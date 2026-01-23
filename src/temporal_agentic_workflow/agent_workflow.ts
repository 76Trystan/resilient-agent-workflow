import {
  proxyActivities,
  defineSignal,
  setHandler,
  sleep,
  log,
} from '@temporalio/workflow';
import type { Activities } from '../activities.ts';
import type { agentActivities } from './agent_activities.ts';
import { evaluateTriggers } from './trigger.ts';

const activities = proxyActivities<Activities>({
  startToCloseTimeout: '10 seconds',
  retry: {
    maximumAttempts: 5,
    initialInterval: '500ms',
    maximumInterval: '5s',
    backoffCoefficient: 1.5,
  },
});

// Separate activity config for agent calls (longer timeout since LLM might be slow)
const agentActivityProxy = proxyActivities<typeof agentActivities>({
  startToCloseTimeout: '30 seconds',
  retry: {
    maximumAttempts: 2,
    initialInterval: '1s',
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
}

export async function teaMakingWorkflow(input: WorkflowInput): Promise<WorkflowOutput> {
  const completedFunctions: string[] = [];
  const errors: string[] = [];
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
    
    completedFunctions.push(stepName);
  };

  try {
    // 1. selfGetCup (no dependencies)
    await executeStep('selfGetCup', () => activities.selfGetCup(), () => {
      state.toggleCupCounter = true;
    });
    
    // 2. kettleFill (no dependencies)
    await executeStep('kettleFill', () => activities.kettleFill(), (result) => {
      if (result) {
        Object.assign(state, result);
        log.info(`State updated from activity: ${JSON.stringify(result)}`);
      }
    });
    
    // 3. kettleTurnOn - Try activity, if it fails check triggers and invoke agent
    let kettleTurnOnSuccess = false;
    let kettleTurnOnAttempts = 0;
    const maxKettleTurnOnAttempts = 3;

    while (!kettleTurnOnSuccess && kettleTurnOnAttempts < maxKettleTurnOnAttempts) {
      try {
        kettleTurnOnAttempts++;
        log.info(`kettleTurnOn attempt ${kettleTurnOnAttempts}/${maxKettleTurnOnAttempts}`);
        
        await executeStep('kettleTurnOn', () => activities.kettleTurnOn(), () => {
          state.toggleSwitchedOn = true;
        });
        
        kettleTurnOnSuccess = true;
        log.info('kettleTurnOn succeeded');
      } catch (error) {
        log.error(`kettleTurnOn failed: ${(error as Error).message}`);
        errors.push(`kettleTurnOn failed: ${(error as Error).message}`);
        
        // Activity failed, now check if agent can fix it
        if (kettleTurnOnAttempts < maxKettleTurnOnAttempts) {
          log.info('Attempting agent recovery...');
          
          const triggeredCondition = evaluateTriggers(state, 'kettleTurnOn');
          
          if (triggeredCondition) {
            log.info(`Trigger detected: ${triggeredCondition.name}`);
            
            try {
              const decision = await agentActivityProxy.invokeAgent(
                triggeredCondition.agentType,
                triggeredCondition.name,
                triggeredCondition.description,
                state,
                completedFunctions
              );
              
              log.info(`Agent Analysis: ${decision.analysis}`);
              log.info(`Confidence: ${(decision.confidence * 100).toFixed(1)}%`);
              
              if (decision.confidence > 0.3 && Object.keys(decision.newState).length > 0) {
                Object.assign(state, decision.newState);
                log.info(`Applied correction: ${decision.action}`);
                await sleep(500);
              } else if (decision.confidence <= 0.3) {
                log.warn(`Agent confidence too low (${decision.confidence}), skipping correction`);
              }
            } catch (agentError) {
              log.error(`Agent error: ${(agentError as Error).message}`);
              errors.push(`Agent error on kettleTurnOn: ${(agentError as Error).message}`);
            }
          } else {
            log.warn('No trigger detected for kettleTurnOn failure, cannot recover');
          }
          
          // Wait before retrying kettleTurnOn
          await sleep(1000);
        }
      }
    }

    if (!kettleTurnOnSuccess) {
      throw new Error('kettleTurnOn failed after ' + maxKettleTurnOnAttempts + ' attempts with agent recovery');
    }
    
    // 4. kettleWaitWhistle (depends on: kettleTurnOn)
    await executeStep('kettleWaitWhistle', () => activities.kettleWaitWhistle(), () => {
      state.toggleBoiled = true;
    });
    
    // 5. cupAddTeabag (depends on: selfGetCup)
    await executeStep('cupAddTeabag', () => activities.cupAddTeabag(), () => {
      state.teabag += 1;
    });
    
    // 6. cupAddWater (depends on: selfGetCup, kettleWaitWhistle)
    await executeStep('cupAddWater', () => activities.cupAddWater(), () => {
      state.hotWater += 1;
    });
    
    // 7. cupMashTea (depends on: cupAddWater, cupAddTeabag)
    await executeStep('cupMashTea', () => activities.cupMashTea(), () => {
      state.toggleMashed = true;
    });
    
    // 8. cupRemoveTeabag (depends on: cupAddTeabag)
    await executeStep('cupRemoveTeabag', () => activities.cupRemoveTeabag(), () => {
      state.teabag -= 1;
    });
    
    // 9. cupAddMilk (depends on: toggleMilk, selfGetCup)
    if (state.toggleMilk) {
      await executeStep('cupAddMilk', () => activities.cupAddMilk(), () => {
        state.milk += 1;
      });
    } else {
      completedFunctions.push('cupAddMilk_skipped');
    }

    // 10. cupAddSugar (depends on: toggleSugar, selfGetCup)
    if (state.toggleSugar) {
      await executeStep('cupAddSugar', () => activities.cupAddSugar(), () => {
        state.sugar += 1;
      });
    } else {
      completedFunctions.push('cupAddSugar_skipped');
    }

    // 11. cupAddSalt (depends on: selfGetCut)
    if (state.toggleSalt) {
      await executeStep('cupAddSalt', () => activities.cupAddSalt(), () => {
        state.salt += 1;
      });
    } else {
      completedFunctions.push('cupAddSalt_skipped');
    }

    // 12. cupStir (depends on: cupMashTea)
    await executeStep('cupStir', () => activities.cupStir(), () => {
      state.toggleStirred = true;
    });
    
    // 13. selfDrinkCup (depends on: cupStir)
    if (state.toggleEmpty) {
      log.info('Auto-correcting: toggleEmpty was true, setting to false for drinking');
      state.toggleEmpty = false;
    }
    await executeStep('selfDrinkCup', () => activities.selfDrinkCup(), () => {
      state.toggleDrunk = true;
    });
    
    // 14. selfEmptyCup (no dependencies)
    await executeStep('selfEmptyCup', () => activities.selfEmptyCup(), () => {
      state.toggleEmpty = true;
      state.hotWater = 0;
      state.coldWater = 0;
      state.milk = 0;
      state.sugar = 0;
      state.salt = 0;
    });
    
    // 15. selfTidyUp (no dependencies)
    await executeStep('selfTidyUp', () => activities.selfTidyUp(), () => {
      state.toggleCupCounter = false;
    });

    return {
      completedFunctions,
      status: 'completed',
      finalState: state,
      errors,
    };
  } catch (error) {
    if (shouldStop) {
      return {
        completedFunctions,
        status: 'stopped',
        finalState: state,
        errors,
      };
    }
    
    return {
      completedFunctions,
      status: 'failed',
      finalState: state,
      errors: [...errors, `Workflow failed: ${(error as Error).message}`],
    };
  }
}