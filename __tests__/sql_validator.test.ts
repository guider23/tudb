import { SQLValidator } from '../backend/src/safety/sql_validator';

describe('SQL Validator', () => {
  let validator: SQLValidator;

  beforeEach(() => {
    validator = new SQLValidator();
    // Set READ_ONLY mode for tests
    process.env.READ_ONLY = 'true';
    process.env.ADMIN_OVERRIDE = 'false';
  });

  describe('Safe SELECT queries', () => {
    it('should allow simple SELECT query', () => {
      const sql = 'SELECT * FROM customers LIMIT 10';
      const result = validator.validate(sql);
      expect(result.isValid).toBe(true);
    });

    it('should allow SELECT with WHERE clause', () => {
      const sql = 'SELECT id, name FROM customers WHERE state = \'Tamil Nadu\' LIMIT 100';
      const result = validator.validate(sql);
      expect(result.isValid).toBe(true);
    });

    it('should allow SELECT with JOIN', () => {
      const sql = `
        SELECT c.name, o.amount 
        FROM customers c 
        JOIN orders o ON c.id = o.customer_id 
        WHERE o.amount > 5000 
        LIMIT 50
      `;
      const result = validator.validate(sql);
      expect(result.isValid).toBe(true);
    });

    it('should allow SELECT with aggregation', () => {
      const sql = 'SELECT product_id, SUM(amount) as total FROM orders GROUP BY product_id';
      const result = validator.validate(sql);
      expect(result.isValid).toBe(true);
    });

    it('should allow SELECT with CTE (WITH clause)', () => {
      const sql = `
        WITH recent_orders AS (
          SELECT * FROM orders WHERE ordered_at > CURRENT_DATE - INTERVAL '30 days'
        )
        SELECT * FROM recent_orders LIMIT 100
      `;
      const result = validator.validate(sql);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Destructive operations', () => {
    it('should block DROP statement', () => {
      const sql = 'DROP TABLE orders';
      const result = validator.validate(sql);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('DROP');
      expect(result.suggestion).toBeTruthy();
    });

    it('should block DELETE statement', () => {
      const sql = 'DELETE FROM orders WHERE id = 1';
      const result = validator.validate(sql);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('DELETE');
    });

    it('should block TRUNCATE statement', () => {
      const sql = 'TRUNCATE TABLE customers';
      const result = validator.validate(sql);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('TRUNCATE');
    });

    it('should block ALTER statement', () => {
      const sql = 'ALTER TABLE products ADD COLUMN test VARCHAR(50)';
      const result = validator.validate(sql);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('ALTER');
    });

    it('should block INSERT statement', () => {
      const sql = 'INSERT INTO customers (name, email) VALUES (\'Test\', \'test@test.com\')';
      const result = validator.validate(sql);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('INSERT');
    });

    it('should block UPDATE statement', () => {
      const sql = 'UPDATE customers SET name = \'Test\' WHERE id = 1';
      const result = validator.validate(sql);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('UPDATE');
    });
  });

  describe('SQL injection attempts', () => {
    it('should block multiple statements', () => {
      const sql = 'SELECT * FROM customers; DROP TABLE orders;';
      const result = validator.validate(sql);
      expect(result.isValid).toBe(false);
    });

    it('should block file operations', () => {
      const sql = 'SELECT * FROM customers INTO OUTFILE \'/tmp/data.txt\'';
      const result = validator.validate(sql);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File operations');
    });

    it('should block LOAD DATA', () => {
      const sql = 'LOAD DATA INFILE \'/tmp/data.txt\' INTO TABLE customers';
      const result = validator.validate(sql);
      expect(result.isValid).toBe(false);
    });
  });

  describe('Admin override', () => {
    it('should allow destructive operations with ADMIN_OVERRIDE', () => {
      process.env.ADMIN_OVERRIDE = 'true';
      const sql = 'DELETE FROM orders WHERE id = 1';
      const result = validator.validate(sql);
      expect(result.isValid).toBe(true);
    });

    it('should allow all operations when READ_ONLY is false', () => {
      process.env.READ_ONLY = 'false';
      const sql = 'UPDATE customers SET name = \'Test\' WHERE id = 1';
      const result = validator.validate(sql);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty SQL', () => {
      const sql = '';
      const result = validator.validate(sql);
      expect(result.isValid).toBe(false);
    });

    it('should handle whitespace-only SQL', () => {
      const sql = '   ';
      const result = validator.validate(sql);
      expect(result.isValid).toBe(false);
    });

    it('should handle case variations', () => {
      const sql = 'select * from customers limit 10';
      const result = validator.validate(sql);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Sanitization', () => {
    it('should sanitize passwords in SQL for logging', () => {
      const sql = 'SELECT * FROM users WHERE password = \'secret123\'';
      const sanitized = validator.sanitizeForLogging(sql);
      expect(sanitized).not.toContain('secret123');
      expect(sanitized).toContain('***');
    });

    it('should sanitize API keys in SQL for logging', () => {
      const sql = 'SELECT * FROM config WHERE api_key = \'abc123xyz\'';
      const sanitized = validator.sanitizeForLogging(sql);
      expect(sanitized).not.toContain('abc123xyz');
      expect(sanitized).toContain('***');
    });

    it('should limit SQL length for logging', () => {
      const longSql = 'SELECT * FROM customers WHERE ' + 'id = 1 AND '.repeat(100);
      const sanitized = validator.sanitizeForLogging(longSql);
      expect(sanitized.length).toBeLessThanOrEqual(500);
    });
  });
});
