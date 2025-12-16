import { BaseAgent, Tool } from './base_agent';
import { QueryAgent } from './query_agent';
import { SecurityAgent } from './security_agent';
import { OptimizationAgent } from './optimization_agent';
import { AnalyticsAgent } from './analytics_agent';
import { QueryService } from '../services/query_service';

export class CoordinatorAgent extends BaseAgent {
  private queryAgent: QueryAgent;
  private securityAgent: SecurityAgent;
  private optimizationAgent: OptimizationAgent;
  private analyticsAgent: AnalyticsAgent;
  private queryService: QueryService;

  constructor() {
    super();
    this.queryAgent = new QueryAgent();
    this.securityAgent = new SecurityAgent();
    this.optimizationAgent = new OptimizationAgent();
    this.analyticsAgent = new AnalyticsAgent();
    this.queryService = new QueryService();
  }

  getSystemPrompt(): string {
    return `You are the Coordinator Agent managing a team of specialized AI agents for database query operations.

Your team:
1. **Query Agent** - Translates natural language to SQL, understands database schema
2. **Security Agent** - Validates queries for security, checks permissions, detects threats
3. **Optimization Agent** - Optimizes queries for performance, suggests indexes
4. **Analytics Agent** - Analyzes results, generates insights, suggests visualizations

STANDARD WORKFLOW:
1. Query Agent generates SQL from natural language
2. Security Agent validates the SQL for safety
3. (Optional) Optimization Agent optimizes if query is complex
4. Execute the query
5. Analytics Agent analyzes results and provides insights

RULES:
- Security Agent MUST validate every query before execution
- For complex queries (joins, subqueries), consult Optimization Agent
- Always use Analytics Agent to provide insights on results
- Be transparent about which agents you're using
- If a query is unsafe, explain why and suggest alternatives

Coordinate efficiently and provide comprehensive responses.`;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'delegate_to_query_agent',
        description: 'Delegate SQL generation task to Query Agent. Use this to convert natural language to SQL.',
        input_schema: {
          type: 'object',
          properties: {
            natural_language_query: {
              type: 'string',
              description: 'Natural language question to convert to SQL',
            },
          },
          required: ['natural_language_query'],
        },
      },
      {
        name: 'delegate_to_security_agent',
        description: 'Delegate security validation to Security Agent. ALWAYS use this before executing any query.',
        input_schema: {
          type: 'object',
          properties: {
            sql: {
              type: 'string',
              description: 'SQL query to validate for security',
            },
          },
          required: ['sql'],
        },
      },
      {
        name: 'delegate_to_optimization_agent',
        description: 'Delegate query optimization to Optimization Agent. Use for complex queries.',
        input_schema: {
          type: 'object',
          properties: {
            sql: {
              type: 'string',
              description: 'SQL query to optimize',
            },
          },
          required: ['sql'],
        },
      },
      {
        name: 'execute_query',
        description: 'Execute the SQL query after it has been validated and optionally optimized.',
        input_schema: {
          type: 'object',
          properties: {
            sql: {
              type: 'string',
              description: 'SQL query to execute',
            },
          },
          required: ['sql'],
        },
      },
      {
        name: 'delegate_to_analytics_agent',
        description: 'Delegate data analysis to Analytics Agent. Use after query execution to provide insights.',
        input_schema: {
          type: 'object',
          properties: {
            query_results: {
              type: 'array',
              description: 'Query results to analyze',
            },
            row_count: {
              type: 'number',
              description: 'Number of rows returned',
            },
            context: {
              type: 'string',
              description: 'Context about what the user was looking for',
            },
          },
          required: ['query_results', 'context'],
        },
      },
    ];
  }

  async executeToolUse(toolUse: any): Promise<any> {
    console.log(`[Coordinator] Delegating to ${toolUse.name}...`);

    try {
      switch (toolUse.name) {
        case 'delegate_to_query_agent':
          console.log('[Coordinator] → Query Agent');
          const sqlResult = await this.queryAgent.generateQuery(
            toolUse.input.natural_language_query
          );
          return {
            agent: 'Query Agent',
            result: sqlResult,
            success: true,
          };

        case 'delegate_to_security_agent':
          console.log('[Coordinator] → Security Agent');
          const securityResult = await this.securityAgent.validateQuery(toolUse.input.sql);
          return {
            agent: 'Security Agent',
            result: securityResult,
            success: true,
          };

        case 'delegate_to_optimization_agent':
          console.log('[Coordinator] → Optimization Agent');
          const optimizationResult = await this.optimizationAgent.optimizeQuery(
            toolUse.input.sql
          );
          return {
            agent: 'Optimization Agent',
            result: optimizationResult,
            success: true,
          };

        case 'execute_query':
          console.log('[Coordinator] Executing query...');
          const executeResult = await this.queryService.executeQuery(
            toolUse.input.sql
          );
          return {
            agent: 'Query Executor',
            result: executeResult,
            success: executeResult.success,
          };

        case 'delegate_to_analytics_agent':
          console.log('[Coordinator] → Analytics Agent');
          const analyticsResult = await this.analyticsAgent.analyzeResults(
            toolUse.input.query_results || [],
            toolUse.input.context || '',
            toolUse.input.row_count || 0
          );
          return {
            agent: 'Analytics Agent',
            result: analyticsResult,
            success: true,
          };

        default:
          return { error: 'Unknown tool', success: false };
      }
    } catch (error: any) {
      console.error(`[Coordinator] Error in ${toolUse.name}:`, error.message);
      return {
        agent: toolUse.name,
        error: error.message,
        success: false,
      };
    }
  }

  async processUserRequest(userRequest: string): Promise<any> {
    console.log('[Coordinator] Processing user request:', userRequest);

    const prompt = `User request: "${userRequest}"

Execute the standard multi-agent workflow:

1. Use Query Agent to generate SQL from the natural language request
2. Use Security Agent to validate the generated SQL (REQUIRED)
3. If query is complex (has JOINs or subqueries), use Optimization Agent to optimize it
4. Execute the query using execute_query tool
5. Use Analytics Agent to analyze the results and provide insights

Coordinate these agents efficiently and provide a comprehensive response to the user.`;

    const response = await this.run(prompt);
    
    return {
      response,
      agents_used: ['Coordinator', 'Query', 'Security', 'Optimization', 'Analytics'],
      timestamp: new Date().toISOString(),
    };
  }
}
