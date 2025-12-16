import axios from 'axios';
import { createLogger } from '../logger';
import { DatabaseClient } from '../../../db/base_client';

const logger = createLogger('mcp-client');

const MCP_BASE_URL = `http://localhost:${process.env.MCP_TOOL_SERVER_PORT || 3001}`;

export class MCPToolClient {
  private dbClient?: DatabaseClient;

  constructor(dbClient?: DatabaseClient) {
    this.dbClient = dbClient;
  }

  async listTables(): Promise<string[]> {
    if (this.dbClient) {
      // Use direct database client
      try {
        const result = await this.dbClient.runSafeQuery(
          `SELECT table_name FROM information_schema.tables 
           WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
           ORDER BY table_name`,
          []
        );
        return result.rows.map((row: any) => row.table_name);
      } catch (error) {
        logger.error('Direct DB list_tables error:', error);
        throw new Error('Failed to list tables');
      }
    }

    try {
      const response = await axios.post(`${MCP_BASE_URL}/tools/call`, {
        method: 'list_tables',
        params: {},
      });

      const result = JSON.parse(response.data.result.content[0].text);
      return result.tables;
    } catch (error) {
      logger.error('MCP list_tables error:', error);
      throw new Error('Failed to list tables');
    }
  }

  async describeTable(table: string): Promise<any> {
    if (this.dbClient) {
      // Use direct database client
      try {
        const columnsResult = await this.dbClient.runSafeQuery(
          `SELECT column_name, data_type, is_nullable
           FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = $1
           ORDER BY ordinal_position`,
          [table]
        );

        const primaryKeysResult = await this.dbClient.runSafeQuery(
          `SELECT kcu.column_name
           FROM information_schema.table_constraints tc
           JOIN information_schema.key_column_usage kcu
             ON tc.constraint_name = kcu.constraint_name
           WHERE tc.table_schema = 'public' 
             AND tc.table_name = $1
             AND tc.constraint_type = 'PRIMARY KEY'`,
          [table]
        );

        const foreignKeysResult = await this.dbClient.runSafeQuery(
          `SELECT
             kcu.column_name,
             ccu.table_name AS referenced_table,
             ccu.column_name AS referenced_column
           FROM information_schema.table_constraints tc
           JOIN information_schema.key_column_usage kcu
             ON tc.constraint_name = kcu.constraint_name
           JOIN information_schema.constraint_column_usage ccu
             ON tc.constraint_name = ccu.constraint_name
           WHERE tc.table_schema = 'public'
             AND tc.table_name = $1
             AND tc.constraint_type = 'FOREIGN KEY'`,
          [table]
        );

        return {
          columns: columnsResult.rows.map((row: any) => ({
            columnName: row.column_name,
            dataType: row.data_type,
            nullable: row.is_nullable === 'YES',
          })),
          primaryKeys: primaryKeysResult.rows.map((row: any) => row.column_name),
          foreignKeys: foreignKeysResult.rows.map((row: any) => ({
            columnName: row.column_name,
            referencedTable: row.referenced_table,
            referencedColumn: row.referenced_column,
          })),
        };
      } catch (error) {
        logger.error(`Direct DB describe_table error for ${table}:`, error);
        throw new Error(`Failed to describe table: ${table}`);
      }
    }

    try {
      const response = await axios.post(`${MCP_BASE_URL}/tools/call`, {
        method: 'describe_table',
        params: { table },
      });

      return JSON.parse(response.data.result.content[0].text);
    } catch (error) {
      logger.error(`MCP describe_table error for ${table}:`, error);
      throw new Error(`Failed to describe table: ${table}`);
    }
  }

  async runSQL(query: string, maxRows: number = 100): Promise<any> {
    if (this.dbClient) {
      // Use direct database client
      try {
        const result = await this.dbClient.runSafeQuery(query, []);
        const truncated = result.rows.length > maxRows;
        const rows = truncated ? result.rows.slice(0, maxRows) : result.rows;

        return {
          rows,
          rowCount: rows.length,
          truncated,
        };
      } catch (error) {
        logger.error('Direct DB run_sql error:', error);
        throw new Error(`SQL execution failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    try {
      const response = await axios.post(`${MCP_BASE_URL}/tools/call`, {
        method: 'run_sql',
        params: { query, max_rows: maxRows },
      });

      return JSON.parse(response.data.result.content[0].text);
    } catch (error) {
      logger.error('MCP run_sql error:', error);
      throw new Error('Failed to execute SQL query');
    }
  }

  async explainQuery(query: string): Promise<string> {
    try {
      const response = await axios.post(`${MCP_BASE_URL}/tools/call`, {
        method: 'explain_query',
        params: { query },
      });

      const result = JSON.parse(response.data.result.content[0].text);
      return result.explanation;
    } catch (error) {
      logger.error('MCP explain_query error:', error);
      return 'Could not explain query';
    }
  }
}
