import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { DatabaseRouter } from '../../db/db_router';
import { createLogger } from './logger';

dotenv.config();

const app = express();
const logger = createLogger('mcp-tool-server');
const PORT = process.env.MCP_TOOL_SERVER_PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = Math.random().toString(36).substring(7);
  res.locals.requestId = requestId;
  logger.info(`[${requestId}] ${req.method} ${req.path}`);
  next();
});

// Initialize database connection
async function initializeDatabase() {
  try {
    await DatabaseRouter.connect();
    logger.info(`Database connected: ${DatabaseRouter.getCurrentProvider()}`);
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    process.exit(1);
  }
}

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    provider: DatabaseRouter.getCurrentProvider(),
    timestamp: new Date().toISOString(),
  });
});

// MCP Protocol: List available tools
app.get('/tools/list', (_req: Request, res: Response) => {
  const tools = [
    {
      name: 'list_tables',
      description: 'List all tables in the database',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'describe_table',
      description: 'Get detailed schema information about a specific table including columns, types, and constraints',
      inputSchema: {
        type: 'object',
        properties: {
          table: {
            type: 'string',
            description: 'Name of the table to describe',
          },
        },
        required: ['table'],
      },
    },
    {
      name: 'run_sql',
      description: 'Execute a read-only SQL query and return results. Only SELECT statements are allowed unless ADMIN_OVERRIDE is enabled.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'SQL query to execute',
          },
          max_rows: {
            type: 'number',
            description: 'Maximum number of rows to return (default: 100)',
            default: 100,
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'explain_query',
      description: 'Get an explanation of what a SQL query does without executing it',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'SQL query to explain',
          },
        },
        required: ['query'],
      },
    },
  ];

  res.json({
    jsonrpc: '2.0',
    result: { tools },
  });
});

// MCP Protocol: Call a tool
app.post('/tools/call', async (req: Request, res: Response) => {
  const { method, params } = req.body;
  const requestId = res.locals.requestId;

  try {
    const client = DatabaseRouter.getClient();
    let result: any;

    switch (method) {
      case 'list_tables':
        result = await handleListTables(client);
        break;

      case 'describe_table':
        if (!params?.table) {
          throw new Error('Parameter "table" is required');
        }
        result = await handleDescribeTable(client, params.table);
        break;

      case 'run_sql':
        if (!params?.query) {
          throw new Error('Parameter "query" is required');
        }
        result = await handleRunSQL(client, params.query, params.max_rows);
        break;

      case 'explain_query':
        if (!params?.query) {
          throw new Error('Parameter "query" is required');
        }
        result = await handleExplainQuery(client, params.query);
        break;

      default:
        throw new Error(`Unknown tool: ${method}`);
    }

    logger.info(`[${requestId}] Tool call successful: ${method}`);
    res.json({
      jsonrpc: '2.0',
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      },
    });
  } catch (error) {
    logger.error(`[${requestId}] Tool call failed:`, error);
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : 'Internal error',
      },
    });
  }
});

// Tool handlers
async function handleListTables(client: any) {
  const tables = await client.listTables();
  return {
    tables,
    count: tables.length,
  };
}

async function handleDescribeTable(client: any, tableName: string) {
  const description = await client.describeTable(tableName);
  return description;
}

async function handleRunSQL(client: any, query: string, maxRows: number = 100) {
  const result = await client.runSafeQuery(query);
  
  // Limit rows
  const rows = result.rows.slice(0, maxRows);
  
  return {
    rows,
    rowCount: rows.length,
    totalRows: result.rowCount,
    fields: result.fields.map((f: any) => ({
      name: f.name,
      dataType: f.dataTypeID,
    })),
    truncated: result.rowCount > maxRows,
  };
}

async function handleExplainQuery(client: any, query: string) {
  const explanation = await client.explainQuery(query);
  return {
    query,
    explanation,
  };
}

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Start server
async function start() {
  await initializeDatabase();
  
  app.listen(PORT, () => {
    logger.info(`MCP Tool Server running on port ${PORT}`);
    logger.info(`Provider: ${DatabaseRouter.getCurrentProvider()}`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await DatabaseRouter.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await DatabaseRouter.disconnect();
  process.exit(0);
});

start().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});
