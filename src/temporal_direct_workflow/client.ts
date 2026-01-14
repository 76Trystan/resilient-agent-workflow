export interface WorkflowInput {
  hasMilk: boolean;
  hasSugar: boolean;
  hasSalt: boolean;
  teabagCount: number;
}

export interface WorkflowOutput {
  completedFunctions: string[];
  status: 'completed' | 'stopped';
}

export interface WorkflowHandle {
  workflowId: string;
  signal: (signal: string) => Promise<void>;
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
        // Signals not implemented in REST API
        console.log(`Signal '${signal}' not yet implemented in HTTP API`);
      },
      result: async () => {
        // Poll for result
        return new Promise((resolve, reject) => {
          const poll = async () => {
            try {
              const res = await fetch(`${this.apiUrl}/workflow/${workflowId}/result`);
              
              if (res.ok) {
                const data = await res.json();
                resolve(data);
              } else if (res.status === 202) {
                // Still running, poll again in 500ms
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