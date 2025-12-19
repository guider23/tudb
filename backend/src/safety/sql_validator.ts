import { createLogger } from '../logger';

const logger = createLogger('sql-validator');

export interface ValidationResult {
  isValid: boolean;
  isDestructive: boolean;
  error?: string;
  suggestion?: string;
}

export class SQLValidator {
  private destructiveKeywords = [
    'DROP',
    'DELETE',
    'TRUNCATE',
    'ALTER',
    'CREATE',
    'INSERT',
    'UPDATE',
    'GRANT',
    'REVOKE',
  ];

  private dangerousPatterns = [
    /;\s*(DROP|DELETE|TRUNCATE|ALTER)/i, // Multiple statements with destructive operations
    /--.*DROP/i, // Commented destructive operations
    /\/\*.*DROP.*\*\//i, // Block commented destructive operations
  ];

  validate(sql: string): ValidationResult {
    const readOnly = process.env.READ_ONLY === 'true';
    const adminOverride = process.env.ADMIN_OVERRIDE === 'true';

    // Normalize SQL for analysis
    const normalizedSQL = sql.trim().replace(/\s+/g, ' ');
    const upperSQL = normalizedSQL.toUpperCase();

    // Check if query is destructive
    let isDestructive = false;
    for (const keyword of this.destructiveKeywords) {
      if (upperSQL.startsWith(keyword)) {
        isDestructive = true;
        break;
      }
    }

    // If admin override is enabled, allow all queries
    if (adminOverride) {
      logger.warn('Admin override enabled - allowing potentially destructive SQL');
      return { isValid: true, isDestructive };
    }

    // If not in read-only mode, allow more operations
    if (!readOnly) {
      return { isValid: true, isDestructive };
    }

    // Check for destructive keywords at the start (READ_ONLY mode)
    if (isDestructive) {
      const keyword = this.destructiveKeywords.find(k => upperSQL.startsWith(k))!;
      logger.warn(`Blocked destructive operation: ${keyword}`);
      return {
        isValid: false,
        isDestructive: true,
        error: `Operation '${keyword}' is not allowed in READ_ONLY mode`,
        suggestion: this.getSuggestionForKeyword(keyword),
      };
    }

    // Check for dangerous patterns (SQL injection attempts, multiple statements)
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(normalizedSQL)) {
        logger.warn('Blocked potentially dangerous SQL pattern');
        return {
          isValid: false,
          isDestructive,
          error: 'SQL contains potentially dangerous patterns',
          suggestion: 'Use simple SELECT statements without multiple commands',
        };
      }
    }

    // Check for multiple statements (simple check)
    const statementCount = (normalizedSQL.match(/;/g) || []).length;
    if (statementCount > 1) {
      logger.warn('Blocked multiple SQL statements');
      return {
        isValid: false,
        isDestructive,
        error: 'Multiple SQL statements are not allowed',
        suggestion: 'Execute one SELECT query at a time',
      };
    }

    // Ensure it's a SELECT statement
    if (!upperSQL.startsWith('SELECT') && !upperSQL.startsWith('WITH')) {
      logger.warn(`Blocked non-SELECT statement: ${upperSQL.split(' ')[0]}`);
      return {
        isValid: false,
        isDestructive,
        error: 'Only SELECT statements are allowed in READ_ONLY mode',
        suggestion: 'Rephrase your query as a SELECT statement',
      };
    }

    // Additional safety checks
    if (upperSQL.includes('INTO OUTFILE') || upperSQL.includes('INTO DUMPFILE')) {
      return {
        isValid: false,
        isDestructive,
        error: 'File operations are not allowed',
        suggestion: 'Remove file output clauses',
      };
    }

    if (upperSQL.includes('LOAD_FILE') || upperSQL.includes('LOAD DATA')) {
      return {
        isValid: false,
        isDestructive,
        error: 'File loading operations are not allowed',
        suggestion: 'Use SELECT to query existing data',
      };
    }

    // Check for overly broad queries
    if (this.isOverlyBroadQuery(upperSQL)) {
      logger.warn('Warning: Query might return too much data');
      // Allow but log warning
    }

    // Validate UNION queries
    const unionValidation = this.validateUnionQuery(normalizedSQL);
    if (!unionValidation.isValid) {
      return unionValidation;
    }

    return { isValid: true, isDestructive: false };
  }

  private validateUnionQuery(sql: string): ValidationResult {
    // Check if query contains UNION, UNION ALL, INTERSECT, or EXCEPT
    const hasSetOperation = /\b(UNION|INTERSECT|EXCEPT)\b/i.test(sql);
    
    if (!hasSetOperation) {
      return { isValid: true, isDestructive: false };
    }

    // Just log a warning - let the database validate column counts
    // The AI prompt should prevent incorrect UNION queries
    logger.warn('UNION query detected - database will validate column counts');
    
    // Allow the query to proceed - database will return proper error if columns don't match
    return { isValid: true, isDestructive: false };
  }

  private isOverlyBroadQuery(sql: string): boolean {
    // Check if SELECT * without WHERE or LIMIT
    return (
      sql.includes('SELECT *') &&
      !sql.includes('WHERE') &&
      !sql.includes('LIMIT')
    );
  }

  private getSuggestionForKeyword(keyword: string): string {
    const suggestions: Record<string, string> = {
      DROP: 'If you want to remove data, consider exporting it first or contact an administrator',
      DELETE: 'To view data without deleting, use SELECT. For data removal, contact an administrator',
      TRUNCATE: 'To clear data, contact an administrator with appropriate permissions',
      ALTER: 'Schema modifications require administrator approval',
      CREATE: 'To create new objects, contact an administrator',
      INSERT: 'To add data, contact an administrator',
      UPDATE: 'To modify data, contact an administrator',
      GRANT: 'Permission changes require administrator access',
      REVOKE: 'Permission changes require administrator access',
    };

    return suggestions[keyword] || 'This operation requires administrator approval';
  }

  /**
   * Sanitize SQL for logging (remove sensitive data)
   */
  sanitizeForLogging(sql: string): string {
    // Remove potential sensitive data patterns
    return sql
      .replace(/password\s*=\s*['"][^'"]*['"]/gi, "password='***'")
      .replace(/api[_-]?key\s*=\s*['"][^'"]*['"]/gi, "api_key='***'")
      .substring(0, 500); // Limit length
  }
}
