import { Worker } from '@temporalio/worker';
import * as activities from './activities.ts';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function runWorker() {
  const worker = await Worker.create({
    workflowsPath: join(__dirname, 'workflows.ts'),
    activities,
    namespace: 'default',
    taskQueue: 'tea-process',
  });

  console.log('Tea process worker started');
  await worker.run();
}