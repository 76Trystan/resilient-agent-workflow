import { Worker } from '@temporalio/worker';
import * as workflow from './workflow';
import { activities } from './activities';

export async function startWorker() {
  const worker = await Worker.create({
    workflowsPath: require.resolve('./workflow'),
    activities,
    taskQueue: 'tea-making',
  });

  await worker.run();
}

if (require.main === module) {
  startWorker().catch((err) => {
    console.error('Worker failed:', err);
    process.exit(1);
  });
}