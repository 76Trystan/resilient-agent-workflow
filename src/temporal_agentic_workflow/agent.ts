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
    // safety net, currently not implemented 
    // private fallbackAnalysis(
    //     triggerName: string,
    //     currentState: TeaState
    // ): AgentDecision {
    //     // Hardcoded fallback for reliability
    //     if (triggerName === 'kettleCups_corrupted') {
    //         return {
    //             action: 'restore_kettleCups',
    //             analysis: 'Fallback: kettleCups corrupted, restoring to 1',
    //             newState: { kettleCups: 1 },
    //             confidence: 0.95,
    //             reasoning: 'Fallback rule-based recovery: kettleCups was sabotaged, restoring to minimum safe value',
    //         };
    //     }

    //     if (triggerName === 'negative_water_level') {
    //         const fixedState: Partial<TeaState> = {};
    //         if (currentState.hotWater < 0) fixedState.hotWater = 0;
    //         if (currentState.coldWater < 0) fixedState.coldWater = 0;

    //         return {
    //             action: 'clamp_water_levels',
    //             analysis: 'Fallback: Water levels cannot be negative, clamping to 0',
    //             newState: fixedState,
    //             confidence: 0.99,
    //             reasoning: 'Fallback rule-based recovery: Water levels clamped to 0',
    //         };
    //     }

    //     return {
    //         action: 'no_action',
    //         analysis: 'Unknown recovery scenario',
    //         newState: {},
    //         confidence: 0.0,
    //         reasoning: 'No applicable recovery rule found',
    //     };
    // }
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