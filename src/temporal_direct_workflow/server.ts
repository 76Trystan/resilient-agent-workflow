import express from 'express';
import { Connection, Client } from '@temporalio/client';
import { teaMakingWorkflow } from './workflow.ts';

interface WorkflowInput {
  teaState: {
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
  };
}

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

let client: Client | null = null;
const workflowHandles = new Map<string, any>();
const workflowProgress = new Map<string, string[]>();
const workflowState = new Map<string, any>();

async function initializeClient() {
  try {
    const connection = await Connection.connect({ address: 'localhost:7233' });
    client = new Client({ connection });
    console.log('✓ Temporal client connected');
  } catch (error) {
    console.error('Failed to connect to Temporal:', error);
  }
}

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
    workflowProgress.set(workflowId, []);
    workflowState.set(workflowId, input.teaState);

    res.json({ workflowId, status: 'started' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/workflow/:workflowId/progress', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const progress = workflowProgress.get(workflowId) || [];
    const state = workflowState.get(workflowId) || {};
    res.json({ completedFunctions: progress, state });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/workflow/:workflowId/result', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const handle = workflowHandles.get(workflowId);

    if (!handle) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    try {
      const result = await handle.result();
      workflowState.set(workflowId, result.finalState);
      workflowHandles.delete(workflowId);
      res.json(result);
    } catch (error) {
      res.status(202).json({ error: 'Workflow still running' });
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

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

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    temporalConnected: client !== null 
  });
});

const PORT = 3000;

initializeClient().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});