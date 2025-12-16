import { BaseAgent, Tool } from './base_agent';

export class AnalyticsAgent extends BaseAgent {
  getSystemPrompt(): string {
    return `You are a Data Analytics Expert Agent. Your role is to:
1. Analyze query results and extract meaningful insights
2. Identify trends, patterns, and anomalies in data
3. Suggest the most appropriate visualizations
4. Generate business intelligence summaries
5. Recommend follow-up analyses

Provide actionable insights that help users understand their data better.
Think like a data scientist and business analyst combined.`;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'analyze_data_distribution',
        description: 'Analyze statistical distribution and patterns in the data',
        input_schema: {
          type: 'object',
          properties: {
            data_summary: {
              type: 'object',
              description: 'Summary of the data (row count, column types, sample values)',
            },
            column_name: {
              type: 'string',
              description: 'Column being analyzed',
            },
          },
          required: ['data_summary'],
        },
      },
      {
        name: 'detect_anomalies',
        description: 'Detect outliers and unusual patterns in the data',
        input_schema: {
          type: 'object',
          properties: {
            anomalies_found: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of detected anomalies',
            },
            severity: {
              type: 'string',
              description: 'Severity level of anomalies',
            },
          },
          required: ['anomalies_found'],
        },
      },
      {
        name: 'suggest_visualization',
        description: 'Recommend the best visualization type for the data',
        input_schema: {
          type: 'object',
          properties: {
            data_shape: {
              type: 'object',
              description: 'Shape and structure of the data',
            },
            recommended_chart: {
              type: 'string',
              description: 'Recommended chart type (bar, line, pie, scatter, table)',
            },
            reason: {
              type: 'string',
              description: 'Why this visualization is recommended',
            },
          },
          required: ['recommended_chart', 'reason'],
        },
      },
      {
        name: 'generate_insights',
        description: 'Generate business insights and key findings from the data',
        input_schema: {
          type: 'object',
          properties: {
            key_findings: {
              type: 'array',
              items: { type: 'string' },
              description: 'Key insights discovered in the data',
            },
            recommendations: {
              type: 'array',
              items: { type: 'string' },
              description: 'Actionable recommendations based on insights',
            },
            follow_up_questions: {
              type: 'array',
              items: { type: 'string' },
              description: 'Suggested follow-up analyses',
            },
          },
          required: ['key_findings'],
        },
      },
    ];
  }

  async executeToolUse(toolUse: any): Promise<any> {
    switch (toolUse.name) {
      case 'analyze_data_distribution':
        return {
          summary: toolUse.input.data_summary,
          column: toolUse.input.column_name,
          distribution_type: 'varied',
          message: 'Data distribution analyzed',
        };

      case 'detect_anomalies':
        return {
          anomalies: toolUse.input.anomalies_found || [],
          severity: toolUse.input.severity || 'low',
          count: toolUse.input.anomalies_found?.length || 0,
        };

      case 'suggest_visualization':
        return {
          recommended_chart: toolUse.input.recommended_chart,
          reason: toolUse.input.reason,
          data_shape: toolUse.input.data_shape,
          message: 'Visualization suggestion generated',
        };

      case 'generate_insights':
        return {
          key_findings: toolUse.input.key_findings || [],
          recommendations: toolUse.input.recommendations || [],
          follow_up_questions: toolUse.input.follow_up_questions || [],
          timestamp: new Date().toISOString(),
        };

      default:
        return { error: 'Unknown tool' };
    }
  }

  async analyzeResults(queryResults: any[], context: string, rowCount: number): Promise<any> {
    const dataSummary = {
      row_count: rowCount,
      sample_data: queryResults.slice(0, 5),
      columns: Object.keys(queryResults[0] || {}),
    };

    const response = await this.run(
      `Analyze these query results and provide insights:

Data Summary:
- Rows returned: ${rowCount}
- Sample data: ${JSON.stringify(dataSummary.sample_data, null, 2)}
- Columns: ${dataSummary.columns.join(', ')}

Context: ${context}

Please:
1. Analyze the data distribution and patterns
2. Detect any anomalies or interesting outliers
3. Suggest the best visualization for this data
4. Generate key insights and actionable recommendations
5. Suggest follow-up questions to explore the data further`
    );

    return response;
  }
}
