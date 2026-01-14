import {
  proxyActivities,
  defineSignal,
  setHandler,
  sleep,
  WorkflowExecutionAlreadyStartedError
} from '@temporalio/workflow';
import type { Activities } from './activities';

const activities = proxyActivities<Activities>({
  startToCloseTimeout: '10 seconds',
});

// Define signals
export const pauseSignal = defineSignal<void>('pause');
export const resumeSignal = defineSignal<void>('resume');
export const stopSignal = defineSignal<void>('stop');

export interface WorkflowInput {
  hasMilk: boolean;
  hasSugar: boolean;
  hasSalt: boolean;
  teabagCount: number;
}

export interface WorkflowOutput {
  completedFunctions: string[];
  status: 'completed' | 'stopped';
}

export async function teaMakingWorkflow(input: WorkflowInput): Promise<WorkflowOutput> {
  const completedFunctions: string[] = [];
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
  };

  try {
    await executeStep('selfGetCup', () => activities.selfGetCup());
    await executeStep('kettleFill', () => activities.kettleFill());
    await executeStep('kettleTurnOn', () => activities.kettleTurnOn());
    await executeStep('kettleWaitWhistle', () => activities.kettleWaitWhistle());
    await executeStep('cupAddTeabag', () => activities.cupAddTeabag());
    await executeStep('cupAddWater', () => activities.cupAddWater());
    await executeStep('cupMashTea', () => activities.cupMashTea());
    await executeStep('cupRemoveTeabag', () => activities.cupRemoveTeabag());

    // Conditional: Milk
    if (input.hasMilk) {
      await executeStep('cupAddMilk', () => activities.cupAddMilk());
    } else {
      completedFunctions.push('cupAddMilk_skipped');
    }

    // Conditional: Sugar
    if (input.hasSugar) {
      await executeStep('cupAddSugar', () => activities.cupAddSugar());
    } else {
      completedFunctions.push('cupAddSugar_skipped');
    }

    // Conditional: Salt
    if (input.hasSalt) {
      await executeStep('cupAddSalt', () => activities.cupAddSalt());
    } else {
      completedFunctions.push('cupAddSalt_skipped');
    }

    await executeStep('cupStir', () => activities.cupStir());
    await executeStep('selfDrinkCup', () => activities.selfDrinkCup());
    await executeStep('selfEmptyCup', () => activities.selfEmptyCup());
    await executeStep('selfTidyUp', () => activities.selfTidyUp());

    return {
      completedFunctions,
      status: 'completed',
    };
  } catch (error) {
    if (shouldStop) {
      return {
        completedFunctions,
        status: 'stopped',
      };
    }
    throw error;
  }
}