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
}

export interface WorkflowOutput {
  completedFunctions: string[];
  status: 'completed' | 'stopped';
  finalState: TeaState;
}

export interface WorkflowInput {
  teaState: TeaState;
}

export interface WorkflowHandle {
  workflowId: string;
  signal: (signal: string) => Promise<void>;
  getProgress: () => Promise<{ completedFunctions: string[]; state: TeaState }>;
  result: () => Promise<WorkflowOutput>;
  terminate: () => Promise<void>;
}

class BrowserTemporalClient {
  private apiUrl = 'http://localhost:3000/api';

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/health`);
      const data = await response.json();
      return data.temporalConnected;
    } catch {
      return false;
    }
  }

  async startWorkflow(input: WorkflowInput): Promise<WorkflowHandle> {
    const response = await fetch(`${this.apiUrl}/workflow/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error('Failed to start workflow');
    }

    const { workflowId } = await response.json();

    return {
      workflowId,
      signal: async (signal: string) => {
        console.log(`Signal '${signal}' not yet implemented in HTTP API`);
      },
      getProgress: async () => {
        const res = await fetch(`${this.apiUrl}/workflow/${workflowId}/progress`);
        if (res.ok) {
          const data = await res.json();
          return { completedFunctions: data.completedFunctions, state: data.state };
        }
        return { completedFunctions: [], state: {} as TeaState };
      },
      result: async () => {
        return new Promise((resolve, reject) => {
          const poll = async () => {
            try {
              const res = await fetch(`${this.apiUrl}/workflow/${workflowId}/result`);
              
              if (res.ok) {
                const data = await res.json();
                resolve(data);
              } else if (res.status === 202) {
                setTimeout(poll, 500);
              } else {
                reject(new Error('Failed to get workflow result'));
              }
            } catch (error) {
              reject(error);
            }
          };
          poll();
        });
      },
      terminate: async () => {
        const response = await fetch(`${this.apiUrl}/workflow/${workflowId}/terminate`, {
          method: 'POST',
        });

        if (!response.ok) {
          throw new Error('Failed to terminate workflow');
        }
      },
    };
  }
}

export const temporalClient = new BrowserTemporalClient();