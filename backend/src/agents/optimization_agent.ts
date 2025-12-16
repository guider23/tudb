import { BaseAgent, Tool } from './base_agent';

export class OptimizationAgent extends BaseAgent {
  getSystemPrompt(): string {
    return `You are a SQL Query Optimization Expert Agent. Your role is to:
1. Analyze query execution plans and performance
2. Suggest index improvements for faster queries
3. Optimize JOIN operations and query structure
4. Reduce query complexity and improve efficiency
5. Provide measurable performance improvements

Focus on practical optimizations that have real impact.
Consider both read and write performance.
Explain the reasoning behind each optimization.`;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'analyze_query_complexity',
        description: 'Analyze the complexity and performance characteristics of a SQL query',
        input_schema: {
          type: 'object',
          properties: {
            sql: {
              type: 'string',
              description: 'SQL query to analyze',
            },
          },
          required: ['sql'],
        },
      },
      {
        name: 'suggest_indexes',
        description: 'Suggest database indexes to improve query performance',
        input_schema: {
          type: 'object',
          properties: {
            sql: {
              type: 'string',
              description: 'SQL query to optimize',
            },
            tables_involved: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tables used in the query',
            },
            index_suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  table: { type: 'string' },
                  column: { type: 'string' },
                  reason: { type: 'string' },
                },
              },
              description: 'List of index suggestions',
            },
          },
          required: ['sql'],
        },
      },
      {
        name: 'rewrite_query',
        description: 'Rewrite query for better performance while maintaining same results',
        input_schema: {
          type: 'object',
          properties: {
            original_sql: {
              type: 'string',
              description: 'Original SQL query',
            },
            optimized_sql: {
              type: 'string',
              description: 'Optimized version of the query',
            },
            improvements: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of specific improvements made',
            },
            expected_speedup: {
              type: 'string',
              description: 'Estimated performance improvement',
            },
          },
          required: ['original_sql', 'optimized_sql', 'improvements'],
        },
      },
    ];
  }

  async executeToolUse(toolUse: any): Promise<any> {
    switch (toolUse.name) {
      case 'analyze_query_complexity':
        const sql = toolUse.input.sql;
        const hasJoins = sql.toUpperCase().includes('JOIN');
        const hasSubquery = sql.includes('(SELECT');
        const hasAggregation = /COUNT|SUM|AVG|MAX|MIN/i.test(sql);
        
        let complexity = 'Simple';
        if (hasSubquery || (hasJoins && hasAggregation)) complexity = 'Complex';
        else if (hasJoins || hasAggregation) complexity = 'Moderate';
        
        return {
          complexity,
          has_joins: hasJoins,
          has_subqueries: hasSubquery,
          has_aggregations: hasAggregation,
          estimated_cost: complexity === 'Complex' ? 'High' : complexity === 'Moderate' ? 'Medium' : 'Low',
        };

      case 'suggest_indexes':
        return {
          sql: toolUse.input.sql,
          tables_involved: toolUse.input.tables_involved || [],
          index_suggestions: toolUse.input.index_suggestions || [],
          message: 'Index suggestions generated based on query pattern',
        };

      case 'rewrite_query':
        return {
          original: toolUse.input.original_sql,
          optimized: toolUse.input.optimized_sql,
          improvements: toolUse.input.improvements || [],
          expected_speedup: toolUse.input.expected_speedup || 'Moderate improvement',
          timestamp: new Date().toISOString(),
        };

      default:
        return { error: 'Unknown tool' };
    }
  }

  async optimizeQuery(sql: string): Promise<any> {
    const response = await this.run(
      `Optimize this SQL query for better performance:

\`\`\`sql
${sql}
\`\`\`

Steps:
1. Analyze the query complexity and identify bottlenecks
2. Suggest relevant indexes if needed
3. Rewrite the query if optimizations are possible
4. Provide a summary of improvements

Focus on practical optimizations that improve performance.`
    );

    return response;
  }
}
