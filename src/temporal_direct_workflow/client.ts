import { Connection, Client } from '@temporalio/client';
import { teaMakingWorkflow, WorkflowInput, WorkflowOutput } from './workflow';

export interface WorkflowHandle {
  workflowId: string;
  signal: (signal: string) => Promise<void>;
  result: () => Promise<WorkflowOutput>;
  terminate: () => Promise<void>;
}

class TemporalClient {
  private client: Client | null = null;

  async connect(): Promise<void> {
    const connection = await Connection.connect({ address: 'localhost:7233' });
    this.client = new Client({ connection });
  }

  async startWorkflow(input: WorkflowInput): Promise<WorkflowHandle> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    const workflowId = `tea-workflow-${Date.now()}`;

    const handle = await this.client.workflow.start(teaMakingWorkflow, {
      args: [input],
      taskQueue: 'tea-making',
      workflowId,
    });

    return {
      workflowId,
      signal: async (signal: string) => {
        const workflowHandle = this.client!.workflow.getHandle(workflowId);
        await workflowHandle.signal(signal);
      },
      result: async () => {
        const workflowHandle = this.client!.workflow.getHandle(workflowId);
        return await workflowHandle.result();
      },
      terminate: async () => {
        const workflowHandle = this.client!.workflow.getHandle(workflowId);
        await workflowHandle.terminate();
      },
    };
  }
}

export const temporalClient = new TemporalClient();