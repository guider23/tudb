import { BasePostgresClient, ConnectionConfig } from './base_client';

export class RDSClient extends BasePostgresClient {
  constructor(connectionString: string) {
    const config: ConnectionConfig = {
      connectionString,
      ssl: { rejectUnauthorized: true }, // AWS RDS with proper certificates
      max: 20, // RDS can handle more connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };
    super(config, 'aws-rds');
  }

  async connect(): Promise<void> {
    try {
      // AWS RDS SSL configuration
      this.pool = this.createPool({ rejectUnauthorized: true });
      
      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      console.log('✓ Connected to AWS RDS Postgres');
    } catch (error) {
      throw new Error(`Failed to connect to AWS RDS: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Override to add RDS-specific optimizations
  async runSafeQuery(sql: string, params?: any[]): Promise<any> {
    // RDS might benefit from query performance insights
    try {
      return await super.runSafeQuery(sql, params);
    } catch (error) {
      // Log RDS-specific error details
      console.error('RDS Query Error:', {
        message: error instanceof Error ? error.message : String(error),
        sql: sql.substring(0, 100),
      });
      throw error;
    }
  }
}
