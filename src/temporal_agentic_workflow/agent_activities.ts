import { TeaState } from './agent_workflow.ts';
import { AgentPool } from './agent.ts';
import { AgentMemory } from './agent_memory.ts';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const agentMemory = new AgentMemory();
const agentPool = new AgentPool(agentMemory);

const dataFilePath = path.join(process.cwd(), 'data.json');

export interface AgentDecision {
  action: string;
  analysis: string;
  newState: Partial<TeaState>;
  confidence: number;
  reasoning: string;
}

async function writeTeaState(state: Record<string, any>) {
  try {
    const data = {
      teaState: state
    };
    
    await writeFile(
      dataFilePath,
      JSON.stringify(data, null, 2),
      'utf-8'
    );
    console.log('Tea state persisted to file:', state);
  } catch (error) {
    console.error('Error writing tea state:', error);
    throw error;
  }
}

export const agentActivities = {
  async invokeAgent(
    agentType: 'recovery',
    triggerName: string,
    triggerDescription: string,
    currentState: TeaState,
    progress: string[]
  ): Promise<AgentDecision> {
    try {
      console.log('==============');
      console.log('AGENT INVOKED');
      console.log('==============');
      console.log('Trigger:', triggerName);
      console.log('Current state kettleCups:', currentState.kettleCups);

      const decision = await agentPool.invokeAgent(
        agentType,
        triggerName,
        triggerDescription,
        currentState,
        progress
      );

      console.log('Agent Decision:');
      console.log('  Action:', decision.action);
      console.log('  Analysis:', decision.analysis);
      console.log('  Corrections:', decision.newState);
      console.log('  Confidence:', (decision.confidence * 100).toFixed(1) + '%');

      // ✨ CRITICAL: Apply corrections to workflow state AND persist to file
      if (decision.confidence > 0.3 && Object.keys(decision.newState).length > 0) {
        const correctedState = {
          ...currentState,
          ...decision.newState
        };
        
        console.log('Applying fix');
        console.log('  New kettleCups value:', correctedState.kettleCups);
        
        // Persist the corrected state to data.json
        await writeTeaState(correctedState);
        console.log('Correction persisted to data.json');
      } else {
        console.log('Confidence too low or no corrections needed');
      }

      // Record in memory
      agentMemory.recordAction(
        triggerName,
        agentType,
        decision.action,
        true,
        decision.confidence,
        decision.reasoning,
        true
      );

      console.log('==============');
      console.log('AGENT COMPLETE');
      console.log('==============\n');

      return decision;
    } catch (error) {
      console.error(`Agent invocation error: ${(error as Error).message}`);

      agentMemory.recordAction(
        triggerName,
        agentType,
        'error',
        false,
        0,
        (error as Error).message,
        true
      );

      throw error;
    }
  },

  async getAgentMemoryStats(): Promise<any> {
    return {
      totalActions: agentMemory.getHistory().length,
      recentActions: agentMemory.getRecentActions(5),
      llmStats: agentMemory.getLLMUsageStats(),
    };
  },
};