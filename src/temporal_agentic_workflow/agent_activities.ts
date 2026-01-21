import { ChatOllama } from '@langchain/ollama';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sabotageTeaState } from './sabotage.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataFilePath = path.join(__dirname, '../../data.json');

// Initialize Ollama LLM
const llm = new ChatOllama({
  baseUrl: 'http://localhost:11434',
  model: 'llama3.1:8b',
  temperature: 0.3,
});

// Tool to read current state
const readStateFile = tool(
  async () => {
    const content = await fs.readFile(dataFilePath, 'utf-8');
    const data = JSON.parse(content);
    return JSON.stringify(data.teaState);
  },
  {
    name: 'read_state',
    description: 'Read the current tea state from data.json',
  }
);

// Tool to update state
const updateStateFile = tool(
  async (input: { field: string; value: number | boolean }) => {
    const content = await fs.readFile(dataFilePath, 'utf-8');
    const data = JSON.parse(content);
    
    data.teaState[input.field] = input.value;
    
    await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
    return `Updated ${input.field} to ${input.value}`;
  },
  {
    name: 'update_state',
    description: 'Update a specific field in the tea state',
    schema: z.object({
      field: z.string().describe('The field name to update (e.g., kettleCups, hotWater)'),
      value: z.union([z.number(), z.boolean()]).describe('The new value for the field'),
    }),
  }
);

export async function agentFixState(
  activityName: string,
  state: Record<string, any>,
  issues: string[]
): Promise<boolean> {
  console.log(`🤖 Agent starting for ${activityName}`);
  console.log(`Issues detected: ${issues.join(', ')}`);

  try {
    const tools = [readStateFile, updateStateFile];
    
    const prompt = `
You are a workflow state repair agent. The following issues were detected during workflow execution:

Activity: ${activityName}
Issues: ${issues.join('\n')}
Current state: ${JSON.stringify(state)}

Your task:
1. Use the read_state tool to check the current state in data.json
2. Identify what values need to be fixed based on the issues
3. Use the update_state tool to fix each issue
4. Verify the fixes are correct

Be systematic and fix one issue at a time. Only update values that directly address the reported issues.
`;

    const response = await llm.invoke(prompt);
    console.log(`Agent response: ${response.content}`);
    console.log(`Agent completed fixes for ${activityName}`);
    
    return true;
  } catch (error) {
    console.error(`Agent error: ${(error as Error).message}`);
    throw error;
  }
}

export const activities = {
  agentFixState,
};

export type Activities = typeof activities;