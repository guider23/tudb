import { Pool, QueryResult } from 'pg';

export interface DatabaseClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  listTables(): Promise<string[]>;
  describeTable(tableName: string): Promise<TableDescription>;
  runSafeQuery(sql: string, params?: any[]): Promise<QueryResult>;
  explainQuery(sql: string): Promise<string>;
  getProviderName(): string;
}

export interface TableDescription {
  tableName: string;
  columns: ColumnInfo[];
  primaryKeys: string[];
  foreignKeys: ForeignKeyInfo[];
}

export interface ColumnInfo {
  columnName: string;
  dataType: string;
  isNullable: boolean;
  defaultValue: string | null;
  maxLength: number | null;
}

export interface ForeignKeyInfo {
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
}

export interface ConnectionConfig {
  connectionString: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export abstract class BasePostgresClient implements DatabaseClient {
  protected pool: Pool | null = null;
  protected config: ConnectionConfig;
  protected providerName: string;

  constructor(config: ConnectionConfig, providerName: string) {
    this.config = config;
    this.providerName = providerName;
  }

  abstract connect(): Promise<void>;

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  getProviderName(): string {
    return this.providerName;
  }

  async listTables(): Promise<string[]> {
    this.ensureConnected();
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    const result = await this.pool!.query(query);
    return result.rows.map((row) => row.table_name);
  }

  async describeTable(tableName: string): Promise<TableDescription> {
    this.ensureConnected();

    // Get column information
    const columnQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = $1
      ORDER BY ordinal_position;
    `;
    const columnResult = await this.pool!.query(columnQuery, [tableName]);

    const columns: ColumnInfo[] = columnResult.rows.map((row) => ({
      columnName: row.column_name,
      dataType: row.data_type,
      isNullable: row.is_nullable === 'YES',
      defaultValue: row.column_default,
      maxLength: row.character_maximum_length,
    }));

    // Get primary keys
    const pkQuery = `
      SELECT a.attname as column_name
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1::regclass AND i.indisprimary;
    `;
    const pkResult = await this.pool!.query(pkQuery, [tableName]);
    const primaryKeys = pkResult.rows.map((row) => row.column_name);

    // Get foreign keys
    const fkQuery = `
      SELECT
        kcu.column_name,
        ccu.table_name AS referenced_table,
        ccu.column_name AS referenced_column
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = $1
        AND tc.table_schema = 'public';
    `;
    const fkResult = await this.pool!.query(fkQuery, [tableName]);
    const foreignKeys: ForeignKeyInfo[] = fkResult.rows.map((row) => ({
      columnName: row.column_name,
      referencedTable: row.referenced_table,
      referencedColumn: row.referenced_column,
    }));

    return {
      tableName,
      columns,
      primaryKeys,
      foreignKeys,
    };
  }

  async runSafeQuery(sql: string, params?: any[]): Promise<QueryResult> {
    this.ensureConnected();
    
    // Check READ_ONLY mode
    const readOnly = process.env.READ_ONLY === 'true';
    const adminOverride = process.env.ADMIN_OVERRIDE === 'true';

    if (readOnly && !adminOverride) {
      // Ensure query is read-only (this is enforced by SQL validator before calling this)
      const upperSql = sql.trim().toUpperCase();
      const destructiveKeywords = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'INSERT', 'UPDATE', 'CREATE'];
      
      for (const keyword of destructiveKeywords) {
        if (upperSql.startsWith(keyword)) {
          throw new Error(`Destructive operation '${keyword}' not allowed in READ_ONLY mode`);
        }
      }
    }

    try {
      const result = await this.pool!.query(sql, params);
      return result;
    } catch (error) {
      throw new Error(`Query execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async explainQuery(sql: string): Promise<string> {
    this.ensureConnected();
    const explainSql = `EXPLAIN (FORMAT JSON) ${sql}`;
    const result = await this.pool!.query(explainSql);
    
    // Parse the execution plan and return a human-readable summary
    const plan = result.rows[0]['QUERY PLAN'][0];
    const nodeType = plan['Plan']['Node Type'];
    const totalCost = plan['Plan']['Total Cost'];
    
    return `Query executes a ${nodeType} operation with estimated cost of ${totalCost}`;
  }

  protected ensureConnected(): void {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }
  }

  protected createPool(sslConfig?: boolean | { rejectUnauthorized: boolean }): Pool {
    return new Pool({
      connectionString: this.config.connectionString,
      ssl: sslConfig ?? this.config.ssl,
      max: this.config.max ?? 10,
      idleTimeoutMillis: this.config.idleTimeoutMillis ?? 30000,
      connectionTimeoutMillis: this.config.connectionTimeoutMillis ?? 10000,
    });
  }
}
