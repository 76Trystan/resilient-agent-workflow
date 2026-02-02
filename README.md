# Resilient Workflows with Temporal & Agent Recovery - Cuppa Tea Example

A proof-of-concept demonstrating deterministic & resilient workflow execution with intelligent agent-based error/change recovery using Temporal, TypeScript, LangChain, and Ollama.

## Overview

This project showcases how these workflows can handle both happy and unhappy paths through intelligent agent intervention. It serves as a reference implementation for building resilient, self-healing workflows that can automatically detect and recover from state corruption or change without manual intervention.

## The Problem Space

In distributed workflow systems, transient failures, data corruption, and state anomalies can occur unpredictably during long running processes. Traditional approaches rely on either manual intervention or rigid, hardcoded recovery logic that doesn't scale, each new failure pattern requires code changes. This creates a bottleneck in resilience.

A potential solution to this space is a Tomporal workflow that uses an Agent within the workflow to detect changes, correct back to a happy path, and deciding what changed states within the workflow reqired the workflow to even restart fully.

---

## Core Concepts

### Deterministic Workflows

A deterministic workflow is a workflow that:

- Produces identical results given the same inputs and execution history
- Is reproducible across failures and restarts
- Has explicit control flow - no external randomness or non-deterministic calls
- Can replay history - Temporal stores all decisions and can rebuild state from history

This implementation demonstrates these principles:

```
Input State → Activity 1 → Activity 2 → ... → Activity N → Final State
```
Given the same input state, the workflow will always execute the same sequence of activities and produce the same output.

### Happy Path vs Unhappy Path
Happy Path: Workflow executes successfully without errors

- All activities succeed
- State remains consistent
- No agent intervention needed
- Workflow completes normally

### Unhappy Path: Workflow encounters errors or corrupted state

- Activities fail or produce invalid state
- Triggers detect anomalies
- Agents invoke to diagnose and fix issues
- Workflow retries with corrected state
- Can still reach completion successfully

---

## Architecture

```
Start Workflow
    ↓
Execute Activity
    ↓
Check for State Corruption (Triggers, Errors or State Checks)
    ├─ Happy Path: Continue to next activity
    └─ Unhappy Path: Invoke Agent
            ↓
        LLM Analysis (via Ollama)
            ↓
        Decide Recovery Action
            ↓
        Persist Correction
            ↓
        Retry Activity
    ↓
Complete Workflow
```

### Components

- Temporal Server: Orchestrates durable workflow execution, manages history, ensures determinism
- Workflow: Orchestration logic, defines the sequence of activities and decision points
- Activities: Individual work units that modify state and persist changes to disk
- Triggers: A mix of detection functions and mock errors that trigger invokeAgent.
- Recovery Agent: Uses LLM to analyze corrupted state and decide on recovery actions
- LLM (Ollama): Provides intelligent analysis and decision-making for recovery
- Persistent State (data.json): Single source of truth for workflow state

---

### Happy Path Example

```
kettleFill: kettleCups = 0 → 1
    ↓
Trigger Check: kettleCups >= 1? YES
    ↓
kettleTurnOn: Succeeds (water available)
    ↓
Workflow continues normally
    ↓
Final State: Valid, Workflow Completes Successfully
```
Characteristics: No agent invocation, No error handling needed, Direct path to completion & Minimal latency.

### Unhappy Path Example

```
kettleFill: kettleCups = 0 → 1
    ↓
SABOTAGE: kettleCups = 1 → 0 (state corruption)
    ↓
Trigger Check: kettleCups >= 1? NO → TRIGGER FIRES
    ↓
Agent Invoked: Analyzes state corruption
    ↓
LLM Decision: "kettleCups was corrupted, restore to 1"
    ↓
State Persisted: kettleCups = 1
    ↓
kettleTurnOn: Retry succeeds (water now available)
    ↓
Workflow continues from recovery point
    ↓
Final State: Valid, Workflow Completes Successfully
```
Characteristics: Intelligent recovery/adaption, State is corrected mid-workflow, Workflow recovers and completes, Demonstrates resilience

---

## Key Features

### Deterministic Execution
Every workflow execution is deterministic:

- Same inputs → Same execution path
- Failures can be replayed
- History is preserved and auditable
- State transitions are explicit and traceable

### Trigger-Based Agent Invocation
Agents only activate when needed:

- Continuous state validation
- Automatic anomaly detection
- Recovery without manual intervention
- Audit trail of all corrections

### LLM-Powered Recovery
Recovery decisions are intelligent:

- Analyzes actual corrupted state
- Considers context and history
- Suggests specific corrections
- Provides confidence scoring
- Fallback to rule-based recovery if LLM fails

