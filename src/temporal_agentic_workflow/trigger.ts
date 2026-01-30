import { TeaState } from './agent_workflow.ts';

export interface TriggerConfig {
  name: string;
  condition: (state: TeaState, activityName: string) => boolean;
  agentType: 'recovery';
  description: string;
}

export const triggers: TriggerConfig[] = [
  {
    name: 'kettleCups_corrupted',
    condition: (state: TeaState, activityName: string) => {
      return activityName === 'kettleFill' && state.kettleCups < 1;
    },
    agentType: 'recovery',
    description: 'kettleCups value dropped below 1 after fill operation. This indicates state corruption or sabotage.',
  },
  // This mocks an error that kettleTurnOn fails when there is no water, agent then responses to fix it
  {
    name: 'kettleTurnOn_no_water',
    condition: (state: TeaState, activityName: string) => {
      return activityName === 'kettleTurnOn' && state.kettleCups < 1;
    },
    agentType: 'recovery',
    description: 'Kettle cannot turn on because kettleCups is less than 1.',
  },
];

export function evaluateTriggers(
  state: TeaState,
  activityName: string
): TriggerConfig | null {
  return triggers.find(trigger => trigger.condition(state, activityName)) || null;
}