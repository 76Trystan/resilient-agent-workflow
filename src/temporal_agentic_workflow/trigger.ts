import { TeaState } from './agent_workflow.ts';

export interface TriggerConfig {
  name: string;
  condition: (state: TeaState, activityName: string) => boolean;
  agentType: 'recovery' | 'conflict' | 'optimizer';
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
    name: 'toggleEmpty_conflict',
    condition: (state: TeaState, activityName: string) => {
      return activityName === 'selfDrinkCup' && state.toggleEmpty === true;
    },
    agentType: 'conflict',
    severity: 'medium',
    description: 'toggleEmpty is true when attempting to drink the cup. This is a logical conflict - cup cannot be both empty and drinkable.',
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