### Retry Logic
Failed activities can be retried:

- Agent fixes state between retries
- Explicit retry limits prevent infinite loops
- State persists across retry attempts
- Workflow can recover and continue

### Example Workflow (Temporal UI)

A Typical Happy path within the Temporal UI would look like the following:

<img width="1380" height="560" alt="HappyPath" src="https://github.com/user-attachments/assets/4cd0a0d6-72b3-49cb-b197-5f7f6e7f623e" />

However, when something changes or an error occurs that could potentially stop or paused the workflow, it will look like this:

<img width="1381" height="318" alt="UnhappyPath" src="https://github.com/user-attachments/assets/0766381a-6471-4fef-a04d-7bb50371ac5b" />

With the addition of the recovery agent, we can see how an unhappy path can be fixed by the agent:

<img width="1388" height="625" alt="AgentPath" src="https://github.com/user-attachments/assets/a58df373-5a53-4fff-891b-aa6623953253" />

Behind the scenes in this example we can see the quantiy of water (kettleCups) is removed right before kettleTurnOn is executed, this causes an error. We can see here exactly what the agent is detecting and acting upon when an error/trigger arises.

This here is the error prompted to the agent, as well as its immediate response:

<img width="484" height="249" alt="input" src="https://github.com/user-attachments/assets/115cc09e-0bb6-4093-8cf8-cecf5478a88e" />

After the agent acts upon the problem, this is the result:

<img width="663" height="267" alt="result" src="https://github.com/user-attachments/assets/dd02178f-1dc5-4462-8300-935618e02a98" />

This demonstrates the agent’s intelligent analysis and decision-making in response to encountered errors. In this example, a mock error "kettleTurnOn_no_water" is triggered, prompting the agent to investigate and respond. Due to constraints such as using a very small language model, extensive system prompting is required to ensure the agent reacts appropriately to the error. In a larger-scale environment, a more powerful language model could interpret arbitrary error codes and take appropriate action without such heavy prompting.



---

## Tech Stack
Runtime & Orchestration:

- Temporal Server: Workflow orchestration and history
- Temporal SDK (TypeScript): Workflow implementation
- Node.js: Activity and server execution

State Management:

- data.json: Persistent state store
- File-based for simplicity and observability

Agent & LLM Frameworks

- LangChain: LLM framework and orchestration
- Ollama: Local LLM inference (llama3.1:8b)
- HTTP-based communication on port 11434

Web Interface:

- Express.js: API server
- Vite: Frontend development and bundling
- TypeScript

## Project Structure

```
src/
 ┣ processes/
 ┃ ┣ direct.ts
 ┃ ┗ manual.ts
 ┣ temporal_agentic_workflow/
 ┃ ┣ agent.ts
 ┃ ┣ agent_activities.ts
 ┃ ┣ agent_config.ts
 ┃ ┣ agent_memory.ts
 ┃ ┣ agent_server.ts
 ┃ ┣ agent_temporal.ts
 ┃ ┣ agent_worker.ts
 ┃ ┣ agent_workflow.ts
 ┃ ┣ client.ts
 ┃ ┣ direct_temporal.ts
 ┃ ┗ trigger.ts
 ┣ temporal_direct_workflow/
 ┃ ┣ client.ts
 ┃ ┣ direct_temporal.ts
 ┃ ┣ self_correct.ts
 ┃ ┣ server.ts
 ┃ ┣ worker.ts
 ┃ ┗ workflow.ts
 ┣ activities.ts
 ┣ index.html
 ┣ sabotage.ts
 ┗ script.ts
 ```
---

## Workflow Comparison

### Direct Workflow (Temporal)

 ```
// No agent, requires recorvery function for each failure.
try {
  await kettleFill();
  await kettleTurnOn();  // Fails if kettleCups < 1
} catch (error) {
  // Workflow fails, manual intervention needed
}
 ```

Limitations:

- Path Recovery requires dependency checks and recovery functions for each problem potentially encounters (Not Scalable).
- Unhappy paths most likely lead to workflow failure.

### Agentic Workflow (Temporal)

 ```
// With agent recovery
try {
  await kettleFill();
} catch (error) {
  // Agent analyzes and fixes corruption
  await agentRecovery();
  // Retry kettleTurnOn with corrected state
}
 ```
 Limitations:
 
 - Agent Tools
 - Needs powerful model

--- 

## Setup

### 1. Installation

```
npm install
```

### 2. Start Backend
```
<from project directory> touch data.json
```

### 3. Start Backend
   
```
npm run start:all
```

### 4. Start Frontend

```
npm run dev
```
---

## MIT License

MIT License

Copyright (c) 2026 76Trystan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
