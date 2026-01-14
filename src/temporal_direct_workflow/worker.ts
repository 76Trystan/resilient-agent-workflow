import { Worker } from '@temporalio/worker';
import * as workflow from './workflow.ts';
import { activities } from './activities.ts';

export async function startWorker() {
  const worker = await Worker.create({
    workflowsPath: new URL('./workflow.ts', import.meta.url).pathname,
    activities,
    taskQueue: 'tea-making',
  });

  await worker.run();
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  startWorker().catch((err) => {
    console.error('Worker failed:', err);
    process.exit(1);
  });
}