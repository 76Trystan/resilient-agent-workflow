import {
  proxyActivities,
  defineSignal,
  setHandler,
  sleep,
  log,
} from '@temporalio/workflow';
import type { Activities } from './activities.ts';

const activities = proxyActivities<Activities>({
  startToCloseTimeout: '10 seconds',
});

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
}

export interface WorkflowInput {
  teaState: TeaState;
}

export interface WorkflowOutput {
  completedFunctions: string[];
  status: 'completed' | 'stopped';
  finalState: TeaState;
}

export async function teaMakingWorkflow(input: WorkflowInput): Promise<WorkflowOutput> {
  const completedFunctions: string[] = [];
  const state = { ...input.teaState };
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

  const executeStep = async (stepName: string, activityFn: () => Promise<void>) => {
    while (isPaused && !shouldStop) {
      await sleep(100);
    }
    if (shouldStop) throw new Error('Workflow stopped by user');
    await activityFn();
    completedFunctions.push(stepName);
    log.info(`Activity completed: ${stepName}`);
  };

  try {
    await executeStep('selfGetCup', () => activities.selfGetCup());
    
    await executeStep('kettleFill', () => activities.kettleFill());
    state.kettleCups = Math.max(0, state.kettleCups - 1);
    
    await executeStep('kettleTurnOn', () => activities.kettleTurnOn());
    
    await executeStep('kettleWaitWhistle', () => activities.kettleWaitWhistle());
    
    await executeStep('cupAddTeabag', () => activities.cupAddTeabag());
    if (state.teabag > 0) {
      state.teabag = Math.max(0, state.teabag - 1);
    }
    
    await executeStep('cupAddWater', () => activities.cupAddWater());
    state.hotWater = Math.max(0, state.hotWater - 1);
    
    await executeStep('cupMashTea', () => activities.cupMashTea());
    
    await executeStep('cupRemoveTeabag', () => activities.cupRemoveTeabag());
    
    if (state.toggleMilk) {
      await executeStep('cupAddMilk', () => activities.cupAddMilk());
      state.milk = Math.max(0, state.milk - 1);
    } else {
      completedFunctions.push('cupAddMilk_skipped');
    }

    if (state.toggleSugar) {
      await executeStep('cupAddSugar', () => activities.cupAddSugar());
      state.sugar = Math.max(0, state.sugar - 1);
    } else {
      completedFunctions.push('cupAddSugar_skipped');
    }

    if (state.toggleSalt) {
      await executeStep('cupAddSalt', () => activities.cupAddSalt());
      state.salt = Math.max(0, state.salt - 1);
    } else {
      completedFunctions.push('cupAddSalt_skipped');
    }

    await executeStep('cupStir', () => activities.cupStir());
    
    await executeStep('selfDrinkCup', () => activities.selfDrinkCup());
    state.hotWater = Math.max(0, state.hotWater - 1);
    
    await executeStep('selfEmptyCup', () => activities.selfEmptyCup());
    state.coldWater = 0;
    
    await executeStep('selfTidyUp', () => activities.selfTidyUp());

    return {
      completedFunctions,
      status: 'completed',
      finalState: state,
    };
  } catch (error) {
    if (shouldStop) {
      return {
        completedFunctions,
        status: 'stopped',
        finalState: state,
      };
    }
    throw error;
  }
}