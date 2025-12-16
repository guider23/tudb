import { BasePostgresClient, ConnectionConfig } from './base_client';

export class RailwayClient extends BasePostgresClient {
  constructor(connectionString: string) {
    const config: ConnectionConfig = {
      connectionString,
      ssl: { rejectUnauthorized: false }, // Railway uses self-signed certs
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };
    super(config, 'railway');
  }

  async connect(): Promise<void> {
    try {
      // Railway-specific SSL configuration (self-signed certificates)
      this.pool = this.createPool({ rejectUnauthorized: false });
      
      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      console.log('✓ Connected to Railway Postgres');
    } catch (error) {
      throw new Error(`Failed to connect to Railway: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
