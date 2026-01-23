import { Ollama } from '@langchain/ollama';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

// Initialize Ollama with llama3.1:8b
export const llm = new Ollama({
  baseUrl: 'http://localhost:11434', // Ollama default port
  model: 'llama3.1:8b',
  temperature: 0.3,
});

// System Prompts

export const recoveryAgentPrompt = ChatPromptTemplate.fromTemplate(`
You are a Recovery Agent in a tea-making workflow system. Your job is to analyze state corruption and decide how to fix it.

Current System State:
{state}

Detected Issue:
{triggerName}: {triggerDescription}

Analyze the problem and provide a JSON response with:
1. "analysis": Brief explanation of what went wrong
2. "action": The specific action to take (e.g. "restore_kettleCups", "reset_water_level")
3. "corrections": Object with the state fields to fix and their new values
4. "confidence": Number between 0 and 1 indicating how confident you are

Example response format:
{{"analysis": "...", "action": "...", "corrections": {{}}, "confidence": 0.95}}

Only return valid JSON, no additional text.
`);

//export const recoveryAgentPrompt = ChatPromptTemplate.fromTemplate("The is a test and debugging prompt, just return 'hello world', do not do anything else.");

// Create chains with output parsers
export const createRecoveryChain = () => {
  return recoveryAgentPrompt
    .pipe(llm)
    .pipe(new StringOutputParser());
};