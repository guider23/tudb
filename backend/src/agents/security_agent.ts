import { BaseAgent, Tool } from './base_agent';
import { SQLValidator } from '../safety/sql_validator';

export class SecurityAgent extends BaseAgent {
  private validator: SQLValidator;

  constructor() {
    super();
    this.validator = new SQLValidator();
  }

  getSystemPrompt(): string {
    return `You are a Database Security Expert Agent. Your role is to:
1. Detect SQL injection attempts and malicious queries
2. Validate queries against security policies
3. Check for potentially destructive operations
4. Identify suspicious query patterns
5. Flag security risks before execution

Always prioritize security and data integrity.
Block any query that could compromise security.
Provide clear explanations when blocking queries.
Allow safe SELECT queries that don't modify data.`;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'check_sql_injection',
        description: 'Scan SQL query for injection attempts and malicious patterns',
        input_schema: {
          type: 'object',
          properties: {
            sql: {
              type: 'string',
              description: 'SQL query to check',
            },
          },
          required: ['sql'],
        },
      },
      {
        name: 'validate_permissions',
        description: 'Check if query operation is allowed based on user permissions',
        input_schema: {
          type: 'object',
          properties: {
            sql: {
              type: 'string',
              description: 'SQL query to validate',
            },
            operation_type: {
              type: 'string',
              description: 'Type of operation (SELECT, INSERT, UPDATE, DELETE, etc)',
            },
          },
          required: ['sql', 'operation_type'],
        },
      },
      {
        name: 'detect_destructive_operations',
        description: 'Identify if query contains destructive operations (DELETE, DROP, TRUNCATE)',
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
        name: 'final_security_verdict',
        description: 'Provide final security verdict after all checks',
        input_schema: {
          type: 'object',
          properties: {
            sql: {
              type: 'string',
              description: 'SQL query being evaluated',
            },
            is_safe: {
              type: 'boolean',
              description: 'Whether the query is safe to execute',
            },
            risk_level: {
              type: 'string',
              description: 'Risk level: LOW, MEDIUM, HIGH, CRITICAL',
            },
            reason: {
              type: 'string',
              description: 'Explanation of the security verdict',
            },
          },
          required: ['sql', 'is_safe', 'risk_level', 'reason'],
        },
      },
    ];
  }

  async executeToolUse(toolUse: any): Promise<any> {
    switch (toolUse.name) {
      case 'check_sql_injection':
        const validation = this.validator.validate(toolUse.input.sql);
        return {
          is_safe: validation.isValid,
          threats: validation.isDestructive ? ['Destructive operation'] : [],
          risk_level: validation.isValid ? 'LOW' : 'HIGH',
          message: validation.error || 'Query validated',
        };

      case 'validate_permissions':
        const operationType = toolUse.input.operation_type.toUpperCase();
        const destructiveOps = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER'];
        const isDestructive = destructiveOps.includes(operationType);
        
        return {
          allowed: !isDestructive, // By default, only allow read operations
          operation: operationType,
          is_destructive: isDestructive,
          message: isDestructive 
            ? 'Destructive operations are not allowed by default'
            : 'Read operation is permitted',
        };

      case 'detect_destructive_operations':
        const sqlUpper = toolUse.input.sql.toUpperCase();
        const destructiveKeywords = ['DELETE', 'DROP', 'TRUNCATE', 'ALTER', 'INSERT', 'UPDATE'];
        const foundOps = destructiveKeywords.filter(op => sqlUpper.includes(op));
        
        return {
          is_destructive: foundOps.length > 0,
          operations_found: foundOps,
          message: foundOps.length > 0 
            ? `Destructive operations detected: ${foundOps.join(', ')}`
            : 'No destructive operations found',
        };

      case 'final_security_verdict':
        return {
          sql: toolUse.input.sql,
          is_safe: toolUse.input.is_safe,
          risk_level: toolUse.input.risk_level,
          reason: toolUse.input.reason,
          timestamp: new Date().toISOString(),
        };

      default:
        return { error: 'Unknown tool' };
    }
  }

  async validateQuery(sql: string): Promise<{ safe: boolean; reason: string; risk_level: string }> {
    const response = await this.run(
      `Validate this SQL query for security: 

\`\`\`sql
${sql}
\`\`\`

Perform these checks:
1. Check for SQL injection patterns
2. Validate the operation type and permissions
3. Detect any destructive operations
4. Provide a final security verdict

Be thorough but allow safe SELECT queries.`
    );
    
    // Parse response for safety verdict (the agent should use final_security_verdict tool)
    const isSafe = !response.toLowerCase().includes('unsafe') && 
                   !response.toLowerCase().includes('blocked') &&
                   !response.toLowerCase().includes('not allowed');
    
    const riskLevel = response.toLowerCase().includes('critical') ? 'CRITICAL' :
                      response.toLowerCase().includes('high') ? 'HIGH' :
                      response.toLowerCase().includes('medium') ? 'MEDIUM' : 'LOW';
    
    return {
      safe: isSafe,
      reason: response,
      risk_level: riskLevel,
    };
  }
}
