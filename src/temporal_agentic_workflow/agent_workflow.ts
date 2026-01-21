import {
  proxyActivities,
  defineSignal,
  setHandler,
  sleep,
  log,
} from '@temporalio/workflow';
import type { Activities } from './activities';

const activities = proxyActivities<Activities>({
  startToCloseTimeout: '30 seconds',
  retry: {
    maximumAttempts: 5,
    initialInterval: '500ms',
    maximumInterval: '5s',
    backoffCoefficient: 1.5,
  },
});

export const updateStateSignal = defineSignal<any>('updateState');
export const pauseSignal = defineSignal('pause');
export const resumeSignal = defineSignal('resume');
export const stopSignal = defineSignal('stop');

export interface TeaState {
  hotWater: number;
  coldWater: number;
  teabag: number;
  sugar: number;
  milk: number;
  salt: number;
  kettleCups: number;
  toggleMilk: boolean;
  toggleSugar: boolean;
  toggleSalt: boolean;
  toggleCupCounter: boolean;
  toggleBoiled: boolean;
  toggleSwitchedOn: boolean;
  toggleEmpty: boolean;
  toggleMashed: boolean;
  toggleStirred: boolean;
  toggleDrunk: boolean;
}

export interface WorkflowInput {
  teaState: TeaState;
}

export interface WorkflowOutput {
  completedFunctions: string[];
  status: 'completed' | 'stopped' | 'failed';
  finalState: TeaState;
  errors: string[];
  agentInterventions: number;
}

// Dependency requirements for each activity
const ACTIVITY_DEPENDENCIES: Record<string, { field: string; minValue: number }[]> = {
  kettleTurnOn: [{ field: 'kettleCups', minValue: 1 }],
  cupAddWater: [{ field: 'toggleBoiled', minValue: 1 }],
  cupMashTea: [{ field: 'teabag', minValue: 1 }, { field: 'hotWater', minValue: 1 }],
  cupStir: [{ field: 'toggleMashed', minValue: 1 }],
  selfDrinkCup: [{ field: 'toggleStirred', minValue: 1 }],
};

function checkDependencies(stepName: string, state: TeaState): { valid: boolean; issues: string[] } {
  const deps = ACTIVITY_DEPENDENCIES[stepName];
  if (!deps) {
    return { valid: true, issues: [] };
  }

  const issues: string[] = [];
  for (const dep of deps) {
    const typedKey = dep.field as keyof TeaState;
    const value = state[typedKey];
    
    if (typeof value === 'number' && value < dep.minValue) {
      issues.push(`${dep.field} is ${value}, needs to be at least ${dep.minValue}`);
    }
  }

  return { valid: issues.length === 0, issues };
}

export async function teaMakingAgentWorkflow(input: WorkflowInput): Promise<WorkflowOutput> {
  const completedFunctions: string[] = [];
  const errors: string[] = [];
  const state = { ...input.teaState };
  let agentInterventions = 0;
  let isPaused = false;
  let shouldStop = false;

  setHandler(pauseSignal, () => {
    isPaused = true;
  });

  setHandler(resumeSignal, () => {
    isPaused = false;
  });

  setHandler(stopSignal, () => {
    shouldStop = true;
  });

  setHandler(updateStateSignal, (newState: Partial<TeaState>) => {
    Object.assign(state, newState);
    log.info(`State updated from UI: ${JSON.stringify(newState)}`);
  });

  const executeStep = async (
    stepName: string,
    activityFn: () => Promise<any>,
    stateUpdate: (result?: any) => Promise<void> | void
  ) => {
    while (isPaused && !shouldStop) {
      await sleep(100);
    }
    if (shouldStop) throw new Error('Workflow stopped by user');
    
    const result = await activityFn();
    await stateUpdate(result);
    
    // Wait 1.5 seconds for sabotage to take effect
    await sleep(1500);
    
    // Check dependencies before continuing
    const depCheck = checkDependencies(stepName, state);
    if (!depCheck.valid) {
      log.warn(`⚠️ Dependency check failed for ${stepName}: ${depCheck.issues.join(', ')}`);
      
      // Call agent to fix the issues
      try {
        const fixed = await activities.agentFixState(stepName, state, depCheck.issues);
        if (fixed) {
          agentInterventions++;
          log.info(`🤖 Agent successfully fixed state for ${stepName}`);
        }
      } catch (error) {
        log.error(`Agent failed to fix state: ${(error as Error).message}`);
        errors.push(`Agent fix failed for ${stepName}: ${(error as Error).message}`);
      }
    }
    
    // Wait 1.5 seconds after agent (if called)
    await sleep(1500);
    
    completedFunctions.push(stepName);
    log.info(`Activity completed: ${stepName}`);
  };

  try {
    // 1. selfGetCup
    await executeStep('selfGetCup', () => activities.selfGetCup(), () => {
      state.toggleCupCounter = true;
    });
    
    // 2. kettleFill
    await executeStep('kettleFill', () => activities.kettleFill(), (result) => {
      if (result) Object.assign(state, result);
    });
    
    // 3. kettleTurnOn (depends on: kettleFill)
    await executeStep('kettleTurnOn', () => activities.kettleTurnOn(), () => {
      state.toggleSwitchedOn = true;
    });
    
    // 4. kettleWaitWhistle
    await executeStep('kettleWaitWhistle', () => activities.kettleWaitWhistle(), () => {
      state.toggleBoiled = true;
    });
    
    // 5. cupAddTeabag
    await executeStep('cupAddTeabag', () => activities.cupAddTeabag(), (result) => {
      if (result) Object.assign(state, result);
    });
    
    // 6. cupAddWater (depends on: toggleBoiled)
    await executeStep('cupAddWater', () => activities.cupAddWater(), (result) => {
      if (result) Object.assign(state, result);
    });
    
    // 7. cupMashTea (depends on: teabag, hotWater)
    await executeStep('cupMashTea', () => activities.cupMashTea(), () => {
      state.toggleMashed = true;
    });
    
    // 8. cupRemoveTeabag
    await executeStep('cupRemoveTeabag', () => activities.cupRemoveTeabag(), (result) => {
      if (result) Object.assign(state, result);
    });
    
    // 9. cupStir (depends on: toggleMashed)
    await executeStep('cupStir', () => activities.cupStir(), () => {
      state.toggleStirred = true;
    });
    
    // 10. selfDrinkCup (depends on: toggleStirred)
    await executeStep('selfDrinkCup', () => activities.selfDrinkCup(), () => {
      state.toggleDrunk = true;
    });
    
    // 11. selfEmptyCup
    await executeStep('selfEmptyCup', () => activities.selfEmptyCup(), () => {
      state.toggleEmpty = true;
      state.hotWater = 0;
      state.coldWater = 0;
      state.milk = 0;
      state.sugar = 0;
      state.salt = 0;
    });
    
    // 12. selfTidyUp
    await executeStep('selfTidyUp', () => activities.selfTidyUp(), () => {
      state.toggleCupCounter = false;
    });

    return {
      completedFunctions,
      status: 'completed',
      finalState: state,
      errors,
      agentInterventions,
    };
  } catch (error) {
    if (shouldStop) {
      return {
        completedFunctions,
        status: 'stopped',
        finalState: state,
        errors,
        agentInterventions,
      };
    }
    
    return {
      completedFunctions,
      status: 'failed',
      finalState: state,
      errors: [...errors, `Workflow failed: ${(error as Error).message}`],
      agentInterventions,
    };
  }
}