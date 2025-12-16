import { Router, Request, Response } from 'express';
import { BedrockClient } from '../services/bedrock_client';
import { MCPToolClient } from '../services/mcp_client';
import { SQLValidator } from '../safety/sql_validator';
import { AuditLogger } from '../services/audit_logger';
import { createLogger } from '../logger';
import { DatabaseRouter } from '../../../db/db_router';
import crypto from 'crypto';

const router = Router();
const logger = createLogger('query-route');
const bedrockClient = new BedrockClient();
const sqlValidator = new SQLValidator();
const auditLogger = new AuditLogger();

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

// Helper to get user settings from database
async function getUserSettings(userId: string) {
  const client = DatabaseRouter.getClient();
  const result = await client.runSafeQuery(
    'SELECT * FROM system_settings WHERE user_id = $1',
    [userId]
  );
  
  if (result.rows.length === 0) {
    // Return defaults if no settings exist
    return {
      allow_destructive_ops: false,
      require_approval: true,
      max_row_limit: 1000,
      query_timeout: 30000,
      enable_audit_log: true,
    };
  }
  
  return result.rows[0];
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const requestId = res.locals.requestId;
  const userId = res.locals.userId; // From Clerk authentication
  const { question, session_id } = req.body;

  if (!question) {
    res.status(400).json({
      error: 'Missing required field: question',
    });
    return;
  }

  logger.info(`[${requestId}] Query from user ${userId}: ${question}`);

  let userDbClient: any = null;

  try {
    // Step 0: Get user's settings from database
    const userSettings = await getUserSettings(userId);
    logger.info(`[${requestId}] User settings: maxRows=${userSettings.max_row_limit}, timeout=${userSettings.query_timeout}ms, destructive=${userSettings.allow_destructive_ops}`);
    
    // Step 1: Get user's active connection
    const activeConnection = await getUserActiveConnection(userId);
    
    if (!activeConnection) {
      res.status(400).json({
        error: 'No active database connection. Please add and activate a connection in the Connections page.',
      });
      return;
    }

    // Step 2: Create database client for user's connection
    logger.info(`[${requestId}] Decrypted connection string: ${activeConnection.connectionString.substring(0, 50)}...`);
    
    userDbClient = DatabaseRouter.createClient(
      activeConnection.provider,
      activeConnection.connectionString
    );
    
    // Connect to the user's database
    await userDbClient.connect();
    logger.info(`[${requestId}] Connected to user's ${activeConnection.provider} database`);
    
    // Step 3: Create MCP client with user's database
    const mcpClient = new MCPToolClient(userDbClient);
    
    // Step 4: Get schema information via MCP tools
    const tables = await mcpClient.listTables();
    logger.info(`[${requestId}] Found ${tables.length} tables`);

    // Step 5: Let LLM decide which tables to describe based on the question
    const schemaContext = await buildSchemaContext(tables, question, requestId, mcpClient);

    // Step 6: Send to Bedrock with tool definitions
    const llmResponse = await bedrockClient.query(question, schemaContext, requestId);

    // Step 7: Handle LLM response
    if (llmResponse.clarify) {
      // LLM needs clarification
      await auditLogger.log({
        user_id: userId,
        connection_id: activeConnection.id,
        session_id,
        question,
        generated_sql: null,
        allowed: true,
        result_count: 0,
        status: 'clarification_needed',
        clarification: llmResponse.clarify,
      });

      res.json({
        status: 'clarification_needed',
        message: llmResponse.clarify,
      });
      return;
    }

    if (llmResponse.tool === 'run_sql') {
      const sql = llmResponse.input.query;
      // Apply user's max row limit setting
      const requestedRows = llmResponse.input.max_rows || 100;
      const maxRows = Math.min(requestedRows, userSettings.max_row_limit);
      logger.info(`[${requestId}] Limiting results to ${maxRows} rows (user max: ${userSettings.max_row_limit})`);

      // Step 8: Validate SQL safety
      const validation = sqlValidator.validate(sql);
      
      // Check if query is destructive and user has permission
      if (validation.isDestructive && !userSettings.allow_destructive_ops) {
        logger.warn(`[${requestId}] Destructive operation blocked for user ${userId}`);
        
        if (userSettings.enable_audit_log) {
          await auditLogger.log({
            user_id: userId,
            connection_id: activeConnection.id,
            session_id,
            question,
            generated_sql: sql,
            allowed: false,
            result_count: 0,
            status: 'blocked',
            error: 'Destructive operations are disabled in your settings',
          });
        }

        res.status(403).json({
          status: 'blocked',
          error: 'Destructive operations (INSERT, UPDATE, DELETE, DROP, etc.) are disabled in your settings.',
          suggestion: 'Enable "Allow Destructive Operations" in Settings to execute this query.',
        });
        return;
      }
      
      if (!validation.isValid) {
        logger.warn(`[${requestId}] SQL validation failed: ${validation.error}`);
        
        if (userSettings.enable_audit_log) {
          await auditLogger.log({
            user_id: userId,
            connection_id: activeConnection.id,
            session_id,
            question,
            generated_sql: sql,
            allowed: false,
            result_count: 0,
            status: 'blocked',
            error: validation.error,
          });
        }

        res.status(403).json({
          status: 'blocked',
          error: validation.error,
          suggestion: validation.suggestion,
        });
        return;
      }

      // Step 8.5: Check if manual approval is required
      if (userSettings.require_approval) {
        logger.info(`[${requestId}] Manual approval required - returning SQL for review`);
        
        // Get explanation before returning for approval
        const explanation = await mcpClient.explainQuery(sql);
        
        res.json({
          status: 'approval_required',
          query: sql,
          question,
          explanation,
          isDestructive: validation.isDestructive,
          estimatedRows: maxRows,
        });
        return;
      }

      // Step 9: Execute query via MCP tool with timeout
      logger.info(`[${requestId}] Executing query with ${userSettings.query_timeout}ms timeout`);
      const queryResult = await Promise.race([
        mcpClient.runSQL(sql, maxRows),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout exceeded')), userSettings.query_timeout)
        )
      ]);

      // Step 10: Get explanation
      const explanation = await mcpClient.explainQuery(sql);

      // Step 11: Generate natural language summary
      const summary = await bedrockClient.generateSummary(
        question,
        sql,
        queryResult,
        explanation,
        requestId
      );

      // Step 12: Log to audit (if enabled)
      if (userSettings.enable_audit_log) {
        await auditLogger.log({
          user_id: userId,
          connection_id: activeConnection.id,
          session_id,
          question,
          generated_sql: sql,
          allowed: true,
          result_count: queryResult.rowCount,
          status: 'success',
        });
      }

      logger.info(`[${requestId}] Query executed successfully: ${queryResult.rowCount} rows`);

      res.json({
        status: 'success',
        query: sql,
        results: queryResult.rows,
        rowCount: queryResult.rowCount,
        truncated: queryResult.truncated,
        explanation: explanation,
        summary: summary,
      });
      return;
    }

    // Unknown response format
    throw new Error('Unexpected LLM response format');

  } catch (error) {
    logger.error(`[${requestId}] Query failed: ${error instanceof Error ? error.message : String(error)}`, {
      stack: error instanceof Error ? error.stack : undefined
    });

    await auditLogger.log({
      user_id: userId,
      connection_id: null,
      session_id,
      question,
      generated_sql: null,
      allowed: false,
      result_count: 0,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return;
  } finally {
    // Always disconnect from user's database when done
    if (userDbClient) {
      try {
        await userDbClient.disconnect();
        logger.info(`[${requestId}] Disconnected from user's database`);
      } catch (disconnectError) {
        logger.warn(`[${requestId}] Error during disconnect:`, disconnectError);
      }
    }
  }
});

