import express from 'express';
import { Connection, Client } from '@temporalio/client';
import { teaMakingWorkflow } from './workflow.ts';
import { readFile } from "fs";
import { promises as fsPromises } from 'fs'; // Import the promises API



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
    toggleCupCounter: boolean;
    toggleBoiled: boolean;
    toggleSwitchedOn: boolean;
    toggleEmpty: boolean;
    toggleMashed: boolean;
    toggleStirred: boolean;
    toggleDrunk: boolean;
  };
}

async function readFileAsync(filePath: string) {
  try {
    const data = await fsPromises.readFile(filePath, { encoding: 'utf-8' });
    return data;
  } catch (error) {
    console.error('Error reading file:', error);
  }
}

// Example usage:
readFileAsync('yourfile.txt');

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
const workflowActivities = new Map<string, string[]>(); // Track completed activities per workflow

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

app.post('/api/workflow/:workflowId/update-state', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const newState = req.body;
    const handle = workflowHandles.get(workflowId);

    if (!handle) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const currentState = workflowState.get(workflowId) || {};
    Object.assign(currentState, newState);
    workflowState.set(workflowId, currentState);

    await handle.signal('updateState', newState);

    res.json({ status: 'state-updated', state: currentState });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/workflow/:workflowId/log-activity', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { activity } = req.body;

    if (!activity) {
      return res.status(400).json({ error: 'Activity name required' });
    }

    let activities = workflowActivities.get(workflowId) || [];
    if (!activities.includes(activity)) {
      activities.push(activity);
      workflowActivities.set(workflowId, activities);
    }

    res.json({ status: 'logged', completedFunctions: activities });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/workflow/:workflowId/progress', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const completedFunctions = workflowActivities.get(workflowId) || [];
    const state = workflowState.get(workflowId) || {};
    res.json({ completedFunctions, state });
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

app.get('/api/tea', async (req, res) => {
    try {
        const teaData = await readFileAsync('./data.json');
        if (!teaData) {
            res.status(404).json({ error: 'Data not found' });
            return;
        }
        const parsedData = JSON.parse(teaData);
        //console.log(typeof())
        res.json({parsedData}); // mopdify to return only values in the object
    } catch (error) {
        res.status(500).json({ error: 'Failed to read data' });
    }
});


const PORT = 3000;

initializeClient().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});