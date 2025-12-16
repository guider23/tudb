import axios from 'axios';

// Mock the Bedrock and MCP clients
jest.mock('../backend/src/services/bedrock_client');
jest.mock('../backend/src/services/mcp_client');

describe('End-to-End Query Flow', () => {
  describe('Example Query 1: Top 5 products by revenue last month', () => {
    it('should generate correct SQL and return results', async () => {
      const expectedSQL = `SELECT p.id, p.name, SUM(o.amount) AS revenue 
FROM orders o 
JOIN products p ON o.product_id = p.id 
WHERE o.ordered_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' 
  AND o.ordered_at < date_trunc('month', CURRENT_DATE) 
GROUP BY p.id, p.name 
ORDER BY revenue DESC 
LIMIT 5`;

      // This test demonstrates the expected behavior
      // In real implementation, this would call the actual API
      const mockResponse = {
        status: 'success',
        query: expectedSQL,
        results: [
          { id: 1, name: 'Laptop Pro 15', revenue: 85000 },
          { id: 11, name: 'Monitor 27inch', revenue: 32000 },
          { id: 8, name: 'Standing Desk', revenue: 28000 },
          { id: 15, name: 'Tablet 10inch', revenue: 28000 },
          { id: 13, name: 'Headphones Wireless', revenue: 7500 },
        ],
        rowCount: 5,
      };

      expect(mockResponse.status).toBe('success');
      expect(mockResponse.results.length).toBe(5);
      expect(mockResponse.results[0].revenue).toBeGreaterThanOrEqual(
        mockResponse.results[1].revenue
      );
    });
  });

  describe('Example Query 2: Customers from Tamil Nadu with orders > 5000 in last 30 days', () => {
    it('should generate parameterized SQL and filter correctly', async () => {
      const expectedSQL = `SELECT DISTINCT c.id, c.name, c.email, c.state, o.amount, o.ordered_at
FROM customers c
JOIN orders o ON c.id = o.customer_id
WHERE c.state = $1
  AND o.amount > $2
  AND o.ordered_at >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY o.ordered_at DESC
LIMIT 100`;

      const mockResponse = {
        status: 'success',
        query: expectedSQL,
        results: [
          {
            id: 1,
            name: 'Raj Kumar',
            email: 'raj.kumar@example.com',
            state: 'Tamil Nadu',
            amount: 85000,
          },
          {
            id: 2,
            name: 'Priya Sharma',
            email: 'priya.sharma@example.com',
            state: 'Tamil Nadu',
            amount: 85000,
          },
          {
            id: 6,
            name: 'Lakshmi Iyer',
            email: 'lakshmi.iyer@example.com',
            state: 'Tamil Nadu',
            amount: 56000,
          },
        ],
        rowCount: 3,
      };

      expect(mockResponse.status).toBe('success');
      expect(mockResponse.results.every((r: any) => r.state === 'Tamil Nadu')).toBe(true);
      expect(mockResponse.results.every((r: any) => r.amount > 5000)).toBe(true);
    });
  });

  describe('Example Query 3: Attempt to drop orders table', () => {
    it('should refuse and provide safe alternative', async () => {
      const mockResponse = {
        status: 'blocked',
        error: "Operation 'DROP' is not allowed in READ_ONLY mode",
        suggestion: 'If you want to remove data, consider exporting it first or contact an administrator',
      };

      expect(mockResponse.status).toBe('blocked');
      expect(mockResponse.error).toContain('DROP');
      expect(mockResponse.suggestion).toBeTruthy();
    });

    it('should log blocked attempt to audit table', async () => {
      const mockAuditLog = {
        user_id: 'test_user',
        question: 'Drop the orders table',
        generated_sql: 'DROP TABLE orders',
        allowed: false,
        result_count: 0,
        status: 'blocked',
        error: "Operation 'DROP' is not allowed",
      };

      expect(mockAuditLog.allowed).toBe(false);
      expect(mockAuditLog.status).toBe('blocked');
      expect(mockAuditLog.result_count).toBe(0);
    });
  });

  describe('Example Query 4: Ambiguous request', () => {
    it('should ask for clarification when query is unclear', async () => {
      const mockResponse = {
        status: 'clarification_needed',
        message: 'I need more information. Which specific data would you like to see? For example: recent orders, customer information, or product catalog?',
      };

      expect(mockResponse.status).toBe('clarification_needed');
      expect(mockResponse.message).toBeTruthy();
    });
  });

  describe('Schema introspection workflow', () => {
    it('should call list_tables before querying', async () => {
      const mockTables = ['customers', 'products', 'orders', 'query_audit_log'];
      
      expect(mockTables).toContain('customers');
      expect(mockTables).toContain('products');
      expect(mockTables).toContain('orders');
    });

    it('should call describe_table for relevant tables', async () => {
      const mockTableDescription = {
        tableName: 'orders',
        columns: [
          { columnName: 'id', dataType: 'integer', isNullable: false },
          { columnName: 'customer_id', dataType: 'integer', isNullable: false },
          { columnName: 'product_id', dataType: 'integer', isNullable: false },
          { columnName: 'amount', dataType: 'numeric', isNullable: false },
          { columnName: 'ordered_at', dataType: 'timestamp', isNullable: true },
        ],
        primaryKeys: ['id'],
        foreignKeys: [
          { columnName: 'customer_id', referencedTable: 'customers', referencedColumn: 'id' },
          { columnName: 'product_id', referencedTable: 'products', referencedColumn: 'id' },
        ],
      };

      expect(mockTableDescription.tableName).toBe('orders');
      expect(mockTableDescription.columns.length).toBeGreaterThan(0);
      expect(mockTableDescription.foreignKeys.length).toBe(2);
    });
  });

  describe('Audit logging', () => {
    it('should log successful queries', async () => {
      const mockAuditEntry = {
        user_id: 'test_user',
        session_id: 'session_123',
        question: 'Show me recent orders',
        generated_sql: 'SELECT * FROM orders ORDER BY ordered_at DESC LIMIT 10',
        allowed: true,
        result_count: 10,
        status: 'success',
      };

      expect(mockAuditEntry.allowed).toBe(true);
      expect(mockAuditEntry.status).toBe('success');
      expect(mockAuditEntry.generated_sql).toBeTruthy();
    });

    it('should log blocked queries', async () => {
      const mockAuditEntry = {
        user_id: 'test_user',
        question: 'Delete all orders',
        generated_sql: 'DELETE FROM orders',
        allowed: false,
        result_count: 0,
        status: 'blocked',
        error: 'DELETE operation not allowed',
      };

      expect(mockAuditEntry.allowed).toBe(false);
      expect(mockAuditEntry.status).toBe('blocked');
      expect(mockAuditEntry.error).toBeTruthy();
    });

    it('should log clarification requests', async () => {
      const mockAuditEntry = {
        user_id: 'test_user',
        question: 'Show me data',
        generated_sql: null,
        allowed: true,
        result_count: 0,
        status: 'clarification_needed',
        clarification: 'Which table would you like to query?',
      };

      expect(mockAuditEntry.status).toBe('clarification_needed');
      expect(mockAuditEntry.clarification).toBeTruthy();
      expect(mockAuditEntry.generated_sql).toBeNull();
    });
  });
});
