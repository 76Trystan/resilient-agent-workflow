import { Worker } from '@temporalio/worker';
import * as workflow from './agent_workflow.ts';
import { activities } from '../activities.ts';
import { agentActivities } from './agent_activities.ts';

export async function startWorker() {
  const worker = await Worker.create({
    workflowsPath: new URL('./agent_workflow.ts', import.meta.url).pathname,
    activities: {
      ...activities,
      ...agentActivities,
    },
    taskQueue: 'tea-making-agentic',
  });

  await worker.run();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startWorker().catch((err) => {
    console.error('Worker failed:', err);
    process.exit(1);
  });
}