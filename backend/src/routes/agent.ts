import { Router, Request, Response } from 'express';
import { CoordinatorAgent } from '../agents/coordinator_agent';
import { createLogger } from '../logger';

const logger = createLogger('agent-routes');
const router = Router();

// Multi-agent processing endpoint
router.post('/agent/process', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = res.locals.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { message, connectionId } = req.body;

    if (!message || !message.trim()) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    if (!connectionId) {
      res.status(400).json({ error: 'Connection ID is required' });
      return;
    }

    logger.info(`[Multi-Agent] Processing request from user ${userId}: ${message.substring(0, 50)}...`);

    // Initialize coordinator
    const coordinator = new CoordinatorAgent();

    // Process request through multi-agent system
    const result = await coordinator.processUserRequest(message);

    logger.info(`[Multi-Agent] Request processed successfully for user ${userId}`);

    res.json({
      response: result.response,
      agents_used: result.agents_used,
      timestamp: result.timestamp,
    });
  } catch (error: any) {
    logger.error('[Multi-Agent] Error:', error);
    res.status(500).json({
      error: 'Failed to process request through multi-agent system',
      details: error.message,
    });
  }
});

// Get agent status
router.get('/agent/status', async (_req: Request, res: Response): Promise<void> => {
  try {
    res.json({
      status: 'operational',
      available_agents: [
        {
          name: 'Coordinator Agent',
          role: 'Task Orchestration',
          status: 'active',
          description: 'Coordinates all specialized agents',
        },
        {
          name: 'Query Agent',
          role: 'SQL Generation',
          status: 'active',
          description: 'Translates natural language to SQL',
        },
        {
          name: 'Security Agent',
          role: 'Query Validation',
          status: 'active',
          description: 'Validates queries for security threats',
        },
        {
          name: 'Optimization Agent',
          role: 'Performance Tuning',
          status: 'active',
          description: 'Optimizes queries for better performance',
        },
        {
          name: 'Analytics Agent',
          role: 'Data Insights',
          status: 'active',
          description: 'Analyzes results and generates insights',
        },
      ],
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get agent status',
      details: error.message,
    });
  }
});

// Get agent capabilities
router.get('/agent/capabilities', async (_req: Request, res: Response): Promise<void> => {
  res.json({
    capabilities: [
      'Natural language to SQL translation',
      'Security validation and threat detection',
      'Query optimization and performance tuning',
      'Data analysis and insight generation',
      'Visualization recommendations',
      'Anomaly detection',
      'Index suggestions',
      'Multi-step workflow orchestration',
    ],
    workflow: {
      standard: [
        '1. Query Agent generates SQL',
        '2. Security Agent validates safety',
        '3. Optimization Agent improves performance (if needed)',
        '4. Execute query',
        '5. Analytics Agent provides insights',
      ],
    },
  });
});

export default router;
