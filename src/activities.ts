import { ApplicationFailure } from '@temporalio/common';
import type { TeaProcessInput, StepResult } from './workflows';

export interface StepExecutionInput {
  stepName: string;
  previousSteps: string[];
  input: TeaProcessInput;
}

export interface StepExecutionResult {
  message: string;
  stateChanges?: Record<string, unknown>;
}

export interface UIUpdateInput {
  currentStep: string;
  progress: number;
  results: StepResult[];
}

// Simulated state for activities
const teaState = {
  waterBoiled: false,
  teabagInCup: false,
  cupCleaned: false,
  milkAdded: false,
  sugarAdded: false,
  saltAdded: false,
};

export async function executeTeaStep(input: StepExecutionInput): Promise<StepExecutionResult> {
  const { stepName, previousSteps, input: teaInput } = input;

  // Validate dependencies based on step
  switch (stepName) {
    case 'boilWater':
      teaState.waterBoiled = true;
      return { message: 'Water boiled successfully' };

    case 'placeTeabag':
      if (!teaState.waterBoiled) {
        throw new Error('Water must be boiled first');
      }
      if (teaInput.teabagCount === 0) {
        throw new Error('No teabags available');
      }
      teaState.teabagInCup = true;
      return { message: 'Teabag placed in cup' };

    case 'cupMashTea':
      if (!teaState.teabagInCup) {
        throw new Error('Teabag must be in cup first');
      }
      return { message: 'Tea mashed' };

    case 'cupAddMilk':
      if (!teaInput.includeMilk) {
        throw new Error('Milk not requested');
      }
      teaState.milkAdded = true;
      return { message: 'Milk added' };

    case 'cupAddSugar':
      if (!teaInput.includeSugar) {
        throw new Error('Sugar not requested');
      }
      teaState.sugarAdded = true;
      return { message: 'Sugar added' };

    case 'cupAddSalt':
      if (!teaInput.includeSalt) {
        throw new Error('Salt not requested');
      }
      teaState.saltAdded = true;
      return { message: 'Salt added' };

    case 'selfDrinkCup':
      if (teaInput.cupEmpty) {
        throw new Error('Cup is empty - cannot drink');
      }
      return { message: 'Tea consumed' };

    default:
      throw new Error(`Unknown step: ${stepName}`);
  }
}

export async function validateDependencies(input: {
  includeMilk: boolean;
  includeSugar: boolean;
  includeSalt: boolean;
  teabagCount: number;
  cupEmpty: boolean;
}): Promise<void> {
  if (input.teabagCount === 0) {
    throw ApplicationFailure.create({
      message: 'No teabags available',
      type: 'MissingDependencyError',
    });
  }

  if (input.cupEmpty) {
    throw ApplicationFailure.create({
      message: 'Cup is empty',
      type: 'InvalidStateError',
    });
  }
}

export async function updateUIState(input: UIUpdateInput): Promise<void> {
  // This activity communicates with the browser UI
  // In a real implementation, this would send updates to a server
  // that broadcasts to the browser client
  console.log(`UI Update - Step: ${input.currentStep}, Progress: ${input.progress}%`);
  console.log('Results:', input.results);
}