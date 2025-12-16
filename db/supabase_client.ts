import { BasePostgresClient, ConnectionConfig } from './base_client';

/**
 * Fixes connection strings with unencoded special characters in passwords.
 * Handles cases where users paste connection strings with raw passwords.
 */
function fixConnectionString(connectionString: string): string {
  try {
    // Try parsing as URL first - if it works, return as-is
    new URL(connectionString);
    return connectionString;
  } catch {
    // If parsing fails, try to fix the password encoding
    const match = connectionString.match(/^(postgres(?:ql)?:\/\/([^:]+):([^@]+)@(.+))$/);
    if (match) {
      const [, , username, password, hostAndDb] = match;
      // URL-encode the password
      const encodedPassword = encodeURIComponent(password);
      return `postgresql://${username}:${encodedPassword}@${hostAndDb}`;
    }
    // If we can't parse it, return as-is and let it fail with a better error
    return connectionString;
  }
}

/**
 * Validates that the connection string uses Supabase's pooler (IPv4 compatible)
 * instead of direct connection (IPv6 only).
 */
function validateSupabaseConnection(connectionString: string): void {
  const url = new URL(connectionString);
  
  // Check if using direct connection (db.*.supabase.co with port 5432)
  if (url.hostname.includes('db.') && url.hostname.includes('.supabase.co') && url.port === '5432') {
    throw new Error(
      'Direct connection detected. Supabase direct connections are IPv6-only and incompatible with Heroku. ' +
      'Please use Pooler instead: In Supabase dashboard → Connect → ORMs → Method: "Session pooler" (port 5432) or "Transaction pooler" (port 6543). ' +
      'The connection string should include "pooler.supabase.com"'
    );
  }
  
  // Validate it's using the pooler (either Session on 5432 or Transaction on 6543)
  if (!url.hostname.includes('pooler.supabase.com')) {
    console.warn('⚠️ Warning: Connection string does not appear to use Supabase pooler. This may cause IPv6 connectivity issues.');
  } else {
    const poolerType = url.port === '6543' ? 'Transaction Pooler' : url.port === '5432' ? 'Session Pooler' : 'Unknown Pooler';
    console.log(`✓ Using Supabase ${poolerType} (IPv4 compatible)`);
  }
}

export class SupabaseClient extends BasePostgresClient {
  constructor(connectionString: string) {
    const fixedConnectionString = fixConnectionString(connectionString);
    
    // Validate that user is using pooler connection (IPv4 compatible)
    validateSupabaseConnection(fixedConnectionString);
    
    const config: ConnectionConfig = {
      connectionString: fixedConnectionString,
      ssl: { rejectUnauthorized: false }, // Supabase pooler uses self-signed certs
      max: 15, // Supabase connection pooler recommended limit
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 20000,
    };
    super(config, 'supabase');
  }

  async connect(): Promise<void> {
    try {
      // Supabase pooler connection with proper SSL configuration
      this.pool = this.createPool({ rejectUnauthorized: false });
      
      // Test connection with retry logic
      let lastError: Error | null = null;
      const maxRetries = 3;
      
      for (let i = 0; i < maxRetries; i++) {
        try {
          const client = await this.pool.connect();
          await client.query('SELECT NOW()');
          client.release();
          console.log('✓ Connected to Supabase Postgres via Session Pooler');
          return;
        } catch (err) {
          lastError = err as Error;
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.log(`Connection attempt ${i + 1}/${maxRetries} failed: ${errorMsg}`);
          
          // Check if it's an IPv6 error and provide helpful message
          if (errorMsg.includes('ENETUNREACH') || errorMsg.includes('2406:')) {
            throw new Error(
              'IPv6 connection error detected. You must use Supabase Session Pooler (not Direct Connection). ' +
              'In Supabase: Connect → ORMs → Method: "Session pooler" → Copy the connection string with "pooler.supabase.com:5432"'
            );
          }
          
          if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
          }
        }
      }
      throw lastError || new Error('Failed to connect after retries');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Supabase connection error:', errorMsg);
      throw error instanceof Error ? error : new Error(`Failed to connect to Supabase: ${errorMsg}`);
    }
  }

  // Override to handle Supabase-specific quirks if needed
  async listTables(): Promise<string[]> {
    // Supabase creates some internal tables we might want to filter
    const tables = await super.listTables();
    return tables.filter(table => !table.startsWith('_') && !table.startsWith('supabase_'));
  }
}
