import { Ollama } from '@langchain/ollama';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

// Initialize Ollama with llama3.1:8b
export const llm = new Ollama({
  baseUrl: 'http://localhost:11434', // Ollama default port
  model: 'llama3.1:8b',
  temperature: 0.3, // Low temperature for deterministic decisions
});

// Reusable prompt templates for different agent types

export const recoveryAgentPrompt = ChatPromptTemplate.fromTemplate(`
You are a Recovery Agent in a tea-making workflow system. Your job is to analyze state corruption and decide how to fix it.

Current System State:
{state}

Detected Issue:
{triggerName}: {triggerDescription}

Analyze the problem and provide a JSON response with:
1. "analysis": Brief explanation of what went wrong
2. "action": The specific action to take (e.g., "restore_kettleCups", "reset_water_level")
3. "corrections": Object with the state fields to fix and their new values
4. "confidence": Number between 0 and 1 indicating how confident you are

Example response format:
{{"analysis": "...", "action": "...", "corrections": {{}}, "confidence": 0.95}}

Only return valid JSON, no additional text.
`);

export const conflictAgentPrompt = ChatPromptTemplate.fromTemplate(`
You are a Conflict Agent in a tea-making workflow system. Your job is to resolve logical conflicts in state.

Current System State:
{state}

Detected Conflict:
{triggerName}: {triggerDescription}

Analyze the conflict and provide a JSON response with:
1. "analysis": Explanation of the conflict
2. "action": The resolution action (e.g., "resolve_empty_conflict")
3. "corrections": Object with state fields to fix to resolve the conflict
4. "confidence": Number between 0 and 1

Example response format:
{{"analysis": "...", "action": "...", "corrections": {{}}, "confidence": 0.95}}

Only return valid JSON, no additional text.
`);

export const optimizerAgentPrompt = ChatPromptTemplate.fromTemplate(`
You are an Optimizer Agent in a tea-making workflow system. Your job is to identify optimization opportunities.

Current System State:
{state}

Workflow Progress:
{progress}

Analyze if there are any optimization opportunities and provide a JSON response with:
1. "analysis": What could be optimized
2. "action": The optimization action
3. "corrections": State changes for optimization (can be empty if no optimization needed)
4. "confidence": Number between 0 and 1

Example response format:
{{"analysis": "...", "action": "...", "corrections": {{}}, "confidence": 0.95}}

Only return valid JSON, no additional text.
`);

// Create chains with output parsers
export const createRecoveryChain = () => {
  return recoveryAgentPrompt
    .pipe(llm)
    .pipe(new StringOutputParser());
};

export const createConflictChain = () => {
  return conflictAgentPrompt
    .pipe(llm)
    .pipe(new StringOutputParser());
};

export const createOptimizerChain = () => {
  return optimizerAgentPrompt
    .pipe(llm)
    .pipe(new StringOutputParser());
};