import { DatabaseRouter } from '../../../db/db_router';

export class QueryService {
  async getSchema(): Promise<any> {
    try {
      const client = DatabaseRouter.getClient();
      
      // Get all tables
      const tablesResult = await client.runSafeQuery(
        `SELECT table_name 
         FROM information_schema.tables 
         WHERE table_schema = 'public' 
         ORDER BY table_name`,
        []
      );

      const tables = [];
      
      for (const row of tablesResult.rows) {
        const tableName = row.table_name;
        
        // Get columns for each table
        const columnsResult = await client.runSafeQuery(
          `SELECT 
            column_name, 
            data_type, 
            is_nullable,
            column_default
           FROM information_schema.columns 
           WHERE table_name = '${tableName}' 
           AND table_schema = 'public'
           ORDER BY ordinal_position`,
          []
        );

        // Get primary keys
        const pkResult = await client.runSafeQuery(
          `SELECT a.attname
           FROM pg_index i
           JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
           WHERE i.indrelid = '${tableName}'::regclass AND i.indisprimary`,
          []
        );

        const primaryKeys = pkResult.rows.map((r: any) => r.attname);

        tables.push({
          name: tableName,
          columns: columnsResult.rows.map((col: any) => ({
            name: col.column_name,
            type: col.data_type,
            nullable: col.is_nullable === 'YES',
            primary_key: primaryKeys.includes(col.column_name),
            default: col.column_default,
          })),
        });
      }

      return { tables };
    } catch (error: any) {
      console.error('Schema fetch error:', error);
      return {
        tables: [],
        error: error.message,
      };
    }
  }

  async validateSQL(sql: string): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];
    
    // Basic SQL validation
    const sqlUpper = sql.toUpperCase().trim();
    
    if (!sqlUpper) {
      errors.push('SQL query is empty');
      return { valid: false, errors };
    }

    // Check for basic SQL structure
    const validStarts = ['SELECT', 'WITH', 'EXPLAIN'];
    const hasValidStart = validStarts.some(keyword => sqlUpper.startsWith(keyword));
    
    if (!hasValidStart) {
      errors.push('Query must start with SELECT, WITH, or EXPLAIN');
    }

    // Check for balanced parentheses
    const openParens = (sql.match(/\(/g) || []).length;
    const closeParens = (sql.match(/\)/g) || []).length;
    
    if (openParens !== closeParens) {
      errors.push('Unbalanced parentheses');
    }

    // Check for FROM clause (required for most queries)
    if (sqlUpper.startsWith('SELECT') && !sqlUpper.includes('FROM')) {
      errors.push('SELECT query missing FROM clause');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async executeQuery(sql: string): Promise<any> {
    try {
      const client = DatabaseRouter.getClient();
      const result = await client.runSafeQuery(sql, []);
      
      return {
        success: true,
        rows: result.rows || [],
        rowCount: result.rows?.length || 0,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
