import { TeaState } from './agent_workflow.ts';
import { AgentMemory } from './agent_memory.ts';
import {
    createRecoveryChain,
} from './agent_config.ts';
import { response } from 'express';

export type AgentType = 'recovery';

export interface AgentDecision {
    action: string;
    analysis: string;
    newState: Partial<TeaState>;
    confidence: number;
    reasoning: string;
}

export class RecoveryAgent {
    constructor(private memory: AgentMemory) { }

    async analyze(
        triggerName: string,
        triggerDescription: string,
        currentState: TeaState
    ): Promise<AgentDecision> {
        try {
            const response = await createRecoveryChain().invoke({
                state: JSON.stringify(currentState, null, 2),
                triggerName,
                triggerDescription,
            });
            console.log("===============================================")
            console.log("Agent Response:")
            console.log(response)
            console.log("===============================================")
            const parsed = JSON.parse(response);

            return {
                action: parsed.action,
                analysis: parsed.analysis,
                newState: parsed.corrections || {},
                confidence: parsed.confidence || 0.5,
                reasoning: `LLM Analysis: ${parsed.analysis}`,
            };
        } catch (error) {
            throw new Error(
                `RecoveryAgent failed for trigger "${triggerName}": ${(error as Error).message}`
            );
        }
    }
}

export class AgentPool {
    private recovery: RecoveryAgent;

    constructor(memory: AgentMemory) {
        this.recovery = new RecoveryAgent(memory);
    }

    async invokeAgent(
        agentType: AgentType,
        triggerName: string,
        triggerDescription: string,
        currentState: TeaState,
        progress?: string[]
    ): Promise<AgentDecision> {
        if (agentType === 'recovery') {
            return this.recovery.analyze(triggerName, triggerDescription, currentState);
        }

        throw new Error(`Unknown agent type: ${agentType}`);
    }
}