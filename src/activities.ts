import { readFile, writeFile } from "fs/promises";
import path from "path";
import { sabotageTeaState } from "./sabotage.ts";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Use process.cwd() to get project root
const dataFilePath = path.join(process.cwd(), 'data.json');

// Helper function to read current state
async function readTeaState() {
  try {
    const content = await readFile(dataFilePath, 'utf-8');
    const data = JSON.parse(content);
    return data.teaState || data;
  } catch (error) {
    console.error('Error reading tea state:', error);
    return null;
  }
}

// Helper function to write updated state
async function writeTeaState(state: Record<string, any>) {
  try {
    const data = {
      teaState: state
    };
    
    await writeFile(
      dataFilePath,
      JSON.stringify(data, null, 2),
      'utf-8'
    );
    console.log('Tea state updated:', state);
  } catch (error) {
    console.error('Error writing tea state:', error);
  }
}

export const activities = {
  async selfGetCup(): Promise<void> {
    await sleep(1000);
    console.log('selfGetCup');
    const state = await readTeaState();
    if (state) {
      state.toggleCupCounter = true;
      await writeTeaState(state);
    }
  },

  async kettleFill(): Promise<any> {
    console.log('kettleFill STARTED');
    await sleep(1000);
    console.log('kettleFill started');
    const state = await readTeaState();
    console.log('Current state:', state);
    
    if (state) {
      state.kettleCups += 1;
      console.log('After increment, kettleCups:', state.kettleCups);
      
      await writeTeaState(state);
      console.log('State written to file with kettleCups:', state.kettleCups);
      
      // Wait 1.5 seconds before sabotage so you can see the change
      console.log('Waiting 1.5 seconds before sabotage...');
      await sleep(1500);
      console.log('1.5 seconds passed, NOW calling sabotage...');
      
      // Sabotage: subtract 1 from kettleCups right after filling
      try {
        await sabotageTeaState(state);
        console.log('===================================')
        console.log('Sabotage complete');
        console.log('===================================')
        
        // Read the state back from file to get the sabotaged version
        await sleep(500);
        const sabotageState = await readTeaState();
        console.log('State read after sabotage, kettleCups now:', sabotageState?.kettleCups);
        
        return sabotageState || state;
      } catch (error) {
        console.error('Sabotage failed:', error);
        return state;
      }
    }
    return state;
  },

  async kettleTurnOn(): Promise<void> {
    await sleep(1000);
    console.log('kettleTurnOn - Checking preconditions');
    const state = await readTeaState();
    
    if (state) {
      // ✨ NEW: Validate that kettle has water
      if (state.kettleCups < 1) {
        const errorMsg = `ERROR: Cannot turn on kettle without water! kettleCups = ${state.kettleCups}. Agent failed to recover state.`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      console.log('Kettle has water (kettleCups:', state.kettleCups + '), turning on');
      state.toggleSwitchedOn = true;
      await writeTeaState(state);
    }
  },

  async kettleWaitWhistle(): Promise<void> {
    await sleep(1000);
    console.log('kettleWaitWhistle');
    const state = await readTeaState();
    if (state) {
      state.toggleBoiled = true;
      await writeTeaState(state);
    }
  },

  async cupAddTeabag(): Promise<void> {
    await sleep(1000);
    console.log('cupAddTeabag');
    const state = await readTeaState();
    if (state) {
      state.teabag += 1;
      await writeTeaState(state);
    }
  },

  async cupAddWater(): Promise<void> {
    await sleep(1000);
    console.log('cupAddWater');
    const state = await readTeaState();
    if (state) {
      state.hotWater += 1;
      await writeTeaState(state);
    }
  },

  async cupMashTea(): Promise<void> {
    await sleep(1000);
    console.log('cupMashTea');
    const state = await readTeaState();
    if (state) {
      state.toggleMashed = true;
      await writeTeaState(state);
    }
  },

  async cupRemoveTeabag(): Promise<void> {
    await sleep(1000);
    console.log('cupRemoveTeabag');
    const state = await readTeaState();
    if (state) {
      state.teabag -= 1;
      await writeTeaState(state);
    }
  },

  async cupAddMilk(): Promise<void> {
    await sleep(1000);
    console.log('cupAddMilk');
    const state = await readTeaState();
    if (state) {
      state.milk += 1;
      await writeTeaState(state);
    }
  },

  async cupAddSugar(): Promise<void> {
    await sleep(1000);
    console.log('cupAddSugar');
    const state = await readTeaState();
    if (state) {
      state.sugar += 1;
      await writeTeaState(state);
    }
  },

  async cupAddSalt(): Promise<void> {
    await sleep(1000);
    console.log('cupAddSalt');
    const state = await readTeaState();
    if (state) {
      state.salt += 1;
      await writeTeaState(state);
    }
  },

  async cupStir(): Promise<void> {
    await sleep(1000);
    console.log('cupStir');
    const state = await readTeaState();
    if (state) {
      state.toggleStirred = true;
      await writeTeaState(state);
    }
  },

  async selfDrinkCup(): Promise<void> {
    await sleep(1000);
    console.log('selfDrinkCup');
    const state = await readTeaState();
    if (state) {
      state.toggleDrunk = true;
      await writeTeaState(state);
    }
  },

  async selfEmptyCup(): Promise<void> {
    await sleep(1000);
    console.log('selfEmptyCup');
    const state = await readTeaState();
    if (state) {
      state.hotWater = 0;
      state.coldWater = 0;
      state.milk = 0;
      state.sugar = 0;
      state.salt = 0;
      state.toggleEmpty = true;
      await writeTeaState(state);
    }
  },

  async selfTidyUp(): Promise<void> {
    await sleep(1000);
    console.log('selfTidyUp');
    const state = await readTeaState();
    if (state) {
      state.toggleCupCounter = false;
      await writeTeaState(state);
    }
  },

  async selfCorrect(activityName: string, stateAfterActivity: Record<string, any>): Promise<{ corrected: boolean; message: string }> {
    if (activityName !== 'kettleFill') {
      return { corrected: false, message: '' };
    }

    const kettleCups = stateAfterActivity.kettleCups;
    
    if (kettleCups < 1) {
      console.log(
        `Self-correct detected issue: kettleFill expected kettleCups => 1, but it is ${kettleCups}`
      );

      stateAfterActivity.kettleCups = 1;
      await writeTeaState(stateAfterActivity);
      console.log('=================================================================================================')
      console.log(`Self-correct function called and successfully fixed issue: kettleCups corrected to previous count`);
      console.log('=================================================================================================')

      
      return { corrected: true, message: 'kettleCups corrected from ' + kettleCups + ' to previous count' };
    }

    return { corrected: false, message: '' };
  },
};

export type Activities = typeof activities;