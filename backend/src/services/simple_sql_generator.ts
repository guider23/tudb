/**
 * Simple rule-based SQL generator as fallback when Bedrock is not available
 * This provides basic SQL generation without AI for common query patterns
 */

export interface TableSchema {
  tableName: string;
  columns: Array<{
    columnName: string;
    dataType: string;
    isNullable: boolean;
  }>;
}

export class SimpleSQLGenerator {
  /**
   * Generate SQL from natural language using simple pattern matching
   */
  generateSQL(question: string, tables: TableSchema[]): { sql: string; explanation: string } | null {
    const lowerQuestion = question.toLowerCase().trim();

    // Pattern 1: "select all/everyone from <table>"
    const selectAllMatch = lowerQuestion.match(/(?:select|show|get|display).*?(?:all|everyone|everything).*?from\s+(\w+)/i);
    if (selectAllMatch) {
      const tableName = selectAllMatch[1];
      const table = tables.find(t => t.tableName.toLowerCase() === tableName.toLowerCase());
      
      if (table) {
        const columns = table.columns.map(c => c.columnName).join(', ');
        return {
          sql: `SELECT ${columns} FROM ${table.tableName} LIMIT 100`,
          explanation: `Retrieving all records from the ${table.tableName} table (limited to 100 rows)`
        };
      }
    }

    // Pattern 2: "show me <table>" or "get <table>"
    const showTableMatch = lowerQuestion.match(/(?:show|get|display).*?(\w+)\s*(?:table)?$/i);
    if (showTableMatch) {
      const tableName = showTableMatch[1];
      const table = tables.find(t => t.tableName.toLowerCase() === tableName.toLowerCase());
      
      if (table) {
        const columns = table.columns.map(c => c.columnName).join(', ');
        return {
          sql: `SELECT ${columns} FROM ${table.tableName} LIMIT 100`,
          explanation: `Retrieving records from the ${table.tableName} table (limited to 100 rows)`
        };
      }
    }

    // Pattern 3: "how many <table>" or "count <table>"
    const countMatch = lowerQuestion.match(/(?:how many|count).*?(\w+)/i);
    if (countMatch) {
      const tableName = countMatch[1];
      const table = tables.find(t => t.tableName.toLowerCase() === tableName.toLowerCase());
      
      if (table) {
        return {
          sql: `SELECT COUNT(*) as total FROM ${table.tableName}`,
          explanation: `Counting total number of records in the ${table.tableName} table`
        };
      }
    }

    // Pattern 4: "latest/recent <table>" or "last N <table>"
    const recentMatch = lowerQuestion.match(/(?:latest|recent|last)\s*(?:(\d+))?\s*(\w+)/i);
    if (recentMatch) {
      const limit = recentMatch[1] || '10';
      const tableName = recentMatch[2];
      const table = tables.find(t => t.tableName.toLowerCase() === tableName.toLowerCase());
      
      if (table) {
        // Find a date/timestamp column
        const dateColumn = table.columns.find(c => 
          c.dataType.includes('timestamp') || 
          c.dataType.includes('date') ||
          c.columnName.toLowerCase().includes('created') ||
          c.columnName.toLowerCase().includes('updated') ||
          c.columnName.toLowerCase().includes('date')
        );
        
        const columns = table.columns.map(c => c.columnName).join(', ');
        const orderBy = dateColumn ? ` ORDER BY ${dateColumn.columnName} DESC` : '';
        
        return {
          sql: `SELECT ${columns} FROM ${table.tableName}${orderBy} LIMIT ${limit}`,
          explanation: `Retrieving the ${limit} most recent records from the ${table.tableName} table`
        };
      }
    }

    // Pattern 5: Direct table name mentioned
    for (const table of tables) {
      if (lowerQuestion.includes(table.tableName.toLowerCase())) {
        const columns = table.columns.map(c => c.columnName).join(', ');
        return {
          sql: `SELECT ${columns} FROM ${table.tableName} LIMIT 100`,
          explanation: `Retrieving records from the ${table.tableName} table (limited to 100 rows)`
        };
      }
    }

    return null;
  }

  /**
   * Check if a question can be handled by simple SQL generation
   */
  canHandle(question: string): boolean {
    const lowerQuestion = question.toLowerCase();
    
    const simplePatterns = [
      /select.*from/i,
      /show.*(?:all|everyone|everything)/i,
      /get.*(?:all|everyone|everything)/i,
      /how many/i,
      /count/i,
      /latest/i,
      /recent/i,
      /display/i
    ];

    return simplePatterns.some(pattern => pattern.test(lowerQuestion));
  }
}
