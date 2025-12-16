import { SYSTEM_PROMPT, buildToolDefinitions } from '../prompts/bedrock_prompts';
import { createLogger } from '../logger';

const logger = createLogger('bedrock-client');

export interface LLMResponse {
  tool?: string;
  input?: any;
  clarify?: string;
}

export class BedrockClient {
  private baseUrl: string;
  private token: string;
  private region: string;
  private modelId: string;

  constructor() {
    this.token = process.env.AWS_BEARER_TOKEN_BEDROCK || '';
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.baseUrl = `https://bedrock-runtime.${this.region}.amazonaws.com`;
    this.modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0';
    
    logger.info('BedrockClient initialized', { 
      region: this.region, 
      modelId: this.modelId,
      hasToken: !!this.token 
    });
  }

  async query(question: string, schemaContext: string, requestId: string): Promise<LLMResponse> {
    if (!this.token) {
      throw new Error('AWS_BEARER_TOKEN_BEDROCK is not configured');
    }
    
    logger.info(`[${requestId}] Sending query to Bedrock`);

    // Meta Llama uses a different format than Claude
    const isLlama = this.modelId.includes('llama');
    
    if (isLlama) {
      // Meta Llama format
      const prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>

You are a SQL query generator. Given a natural language question and database schema, generate a valid SQL query.

Database Schema:
${schemaContext}

Instructions:
1. Generate only valid SQL queries that match the schema
2. Use proper SQL syntax
3. Return ONLY the SQL query, no explanations
4. Do NOT include markdown formatting or code blocks<|eot_id|><|start_header_id|>user<|end_header_id|>

${question}<|eot_id|><|start_header_id|>assistant<|end_header_id|>`;

      const body = {
        prompt,
        max_gen_len: 512,
        temperature: 0.1,
      };

      try {
        const url = `${this.baseUrl}/model/${encodeURIComponent(this.modelId)}/invoke`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${this.token}`,
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Bedrock API error (${response.status}): ${errorText}`);
        }

        const responseBody = await response.json() as any;

        logger.info(`[${requestId}] Llama response received`);

        const generation = responseBody.generation || '';
        
        // Extract SQL from the response
        let sql = generation.trim();
        
        // Remove common prefixes/wrappers
        sql = sql.replace(/^```sql\n?/i, '').replace(/\n?```$/i, '');
        sql = sql.replace(/^```\n?/i, '').replace(/\n?```$/i, '');
        sql = sql.trim();

        if (sql && (sql.toUpperCase().startsWith('SELECT') || 
                    sql.toUpperCase().startsWith('INSERT') || 
                    sql.toUpperCase().startsWith('UPDATE') || 
                    sql.toUpperCase().startsWith('DELETE'))) {
          return {
            tool: 'run_sql',
            input: { query: sql, max_rows: 100 },
          };
        }

        // If no valid SQL, treat as clarification
        return {
          clarify: generation,
        };
      } catch (error) {
        logger.error(`[${requestId}] Bedrock error:`, error);
        throw new Error(`Bedrock API error: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      // Claude/Anthropic format (original code)
      const tools = buildToolDefinitions();
      
      const messages = [
        {
          role: 'user',
          content: `Available database schema:\n${schemaContext}\n\nUser question: ${question}\n\nPlease generate a SQL query to answer this question.`,
        },
      ];

      const body = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages,
        tools,
        temperature: 0,
      };

      try {
        const url = `${this.baseUrl}/model/${encodeURIComponent(this.modelId)}/invoke`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${this.token}`,
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Bedrock API error (${response.status}): ${errorText}`);
        }

        const responseBody = await response.json() as any;

        logger.info(`[${requestId}] Bedrock response received`, {
          stopReason: responseBody.stop_reason,
          contentTypes: responseBody.content?.map((c: any) => c.type),
        });

        // Handle tool use response
        if (responseBody.stop_reason === 'tool_use') {
          const toolUse = responseBody.content.find((c: any) => c.type === 'tool_use');
          
          if (toolUse) {
            logger.info(`[${requestId}] Tool use detected: ${toolUse.name}`, {
              input: toolUse.input,
            });
            return {
              tool: toolUse.name,
              input: toolUse.input,
            };
          }
          
          logger.error(`[${requestId}] tool_use stop_reason but no tool_use content found`, {
            content: JSON.stringify(responseBody.content),
          });
        }

        // Handle text response (clarification)
        const textContent = responseBody.content.find((c: any) => c.type === 'text');
        if (textContent) {
          return {
            clarify: textContent.text,
          };
        }

