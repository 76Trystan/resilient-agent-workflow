import { TeaState } from './agent_workflow.ts';
import { AgentPool } from './agent.ts';
import { AgentMemory } from './agent_memory.ts';

const agentMemory = new AgentMemory();
const agentPool = new AgentPool(agentMemory);

export interface AgentDecision {
  action: string;
  analysis: string;
  newState: Partial<TeaState>;
  confidence: number;
  reasoning: string;
}

export const agentActivities = {
  async invokeAgent(
    agentType: 'recovery' | 'conflict' | 'optimizer',
    triggerName: string,
    triggerDescription: string,
    currentState: TeaState,
    progress: string[]
  ): Promise<AgentDecision> {
    try {
      const decision = await agentPool.invokeAgent(
        agentType,
        triggerName,
        triggerDescription,
        currentState,
        progress
      );

      console.log(`Agent decision: ${decision.action}`);
      console.log(`Confidence: ${(decision.confidence * 100).toFixed(1)}%`);
      console.log(`Analysis: ${decision.analysis}`);

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