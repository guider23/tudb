import mysql from 'mysql2/promise';
import { DatabaseClient, TableDescription, ColumnInfo } from './base_client';

export interface MySQLConnectionConfig {
  connectionString: string;
  connectionLimit?: number;
  queueLimit?: number;
  waitForConnections?: boolean;
}

export class MySQLClient implements DatabaseClient {
  private pool: mysql.Pool | null = null;
  private config: MySQLConnectionConfig;
  private providerName: string;

  constructor(config: MySQLConnectionConfig, providerName: string = 'mysql') {
    this.config = config;
    this.providerName = providerName;
  }

  async connect(): Promise<void> {
    if (this.pool) {
      return;
    }

    try {
      this.pool = mysql.createPool({
        uri: this.config.connectionString,
        connectionLimit: this.config.connectionLimit || 10,
        queueLimit: this.config.queueLimit || 0,
        waitForConnections: this.config.waitForConnections !== false,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
      });

      // Test the connection
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
    } catch (error) {
      this.pool = null;
      throw new Error(`Failed to connect to MySQL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  getProviderName(): string {
    return this.providerName;
  }

  private ensureConnected(): void {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }
  }

  async listTables(): Promise<string[]> {
    this.ensureConnected();
    const [rows] = await this.pool!.query('SHOW TABLES');
    const tables = rows as any[];
    return tables.map((row) => Object.values(row)[0] as string);
  }

  async describeTable(tableName: string): Promise<TableDescription> {
    this.ensureConnected();

    // Get column information
    const [columns] = await this.pool!.query(`DESCRIBE \`${tableName}\``);
    const columnRows = columns as any[];

    const columnInfos: ColumnInfo[] = columnRows.map((col) => ({
      columnName: col.Field,
      dataType: col.Type,
      isNullable: col.Null === 'YES',
      defaultValue: col.Default,
      maxLength: this.extractMaxLength(col.Type),
    }));

    // Get primary keys
    const primaryKeys = columnRows
      .filter((col) => col.Key === 'PRI')
      .map((col) => col.Field);

    // Get foreign keys
    const [fkRows] = await this.pool!.query(`
      SELECT 
        COLUMN_NAME as columnName,
        REFERENCED_TABLE_NAME as referencedTable,
        REFERENCED_COLUMN_NAME as referencedColumn
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `, [tableName]);

    const foreignKeys = (fkRows as any[]).map((fk) => ({
      columnName: fk.columnName,
      referencedTable: fk.referencedTable,
      referencedColumn: fk.referencedColumn,
    }));

    return {
      tableName,
      columns: columnInfos,
      primaryKeys,
      foreignKeys,
    };
  }

  private extractMaxLength(dataType: string): number | null {
    const match = dataType.match(/\((\d+)\)/);
    return match ? parseInt(match[1], 10) : null;
  }

  async runSafeQuery(sql: string, params?: any[]): Promise<any> {
    this.ensureConnected();

    try {
      const [rows, fields] = await this.pool!.query(sql, params || []);
      
      // Convert MySQL result to PostgreSQL-like format
      return {
        rows: Array.isArray(rows) ? rows : [rows],
        rowCount: Array.isArray(rows) ? rows.length : 1,
        command: this.extractCommand(sql),
        fields: fields || [],
      };
    } catch (error) {
      throw new Error(`MySQL query failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private extractCommand(sql: string): string {
    const match = sql.trim().match(/^(\w+)/i);
    return match ? match[1].toUpperCase() : 'UNKNOWN';
  }

  async explainQuery(sql: string): Promise<string> {
    this.ensureConnected();

    try {
      const [rows] = await this.pool!.query(`EXPLAIN ${sql}`);
      return JSON.stringify(rows, null, 2);
    } catch (error) {
      throw new Error(`Failed to explain query: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.connect();
      const connection = await this.pool!.getConnection();
      await connection.ping();
      connection.release();
      return true;
    } catch (error) {
      return false;
    }
  }

  async getDatabaseInfo(): Promise<{ version: string; database: string }> {
    this.ensureConnected();
    
    const [versionRows] = await this.pool!.query('SELECT VERSION() as version');
    const [dbRows] = await this.pool!.query('SELECT DATABASE() as database');
    
    const version = (versionRows as any[])[0]?.version || 'unknown';
    const database = (dbRows as any[])[0]?.database || 'unknown';

    return { version, database };
  }
}
