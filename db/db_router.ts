import { DatabaseClient } from './base_client';
import { PostgresClient } from './postgres_client';
import { SupabaseClient } from './supabase_client';
import { NeonClient } from './neon_client';
import { RailwayClient } from './railway_client';
import { RDSClient } from './rds_client';
import { MySQLClient } from './mysql_client';

export type DBProvider = 'local' | 'supabase' | 'neon' | 'railway' | 'rds' | 'mysql' | 'planetscale' | 'localmysql';

export class DatabaseRouter {
  private static instance: DatabaseClient | null = null;
  private static currentProvider: DBProvider | null = null;

  static getClient(): DatabaseClient {
    const provider = (process.env.DB_PROVIDER || 'local') as DBProvider;

    // Return cached instance if provider hasn't changed
    if (this.instance && this.currentProvider === provider) {
      return this.instance;
    }

    // Create new client based on provider
    this.currentProvider = provider;
    this.instance = this.createClient(provider);
    
    return this.instance;
  }

  // Public method to create client from connection string
  static createClient(provider: DBProvider | string, connectionString?: string): DatabaseClient {
    if (connectionString) {
      // Create client directly from connection string
      switch (provider) {
        case 'local':
          return new PostgresClient(connectionString);
        case 'supabase':
          return new SupabaseClient(connectionString);
        case 'neon':
          return new NeonClient(connectionString);
        case 'railway':
          return new RailwayClient(connectionString);
        case 'rds':
          return new RDSClient(connectionString);
        case 'mysql':
        case 'localmysql':
          return new MySQLClient({ connectionString }, 'mysql');
        case 'planetscale':
          return new MySQLClient({ connectionString }, 'planetscale');
        default:
          throw new Error(`Unsupported database provider: ${provider}`);
      }
    }
    
    // Use environment variables
    switch (provider) {
      case 'local':
        return this.createLocalClient();
      
      case 'supabase':
        return this.createSupabaseClient();
      
      case 'neon':
        return this.createNeonClient();
      
      case 'railway':
        return this.createRailwayClient();
      
      case 'rds':
        return this.createRDSClient();
      
      case 'mysql':
      case 'localmysql':
        return this.createMySQLClient();
      
      case 'planetscale':
        return this.createPlanetScaleClient();
      
      default:
        throw new Error(`Unsupported database provider: ${provider}`);
    }
  }

  private static createLocalClient(): DatabaseClient {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required for local provider');
    }
    return new PostgresClient(connectionString);
  }

  private static createSupabaseClient(): DatabaseClient {
    const connectionString = process.env.SUPABASE_DB_URL;
    if (!connectionString) {
      throw new Error('SUPABASE_DB_URL environment variable is required for supabase provider');
    }
    return new SupabaseClient(connectionString);
  }

  private static createNeonClient(): DatabaseClient {
    const connectionString = process.env.NEON_DATABASE_URL;
    if (!connectionString) {
      throw new Error('NEON_DATABASE_URL environment variable is required for neon provider');
    }
    return new NeonClient(connectionString);
  }

  private static createRailwayClient(): DatabaseClient {
    const connectionString = process.env.RAILWAY_DATABASE_URL;
    if (!connectionString) {
      throw new Error('RAILWAY_DATABASE_URL environment variable is required for railway provider');
    }
    return new RailwayClient(connectionString);
  }

  private static createRDSClient(): DatabaseClient {
    const connectionString = process.env.RDS_DATABASE_URL;
    if (!connectionString) {
      throw new Error('RDS_DATABASE_URL environment variable is required for rds provider');
    }
    return new RDSClient(connectionString);
  }

  private static createMySQLClient(): DatabaseClient {
    const connectionString = process.env.MYSQL_DATABASE_URL;
    if (!connectionString) {
      throw new Error('MYSQL_DATABASE_URL environment variable is required for mysql provider');
    }
    return new MySQLClient({ connectionString }, 'mysql');
  }

  private static createPlanetScaleClient(): DatabaseClient {
    const connectionString = process.env.PLANETSCALE_DATABASE_URL;
    if (!connectionString) {
      throw new Error('PLANETSCALE_DATABASE_URL environment variable is required for planetscale provider');
    }
    return new MySQLClient({ connectionString }, 'planetscale');
  }

  static async connect(): Promise<void> {
    const client = this.getClient();
    await client.connect();
  }

  static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.disconnect();
      this.instance = null;
      this.currentProvider = null;
    }
  }

  static getCurrentProvider(): DBProvider | null {
    return this.currentProvider;
  }

  static isConnected(): boolean {
    return this.instance !== null;
  }
}

// Export for convenience
export { DatabaseClient } from './base_client';
export { PostgresClient } from './postgres_client';
export { SupabaseClient } from './supabase_client';
export { NeonClient } from './neon_client';
export { RailwayClient } from './railway_client';
export { RDSClient } from './rds_client';
export { MySQLClient } from './mysql_client';