// Approval endpoint - execute pre-approved SQL
router.post('/approve', async (req: Request, res: Response): Promise<void> => {
  const requestId = res.locals.requestId;
  const userId = res.locals.userId;
  const { sql, question, session_id } = req.body;

  if (!sql || !question) {
    res.status(400).json({
      error: 'Missing required fields: sql and question',
    });
    return;
  }

  logger.info(`[${requestId}] User ${userId} approved query execution`);

  let userDbClient: any = null;

  try {
    // Get user's settings and active connection
    const userSettings = await getUserSettings(userId);
    const activeConnection = await getUserActiveConnection(userId);
    
    if (!activeConnection) {
      res.status(400).json({
        error: 'No active database connection',
      });
      return;
    }

    // Connect to user's database
    userDbClient = DatabaseRouter.createClient(
      activeConnection.provider,
      activeConnection.connectionString
    );
    await userDbClient.connect();
    
    const mcpClient = new MCPToolClient(userDbClient);
    
    // Apply max row limit
    const maxRows = userSettings.max_row_limit || 1000;
    
    // Execute query with timeout
    logger.info(`[${requestId}] Executing approved query with ${userSettings.query_timeout}ms timeout`);
    const queryResult = await Promise.race([
      mcpClient.runSQL(sql, maxRows),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout exceeded')), userSettings.query_timeout)
      )
    ]);

    // Get explanation
    const explanation = await mcpClient.explainQuery(sql);

    // Generate summary
    const summary = await bedrockClient.generateSummary(
      question,
      sql,
      queryResult,
      explanation,
      requestId
    );

    // Log to audit
    if (userSettings.enable_audit_log) {
      await auditLogger.log({
        user_id: userId,
        connection_id: activeConnection.id,
        session_id,
        question,
        generated_sql: sql,
        allowed: true,
        result_count: queryResult.rowCount,
        status: 'success',
      });
    }

    logger.info(`[${requestId}] Approved query executed successfully: ${queryResult.rowCount} rows`);

    res.json({
      status: 'success',
      query: sql,
      results: queryResult.rows,
      rowCount: queryResult.rowCount,
      truncated: queryResult.truncated,
      explanation: explanation,
      summary: summary,
      executionTime: queryResult.executionTime || 0,
    });
    return;

  } catch (error) {
    logger.error(`[${requestId}] Approved query failed: ${error instanceof Error ? error.message : String(error)}`);

    await auditLogger.log({
      user_id: userId,
      connection_id: null,
      session_id,
      question,
      generated_sql: sql,
      allowed: true,
      result_count: 0,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Query execution failed',
    });
    return;
  } finally {
    if (userDbClient) {
      try {
        await userDbClient.disconnect();
        logger.info(`[${requestId}] Disconnected from user's database`);
      } catch (disconnectError) {
        logger.warn(`[${requestId}] Error during disconnect:`, disconnectError);
      }
    }
  }
});

