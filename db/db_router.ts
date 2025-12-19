import { DatabaseClient } from './base_client';
import { PostgresClient } from './postgres_client';
import { SupabaseClient } from './supabase_client';
import { NeonClient } from './neon_client';
import { RailwayClient } from './railway_client';
import { RDSClient } from './rds_client';
import { MySQLClient } from './mysql_client';

export type DBProvider = 'local' | 'supabase' | 'neon' | 'railway' | 'rds' | 'mysql' | 'planetscale' | 'azuremysql' | 'localmysql' | 
  'herokupostgres' | 'googlecloudsql' | 'azurepostgres' | 'digitaloceanpostgres' | 'aivenpostgres' | 'render' | 'cockroachdb' | 'timescalecloud' |
  'googlecloudsqlmysql' | 'digitaloceanmysql' | 'aivenmysql' | 'auroramysql';

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
        case 'azuremysql':
          return new MySQLClient({ connectionString }, 'azuremysql');
        // PostgreSQL providers
        case 'herokupostgres':
        case 'googlecloudsql':
        case 'azurepostgres':
        case 'digitaloceanpostgres':
        case 'aivenpostgres':
        case 'render':
          return new PostgresClient(connectionString);
        case 'cockroachdb':
        case 'timescalecloud':
          return new PostgresClient(connectionString);
        // MySQL providers
        case 'googlecloudsqlmysql':
        case 'digitaloceanmysql':
        case 'aivenmysql':
        case 'auroramysql':
          return new MySQLClient({ connectionString }, provider);
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
      
      case 'azuremysql':
        return this.createAzureMySQLClient();
      
      // PostgreSQL providers
      case 'herokupostgres':
        return this.createHerokuPostgresClient();
      
      case 'googlecloudsql':
        return this.createGoogleCloudSQLClient();
      
      case 'azurepostgres':
        return this.createAzurePostgresClient();
      
      case 'digitaloceanpostgres':
        return this.createDigitalOceanPostgresClient();
      
      case 'aivenpostgres':
        return this.createAivenPostgresClient();
      
      case 'render':
        return this.createRenderClient();
      
      case 'cockroachdb':
        return this.createCockroachDBClient();
      
      case 'timescalecloud':
        return this.createTimescaleCloudClient();
      
      // MySQL providers
      case 'googlecloudsqlmysql':
        return this.createGoogleCloudSQLMySQLClient();
      
      case 'digitaloceanmysql':
        return this.createDigitalOceanMySQLClient();
      
      case 'aivenmysql':
        return this.createAivenMySQLClient();
      
      case 'auroramysql':
        return this.createAuroraMySQLClient();
      
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

  private static createAzureMySQLClient(): DatabaseClient {
    const connectionString = process.env.AZURE_MYSQL_DATABASE_URL;
    if (!connectionString) {
      throw new Error('AZURE_MYSQL_DATABASE_URL environment variable is required for azuremysql provider');
    }
    return new MySQLClient({ connectionString }, 'azuremysql');
  }

  // PostgreSQL cloud providers
  private static createHerokuPostgresClient(): DatabaseClient {
    const connectionString = process.env.HEROKU_POSTGRES_DATABASE_URL;
    if (!connectionString) {
      throw new Error('HEROKU_POSTGRES_DATABASE_URL environment variable is required for herokupostgres provider');
    }
    return new PostgresClient(connectionString);
  }

  private static createGoogleCloudSQLClient(): DatabaseClient {
    const connectionString = process.env.GOOGLE_CLOUD_SQL_DATABASE_URL;
    if (!connectionString) {
      throw new Error('GOOGLE_CLOUD_SQL_DATABASE_URL environment variable is required for googlecloudsql provider');
    }
    return new PostgresClient(connectionString);
  }

  private static createAzurePostgresClient(): DatabaseClient {
    const connectionString = process.env.AZURE_POSTGRES_DATABASE_URL;
    if (!connectionString) {
      throw new Error('AZURE_POSTGRES_DATABASE_URL environment variable is required for azurepostgres provider');
    }
    return new PostgresClient(connectionString);
  }

  private static createDigitalOceanPostgresClient(): DatabaseClient {
    const connectionString = process.env.DIGITALOCEAN_POSTGRES_DATABASE_URL;
    if (!connectionString) {
      throw new Error('DIGITALOCEAN_POSTGRES_DATABASE_URL environment variable is required for digitaloceanpostgres provider');
    }
    return new PostgresClient(connectionString);
  }

  private static createAivenPostgresClient(): DatabaseClient {
    const connectionString = process.env.AIVEN_POSTGRES_DATABASE_URL;
    if (!connectionString) {
      throw new Error('AIVEN_POSTGRES_DATABASE_URL environment variable is required for aivenpostgres provider');
    }
    return new PostgresClient(connectionString);
  }

  private static createRenderClient(): DatabaseClient {
    const connectionString = process.env.RENDER_DATABASE_URL;
    if (!connectionString) {
      throw new Error('RENDER_DATABASE_URL environment variable is required for render provider');
    }
    return new PostgresClient(connectionString);
  }

  private static createCockroachDBClient(): DatabaseClient {
    const connectionString = process.env.COCKROACHDB_DATABASE_URL;
    if (!connectionString) {
      throw new Error('COCKROACHDB_DATABASE_URL environment variable is required for cockroachdb provider');
    }
    return new PostgresClient(connectionString);
  }

  private static createTimescaleCloudClient(): DatabaseClient {
    const connectionString = process.env.TIMESCALE_CLOUD_DATABASE_URL;
    if (!connectionString) {
      throw new Error('TIMESCALE_CLOUD_DATABASE_URL environment variable is required for timescalecloud provider');
    }
    return new PostgresClient(connectionString);
  }

  // MySQL cloud providers
  private static createGoogleCloudSQLMySQLClient(): DatabaseClient {
    const connectionString = process.env.GOOGLE_CLOUD_SQL_MYSQL_DATABASE_URL;
    if (!connectionString) {
      throw new Error('GOOGLE_CLOUD_SQL_MYSQL_DATABASE_URL environment variable is required for googlecloudsqlmysql provider');
    }
    return new MySQLClient({ connectionString }, 'googlecloudsqlmysql');
  }

  private static createDigitalOceanMySQLClient(): DatabaseClient {
    const connectionString = process.env.DIGITALOCEAN_MYSQL_DATABASE_URL;
    if (!connectionString) {
      throw new Error('DIGITALOCEAN_MYSQL_DATABASE_URL environment variable is required for digitaloceanmysql provider');
    }
    return new MySQLClient({ connectionString }, 'digitaloceanmysql');
  }

  private static createAivenMySQLClient(): DatabaseClient {
    const connectionString = process.env.AIVEN_MYSQL_DATABASE_URL;
    if (!connectionString) {
      throw new Error('AIVEN_MYSQL_DATABASE_URL environment variable is required for aivenmysql provider');
    }
    return new MySQLClient({ connectionString }, 'aivenmysql');
  }

  private static createAuroraMySQLClient(): DatabaseClient {
    const connectionString = process.env.AURORA_MYSQL_DATABASE_URL;
    if (!connectionString) {
      throw new Error('AURORA_MYSQL_DATABASE_URL environment variable is required for auroramysql provider');
    }
    return new MySQLClient({ connectionString }, 'auroramysql');
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
