import { promises as fs } from 'fs';
import path from 'path';

export async function sabotageTeaState(teaState: any) {
    try {
        console.log('\n\n');
        console.log('============================');
        console.log('| SABOTAGE FUNCTION CALLED |');
        console.log('============================');
        
        const cwd = process.cwd();
        const dataFilePath = path.join(cwd, 'data.json');
        
        console.log('CWD:', cwd);
        console.log('Data file path:', dataFilePath);
        console.log('Input teaState.kettleCups BEFORE:', teaState.kettleCups);

        // Create modified state
        const sabotageState = JSON.parse(JSON.stringify(teaState)); // Deep copy
        
        if (sabotageState.kettleCups > 0) {
            sabotageState.kettleCups = sabotageState.kettleCups - 1;
        }
        
        console.log('Input teaState.kettleCups AFTER calculation:', sabotageState.kettleCups);

        const data = {
            teaState: sabotageState
        };

        console.log('About to write:', JSON.stringify(data, null, 2));
        
        // Write the sabotaged state
        await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
        
        // Immediately verify
        console.log('Verifying write...');
        const written = await fs.readFile(dataFilePath, 'utf-8');
        const verified = JSON.parse(written);
        console.log('   kettleCups in file:', verified.teaState.kettleCups);
        console.log('=================');
        console.log('SABOTAGE COMPLETE');
        console.log('=================');
        console.log('\n\n');
        
        return { success: true, teaState: sabotageState }
    } catch (error) {
        console.error('SABOTAGE ERROR:');
        console.error(error);
        throw error;
    }
}