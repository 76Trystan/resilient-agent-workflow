# Resilient Workflows with Temporal & Agent Recovery - Cuppa Tea Example

A proof-of-concept demonstrating **Temporal-based deterministic workflow execution** with 
**optional agent-assisted error recovery** using TypeScript, LangChain, and Ollama.

## Overview

This project showcases four different approaches to workflow orchestration, from manual UI-driven 
steps to fully automated deterministic workflows with LLM-powered recovery.

**Important:** This is a simplified demo using a toy tea-making domain. The agent recovery system 
has significant limitations (see Known Limitations below).

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

**Happy Path:** Workflow executes successfully without errors
- All activities succeed
- State remains consistent
- No agent intervention needed
- Workflow completes normally

**Unhappy Path (Agentic Only):** Workflow encounters errors or corrupted state
- Activities fail or produce invalid state
- Triggers detect anomalies
- Agents invoke to diagnose and fix issues
- Workflow retries with corrected state
- Can still reach completion successfully



---

## Architecture

```
kettleFill Activity
    ↓
Sabotage (demo only, controlled by enableSabotage flag)
    ↓
kettleTurnOn Activity
    ↓
Activity Fails? (if kettleCups < 1)
    ├─ NO → Continue to next activity
    └─ YES → Check Triggers & Invoke Agent (up to 3 retries)
        ↓
    LLM Analysis & Correction
        ↓
    Retry kettleTurnOn
```

## Process & Workflows

This project consists of the following 4 workflows and processes:

### 1. Manual Process
   This Demonstrates steps to make a cup of tea as a manual process, in Cuppa-Tea UI, maunal process involves manually clicking through each step of the procedure.

### 2. Direct Process (Client-Side Automation)
Like the manual process but automatically executes steps client-side every 1 second.
Uses UI state updates, NOT Temporal. Not suitable for long-running or distributed scenarios.

### 3. Direct Workflow
    Direct Workflow is a carbon copy of direct process, only difference here is it is defined as a workflow using the Temporal Framework for durable execution.

**Note:** Self-correction logic exists but is currently disabled (`enableSelfCorrect = false`). 
When enabled, it provides basic checks only for kettleFill activity.

### 4. Agentic Workflow
    The Agentic workflow is like direct workflow, a workflow run by the Temporal Framework, however when errors/triggeres are encountered during the workflow, an agent is invoked mid-workflow to fix any issues or changes, ultimately putting the workflow back on a happy path.

---

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
SABOTAGE (Demo): kettleCups = 1 → 0 (state corruption)
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

### Trigger-Based Agent Invocation (Currently Limited)
Agents activate for specific failure scenarios:
- Currently supports kettleCups corruption detection (2 triggers defined)
- Triggers only evaluate on kettleTurnOn activity
- Not generalized for arbitrary state anomalies

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

---

## Example Workflow (Temporal UI)

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

## Prerequisites & Notes

- **Temporal Server**: Running on `localhost:7233`
- **Ollama**: Running on `localhost:11434` with `llama3.1:8b` model
```bash
  ollama pull llama3.1:8b
  ollama serve
```
- **Node.js**: 18+ with npm

### Architecture Notes

Two separate Express servers:
- **Port 3000**: Direct temporal workflow server (`src/temporal_direct_workflow/server.ts`)
- **Port 3001**: Agentic temporal workflow server (`src/temporal_agentic_workflow/agent_server.ts`)

Both share the same Temporal backend but use different workers and task queues.

--- 

## Setup & Installation

### 1. NPM Installation

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

## Known Limitations & Future Improvements

### Agent Recovery
- Agent only invokes for `kettleTurnOn` activity failures
- Only 2 triggers defined (`kettleCups_corrupted`, `kettleTurnOn_no_water`)
- Small LLM model (llama3.1:8b) may produce invalid JSON or hallucinated field names
- No validation of LLM output before applying corrections
- Confidence scoring is advisory; corrections apply if confidence > 0.3 regardless of actual validity

### State Management
- Single file-based state (data.json) - not suitable for concurrent workflows
- No transaction semantics - state can be inconsistent between activities
- Sabotage is hardcoded into kettleFill activity, not truly random/external

### Workflow Constraints
- Manual process is UI-heavy and not scalable
- Direct process doesn't use Temporal semantics, just polling
- Only 15 sequential activities - complex workflows need better modeling

### Critical Issues
1. **Agent Robustness**: No fallback when LLM returns invalid JSON
2. **Trigger Coverage**: Only 2 scenarios; most errors unhandled
3. **Concurrent Workflows**: File-based state breaks with >1 workflow
4. **State Validation**: Invalid corrections silently ignored

### Recommended Fixes
- Replace file-based state with database (PostgreSQL, etc.)
- Add JSON schema validation for LLM output
- Implement comprehensive error trigger patterns
- Use larger, more capable LLM (gpt-4, etc.)
- Add transaction-like semantics for multi-activity operations
- Queue-based state updates instead of direct file writes

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
