export interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string | any[];
}

export abstract class BaseAgent {
  protected bedrockUrl: string;
  protected token: string;
  protected modelId: string;
  protected tools: Tool[] = [];
  protected systemPrompt: string = '';

  constructor() {
    this.token = process.env.AWS_BEARER_TOKEN_BEDROCK || '';
    const region = process.env.AWS_REGION || 'us-east-1';
    this.bedrockUrl = `https://bedrock-runtime.${region}.amazonaws.com`;
    this.modelId = process.env.BEDROCK_MODEL_ID || 'meta.llama3-70b-instruct-v1:0';
    
    if (!this.token) {
      throw new Error('AWS_BEARER_TOKEN_BEDROCK is not configured');
    }
  }

  abstract getTools(): Tool[];
  abstract executeToolUse(toolUse: any): Promise<any>;
  abstract getSystemPrompt(): string;

  async run(userMessage: string, conversationHistory: AgentMessage[] = []): Promise<string> {
    this.tools = this.getTools();
    this.systemPrompt = this.getSystemPrompt();

    let iterations = 0;
    const maxIterations = 10;
    
    // Build conversation for Llama
    let conversation = this.systemPrompt + '\n\n';
    
    for (const msg of conversationHistory) {
      conversation += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${
        typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
      }\n`;
    }
    
    conversation += `User: ${userMessage}\n`;
    
    // Add tool descriptions if available
    if (this.tools.length > 0) {
      conversation += '\nAvailable tools:\n';
      this.tools.forEach(tool => {
        conversation += `- ${tool.name}: ${tool.description}\n`;
        conversation += `  Parameters: ${JSON.stringify(tool.input_schema.properties)}\n`;
      });
      conversation += '\nTo use a tool, respond with: TOOL: <tool_name> | INPUT: <json_input>\n';
    }
    
    conversation += 'Assistant:';

    while (iterations < maxIterations) {
      iterations++;

      try {
        const prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>

${conversation}<|eot_id|><|start_header_id|>assistant<|end_header_id|>`;

        const body = {
          prompt,
          max_gen_len: 2048,
          temperature: 0.1,
        };

        const url = `${this.bedrockUrl}/model/${encodeURIComponent(this.modelId)}/invoke`;
        
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
        const generation = (responseBody.generation || '').trim();

        // Check if agent wants to use a tool
        if (generation.includes('TOOL:') && generation.includes('INPUT:')) {
          const toolMatch = generation.match(/TOOL:\s*(\w+)\s*\|\s*INPUT:\s*(\{.*?\})/s);
          
          if (toolMatch) {
            const toolName = toolMatch[1];
            const toolInput = JSON.parse(toolMatch[2]);
            
            // Execute the tool
            const toolResult = await this.executeToolUse({
              name: toolName,
              input: toolInput,
            });

            // Add to conversation
            conversation += ` ${generation}\n`;
            conversation += `Tool Result: ${JSON.stringify(toolResult)}\n`;
            conversation += 'Assistant:';
          }
        } else {
          // Agent is done, return final response
          return generation;
        }
      } catch (error: any) {
        console.error(`Agent error (iteration ${iterations}):`, error.message);
        return `I encountered an error: ${error.message}. Please try rephrasing your request.`;
      }
    }

    return 'I reached my thinking limit. Please try breaking your request into smaller parts.';
  }
}
