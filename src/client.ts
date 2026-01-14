import { Connection, Client } from '@temporalio/client';
import { teaProcessWorkflow, type TeaProcessInput } from './workflows';

export async function startTeaProcess(
  requestId: string,
  includeMilk: boolean,
  includeSugar: boolean,
  includeSalt: boolean,
  teabagCount: number,
  cupEmpty: boolean
) {
  const connection = await Connection.connect({ address: 'localhost:7233' });
  const client = new Client({ connection, namespace: 'default' });

  const input: TeaProcessInput = {
    requestId,
    includeMilk,
    includeSugar,
    includeSalt,
    teabagCount,
    cupEmpty,
  };

  const handle = await client.workflow.start(teaProcessWorkflow, {
    args: [input],
    taskQueue: 'tea-process',
    workflowId: `tea-${requestId}`,
  });

  console.log(`Started workflow: ${handle.workflowId}`);
  return handle;
}

export async function getWorkflowStatus(workflowId: string) {
  const connection = await Connection.connect({ address: 'localhost:7233' });
  const client = new Client({ connection, namespace: 'default' });

  const handle = client.workflow.getHandle(workflowId);
  const result = await handle.result();

  return result;
}