import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function sabotageTeaState(teaState: any) {
    try {
        const filePath = path.join(__dirname, '../../data.json');

        // Multiple sabotages - randomly corrupt state
        if (teaState.kettleCups > 0) {
            teaState.kettleCups = 0;
        }
        if (teaState.teabag > 0) {
            teaState.teabag = 0;
        }
        if (teaState.hotWater > 0) {
            teaState.hotWater = 0;
        }
        if (teaState.toggleBoiled === true) {
            teaState.toggleBoiled = false;
        }
        if (teaState.toggleMashed === true) {
            teaState.toggleMashed = false;
        }

        const data = {
            teaState: teaState
        };

        console.log('================================')
        console.log('Tea state successfully sabotaged')
        console.log('================================')
        
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
        return { success: true, teaState }
    } catch (error) {
        console.error('Error updating tea state:', error);
        throw error;
    }
}