import { BasePostgresClient, ConnectionConfig } from './base_client';

export class NeonClient extends BasePostgresClient {
  constructor(connectionString: string) {
    const config: ConnectionConfig = {
      connectionString,
      ssl: { rejectUnauthorized: true }, // Neon requires SSL
      max: 3, // Neon serverless has lower connection limits
      idleTimeoutMillis: 20000, // Shorter timeout for serverless
      connectionTimeoutMillis: 10000,
    };
    super(config, 'neon');
  }

  async connect(): Promise<void> {
    try {
      // Ensure connection string has sslmode parameter
      let connectionString = this.config.connectionString;
      if (!connectionString.includes('sslmode=')) {
        connectionString += connectionString.includes('?') ? '&sslmode=require' : '?sslmode=require';
        this.config.connectionString = connectionString;
      }

      this.pool = this.createPool({ rejectUnauthorized: true });
      
      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      console.log('✓ Connected to Neon Serverless Postgres');
    } catch (error) {
      throw new Error(`Failed to connect to Neon: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Override for Neon's serverless architecture
  async runSafeQuery(sql: string, params?: any[]): Promise<any> {
    // Neon serverless might need connection retry logic
    let retries = 3;
    let lastError: Error | null = null;

    while (retries > 0) {
      try {
        return await super.runSafeQuery(sql, params);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (lastError.message.includes('connection') && retries > 1) {
          // Connection issue with serverless, retry
          retries--;
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        throw lastError;
      }
    }

    throw lastError || new Error('Query failed after retries');
  }
}
