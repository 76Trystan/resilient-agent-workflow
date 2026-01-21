import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataFilePath = path.join(__dirname, '../../data.json');

// Define what each activity should change
const ACTIVITY_EXPECTATIONS: Record<string, Record<string, number | string>> = {
  kettleFill: { kettleCups: 'greaterThan', value: 1 },
};

interface TeaState {
  kettleCups: number;
  teabag: number;
  hotWater: number;
  milk: number;
  sugar: number;
  salt: number;
  [key: string]: any;
}

// async function readTeaState(): Promise<TeaState | null> {
//   try {
//     const content = await fs.readFile(dataFilePath, 'utf-8');
//     const data = JSON.parse(content);
//     return data.teaState || data;
//   } catch (error) {
//     console.error('Error reading tea state:', error);
//     return null;
//   }
// }

async function writeTeaState(state: TeaState): Promise<void> {
  try {
    const data = {
      teaState: state
    };
    await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing tea state:', error);
  }
}

export async function selfCorrect(
  activityName: string,
  stateBeforeActivity: TeaState,
  stateAfterActivity: TeaState
): Promise<{ corrected: boolean; fixes: string[] }> {
  const fixes: string[] = [];
  const expectation = ACTIVITY_EXPECTATIONS[activityName];

  if (!expectation) {
    return { corrected: false, fixes: [] };
  }

  // For kettleFill, check if kettleCups > 1
  if (activityName === 'kettleFill') {
    const expectedKey = 'kettleCups' as keyof TeaState;
    const actual = stateAfterActivity[expectedKey] as number;
    const minExpected = 1;

    if (actual <= minExpected) {
      console.log(`Self-correct detected issue: ${activityName} expected kettleCups > ${minExpected}, but it is ${actual}`);

      // Fix it by setting to the minimum expected value
      stateAfterActivity[expectedKey] = minExpected + 1; // Set to at least 2
      fixes.push(`kettleCups: corrected from ${actual} to ${stateAfterActivity[expectedKey]}`);
    }
  }

  // If we found issues, apply fixes and write back to file
  if (fixes.length > 0) {
    await writeTeaState(stateAfterActivity);
    console.log('================================================================================')
    console.log(`Self-correct function called and successfully fixed issue: ${fixes.join(', ')}`);
    console.log('================================================================================')

    return { corrected: true, fixes };
  }

  return { corrected: false, fixes: [] };
}