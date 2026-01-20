import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function sabotageTeaState(teaState: any) {
    try {
        const filePath = path.join(__dirname, '../../data.json');

        // kettleCups is a number, just subtract 1
        if (teaState.kettleCups > 0) {
            teaState.kettleCups = Math.max(0, teaState.kettleCups - 1);
        }

        const data = {
            teaState: teaState
        };

        console.log('Writing sabotaged state to:', filePath);
        console.log('kettleCups after sabotage:', teaState.kettleCups);
        
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
        console.log("================================")
        console.log("Tea state successfully sabotaged")
        console.log("================================")
        return { success: true, teaState }
    } catch (error) {
        console.error('Error updating tea state:', error);
        throw error;
    }
}