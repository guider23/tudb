// MUST load .env FIRST before any other imports
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Find the project root by looking for package.json
let envPath = path.join(__dirname, '../../.env');
if (!fs.existsSync(envPath)) {
  // If running from dist/, go up one more level
  envPath = path.join(__dirname, '../../../.env');
}

console.log('Loading .env from:', envPath);
console.log('File exists:', fs.existsSync(envPath));
dotenv.config({ path: envPath });
console.log('AWS_BEARER_TOKEN_BEDROCK loaded:', process.env.AWS_BEARER_TOKEN_BEDROCK ? 'YES' : 'NO');
console.log('ENCRYPTION_KEY loaded:', process.env.ENCRYPTION_KEY ? 'YES' : 'NO');

// NOW import everything else
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { queryRouter } from './routes/query';
import adminRouter from './routes/admin';
import agentRouter from './routes/agent';
import inspectRouter from './routes/inspect';
import { createLogger } from './logger';
import { DatabaseRouter } from '../../db/db_router';
import { clerkAuth, requireAuthentication, extractUserId } from './middleware/clerk-auth';

const app = express();
const logger = createLogger('backend');
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration - allow both HTTP and HTTPS for custom domain
const allowedOrigins = [
  'http://localhost:5173',
  'https://localhost:5173',
  'http://localhost:5174',
  'https://localhost:5174',
  process.env.FRONTEND_URL,
  'https://tudb.bcworks.in.net',
  'http://tudb.bcworks.in.net',
  'https://tudb-frontend.herokuapp.com',
  'http://tudb-frontend.herokuapp.com',
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      logger.warn(`Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(null, true); // Temporarily allow all for debugging
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// Clerk authentication middleware (must be before protected routes)
app.use(clerkAuth);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = Math.random().toString(36).substring(7);
  res.locals.requestId = requestId;
  logger.info(`[${requestId}] ${req.method} ${req.path}`);
  next();
});

// Health check (public)
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    provider: DatabaseRouter.getCurrentProvider(),
  });
});

// Public route for shared queries (no auth required)
app.get('/api/admin/shared/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const client = DatabaseRouter.getClient();
    
    // Get share info and increment view count
    const shareResult = await client.runSafeQuery(
      `SELECT qs.*, sq.name, sq.question, sq.sql, sq.folder
       FROM query_shares qs
       JOIN saved_queries sq ON qs.query_id = sq.id
       WHERE qs.share_token = $1
       AND (qs.expires_at IS NULL OR qs.expires_at > CURRENT_TIMESTAMP)`,
      [token]
    );

    if (shareResult.rows.length === 0) {
      res.status(404).json({ error: 'Shared query not found or expired' });
      return;
    }

    // Increment view count
    await client.runSafeQuery(
      'UPDATE query_shares SET view_count = view_count + 1 WHERE share_token = $1',
      [token]
    );

    res.json(shareResult.rows[0]);
  } catch (error) {
    console.error('Get shared query error:', error);
    res.status(500).json({ error: 'Failed to retrieve shared query' });
  }
});

// Protected routes (require Clerk authentication)
app.use('/api/query', requireAuthentication, extractUserId, queryRouter);
app.use('/api/admin', requireAuthentication, extractUserId, adminRouter);
app.use('/api/admin', requireAuthentication, extractUserId, agentRouter);
app.use('/api/inspect', requireAuthentication, extractUserId, inspectRouter);

// Serve static files from admin-dashboard build
// When compiled: __dirname = /app/backend/dist, so we need ../../../admin-dashboard/dist to get to /app/admin-dashboard/dist
const dashboardPath = path.resolve(__dirname, '../../../admin-dashboard/dist');
logger.info(`Serving static files from: ${dashboardPath}`);
app.use(express.static(dashboardPath));

// Serve index.html for all non-API routes (SPA support)
app.get('*', (_req: Request, res: Response) => {
  const indexPath = path.join(dashboardPath, 'index.html');
  logger.info(`Serving index.html from: ${indexPath}`);
  res.sendFile(indexPath);
});

// Error handling
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  const requestId = res.locals.requestId;
  logger.error(`[${requestId}] Error:`, err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Initialize
async function initialize() {
  try {
    await DatabaseRouter.connect();
    logger.info(`Database connected: ${DatabaseRouter.getCurrentProvider()}`);
    
    app.listen(PORT, () => {
      logger.info(`Backend server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
      logger.info(`FRONTEND_URL: ${process.env.FRONTEND_URL || 'not set'}`);
    });
  } catch (error) {
    logger.error('Failed to initialize:', error);
    process.exit(1);
  }
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

initialize().catch((error) => {
  logger.error('Failed to start:', error);
  process.exit(1);
});
