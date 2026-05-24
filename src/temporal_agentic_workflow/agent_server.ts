import express from 'express';
import { Connection, Client } from '@temporalio/client';
import { teaMakingWorkflow } from './agent_workflow.ts';
import { promises as fsPromises } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
const workflowActivities = new Map<string, string[]>();

async function initializeClient() {
  try {
    const connection = await Connection.connect({ address: 'localhost:7233' });
    client = new Client({ connection });
    console.log()
    console.log("=============================")
    console.log('| Temporal client connected |');
    console.log("=============================")

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
      taskQueue: 'tea-making-agentic',
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
    const handle = workflowHandles.get(workflowId);
    const state = workflowState.get(workflowId) || {};

    if (!handle) {
      return res.json({ completedFunctions: [], state });
    }

    try {
      const completedFunctions = await handle.query('getCompletedFunctions');
      res.json({ completedFunctions, state });
    } catch {
      // Workflow may have just completed and handle is stale
      res.json({ completedFunctions: [], state });
    }
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
        res.json(parsedData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read data' });
    }
});

// Reset tea state API
app.post('/api/tea/reset', async (req, res) => {
    try {
        const filePath = './data.json';
        const resetData = {
            teaState: {
                hotWater: 0,
                coldWater: 0,
                teabag: 0,
                sugar: 0,
                milk: 0,
                salt: 0,
                kettleCups: 0,
                toggleMilk: false,
                toggleSugar: false,
                toggleSalt: false,
                toggleCupCounter: false,
                toggleBoiled: false,
                toggleSwitchedOn: false,
                toggleEmpty: false,
                toggleMashed: false,
                toggleStirred: false,
                toggleDrunk: false
            }
        };
        await fs.writeFile(filePath, JSON.stringify(resetData, null, 2), 'utf-8');
        res.json({ success: true, ...resetData });
    } catch (error) {
        console.error('Error resetting tea state:', error);
        res.status(500).json({ error: 'Failed to reset data' });
    }
});

// Update tea state API
app.post('/api/tea/update', async (req, res) => {
    try {
        const { teaState } = req.body;
        const filePath = './data.json';
        
        const data = {
            teaState: teaState
        };
        
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
        res.json({ success: true, teaState });
    } catch (error) {
        console.error('Error updating tea state:', error);
        res.status(500).json({ error: 'Failed to update data' });
    }
});

// Static files (AFTER all API routes)
app.use(express.static(path.join(__dirname, '../')));

// Catch-all route for HTML (AFTER static files)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

const PORT = 3001;

initializeClient().then(() => {
  app.listen(PORT, () => {
    console.log();
    console.log(`Server running on http://localhost:${PORT}`);
  });
});