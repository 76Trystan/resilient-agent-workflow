import { proxyActivities } from '@temporalio/workflow';
import { ApplicationFailure } from '@temporalio/common';
import type * as activities from './activities';

export interface TeaProcessInput {
  requestId: string;
  includeMilk: boolean;
  includeSugar: boolean;
  includeSalt: boolean;
  teabagCount: number;
  cupEmpty: boolean;
}

export interface StepResult {
  stepName: string;
  status: 'completed' | 'skipped' | 'failed';
  message: string;
  timestamp: number;
}

export async function teaProcessWorkflow(input: TeaProcessInput): Promise<StepResult[]> {
  const { 
    executeTeaStep, 
    validateDependencies, 
    updateUIState 
  } = proxyActivities<typeof activities>({
    retry: {
      initialInterval: '500ms',
      maximumInterval: '5 seconds',
      backoffCoefficient: 2,
      maximumAttempts: 3,
      nonRetryableErrorTypes: ['MissingDependencyError', 'InvalidStateError'],
    },
    startToCloseTimeout: '30 seconds',
  });

  const results: StepResult[] = [];
  const completedSteps: string[] = [];

  try {
    // Validate initial state
    await validateDependencies({
      includeMilk: input.includeMilk,
      includeSugar: input.includeSugar,
      includeSalt: input.includeSalt,
      teabagCount: input.teabagCount,
      cupEmpty: input.cupEmpty,
    });

    // Execute each tea step in sequence
    const steps = [
      'boilWater',
      'placeTeabag',
      'cupMashTea',
      'cupAddMilk',
      'cupAddSugar',
      'cupAddSalt',
      'selfDrinkCup',
    ];

    for (const stepName of steps) {
      try {
        // Check if this step should be skipped
        if (stepName === 'cupAddMilk' && !input.includeMilk) {
          results.push({
            stepName,
            status: 'skipped',
            message: 'Milk not requested',
            timestamp: Date.now(),
          });
          continue;
        }

        if (stepName === 'cupAddSugar' && !input.includeSugar) {
          results.push({
            stepName,
            status: 'skipped',
            message: 'Sugar not requested',
            timestamp: Date.now(),
          });
          continue;
        }

        if (stepName === 'cupAddSalt' && !input.includeSalt) {
          results.push({
            stepName,
            status: 'skipped',
            message: 'Salt not requested',
            timestamp: Date.now(),
          });
          continue;
        }

        // Execute the step
        const result = await executeTeaStep({
          stepName,
          previousSteps: completedSteps,
          input,
        });

        results.push({
          stepName,
          status: 'completed',
          message: result.message,
          timestamp: Date.now(),
        });

        completedSteps.push(stepName);

        // Update UI with progress
        await updateUIState({
          currentStep: stepName,
          progress: (completedSteps.length / steps.length) * 100,
          results,
        });
      } catch (stepErr) {
        const errorMessage = stepErr instanceof Error ? stepErr.message : String(stepErr);

        results.push({
          stepName,
          status: 'failed',
          message: errorMessage,
          timestamp: Date.now(),
        });

        throw ApplicationFailure.create({
          message: `Tea process failed at step ${stepName}: ${errorMessage}`,
          type: 'TeaProcessError',
        });
      }
    }

    // Final success
    await updateUIState({
      currentStep: 'completed',
      progress: 100,
      results,
    });

    return results;
  } catch (err) {
    throw ApplicationFailure.create({
      message: `Tea process workflow failed: ${err instanceof Error ? err.message : String(err)}`,
      type: 'WorkflowError',
    });
  }
}
