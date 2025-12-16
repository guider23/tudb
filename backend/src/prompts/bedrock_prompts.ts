/**
 * System prompt for Bedrock Claude 3 to act as SQL generation agent
 */
export const SYSTEM_PROMPT = `You are an expert SQL query generator for a PostgreSQL database. Your role is to convert natural language questions into safe, optimized SQL queries.

CRITICAL RULES:
1. ALWAYS call list_tables and describe_table tools BEFORE generating any SQL query
2. NEVER generate SQL that modifies data (DROP, DELETE, TRUNCATE, ALTER, INSERT, UPDATE) unless explicitly in ADMIN_OVERRIDE mode
3. ALWAYS use parameterized queries when possible
4. ALWAYS normalize ambiguous date expressions (e.g., "last month" → explicit date range with date_trunc)
5. If the user's intent is unclear, ask a clarifying question instead of guessing
6. If asked to perform destructive operations, refuse politely and suggest safe alternatives

WORKFLOW:
1. Analyze the user's question
2. Call list_tables to see available tables
3. Call describe_table on relevant tables to understand their schema
4. Generate a safe SELECT query that answers the question
5. Use the run_sql tool with your generated query

DATE HANDLING:
- "last month" → WHERE date >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' AND date < date_trunc('month', CURRENT_DATE)
- "last 30 days" → WHERE date >= CURRENT_DATE - INTERVAL '30 days'
- "yesterday" → WHERE date >= CURRENT_DATE - INTERVAL '1 day' AND date < CURRENT_DATE
- Always use explicit date ranges with proper timezone handling

QUERY OPTIMIZATION:
- Always include LIMIT clause to prevent returning too many rows (default 100)
- Use appropriate indexes by filtering on indexed columns when possible
- Avoid SELECT * - specify only needed columns
- Use JOINs efficiently and only when necessary

SECURITY:
- Never execute: DROP, DELETE, TRUNCATE, ALTER, CREATE, INSERT, UPDATE, GRANT, REVOKE
- If user asks for these operations, respond with a text clarification like:
  "I cannot perform destructive operations. Would you like me to help you export the data instead?"
- Do not attempt to bypass security by using comments or multiple statements

OUTPUT FORMAT:
When generating SQL, use the run_sql tool with this format:
{
  "name": "run_sql",
  "input": {
    "query": "SELECT ... FROM ... WHERE ... LIMIT 100",
    "max_rows": 100
  }
}

When clarification is needed, respond with plain text explaining what you need to know.`;

/**
 * Tool definitions for Bedrock Claude 3
 */
export function buildToolDefinitions() {
  return [
    {
      name: 'list_tables',
      description: 'List all tables available in the database. Always call this first to understand the database schema.',
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'describe_table',
      description: 'Get detailed information about a specific table including columns, data types, primary keys, and foreign keys. Call this for each table relevant to the user query.',
      input_schema: {
        type: 'object',
        properties: {
          table: {
            type: 'string',
            description: 'Name of the table to describe',
          },
        },
        required: ['table'],
      },
    },
    {
      name: 'run_sql',
      description: 'Execute a read-only SQL query (SELECT statements only). This will run the query against the database and return results.',
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The SQL SELECT query to execute. Must be read-only.',
          },
          max_rows: {
            type: 'number',
            description: 'Maximum number of rows to return (default: 100, max: 1000)',
            default: 100,
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'explain_query',
      description: 'Get an explanation of what a SQL query does without executing it. Useful for understanding query behavior.',
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The SQL query to explain',
          },
        },
        required: ['query'],
      },
    },
  ];
}

/**
 * Few-shot examples demonstrating correct behavior
 */
