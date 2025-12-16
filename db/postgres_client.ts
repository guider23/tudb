import { BasePostgresClient, ConnectionConfig } from './base_client';

export class PostgresClient extends BasePostgresClient {
  constructor(connectionString: string) {
    // Auto-detect if SSL is needed (Heroku, AWS RDS, etc.)
    const needsSSL = connectionString.includes('amazonaws.com') || 
                     connectionString.includes('heroku') ||
                     process.env.NODE_ENV === 'production' ||
                     process.env.DB_SSL === 'true';
    
    const config: ConnectionConfig = {
      connectionString,
      ssl: needsSSL ? { rejectUnauthorized: false } : false,
      max: 20, // Local/standard Postgres can handle more connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };
    super(config, 'local-postgres');
  }

  async connect(): Promise<void> {
    try {
      this.pool = this.createPool();
      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      console.log('✓ Connected to Local Postgres');
    } catch (error) {
      throw new Error(`Failed to connect to Local Postgres: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