async function buildSchemaContext(
  tables: string[],
  question: string,
  requestId: string,
  mcpClient: MCPToolClient
): Promise<string> {
  // Simple heuristic: describe tables mentioned in the question
  // or describe all if question is general
  const lowerQuestion = question.toLowerCase();
  const relevantTables = tables.filter(
    (table) => lowerQuestion.includes(table.toLowerCase())
  );

  const tablesToDescribe = relevantTables.length > 0 
    ? relevantTables 
    : tables.slice(0, 5); // Describe first 5 tables if no specific mention

  logger.info(`[${requestId}] Describing tables: ${tablesToDescribe.join(', ')}`);

  const descriptions = await Promise.all(
    tablesToDescribe.map(async (table) => {
      const desc = await mcpClient.describeTable(table);
      return {
        table,
        columns: desc.columns.map((c: any) => `${c.columnName} (${c.dataType})`).join(', '),
        primaryKeys: desc.primaryKeys.join(', '),
        foreignKeys: desc.foreignKeys.map(
          (fk: any) => `${fk.columnName} -> ${fk.referencedTable}.${fk.referencedColumn}`
        ),
      };
    })
  );

  return JSON.stringify({ tables: descriptions }, null, 2);
}

// Explain query results endpoint
router.post('/explain', async (req: Request, res: Response): Promise<void> => {
  const requestId = res.locals.requestId;
  const userId = res.locals.userId;
  const { question, results, columns } = req.body;

  if (!question || !results || !columns) {
    res.status(400).json({
      error: 'Missing required fields: question, results, columns',
    });
    return;
  }

  logger.info(`[${requestId}] Explain request from user ${userId}: ${question}`);

  try {
    logger.info(`[${requestId}] Sending explanation request to Bedrock`);
    const explanation = await bedrockClient.generateExplanation(question, results, columns, requestId);
    
    logger.info(`[${requestId}] Explanation generated successfully`);
    
    res.json({
      explanation,
      rowCount: results.length,
    });
  } catch (error: any) {
    logger.error(`[${requestId}] Error generating explanation:`, error);
    res.status(500).json({
      error: 'Failed to generate explanation',
      message: error.message,
    });
  }
});

export { router as queryRouter };
