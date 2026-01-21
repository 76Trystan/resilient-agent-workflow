import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { sabotageTeaState } from "./sabotage.ts";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataFilePath = path.join(__dirname, '../../data.json');

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

async function writeTeaState(state: Record<string, any>) {
  try {
    const data = { teaState: state };
    await writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log('Tea state updated');
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
    await sleep(1000);
    console.log('⏱️ kettleFill STARTED');
    const state = await readTeaState();
    
    if (state) {
      state.kettleCups += 1;
      console.log('After increment, kettleCups:', state.kettleCups);
      await writeTeaState(state);
      console.log('✅ State written to file with kettleCups:', state.kettleCups);
      
      console.log('⏳ Waiting 1.5 seconds before sabotage...');
      await sleep(1500);
      console.log('⏳ 1.5 seconds passed, NOW calling sabotage...');
      
      try {
        const result = await sabotageTeaState('kettleFill');
        console.log('Sabotage complete:', result.sabotaged);
        return state;
      } catch (error) {
        console.error('Sabotage failed:', error);
        return state;
      }
    }
    return state;
  },

  async kettleTurnOn(): Promise<void> {
    await sleep(1000);
    console.log('kettleTurnOn');
    const state = await readTeaState();
    if (state) {
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

  async cupAddTeabag(): Promise<any> {
    await sleep(1000);
    console.log('cupAddTeabag');
    const state = await readTeaState();
    
    if (state) {
      state.teabag += 1;
      await writeTeaState(state);
      await sleep(1500);
      
      try {
        await sabotageTeaState('cupAddTeabag');
        return state;
      } catch (error) {
        console.error('Sabotage failed:', error);
        return state;
      }
    }
    return state;
  },

  async cupAddWater(): Promise<any> {
    await sleep(1000);
    console.log('cupAddWater');
    const state = await readTeaState();
    
    if (state) {
      state.hotWater += 1;
      await writeTeaState(state);
      await sleep(1500);
      
      try {
        await sabotageTeaState('cupAddWater');
        return state;
      } catch (error) {
        console.error('Sabotage failed:', error);
        return state;
      }
    }
    return state;
  },

  async cupMashTea(): Promise<any> {
    await sleep(1000);
    console.log('cupMashTea');
    const state = await readTeaState();
    
    if (state) {
      state.toggleMashed = true;
      await writeTeaState(state);
      await sleep(1500);
      
      try {
        await sabotageTeaState('cupMashTea');
        return state;
      } catch (error) {
        console.error('Sabotage failed:', error);
        return state;
      }
    }
    return state;
  },

  async cupRemoveTeabag(): Promise<void> {
    await sleep(1000);
    console.log('cupRemoveTeabag');
    const state = await readTeaState();
    if (state) {
      state.teabag = Math.max(0, state.teabag - 1);
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

  async cupStir(): Promise<any> {
    await sleep(1000);
    console.log('cupStir');
    const state = await readTeaState();
    
    if (state) {
      state.toggleStirred = true;
      await writeTeaState(state);
      await sleep(1500);
      
      try {
        await sabotageTeaState('cupStir');
        return state;
      } catch (error) {
        console.error('Sabotage failed:', error);
        return state;
      }
    }
    return state;
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
      state.toggleEmpty = true;
      state.hotWater = 0;
      state.coldWater = 0;
      state.milk = 0;
      state.sugar = 0;
      state.salt = 0;
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

  async agentFixState(activityName: string, state: Record<string, any>, issues: string[]): Promise<boolean> {
    console.log(`🤖 Agent activity called for ${activityName}`);
    console.log(`Issues to fix: ${issues.join(', ')}`);
    
    try {
      const { agentFixState: agentFix } = await import('./agent_activities.ts');
      return agentFix(activityName, state, issues);
    } catch (error) {
      console.error(`Failed to call agent: ${(error as Error).message}`);
      throw error;
    }
  },
};

export type Activities = typeof activities;