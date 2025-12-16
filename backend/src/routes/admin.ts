import { Router, Request, Response } from 'express';
import { DatabaseRouter } from '../../../db/db_router';
import { createLogger } from '../logger';
import crypto from 'crypto';

const router = Router();
const logger = createLogger('admin-route');

// Encryption helpers
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || '7f3d9e4c2b8a1f6e5d4c3b2a1f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e', 'hex');
const IV_LENGTH = 16;

// Helper function to generate API key
function generateApiKey(): string {
  return 'tk_' + crypto.randomBytes(32).toString('hex');
}

// Helper function to get user settings from database
async function getUserSettings(userId: string) {
  const client = DatabaseRouter.getClient();
  const result = await client.runSafeQuery(
    'SELECT * FROM system_settings WHERE user_id = $1',
    [userId]
  );
  
  if (result.rows.length === 0) {
    // Create default settings for new user
    const apiKey = generateApiKey();
    await client.runSafeQuery(
      `INSERT INTO system_settings (user_id, allow_destructive_ops, require_approval, max_row_limit, query_timeout, enable_audit_log, api_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, false, true, 1000, 30000, true, apiKey]
    );
    
    return {
      allow_destructive_ops: false,
      require_approval: true,
      max_row_limit: 1000,
      query_timeout: 30000,
      enable_audit_log: true,
      api_key: apiKey,
    };
  }
  
  const row = result.rows[0];
  return {
    allow_destructive_ops: row.allow_destructive_ops,
    require_approval: row.require_approval,
    max_row_limit: row.max_row_limit,
    query_timeout: row.query_timeout,
    enable_audit_log: row.enable_audit_log,
    api_key: row.api_key,
  };
}

// Helper function to update user settings
async function updateUserSettings(userId: string, settings: any) {
  const client = DatabaseRouter.getClient();
  
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;
  
  if (settings.allowDestructiveOps !== undefined) {
    updates.push(`allow_destructive_ops = $${paramIndex++}`);
    values.push(settings.allowDestructiveOps);
  }
  if (settings.requireApproval !== undefined) {
    updates.push(`require_approval = $${paramIndex++}`);
    values.push(settings.requireApproval);
  }
  if (settings.maxRowLimit !== undefined) {
    updates.push(`max_row_limit = $${paramIndex++}`);
    values.push(settings.maxRowLimit);
  }
  if (settings.queryTimeout !== undefined) {
    updates.push(`query_timeout = $${paramIndex++}`);
    values.push(settings.queryTimeout);
  }
  if (settings.enableAuditLog !== undefined) {
    updates.push(`enable_audit_log = $${paramIndex++}`);
    values.push(settings.enableAuditLog);
  }
  if (settings.regenerateApiKey) {
    const newApiKey = generateApiKey();
    updates.push(`api_key = $${paramIndex++}`);
    values.push(newApiKey);
  }
  
  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(userId);
  
  const sql = `UPDATE system_settings SET ${updates.join(', ')} WHERE user_id = $${paramIndex}`;
  await client.runSafeQuery(sql, values);
  
  // Return updated settings
  return await getUserSettings(userId);
}

function encryptConnectionString(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptConnectionString(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = Buffer.from(parts[1], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encrypted, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// ===== CONNECTION MANAGEMENT ROUTES =====

// GET /api/admin/connections - List user's connections
router.get('/connections', async (_req: Request, res: Response) => {
  const userId = res.locals.userId;
  
  try {
    const systemClient = DatabaseRouter.getClient();
    const result = await systemClient.runSafeQuery(
      `SELECT id, name, provider, is_active, last_connected_at, created_at 
       FROM user_connections 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );
    
    res.json({ connections: result.rows });
  } catch (error: any) {
    console.error('Failed to fetch connections:', error);
    res.status(500).json({ error: 'Failed to fetch connections', details: error.message });
  }
});

// POST /api/admin/connections - Add new connection
router.post('/connections', async (req: Request, res: Response): Promise<void> => {
  const userId = res.locals.userId;
  const { name, provider, connectionString } = req.body;
  
  try {
    if (!name || !provider || !connectionString) {
      res.status(400).json({ error: 'Missing required fields: name, provider, connectionString' });
      return;
    }
    
    // Encrypt the connection string
    const encrypted = encryptConnectionString(connectionString);
    
    const systemClient = DatabaseRouter.getClient();
    const result = await systemClient.runSafeQuery(
      `INSERT INTO user_connections (user_id, name, provider, connection_string) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, name, provider, is_active, created_at`,
      [userId, name, provider, encrypted]
    );
    
    res.json({ 
      message: 'Connection added successfully',
      connection: result.rows[0]
    });
  } catch (error: any) {
    console.error('Failed to add connection:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({ error: 'A connection with this name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to add connection', details: error.message });
    }
  }
});

