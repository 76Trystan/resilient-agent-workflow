# Deterministic Workflows with Temporal & LLM-Powered Agent Recovery

A proof-of-concept demonstrating deterministic workflow execution with intelligent agent-based error/change recovery using Temporal, TypeScript, LangChain, and Ollama.

## Overview

This project showcases how deterministic workflows can handle both happy and unhappy paths through intelligent agent intervention. It serves as a reference implementation for building resilient, self-healing workflows that can automatically detect and recover from state corruption without manual intervention.

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
npm run start:all
```

### 3. Start Frontend

```
npm run dev
```
---