        throw new Error('Unexpected response format from Bedrock');
      } catch (error) {
        logger.error(`[${requestId}] Bedrock error:`, error);
        throw new Error(`Bedrock API error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  async generateSummary(
    question: string,
    sql: string,
    results: any,
    explanation: string,
    requestId: string
  ): Promise<string> {
    logger.info(`[${requestId}] Generating summary`);

    const isLlama = this.modelId.includes('llama');

    if (isLlama) {
      // Meta Llama format
      const prompt = `<|begin_of_text|><|start_header_id|>user<|end_header_id|>

You executed this SQL query:
${sql}

Query explanation: ${explanation}

The query returned ${results.rowCount} rows.

Original user question: ${question}

Provide a concise, natural language summary of the results in 2-3 sentences. Focus on answering the user's question directly.<|eot_id|><|start_header_id|>assistant<|end_header_id|>`;

      const body = {
        prompt,
        max_gen_len: 300,
        temperature: 0.5,
      };

      try {
        const url = `${this.baseUrl}/model/${encodeURIComponent(this.modelId)}/invoke`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${this.token}`,
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          throw new Error(`Bedrock API error (${response.status})`);
        }

        const responseBody = await response.json() as any;
        return responseBody.generation?.trim() || 'Summary generation failed';
      } catch (error) {
        logger.error(`[${requestId}] Summary generation error:`, error);
        return 'Could not generate summary';
      }
    } else {
      // Claude/Anthropic format (original code)
      const summaryPrompt = `
You executed this SQL query:
${sql}

Query explanation: ${explanation}

The query returned ${results.rowCount} rows.

Original user question: ${question}

Provide a concise, natural language summary of the results in 2-3 sentences. 
Focus on answering the user's question directly.
`;

      const body = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: summaryPrompt,
          },
        ],
        temperature: 0.7,
      };

      try {
        const url = `${this.baseUrl}/model/${encodeURIComponent(this.modelId)}/invoke`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${this.token}`,
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          throw new Error(`Bedrock API error (${response.status})`);
        }

        const responseBody = await response.json() as any;
        const textContent = responseBody.content.find((c: any) => c.type === 'text');
        return textContent?.text || 'Summary generation failed';
      } catch (error) {
        logger.error(`[${requestId}] Summary generation error:`, error);
        return 'Could not generate summary';
      }
    }
  }

  async generateExplanation(
    question: string,
    results: any[],
    columns: string[],
    requestId: string
  ): Promise<string> {
    logger.info(`[${requestId}] Generating explanation for query results`);

    const isLlama = this.modelId.includes('llama');
    const sampleData = results.slice(0, 10);
    const dataPreview = JSON.stringify(sampleData, null, 2);

    if (isLlama) {
      // Meta Llama format
      const prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>

You are a data analyst AI assistant. Provide clear, insightful explanations of database query results.<|eot_id|><|start_header_id|>user<|end_header_id|>

A user asked this question about their database:
"${question}"

The query returned ${results.length} rows with these columns: ${columns.join(', ')}.

Here's a preview of the data (first ${sampleData.length} rows):
${dataPreview}

Please provide a clear explanation of what this data shows. Include:
1. A summary of what the data represents
2. Key insights or patterns you notice
3. Any notable trends or anomalies
4. Suggestions for further analysis if applicable

Keep your explanation concise, friendly, and accessible to non-technical users.<|eot_id|><|start_header_id|>assistant<|end_header_id|>`;

      const body = {
        prompt,
        max_gen_len: 800,
        temperature: 0.7,
      };

      try {
        const url = `${this.baseUrl}/model/${encodeURIComponent(this.modelId)}/invoke`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${this.token}`,
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Bedrock API error (${response.status}): ${errorText}`);
        }

        const responseBody = await response.json() as any;
        return responseBody.generation?.trim() || 'Explanation generation failed';
      } catch (error) {
        logger.error(`[${requestId}] Explanation generation error:`, error);
        throw error;
      }
    } else {
      // Claude/Anthropic format
      const explanationPrompt = `You are a data analyst AI assistant. A user asked the following question about their database:

Question: "${question}"

The query returned ${results.length} rows with the following columns: ${columns.join(', ')}.

Here's a preview of the data (first ${sampleData.length} rows):
${dataPreview}

Please provide a clear, insightful explanation of what this data shows. Include:
1. A summary of what the data represents
2. Key insights or patterns you notice
3. Any notable trends or anomalies
4. Suggestions for further analysis if applicable

Keep your explanation concise, friendly, and accessible to non-technical users.`;

      const body = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: explanationPrompt,
          },
        ],
        temperature: 0.7,
      };

      try {
        const url = `${this.baseUrl}/model/${encodeURIComponent(this.modelId)}/invoke`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${this.token}`,
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Bedrock API error (${response.status}): ${errorText}`);
        }

        const responseBody = await response.json() as any;
        const textContent = responseBody.content.find((c: any) => c.type === 'text');
        return textContent?.text || 'Explanation generation failed';
      } catch (error) {
        logger.error(`[${requestId}] Explanation generation error:`, error);
        throw error;
      }
    }
  }
}