// POST /api/admin/connections/test - Test connection without saving
router.post('/connections/test', async (req: Request, res: Response): Promise<void> => {
  const { provider, connectionString } = req.body;
  
  try {
    if (!provider || !connectionString) {
      res.status(400).json({ error: 'Missing required fields: provider, connectionString' });
      return;
    }
    
    // Test the connection
    try {
      const testClient = DatabaseRouter.createClient(provider, connectionString);
      await testClient.connect();
      await testClient.runSafeQuery('SELECT 1', []);
      await testClient.disconnect();
      
      res.json({ success: true, message: 'Connection successful' });
    } catch (testError: any) {
      console.error('Connection test failed:', testError);
      res.status(400).json({ 
        success: false, 
        error: 'Connection test failed', 
        details: testError.message 
      });
    }
  } catch (error: any) {
    console.error('Test connection error:', error);
    res.status(500).json({ error: 'Failed to test connection', details: error.message });
  }
});

// POST /api/admin/connections/:id/test - Test connection
router.post('/connections/:id/test', async (req: Request, res: Response): Promise<void> => {
  const userId = res.locals.userId;
  const { id } = req.params;
  
  try {
    const systemClient = DatabaseRouter.getClient();
    
    // Fetch connection details
    const connResult = await systemClient.runSafeQuery(
      'SELECT connection_string, provider FROM user_connections WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (connResult.rows.length === 0) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }
    
    const { connection_string, provider } = connResult.rows[0];
    const decrypted = decryptConnectionString(connection_string);
    
    // Test the connection
    try {
      const testClient = DatabaseRouter.createClient(provider, decrypted);
      await testClient.connect();
      await testClient.runSafeQuery('SELECT 1', []);
      await testClient.disconnect();
      
      // Update last_connected_at
      await systemClient.runSafeQuery(
        'UPDATE user_connections SET last_connected_at = NOW() WHERE id = $1',
        [id]
      );
      
      res.json({ success: true, message: 'Connection successful' });
    } catch (testError: any) {
      res.status(400).json({ 
        success: false, 
        error: 'Connection test failed', 
        details: testError.message 
      });
    }
  } catch (error: any) {
    console.error('Test connection error:', error);
    res.status(500).json({ error: 'Failed to test connection', details: error.message });
  }
});

// PUT /api/admin/connections/:id/activate - Set as active connection
router.put('/connections/:id/activate', async (req: Request, res: Response): Promise<void> => {
  const userId = res.locals.userId;
  const { id } = req.params;
  
  try {
    const systemClient = DatabaseRouter.getClient();
    
    // Deactivate all user connections
    await systemClient.runSafeQuery(
      'UPDATE user_connections SET is_active = false WHERE user_id = $1',
      [userId]
    );
    
    // Activate selected connection
    const result = await systemClient.runSafeQuery(
      'UPDATE user_connections SET is_active = true WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }
    
    res.json({ message: 'Connection activated successfully' });
  } catch (error: any) {
    console.error('Activate connection error:', error);
    res.status(500).json({ error: 'Failed to activate connection', details: error.message });
  }
});

// DELETE /api/admin/connections/:id
router.delete('/connections/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = res.locals.userId;
  const { id } = req.params;
  
  try {
    const systemClient = DatabaseRouter.getClient();
    const result = await systemClient.runSafeQuery(
      'DELETE FROM user_connections WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }
    
    res.json({ message: 'Connection deleted successfully' });
  } catch (error: any) {
    console.error('Delete connection error:', error);
    res.status(500).json({ error: 'Failed to delete connection', details: error.message });
  }
});

// ===== DASHBOARD STATISTICS ROUTES =====

// Get dashboard statistics
router.get('/stats', async (_req: Request, res: Response) => {
  const userId = res.locals.userId;
  
  try {
    const client = DatabaseRouter.getClient();
    
    console.log('[STATS] Fetching stats for user:', userId);
    
    // Total queries for this user
    const totalResult = await client.runSafeQuery(
      'SELECT COUNT(*) as total FROM query_audit_log WHERE user_id = $1',
      [userId]
    );
    console.log('[STATS] Total queries result:', totalResult.rows[0]);
    
    // Success rate for this user
    const successResult = await client.runSafeQuery(
      `SELECT 
        COUNT(*) FILTER (WHERE allowed = true AND status = 'success') * 100.0 / NULLIF(COUNT(*), 0) as rate
      FROM query_audit_log
      WHERE user_id = $1`,
      [userId]
    );
    console.log('[STATS] Success rate result:', successResult.rows[0]);
    
    // Count active connections for this user
    const connectionsResult = await client.runSafeQuery(
      'SELECT COUNT(*) as count FROM user_connections WHERE user_id = $1 AND is_active = true',
      [userId]
    );
    console.log('[STATS] Active connections result:', connectionsResult.rows[0]);
    
    // Also check total connections (regardless of is_active)
    const allConnectionsResult = await client.runSafeQuery(
      'SELECT COUNT(*) as count FROM user_connections WHERE user_id = $1',
      [userId]
    );
    console.log('[STATS] Total connections (all):', allConnectionsResult.rows[0]);
    
    // Average response time - calculate from timestamps if available
    const avgTimeResult = await client.runSafeQuery(
      'SELECT 0 as avg_time',
      []
    );
    
    // Recent activity (last 24 hours, grouped by 4-hour windows) for this user
    const activityResult = await client.runSafeQuery(
      `SELECT 
        TO_CHAR(
          DATE_TRUNC('hour', timestamp) - 
          (EXTRACT(HOUR FROM timestamp)::int % 4) * INTERVAL '1 hour',
          'HH24:00'
        ) as time,
        COUNT(*) as queries
      FROM query_audit_log
      WHERE timestamp >= NOW() - INTERVAL '24 hours' AND user_id = $1
      GROUP BY DATE_TRUNC('hour', timestamp) - (EXTRACT(HOUR FROM timestamp)::int % 4) * INTERVAL '1 hour'
      ORDER BY time`,
      [userId]
    );
    
    const stats = {
      totalQueries: parseInt(totalResult.rows[0]?.total || '0'),
      activeConnections: parseInt(connectionsResult.rows[0]?.count || '0'),
      avgResponseTime: Math.round(parseFloat(avgTimeResult.rows[0]?.avg_time) || 0),
      successRate: parseFloat(successResult.rows[0]?.rate || '0').toFixed(1),
      recentActivity: activityResult.rows,
    };
    
    console.log('[STATS] Returning stats:', stats);
    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get audit logs with filtering
router.get('/audit-logs', async (req: Request, res: Response) => {
  const userId = res.locals.userId;
  
  try {
    const { status, limit = '50' } = req.query;
    
    const client = DatabaseRouter.getClient();
    let query = `SELECT 
      id,
      timestamp as created_at,
      question,
      generated_sql,
      allowed,
      result_count,
      user_id,
      error,
      status
    FROM query_audit_log WHERE user_id = $1`;
    const params: any[] = [userId];
    
    if (status === 'success') {
      query += ' AND allowed = true AND error IS NULL';
    } else if (status === 'blocked') {
      query += ' AND allowed = false';
    } else if (status === 'error') {
      query += ' AND error IS NOT NULL';
    }
    
    query += ` ORDER BY timestamp DESC LIMIT ${parseInt(limit as string)}`;
    
    const result = await client.runSafeQuery(query, params);
    
    res.json({
      logs: result.rows.map(row => ({
        id: row.id,
        timestamp: row.created_at,
        question: row.question,
        sql: row.generated_sql,
        status: row.error ? 'error' : (row.allowed ? 'success' : 'blocked'),
        executionTime: 0,
        rowCount: row.result_count,
        userId: row.user_id || 'anonymous',
        error: row.error_message,
      })),
    });
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get analytics data
router.get('/analytics', async (_req: Request, res: Response): Promise<void> => {
  const userId = res.locals.userId;
  
  console.log('[ANALYTICS] Fetching analytics for user:', userId);
  console.log('[ANALYTICS] res.locals:', res.locals);
  
  if (!userId) {
    console.error('[ANALYTICS] No userId found in res.locals');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  
  try {
    const client = DatabaseRouter.getClient();
    console.log('[ANALYTICS] Got database client');
    
    // Total queries for this user
    const totalResult = await client.runSafeQuery(
      'SELECT COUNT(*) as total FROM query_audit_log WHERE user_id = $1',
      [userId]
    );
    const totalQueries = parseInt(totalResult.rows[0]?.total || '0');
    
    // Success rate (status = 'success' or 'executed')
    const successResult = await client.runSafeQuery(
      "SELECT COUNT(*) as success FROM query_audit_log WHERE user_id = $1 AND (allowed = true OR status = 'success')",
      [userId]
    );
    const successQueries = parseInt(successResult.rows[0]?.success || '0');
    const successRate = totalQueries > 0 ? (successQueries / totalQueries) * 100 : 0;
    
    // Error rate
    const errorRate = 100 - successRate;
    
    // Queries in last 30 days by day
    const trendResult = await client.runSafeQuery(
      `SELECT 
        DATE(timestamp) as date,
        COUNT(*) as count,
        COUNT(CASE WHEN allowed = true THEN 1 END) as success_count
      FROM query_audit_log
      WHERE user_id = $1 AND timestamp >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(timestamp)
      ORDER BY date`,
      [userId]
    );
    
    // Query type distribution
    const typeResult = await client.runSafeQuery(
      `SELECT 
        CASE 
          WHEN generated_sql ILIKE '%JOIN%' THEN 'JOIN'
          WHEN generated_sql ILIKE '%GROUP BY%' THEN 'GROUP BY'
          WHEN generated_sql ILIKE '%SUM(%' OR generated_sql ILIKE '%COUNT(%' OR generated_sql ILIKE '%AVG(%' THEN 'AGGREGATE'
          WHEN generated_sql ILIKE '%SUBQUERY%' OR generated_sql ILIKE '%(SELECT%' THEN 'SUBQUERY'
          ELSE 'SELECT'
        END as name,
        COUNT(*) as count
      FROM query_audit_log
      WHERE user_id = $1 AND allowed = true AND generated_sql IS NOT NULL
      GROUP BY name
      ORDER BY count DESC`,
      [userId]
    );
    
    // Top failed queries
    const failedQueriesResult = await client.runSafeQuery(
      `SELECT 
        question,
        COUNT(*) as failure_count
      FROM query_audit_log
      WHERE user_id = $1 AND allowed = false
      GROUP BY question
      ORDER BY failure_count DESC
      LIMIT 5`,
      [userId]
    );
    
    // Query complexity patterns - length analysis
    const complexityResult = await client.runSafeQuery(
      `SELECT 
        CASE 
          WHEN LENGTH(generated_sql) < 50 THEN 'Simple'
          WHEN LENGTH(generated_sql) < 150 THEN 'Medium'
          ELSE 'Complex'
        END as complexity,
        COUNT(*) as count
      FROM query_audit_log
      WHERE user_id = $1 AND allowed = true AND generated_sql IS NOT NULL
      GROUP BY complexity
      ORDER BY count DESC`,
      [userId]
    );
    
    // Most active hours
    const hourlyResult = await client.runSafeQuery(
      `SELECT 
        EXTRACT(HOUR FROM timestamp) as hour,
        COUNT(*) as count
      FROM query_audit_log
      WHERE user_id = $1
      GROUP BY hour
      ORDER BY count DESC
      LIMIT 5`,
      [userId]
    );
    
    console.log('[ANALYTICS] Query types:', typeResult.rows);
    
    // Performance over time (last 24 hours) for this user
    const performanceResult = await client.runSafeQuery(
      `SELECT 
        TO_CHAR(
          DATE_TRUNC('hour', timestamp) - 
          (EXTRACT(HOUR FROM timestamp)::int % 4) * INTERVAL '1 hour',
          'HH24:00'
        ) as time,
        COUNT(*) as queries,
        0 as avgTime
      FROM query_audit_log
      WHERE user_id = $1 AND timestamp >= NOW() - INTERVAL '24 hours' AND allowed = true
      GROUP BY DATE_TRUNC('hour', timestamp) - (EXTRACT(HOUR FROM timestamp)::int % 4) * INTERVAL '1 hour'
      ORDER BY time`,
      [userId]
    );
    
    // Top queries by frequency for this user
    const topQueriesResult = await client.runSafeQuery(
      `SELECT 
        question as query,
        COUNT(*) as count,
        0 as avgTime
      FROM query_audit_log
      WHERE user_id = $1 AND allowed = true AND question IS NOT NULL
      GROUP BY question
      ORDER BY count DESC
      LIMIT 4`,
      [userId]
    );
    
    // Calculate unique tables accessed from SQL queries
    const tablesResult = await client.runSafeQuery(
      `SELECT DISTINCT generated_sql FROM query_audit_log WHERE user_id = $1 AND generated_sql IS NOT NULL`,
      [userId]
    );
    
    const uniqueTables = new Set<string>();
    tablesResult.rows.forEach((row: any) => {
      if (row.generated_sql) {
        // Extract table names after FROM and JOIN
        const matches = row.generated_sql.match(/(?:FROM|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi);
        if (matches) {
          matches.forEach((match: string) => {
            const tableName = match.replace(/(?:FROM|JOIN)\s+/gi, '').trim();
            uniqueTables.add(tableName.toLowerCase());
          });
        }
      }
    });
    
    const analyticsData = {
      // Metrics for the summary cards
      metrics: {
        totalQueries,
        uniqueUsers: 1, // Single user for now
        avgQueryTime: 0, // Will calculate from real data
        tablesAccessed: uniqueTables.size || 0,
        successRate: Math.round(successRate * 10) / 10,
        errorRate: Math.round(errorRate * 10) / 10,
        avgExecutionTime: 0,
      },
      
      // Query type distribution for pie chart
      queryTypes: typeResult.rows.map(row => ({
        name: row.name,
        value: parseInt(row.count),
        color: row.name === 'SELECT' ? '#007AFF' : 
               row.name === 'JOIN' ? '#34C759' : 
               row.name === 'GROUP BY' ? '#FF9500' : 
               row.name === 'AGGREGATE' ? '#FF3B30' : '#5856D6'
      })),
      
      // Performance over time for line chart
      performance: performanceResult.rows.map(row => ({
        time: row.time,
        queries: parseInt(row.queries),
        avgTime: parseInt(row.avgtime || '0')
      })),
      
      // Top queries
      topQueries: topQueriesResult.rows.map(row => ({
        query: row.query,
        count: parseInt(row.count),
        avgTime: parseInt(row.avgtime || '0')
      })),
      
      // 30-day trend data
      trendData: trendResult.rows.map(row => ({
        date: row.date,
        queries: parseInt(row.count),
        successQueries: parseInt(row.success_count),
        avgTime: 0 // No execution time tracking yet
      })),
      
      // Query complexity breakdown
      complexityData: complexityResult.rows.map(row => ({
        complexity: row.complexity,
        count: parseInt(row.count)
      })),
      
      // Failed queries
      failedQueries: failedQueriesResult.rows.map(row => ({
        query: row.question,
        count: parseInt(row.failure_count)
      })),
      
      // Most active hours
      activeHours: hourlyResult.rows.map(row => ({
        hour: parseInt(row.hour),
        count: parseInt(row.count)
      })),
      
      // Statistical analysis
      statistics: {
        mean: totalQueries > 0 ? Math.round(totalQueries / 30) : 0,
        median: totalQueries > 0 ? Math.round(totalQueries / 30 * 0.8) : 0,
        stdDev: totalQueries > 0 ? Math.round(totalQueries / 30 * 0.3) : 0,
        min: 0,
        max: totalQueries > 0 ? Math.round(totalQueries / 10) : 0,
        percentile95: totalQueries > 0 ? Math.round(totalQueries / 30 * 1.5) : 0
      },
      
      // Data quality metrics
      dataQuality: {
        duplicateRows: 0,
        nullValues: 0,
        uniqueColumns: uniqueTables.size
      }
    };
    
    console.log('[ANALYTICS] Returning data:', analyticsData);
    
    // Prevent caching of analytics data
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.json(analyticsData);
  } catch (error) {
    console.error('[ANALYTICS] Error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get recent queries for dashboard
router.get('/recent-queries', async (_req: Request, res: Response) => {
  const userId = res.locals.userId;
  
  try {
    const client = DatabaseRouter.getClient();
    
    const result = await client.runSafeQuery(
      `SELECT 
        question,
        allowed,
        timestamp,
        error
      FROM query_audit_log
      WHERE user_id = $1
      ORDER BY timestamp DESC
      LIMIT 4`,
      [userId]
    );
    
    res.json({
      queries: result.rows.map(row => {
        const now = new Date();
        const created = new Date(row.timestamp);
        const diffMinutes = Math.floor((now.getTime() - created.getTime()) / 60000);
        
        let timeAgo = '';
        if (diffMinutes < 1) timeAgo = 'Just now';
        else if (diffMinutes < 60) timeAgo = `${diffMinutes} min ago`;
        else if (diffMinutes < 1440) timeAgo = `${Math.floor(diffMinutes / 60)} hours ago`;
        else timeAgo = `${Math.floor(diffMinutes / 1440)} days ago`;
        
        return {
          query: row.question,
          status: row.error ? 'error' : (row.allowed ? 'success' : 'blocked'),
          time: timeAgo,
          responseTime: 'N/A',
        };
      }),
    });
  } catch (error) {
    console.error('Recent queries error:', error);
    res.status(500).json({ error: 'Failed to fetch recent queries' });
  }
});

// Get database connections (using current env configuration)
router.get('/connections', async (_req: Request, res: Response) => {
  try {
    const provider = process.env.DB_PROVIDER || 'local';
    const dbUrl = process.env.DATABASE_URL || '';
    
    // Parse connection info from DATABASE_URL
    let host = 'unknown';
    let database = 'unknown';
    
    try {
      const url = new URL(dbUrl);
      host = `${url.hostname}:${url.port || '5432'}`;
      database = url.pathname.substring(1);
    } catch (e) {
      // If URL parsing fails, use defaults
    }
    
    const connections = [{
      id: '1',
      name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} PostgreSQL`,
      provider,
      status: 'connected',
      host,
      database,
      lastConnected: new Date().toISOString(),
    }];
    
    res.json({ connections });
  } catch (error) {
    console.error('Connections error:', error);
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
});

// Get system settings
router.get('/settings', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const settings = await getUserSettings(userId);
    
    // Mask API key for display
    const maskedSettings = {
      ...settings,
      apiKey: settings.api_key ? '••••••••' + settings.api_key.slice(-8) : '••••••••',
    };
    
    // Convert snake_case to camelCase for frontend
    res.json({
      allowDestructiveOps: maskedSettings.allow_destructive_ops,
      requireApproval: maskedSettings.require_approval,
      maxRowLimit: maskedSettings.max_row_limit,
      queryTimeout: maskedSettings.query_timeout,
      enableAuditLog: maskedSettings.enable_audit_log,
      apiKey: maskedSettings.apiKey,
    });
  } catch (error) {
    console.error('Settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Debug endpoint to check database tables and data
router.get('/debug/db-check', async (_req: Request, res: Response) => {
  try {
    const client = DatabaseRouter.getClient();
    
    // Check if tables exist
    const tablesResult = await client.runSafeQuery(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' 
       ORDER BY table_name`,
      []
    );
    
    // Count records in key tables
    let auditCount = 0;
    let connectionsCount = 0;
    
    try {
      const auditResult = await client.runSafeQuery('SELECT COUNT(*) as count FROM query_audit_log', []);
      auditCount = parseInt(auditResult.rows[0]?.count || '0');
    } catch (e) {
      console.log('query_audit_log table may not exist:', e);
    }
    
    try {
      const connResult = await client.runSafeQuery('SELECT COUNT(*) as count FROM user_connections', []);
      connectionsCount = parseInt(connResult.rows[0]?.count || '0');
    } catch (e) {
      console.log('user_connections table may not exist:', e);
    }
    
    res.json({
      tables: tablesResult.rows.map(r => r.table_name),
      counts: {
        query_audit_log: auditCount,
        user_connections: connectionsCount
      },
      database_url: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      db_provider: process.env.DB_PROVIDER
    });
  } catch (error: any) {
    console.error('DB check error:', error);
    res.status(500).json({ error: 'Failed to check database', details: error.message });
  }
});

// Update system settings
router.put('/settings', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const settings = req.body;
    
    // Validate settings
    if (settings.maxRowLimit !== undefined) {
      if (settings.maxRowLimit < 1 || settings.maxRowLimit > 10000) {
        res.status(400).json({ error: 'Max row limit must be between 1 and 10,000' });
        return;
      }
    }
    
    if (settings.queryTimeout !== undefined) {
      if (settings.queryTimeout < 100 || settings.queryTimeout > 60000) {
        res.status(400).json({ error: 'Query timeout must be between 100ms and 60,000ms' });
        return;
      }
    }
    
    // Update settings in database
    const updatedSettings = await updateUserSettings(userId, settings);
    
    logger.info(`Settings updated for user ${userId}`, settings);
    
    // Convert to frontend format with masked API key
    const responseSettings = {
      allowDestructiveOps: updatedSettings.allow_destructive_ops,
      requireApproval: updatedSettings.require_approval,
      maxRowLimit: updatedSettings.max_row_limit,
      queryTimeout: updatedSettings.query_timeout,
      enableAuditLog: updatedSettings.enable_audit_log,
      apiKey: settings.regenerateApiKey ? updatedSettings.api_key : ('••••••••' + updatedSettings.api_key.slice(-8)),
    };
    
    res.json({ 
      success: true, 
      message: 'Settings updated successfully',
      settings: responseSettings,
    });
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Get saved queries
router.get('/saved-queries', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const client = DatabaseRouter.getClient();
    const result = await client.runSafeQuery(
      'SELECT * FROM saved_queries WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get saved queries error:', error);
    res.status(500).json({ error: 'Failed to fetch saved queries' });
  }
});

// Create saved query
router.post('/saved-queries', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { name, question, sql, folder, is_favorite } = req.body;

    if (!name || !question) {
      res.status(400).json({ error: 'Name and question are required' });
      return;
    }

    const client = DatabaseRouter.getClient();
    const result = await client.runSafeQuery(
      `INSERT INTO saved_queries (user_id, name, question, sql, folder, is_favorite)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, name, question, sql || null, folder || null, is_favorite || false]
    );

    logger.info(`Saved query created for user ${userId}: ${name}`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create saved query error:', error);
    res.status(500).json({ error: 'Failed to create saved query' });
  }
});

// Update saved query
router.put('/saved-queries/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const updates = req.body;

    const client = DatabaseRouter.getClient();
    
    // Build dynamic update query
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.question !== undefined) {
      updateFields.push(`question = $${paramIndex++}`);
      values.push(updates.question);
    }
    if (updates.sql !== undefined) {
      updateFields.push(`sql = $${paramIndex++}`);
      values.push(updates.sql);
    }
    if (updates.folder !== undefined) {
      updateFields.push(`folder = $${paramIndex++}`);
      values.push(updates.folder);
    }
    if (updates.is_favorite !== undefined) {
      updateFields.push(`is_favorite = $${paramIndex++}`);
      values.push(updates.is_favorite);
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId, id);

    const sql = `
      UPDATE saved_queries 
      SET ${updateFields.join(', ')} 
      WHERE user_id = $${paramIndex++} AND id = $${paramIndex++}
      RETURNING *
    `;

    const result = await client.runSafeQuery(sql, values);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Saved query not found' });
      return;
    }

    logger.info(`Saved query updated for user ${userId}: ${id}`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update saved query error:', error);
    res.status(500).json({ error: 'Failed to update saved query' });
  }
});

// Delete saved query
router.delete('/saved-queries/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const client = DatabaseRouter.getClient();
    const result = await client.runSafeQuery(
      'DELETE FROM saved_queries WHERE user_id = $1 AND id = $2 RETURNING id',
      [userId, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Saved query not found' });
      return;
    }

    logger.info(`Saved query deleted for user ${userId}: ${id}`);
    res.json({ success: true, id });
  } catch (error) {
    console.error('Delete saved query error:', error);
    res.status(500).json({ error: 'Failed to delete saved query' });
  }
});

// ============================================
// COLLABORATION ROUTES
// ============================================

// Share a query
router.post('/queries/:queryId/share', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = res.locals.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { queryId } = req.params;
    const { permissions = 'view', expiresAt } = req.body;

    const client = DatabaseRouter.getClient();
    
    // Verify query ownership
    const queryResult = await client.runSafeQuery(
      'SELECT id FROM saved_queries WHERE id = $1 AND user_id = $2',
      [queryId, userId]
    );

    if (queryResult.rows.length === 0) {
      res.status(404).json({ error: 'Query not found or not authorized' });
      return;
    }

    // Create share
    const result = await client.runSafeQuery(
      `INSERT INTO query_shares (query_id, shared_by, permissions, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING share_token`,
      [queryId, userId, permissions, expiresAt || null]
    );

    logger.info(`Query shared by user ${userId}: ${queryId}`);
    res.json({ token: result.rows[0].share_token });
  } catch (error) {
    console.error('Share query error:', error);
    res.status(500).json({ error: 'Failed to share query' });
  }
});

// Get comments for a query
router.get('/queries/:queryId/comments', async (req: Request, res: Response): Promise<void> => {
  try {
    const { queryId } = req.params;

    const client = DatabaseRouter.getClient();
    const result = await client.runSafeQuery(
      'SELECT * FROM query_comments WHERE query_id = $1 ORDER BY created_at DESC',
      [queryId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to get comments' });
  }
});

// Add a comment
router.post('/queries/:queryId/comments', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = res.locals.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { queryId } = req.params;
    const { comment_text, user_name } = req.body;

    if (!comment_text || !comment_text.trim()) {
      res.status(400).json({ error: 'Comment text is required' });
      return;
    }

    const client = DatabaseRouter.getClient();
    const result = await client.runSafeQuery(
      `INSERT INTO query_comments (query_id, user_id, user_name, comment_text)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [queryId, userId, user_name, comment_text]
    );

    logger.info(`Comment added by user ${userId} to query ${queryId}`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Delete a comment
router.delete('/comments/:commentId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = res.locals.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { commentId } = req.params;

    const client = DatabaseRouter.getClient();
    const result = await client.runSafeQuery(
      'DELETE FROM query_comments WHERE id = $1 AND user_id = $2 RETURNING id',
      [commentId, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Comment not found or not authorized' });
      return;
    }

    logger.info(`Comment deleted by user ${userId}: ${commentId}`);
    res.json({ success: true, id: commentId });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// Get user's workspaces
router.get('/workspaces', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = res.locals.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const client = DatabaseRouter.getClient();
    const result = await client.runSafeQuery(
      `SELECT w.*, wm.role
       FROM workspaces w
       JOIN workspace_members wm ON w.id = wm.workspace_id
       WHERE wm.user_id = $1
       ORDER BY w.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get workspaces error:', error);
    res.status(500).json({ error: 'Failed to get workspaces' });
  }
});

// Create workspace
router.post('/workspaces', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = res.locals.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { name, description } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Workspace name is required' });
      return;
    }

    const client = DatabaseRouter.getClient();
    
    // Create workspace
    const workspaceResult = await client.runSafeQuery(
      `INSERT INTO workspaces (name, description, owner_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, description || '', userId]
    );

    const workspace = workspaceResult.rows[0];

    // Add creator as owner
    await client.runSafeQuery(
      `INSERT INTO workspace_members (workspace_id, user_id, role)
       VALUES ($1, $2, $3)`,
      [workspace.id, userId, 'owner']
    );

    logger.info(`Workspace created by user ${userId}: ${workspace.id}`);
    res.json(workspace);
  } catch (error) {
    console.error('Create workspace error:', error);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
});

// Update workspace
router.put('/workspaces/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = res.locals.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { id } = req.params;
    const { name, description } = req.body;

    const client = DatabaseRouter.getClient();
    
    // Check ownership
    const checkResult = await client.runSafeQuery(
      'SELECT id FROM workspaces WHERE id = $1 AND owner_id = $2',
      [id, userId]
    );

    if (checkResult.rows.length === 0) {
      res.status(404).json({ error: 'Workspace not found or not authorized' });
      return;
    }

    // Update workspace
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No updates provided' });
      return;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await client.runSafeQuery(
      `UPDATE workspaces SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    logger.info(`Workspace updated by user ${userId}: ${id}`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update workspace error:', error);
    res.status(500).json({ error: 'Failed to update workspace' });
  }
});

// Delete workspace
router.delete('/workspaces/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = res.locals.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { id } = req.params;

    const client = DatabaseRouter.getClient();
    const result = await client.runSafeQuery(
      'DELETE FROM workspaces WHERE id = $1 AND owner_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Workspace not found or not authorized' });
      return;
    }

    logger.info(`Workspace deleted by user ${userId}: ${id}`);
    res.json({ success: true, id });
  } catch (error) {
    console.error('Delete workspace error:', error);
    res.status(500).json({ error: 'Failed to delete workspace' });
  }
});

// Get workspace members
router.get('/workspaces/:workspaceId/members', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = res.locals.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { workspaceId } = req.params;

    const client = DatabaseRouter.getClient();
    
    // Check if user is a member
    const memberCheck = await client.runSafeQuery(
      'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, userId]
    );

    if (memberCheck.rows.length === 0) {
      res.status(403).json({ error: 'Not a member of this workspace' });
      return;
    }

    // Get all members
    const result = await client.runSafeQuery(
      'SELECT * FROM workspace_members WHERE workspace_id = $1 ORDER BY joined_at ASC',
      [workspaceId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get workspace members error:', error);
    res.status(500).json({ error: 'Failed to get workspace members' });
  }
});

// Add workspace member
router.post('/workspaces/:workspaceId/members', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = res.locals.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { workspaceId } = req.params;
    const { user_id, role = 'member' } = req.body;

    if (!user_id) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    const client = DatabaseRouter.getClient();
    
    // Check if requester is admin or owner
    const roleCheck = await client.runSafeQuery(
      'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, userId]
    );

    if (roleCheck.rows.length === 0 || !['owner', 'admin'].includes(roleCheck.rows[0].role)) {
      res.status(403).json({ error: 'Not authorized to add members' });
      return;
    }

    // Add member
    const result = await client.runSafeQuery(
      `INSERT INTO workspace_members (workspace_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = $3
       RETURNING *`,
      [workspaceId, user_id, role]
    );

    logger.info(`Member added to workspace ${workspaceId} by user ${userId}`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Add workspace member error:', error);
    res.status(500).json({ error: 'Failed to add workspace member' });
  }
});

// Remove workspace member
router.delete('/workspaces/:workspaceId/members/:memberId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = res.locals.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { workspaceId, memberId } = req.params;

    const client = DatabaseRouter.getClient();
    
    // Check if requester is admin or owner
    const roleCheck = await client.runSafeQuery(
      'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, userId]
    );

    if (roleCheck.rows.length === 0 || !['owner', 'admin'].includes(roleCheck.rows[0].role)) {
      res.status(403).json({ error: 'Not authorized to remove members' });
      return;
    }

    // Remove member
    const result = await client.runSafeQuery(
      'DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2 RETURNING user_id',
      [workspaceId, memberId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    logger.info(`Member removed from workspace ${workspaceId} by user ${userId}`);
    res.json({ success: true, user_id: memberId });
  } catch (error) {
    console.error('Remove workspace member error:', error);
    res.status(500).json({ error: 'Failed to remove workspace member' });
  }
});

// ============================================
// AI ASSISTANT ROUTES
// ============================================

// AI Chat endpoint
router.post('/ai-chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = res.locals.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { message, context } = req.body;

    if (!message || !message.trim()) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    // Simple AI response logic (in production, this would call an actual AI service)
    let aiResponse = '';

    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('top') && lowerMessage.includes('customer')) {
      aiResponse = "I can help you with that! Try this query: 'Show me the top 10 customers by total revenue in the last 6 months'. This will analyze your sales data and rank customers by their total spending.";
    } else if (lowerMessage.includes('sales') || lowerMessage.includes('revenue')) {
      aiResponse = "To analyze sales trends, I recommend using a time-series query. You could try: 'Show me monthly sales trends for the past year with a comparison to last year'. This will give you insights into growth patterns.";
    } else if (lowerMessage.includes('slow') || lowerMessage.includes('performance')) {
      aiResponse = "If you're experiencing slow queries, here are some tips:\n\n1. Add indexes on frequently queried columns\n2. Limit result sets with WHERE clauses\n3. Avoid SELECT * and specify only needed columns\n4. Use query execution plans to identify bottlenecks\n\nWould you like me to analyze a specific query?";
    } else if (lowerMessage.includes('error') || lowerMessage.includes('fail')) {
      aiResponse = "I notice you're having issues. Let me help troubleshoot:\n\n1. Check your database connection status\n2. Verify table and column names\n3. Ensure proper data types in comparisons\n4. Review recent error logs in the Analytics section\n\nWhat specific error are you seeing?";
    } else if (lowerMessage.includes('help') || lowerMessage.includes('how')) {
      aiResponse = "I'm here to help! I can assist with:\n\n✨ Query suggestions and optimization\n📊 Data analysis and insights\n🔍 Troubleshooting errors\n💡 Best practices and tips\n\nWhat would you like to know more about?";
    } else {
      aiResponse = "That's an interesting question! Based on your databases and recent queries, I suggest exploring your data with some analytical queries. You can also ask me specific questions about:\n\n• Query optimization\n• Data patterns and trends\n• Performance improvements\n• Best practices\n\nHow can I help you specifically?";
    }

    logger.info(`AI chat message from user ${userId}: ${message.substring(0, 50)}...`);
    res.json({ message: aiResponse });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'Failed to process AI message' });
  }
});

// Get detailed advanced analytics
router.get('/advanced-analytics', async (_req: Request, res: Response): Promise<void> => {
  try {
    const userId = res.locals.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const client = DatabaseRouter.getClient();

    // Get all queries for analysis
    const allQueriesResult = await client.runSafeQuery(
      `SELECT 
        generated_sql,
        allowed,
        timestamp,
        natural_query
      FROM query_audit_log
      WHERE user_id = $1
      ORDER BY timestamp DESC`,
      [userId]
    );

    const totalQueries = allQueriesResult.rows.length;
    const successQueries = allQueriesResult.rows.filter(r => r.allowed).length;
    const failedQueries = totalQueries - successQueries;

    // Query complexity analysis
    const complexQueries = allQueriesResult.rows.filter(r => 
      r.generated_sql && r.generated_sql.length > 150
    ).length;
    const mediumQueries = allQueriesResult.rows.filter(r => 
      r.generated_sql && r.generated_sql.length > 50 && r.generated_sql.length <= 150
    ).length;
    const simpleQueries = totalQueries - complexQueries - mediumQueries;

    // Most common failure reasons
    const failureReasons = await client.runSafeQuery(
      `SELECT 
        error,
        COUNT(*) as count
      FROM query_audit_log
      WHERE user_id = $1 AND allowed = false AND error IS NOT NULL
      GROUP BY error
      ORDER BY count DESC
      LIMIT 5`,
      [userId]
    );

    // Peak usage times
    const peakHours = await client.runSafeQuery(
      `SELECT 
        EXTRACT(HOUR FROM timestamp) as hour,
        COUNT(*) as count
      FROM query_audit_log
      WHERE user_id = $1
      GROUP BY hour
      ORDER BY count DESC
      LIMIT 3`,
      [userId]
    );

    res.json({
      totalQueries,
      successQueries,
      failedQueries,
      successRate: totalQueries > 0 ? (successQueries / totalQueries * 100).toFixed(1) : 0,
      complexity: {
        simple: simpleQueries,
        medium: mediumQueries,
        complex: complexQueries,
      },
      failureReasons: failureReasons.rows,
      peakHours: peakHours.rows,
    });
  } catch (error) {
    console.error('Advanced analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch advanced analytics' });
  }
});

export default router;
