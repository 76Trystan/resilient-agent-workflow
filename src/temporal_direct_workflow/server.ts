import express from 'express';
import { Connection, Client } from '@temporalio/client';
import { teaMakingWorkflow } from './workflow.ts';

interface WorkflowInput {
  hasMilk: boolean;
  hasSugar: boolean;
  hasSalt: boolean;
  teabagCount: number;
}

const app = express();
app.use(express.json());

let client: Client | null = null;
const workflowHandles = new Map<string, any>();

// Initialize Temporal client
async function initializeClient() {
  try {
    const connection = await Connection.connect({ address: 'localhost:7233' });
    client = new Client({ connection });
    console.log('========== Temporal client connected ==========');
  } catch (error) {
    console.error('Failed to connect to Temporal:', error);
  }
}

// Start workflow
app.post('/api/workflow/start', async (req, res) => {
  if (!client) {
    return res.status(503).json({ error: 'Temporal client not connected' });
  }

  try {
    const input: WorkflowInput = req.body;
    const workflowId = `tea-workflow-${Date.now()}`;

    const handle = await client.workflow.start(teaMakingWorkflow, {
      args: [input],
      taskQueue: 'tea-making',
      workflowId,
    });

    workflowHandles.set(workflowId, handle);

    res.json({ workflowId, status: 'started' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get workflow result
app.get('/api/workflow/:workflowId/result', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const handle = workflowHandles.get(workflowId);

    if (!handle) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    try {
      const result = await handle.result();
      workflowHandles.delete(workflowId);
      res.json(result);
    } catch (error) {
      // Workflow still running
      res.status(202).json({ error: 'Workflow still running' });
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Terminate workflow
app.post('/api/workflow/:workflowId/terminate', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const handle = workflowHandles.get(workflowId);

    if (!handle) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    await handle.terminate();
    workflowHandles.delete(workflowId);
    res.json({ status: 'terminated' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    temporalConnected: client !== null 
  });
});

// Start server
const PORT = 3000;

initializeClient().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});