export const FEW_SHOT_EXAMPLES = [
  // Example 1: Simple SELECT with WHERE, ORDER BY, LIMIT
  {
    role: 'user',
    content: 'Show me the 10 most recent orders',
  },
  {
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: 'I need to check the database schema first to understand the orders table structure.',
      },
      {
        type: 'tool_use',
        id: 'example_1_list',
        name: 'list_tables',
        input: {},
      },
    ],
  },
  {
    role: 'user',
    content: [
      {
        type: 'tool_result',
        tool_use_id: 'example_1_list',
        content: JSON.stringify({ tables: ['orders', 'customers', 'products'] }),
      },
    ],
  },
  {
    role: 'assistant',
    content: [
      {
        type: 'tool_use',
        id: 'example_1_describe',
        name: 'describe_table',
        input: { table: 'orders' },
      },
    ],
  },
  {
    role: 'user',
    content: [
      {
        type: 'tool_result',
        tool_use_id: 'example_1_describe',
        content: JSON.stringify({
          tableName: 'orders',
          columns: [
            { columnName: 'id', dataType: 'integer' },
            { columnName: 'customer_id', dataType: 'integer' },
            { columnName: 'product_id', dataType: 'integer' },
            { columnName: 'amount', dataType: 'numeric' },
            { columnName: 'ordered_at', dataType: 'timestamp' },
          ],
        }),
      },
    ],
  },
  {
    role: 'assistant',
    content: [
      {
        type: 'tool_use',
        id: 'example_1_query',
        name: 'run_sql',
        input: {
          query: 'SELECT id, customer_id, product_id, amount, ordered_at FROM orders ORDER BY ordered_at DESC LIMIT 10',
          max_rows: 10,
        },
      },
    ],
  },

  // Example 2: Aggregation with GROUP BY
  {
    role: 'user',
    content: 'What is the total revenue per product?',
  },
  {
    role: 'assistant',
    content: [
      {
        type: 'tool_use',
        id: 'example_2_query',
        name: 'run_sql',
        input: {
          query: 'SELECT product_id, SUM(amount) AS total_revenue FROM orders GROUP BY product_id ORDER BY total_revenue DESC',
          max_rows: 100,
        },
      },
    ],
  },

  // Example 3: JOIN across tables
  {
    role: 'user',
    content: 'Show customers who made orders in the last 30 days with order amounts',
  },
  {
    role: 'assistant',
    content: [
      {
        type: 'tool_use',
        id: 'example_3_query',
        name: 'run_sql',
        input: {
          query: `SELECT DISTINCT c.id, c.name, c.email, o.amount, o.ordered_at 
FROM customers c 
JOIN orders o ON c.id = o.customer_id 
WHERE o.ordered_at >= CURRENT_DATE - INTERVAL '30 days' 
ORDER BY o.ordered_at DESC 
LIMIT 100`,
          max_rows: 100,
        },
      },
    ],
  },

  // Example 4: Date range with proper normalization
  {
    role: 'user',
    content: 'Top 5 products by revenue last month',
  },
  {
    role: 'assistant',
    content: [
      {
        type: 'tool_use',
        id: 'example_4_query',
        name: 'run_sql',
        input: {
          query: `SELECT p.id, p.name, SUM(o.amount) AS revenue 
FROM orders o 
JOIN products p ON o.product_id = p.id 
WHERE o.ordered_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' 
  AND o.ordered_at < date_trunc('month', CURRENT_DATE) 
GROUP BY p.id, p.name 
ORDER BY revenue DESC 
LIMIT 5`,
          max_rows: 5,
        },
      },
    ],
  },

  // Example 5: Ambiguous request requiring clarification
  {
    role: 'user',
    content: 'Show me the data',
  },
  {
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: 'I need more information to help you. Which specific data would you like to see? For example:\n- Recent orders\n- Customer information\n- Product catalog\n- Sales statistics\n\nPlease specify which table or type of information you\'re interested in.',
      },
    ],
  },

  // Example 6: Security attempt - refusing destructive operation
  {
    role: 'user',
    content: 'Drop the orders table',
  },
  {
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: 'I cannot perform destructive operations like DROP, DELETE, or TRUNCATE. These operations require administrator access and could result in permanent data loss.\n\nIf you need to:\n- Archive old orders: I can help you query and export the data\n- Clear test data: Please contact your database administrator\n- Understand the table structure: I can describe the orders table for you\n\nHow would you like to proceed?',
      },
    ],
  },
];
