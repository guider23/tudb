import { BaseAgent, Tool } from './base_agent';
import { QueryService } from '../services/query_service';

export class QueryAgent extends BaseAgent {
  private queryService: QueryService;

  constructor() {
    super();
    this.queryService = new QueryService();
  }

  getSystemPrompt(): string {
    return `You are a SQL Query Expert Agent. Your role is to:
1. Translate natural language questions into precise SQL queries
2. Understand database schema and relationships
3. Generate optimized queries that return exactly what the user needs
4. Handle complex queries with joins, aggregations, and subqueries

Always generate valid SQL that follows best practices.
Use appropriate JOINs, WHERE clauses, and aggregations.
Consider performance implications of your queries.
Format the SQL query clearly and use proper indentation.`;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'get_database_schema',
        description: 'Get the complete database schema including tables, columns, data types, and primary keys. Call this first to understand the database structure.',
        input_schema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'generate_sql_query',
        description: 'Generate a SQL query based on natural language request. Use this after understanding the schema.',
        input_schema: {
          type: 'object',
          properties: {
            natural_language_query: {
              type: 'string',
              description: 'The natural language question to convert to SQL',
            },
            sql_query: {
              type: 'string',
              description: 'The generated SQL query',
            },
            explanation: {
              type: 'string',
              description: 'Brief explanation of what the query does',
            },
          },
          required: ['natural_language_query', 'sql_query', 'explanation'],
        },
      },
      {
        name: 'validate_sql_syntax',
        description: 'Validate SQL syntax before finalizing',
        input_schema: {
          type: 'object',
          properties: {
            sql: {
              type: 'string',
              description: 'SQL query to validate',
            },
          },
          required: ['sql'],
        },
      },
    ];
  }

  async executeToolUse(toolUse: any): Promise<any> {
    switch (toolUse.name) {
      case 'get_database_schema':
        const schema = await this.queryService.getSchema();
        return {
          success: true,
          schema,
          message: `Found ${schema.tables?.length || 0} tables in the database`,
        };

      case 'generate_sql_query':
        return {
          success: true,
          sql: toolUse.input.sql_query,
          natural_query: toolUse.input.natural_language_query,
          explanation: toolUse.input.explanation,
        };

      case 'validate_sql_syntax':
        const validation = await this.queryService.validateSQL(toolUse.input.sql);
        return {
          valid: validation.valid,
          errors: validation.errors,
          sql: toolUse.input.sql,
        };

      default:
        return { error: 'Unknown tool' };
    }
  }

  async generateQuery(naturalLanguageQuery: string): Promise<any> {
    const response = await this.run(
      `Generate a SQL query for this request: "${naturalLanguageQuery}". 
      
Steps:
1. First, get the database schema to understand available tables and columns
2. Then generate an optimized SQL query that answers the question
3. Validate the SQL syntax
4. Return the final SQL query with an explanation`
    );
    
    return response;
  }
}
