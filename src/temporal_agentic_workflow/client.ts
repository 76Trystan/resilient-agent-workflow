import { Connection, Client } from '@temporalio/client';

export interface WorkflowHandle {
  workflowId: string;
  updateState(newState: any): Promise<void>;
  logActivity(activity: string): Promise<void>;
  getProgress(): Promise<{ completedFunctions: string[]; state: any }>;
  result(): Promise<any>;
  terminate(): Promise<void>;
}

export interface TeaState {
  hotWater: number;
  coldWater: number;
  teabag: number;
  sugar: number;
  milk: number;
  salt: number;
  kettleCups: number;
  toggleMilk: boolean;
  toggleSugar: boolean;
  toggleSalt: boolean;
  toggleCupCounter: boolean;
  toggleBoiled: boolean;
  toggleSwitchedOn: boolean;
  toggleEmpty: boolean;
  toggleMashed: boolean;
  toggleStirred: boolean;
  toggleDrunk: boolean;
}

let client: Client | null = null;

async function getClient(): Promise<Client> {
  if (client) {
    return client;
  }

  const connection = await Connection.connect({ address: 'localhost:7233' });
  client = new Client({ connection });
  return client;
}

export const temporalClient = {
  async checkConnection(): Promise<boolean> {
    try {
      const c = await getClient();
      await c.connection.getServerVersion();
      return true;
    } catch {
      return false;
    }
  },

  async startWorkflow(input: { teaState: TeaState }): Promise<WorkflowHandle> {
    const c = await getClient();
    const { teaMakingAgentWorkflow } = await import('./agent_workflow.ts');

    const handle = await c.workflow.start(teaMakingAgentWorkflow, {
      args: [input],
      taskQueue: 'tea-making',
      workflowId: `tea-agent-workflow-${Date.now()}`,
    });

    const workflowId = handle.workflowId;
    const completedFunctions: string[] = [];

    return {
      workflowId,
      async updateState(newState: any) {
        await handle.signal('updateState', newState);
      },
      async logActivity(activity: string) {
        completedFunctions.push(activity);
      },
      async getProgress() {
        try {
          const result = await handle.result();
          return {
            completedFunctions: result.completedFunctions || [],
            state: result.finalState || {},
          };
        } catch {
          return { completedFunctions, state: {} };
        }
      },
      async result() {
        return handle.result();
      },
      async terminate() {
        await handle.terminate();
      },
    };
  },
};

export type { WorkflowHandle };