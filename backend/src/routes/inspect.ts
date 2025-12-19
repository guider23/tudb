import { Router, Request, Response } from 'express';
import { createLogger } from '../logger';
import { DatabaseRouter } from '../../../db/db_router';
import crypto from 'crypto';

const router = Router();
const logger = createLogger('inspect-route');

const ALGORITHM = 'aes-256-cbc';

function decryptConnectionString(encrypted: string): string {
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is not configured');
  }
  const parts = encrypted.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function getUserActiveConnection(userId: string) {
  const client = DatabaseRouter.getClient();
  
  const result = await client.runSafeQuery(
    'SELECT id, provider, connection_string FROM user_connections WHERE user_id = $1 AND is_active = true LIMIT 1',
    [userId]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return {
    id: result.rows[0].id,
    provider: result.rows[0].provider,
    connectionString: decryptConnectionString(result.rows[0].connection_string),
  };
}

// GET /api/inspect/tables - List all tables in active database
router.get('/tables', async (req: Request, res: Response): Promise<void> => {
  const requestId = res.locals.requestId;
  const userId = res.locals.userId;

  logger.info(`[${requestId}] List tables request from user ${userId}`);

  try {
    const activeConnection = await getUserActiveConnection(userId);
    
    if (!activeConnection) {
      res.status(400).json({
        error: 'No active database connection. Please add and activate a connection.',
      });
      return;
    }

    const userDbClient = DatabaseRouter.createClient(
      activeConnection.provider,
      activeConnection.connectionString
    );

    await userDbClient.connect();

    // Detect if MySQL or PostgreSQL
    const isMySQL = ['mysql', 'localmysql', 'planetscale', 'azuremysql', 'googlecloudsqlmysql', 
                     'digitaloceanmysql', 'aivenmysql', 'auroramysql'].includes(activeConnection.provider);

    let tablesQuery: string;
    if (isMySQL) {
      tablesQuery = 'SHOW TABLES';
    } else {
      tablesQuery = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name";
    }

    const result = await userDbClient.runSafeQuery(tablesQuery, []);
    await userDbClient.disconnect();

    // Normalize response
    let tables: string[];
    if (isMySQL) {
      const dbName = activeConnection.connectionString.split('/').pop()?.split('?')[0] || 'database';
      tables = result.rows.map((row: any) => row[`Tables_in_${dbName}`] || Object.values(row)[0]);
    } else {
      tables = result.rows.map((row: any) => row.table_name);
    }

    res.json({ tables });

  } catch (error: any) {
    logger.error(`[${requestId}] Error listing tables:`, error);
    res.status(500).json({
      error: 'Failed to list tables',
      details: error.message,
    });
  }
});

// GET /api/inspect/table/:tableName - Get table data with schema
router.get('/table/:tableName', async (req: Request, res: Response): Promise<void> => {
  const requestId = res.locals.requestId;
  const userId = res.locals.userId;
  const { tableName } = req.params;
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;

  logger.info(`[${requestId}] Get table data: ${tableName} (limit: ${limit}, offset: ${offset})`);

  try {
    const activeConnection = await getUserActiveConnection(userId);
    
    if (!activeConnection) {
      res.status(400).json({
        error: 'No active database connection.',
      });
      return;
    }

    const userDbClient = DatabaseRouter.createClient(
      activeConnection.provider,
      activeConnection.connectionString
    );

    await userDbClient.connect();

    const isMySQL = ['mysql', 'localmysql', 'planetscale', 'azuremysql', 'googlecloudsqlmysql', 
                     'digitaloceanmysql', 'aivenmysql', 'auroramysql'].includes(activeConnection.provider);

    // Get table schema to identify primary keys and column types
    let schemaQuery: string;
    let schemaResult: any;

    if (isMySQL) {
      schemaQuery = `
        SELECT 
          COLUMN_NAME as column_name,
          DATA_TYPE as data_type,
          COLUMN_KEY as column_key,
          IS_NULLABLE as is_nullable
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = ? 
        ORDER BY ORDINAL_POSITION
      `;
      schemaResult = await userDbClient.runSafeQuery(schemaQuery, [tableName]);
    } else {
      schemaQuery = `
        SELECT 
          c.column_name,
          c.data_type,
          c.is_nullable,
          CASE WHEN pk.column_name IS NOT NULL THEN 'PRI' ELSE '' END as column_key
        FROM information_schema.columns c
        LEFT JOIN (
          SELECT ku.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage ku
            ON tc.constraint_name = ku.constraint_name
            AND tc.table_schema = ku.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_name = $1
            AND tc.table_schema = 'public'
        ) pk ON c.column_name = pk.column_name
        WHERE c.table_name = $1 
          AND c.table_schema = 'public'
        ORDER BY c.ordinal_position
      `;
      schemaResult = await userDbClient.runSafeQuery(schemaQuery, [tableName]);
    }

    const schema = schemaResult.rows.map((row: any) => ({
      name: row.column_name,
      type: row.data_type,
      isPrimaryKey: row.column_key === 'PRI',
      isNullable: row.is_nullable === 'YES',
    }));

    // Get table data
    const dataQuery = `SELECT * FROM ${tableName} LIMIT ${limit} OFFSET ${offset}`;
    const dataResult = await userDbClient.runSafeQuery(dataQuery, []);

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM ${tableName}`;
    const countResult = await userDbClient.runSafeQuery(countQuery, []);
    const total = parseInt(countResult.rows[0].total || countResult.rows[0].COUNT);

    await userDbClient.disconnect();

    res.json({
      tableName,
      schema,
      data: dataResult.rows,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    });

  } catch (error: any) {
    logger.error(`[${requestId}] Error getting table data:`, error);
    res.status(500).json({
      error: 'Failed to get table data',
      details: error.message,
    });
  }
});

// PUT /api/inspect/table/:tableName - Update row data
router.put('/table/:tableName', async (req: Request, res: Response): Promise<void> => {
  const requestId = res.locals.requestId;
  const userId = res.locals.userId;
  const { tableName } = req.params;
  const { primaryKey, updates } = req.body;

  if (!primaryKey || !updates || Object.keys(updates).length === 0) {
    res.status(400).json({
      error: 'Missing required fields: primaryKey and updates',
    });
    return;
  }

  logger.info(`[${requestId}] Update row in ${tableName}: ${JSON.stringify(primaryKey)}`);

  try {
    const activeConnection = await getUserActiveConnection(userId);
    
    if (!activeConnection) {
      res.status(400).json({
        error: 'No active database connection.',
      });
      return;
    }

    const userDbClient = DatabaseRouter.createClient(
      activeConnection.provider,
      activeConnection.connectionString
    );

    await userDbClient.connect();

    const isMySQL = ['mysql', 'localmysql', 'planetscale', 'azuremysql', 'googlecloudsqlmysql', 
                     'digitaloceanmysql', 'aivenmysql', 'auroramysql'].includes(activeConnection.provider);

    // Build UPDATE query
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;

    // Add update values
    for (const [column, value] of Object.entries(updates)) {
      if (isMySQL) {
        setClauses.push(`${column} = ?`);
      } else {
        setClauses.push(`${column} = $${paramCounter++}`);
      }
      values.push(value);
    }

    // Build WHERE clause for primary key
    const whereClauses: string[] = [];
    for (const [column, value] of Object.entries(primaryKey)) {
      if (isMySQL) {
        whereClauses.push(`${column} = ?`);
      } else {
        whereClauses.push(`${column} = $${paramCounter++}`);
      }
      values.push(value);
    }

    const updateQuery = `
      UPDATE ${tableName}
      SET ${setClauses.join(', ')}
      WHERE ${whereClauses.join(' AND ')}
    `;

    logger.info(`[${requestId}] Executing update: ${updateQuery}`);
    
    const result = await userDbClient.runSafeQuery(updateQuery, values);
    await userDbClient.disconnect();

    res.json({
      success: true,
      message: 'Row updated successfully',
      rowsAffected: result.rowCount || 1,
    });

  } catch (error: any) {
    logger.error(`[${requestId}] Error updating row:`, error);
    res.status(500).json({
      error: 'Failed to update row',
      details: error.message,
    });
  }
});

export default router;
