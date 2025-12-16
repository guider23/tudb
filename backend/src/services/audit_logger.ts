import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../logger';

const logger = createLogger('audit-logger');

export interface AuditLog {
  user_id: string;
  connection_id?: string | null;
  session_id?: string;
  question: string;
  generated_sql: string | null;
  allowed: boolean;
  result_count: number;
  status: 'success' | 'blocked' | 'error' | 'clarification_needed';
  error?: string;
  clarification?: string;
}

export class AuditLogger {
  private pool: Pool | null = null;

  constructor() {
    this.initializePool();
  }

  private initializePool() {
    try {
      const dbUrl = this.getConnectionString();
      if (dbUrl) {
        // Check if SSL is needed (Heroku, RDS endpoints, etc.)
        const needsSsl = dbUrl.includes('heroku') || dbUrl.includes('rds.amazonaws.com') || dbUrl.includes('.neon.tech');
        const sslEnabled = process.env.DB_SSL === 'true' || needsSsl;
        
        this.pool = new Pool({
          connectionString: dbUrl,
          ssl: sslEnabled 
            ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true' }
            : false,
        });
        
        logger.info(`Audit logger pool initialized with SSL: ${sslEnabled}`);
      }
    } catch (error) {
      logger.error('Failed to initialize audit logger pool:', error);
    }
  }

  private getConnectionString(): string | undefined {
    const provider = process.env.DB_PROVIDER || 'local';
    
    switch (provider) {
      case 'local':
        return process.env.DATABASE_URL;
      case 'supabase':
        return process.env.SUPABASE_DB_URL;
      case 'neon':
        return process.env.NEON_DATABASE_URL;
      case 'railway':
        return process.env.RAILWAY_DATABASE_URL;
      case 'rds':
        return process.env.RDS_DATABASE_URL;
      default:
        return process.env.DATABASE_URL;
    }
  }

  async log(entry: AuditLog): Promise<void> {
    const logId = uuidv4();
    console.log('[AUDIT] Attempting to log entry:', { 
      id: logId, 
      userId: entry.user_id, 
      question: entry.question,
      status: entry.status 
    });
    
    try {
      if (!this.pool) {
        logger.warn('Audit pool not initialized, logging to console only');
        console.log('AUDIT LOG:', JSON.stringify(entry, null, 2));
        return;
      }

      const query = `
        INSERT INTO query_audit_log (
          id, user_id, connection_id, session_id, question, generated_sql, 
          allowed, result_count, status, error, clarification, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      `;

      const values = [
        logId,
        entry.user_id,
        entry.connection_id || null,
        entry.session_id || null,
        entry.question,
        entry.generated_sql,
        entry.allowed,
        entry.result_count,
        entry.status,
        entry.error || null,
        entry.clarification || null,
      ];

      await this.pool.query(query, values);
      console.log('[AUDIT] ✅ Successfully logged to database with ID:', logId);
      logger.info(`Audit log created for user ${entry.user_id}: ${entry.status}`);
    } catch (error) {
      console.error('[AUDIT] ❌ Failed to write to database:', error);
      logger.error('Failed to write audit log:', error);
      // Fallback to console logging
      console.log('AUDIT LOG (fallback):', JSON.stringify(entry, null, 2));
    }
  }

  async getRecentLogs(userId: string, limit: number = 10): Promise<any[]> {
    try {
      if (!this.pool) {
        return [];
      }

      const query = `
        SELECT * FROM query_audit_log
        WHERE user_id = $1
        ORDER BY timestamp DESC
        LIMIT $2
      `;

      const result = await this.pool.query(query, [userId, limit]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to retrieve audit logs:', error);
      return [];
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}
