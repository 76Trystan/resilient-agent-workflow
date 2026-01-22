import { TeaState } from './agent_workflow.ts';
import { AgentMemory } from './agent_memory.ts';
import {
  createRecoveryChain,
  createConflictChain,
  createOptimizerChain,
} from './agent_config.ts';

export type AgentType = 'recovery' | 'conflict' | 'optimizer';

export interface AgentDecision {
  action: string;
  analysis: string;
  newState: Partial<TeaState>;
  confidence: number;
  reasoning: string;
}

export class RecoveryAgent {
  private chain = createRecoveryChain();

  constructor(private memory: AgentMemory) {}

  async analyze(
    triggerName: string,
    triggerDescription: string,
    currentState: TeaState
  ): Promise<AgentDecision> {
    try {
      // Call LLM through LangChain
      const response = await this.chain.invoke({
        state: JSON.stringify(currentState, null, 2),
        triggerName,
        triggerDescription,
      });

      // Parse LLM response
      const parsed = JSON.parse(response);

      return {
        action: parsed.action,
        analysis: parsed.analysis,
        newState: parsed.corrections || {},
        confidence: parsed.confidence || 0.5,
        reasoning: `LLM Analysis: ${parsed.analysis}`,
      };
    } catch (error) {
      console.error(`Recovery Agent error: ${(error as Error).message}`);
      
      // Fallback: Rule-based recovery if LLM fails
      return this.fallbackAnalysis(triggerName, currentState);
    }
  }

  private fallbackAnalysis(
    triggerName: string,
    currentState: TeaState
  ): AgentDecision {
    // Hardcoded fallback for reliability
    if (triggerName === 'kettleCups_corrupted') {
      return {
        action: 'restore_kettleCups',
        analysis: 'Fallback: kettleCups corrupted, restoring to 1',
        newState: { kettleCups: 1 },
        confidence: 0.85,
        reasoning: 'LLM failed, using fallback rule-based recovery',
      };
    }

    return {
      action: 'no_action',
      analysis: 'Unknown recovery scenario',
      newState: {},
      confidence: 0.0,
      reasoning: 'No applicable recovery rule found',
    };
  }
}

export class ConflictAgent {
  private chain = createConflictChain();

  constructor(private memory: AgentMemory) {}

  async analyze(
    triggerName: string,
    triggerDescription: string,
    currentState: TeaState
  ): Promise<AgentDecision> {
    try {
      const response = await this.chain.invoke({
        state: JSON.stringify(currentState, null, 2),
        triggerName,
        triggerDescription,
      });

      const parsed = JSON.parse(response);

      return {
        action: parsed.action,
        analysis: parsed.analysis,
        newState: parsed.corrections || {},
        confidence: parsed.confidence || 0.5,
        reasoning: `LLM Analysis: ${parsed.analysis}`,
      };
    } catch (error) {
      console.error(`Conflict Agent error: ${(error as Error).message}`);
      return this.fallbackAnalysis(triggerName, currentState);
    }
  }

  private fallbackAnalysis(
    triggerName: string,
    currentState: TeaState
  ): AgentDecision {
    if (triggerName === 'toggleEmpty_conflict') {
      return {
        action: 'resolve_empty_conflict',
        analysis: 'Fallback: toggleEmpty conflict, setting to false',
        newState: { toggleEmpty: false },
        confidence: 0.9,
        reasoning: 'LLM failed, using fallback rule-based resolution',
      };
    }

    return {
      action: 'no_action',
      analysis: 'Unknown conflict scenario',
      newState: {},
      confidence: 0.0,
      reasoning: 'No applicable conflict resolution rule found',
    };
  }
}

export class OptimizerAgent {
  private chain = createOptimizerChain();

  constructor(private memory: AgentMemory) {}

  async analyze(
    triggerName: string,
    triggerDescription: string,
    currentState: TeaState,
    progress: string[]
  ): Promise<AgentDecision> {
    try {
      const response = await this.chain.invoke({
        state: JSON.stringify(currentState, null, 2),
        progress: JSON.stringify(progress),
        triggerName,
        triggerDescription,
      });

      const parsed = JSON.parse(response);

      return {
        action: parsed.action,
        analysis: parsed.analysis,
        newState: parsed.corrections || {},
        confidence: parsed.confidence || 0.5,
        reasoning: `LLM Analysis: ${parsed.analysis}`,
      };
    } catch (error) {
      console.error(`Optimizer Agent error: ${(error as Error).message}`);
      // Optimizer can fail gracefully - no fallback needed
      return {
        action: 'no_optimization',
        analysis: 'Optimization analysis failed',
        newState: {},
        confidence: 0.0,
        reasoning: 'LLM call failed, skipping optimization',
      };
    }
  }
}

export class AgentPool {
  private recovery: RecoveryAgent;
  private conflict: ConflictAgent;
  private optimizer: OptimizerAgent;

  constructor(memory: AgentMemory) {
    this.recovery = new RecoveryAgent(memory);
    this.conflict = new ConflictAgent(memory);
    this.optimizer = new OptimizerAgent(memory);
  }

  async invokeAgent(
    agentType: AgentType,
    triggerName: string,
    triggerDescription: string,
    currentState: TeaState,
    progress?: string[]
  ): Promise<AgentDecision> {
    switch (agentType) {
      case 'recovery':
        return this.recovery.analyze(triggerName, triggerDescription, currentState);
      case 'conflict':
        return this.conflict.analyze(triggerName, triggerDescription, currentState);
      case 'optimizer':
        return this.optimizer.analyze(
          triggerName,
          triggerDescription,
          currentState,
          progress || []
        );
    }
  }
}