import { TeaState } from './agent_workflow.ts';

export interface TriggerConfig {
  name: string;
  condition: (state: TeaState, activityName: string) => boolean;
  agentType: 'recovery';
  severity: 'low' | 'medium' | 'high';
  description: string; // For LLM context
}

export const triggers: TriggerConfig[] = [
  {
    name: 'kettleCups_corrupted',
    condition: (state: TeaState, activityName: string) => {
      return activityName === 'kettleFill' && state.kettleCups < 1;
    },
    agentType: 'recovery',
    severity: 'high',
    description: 'kettleCups value dropped below 1 after fill operation. This indicates state corruption or sabotage.',
  },
  {
    name: 'negative_water_level',
    condition: (state: TeaState, activityName: string) => {
      return (state.hotWater < 0 || state.coldWater < 0);
    },
    agentType: 'recovery',
    severity: 'high',
    description: 'Water levels are negative, which is physically impossible. Water levels must be clamped to zero or corrected.',
  },
];

export function evaluateTriggers(
  state: TeaState,
  activityName: string
): TriggerConfig | null {
  return triggers.find(trigger => trigger.condition(state, activityName)) || null;
}