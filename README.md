# Cuppa-Tea-Example with Temporal

The Cuppa-Tea Project Demonstrates the key differences between Direct Temporal Processes and an Agentic Temporal Process (A Temporal workflow with an agent in the loop).

### The Problem Space

In distributed workflow systems, transient failures, data corruption, and state anomalies can occur unpredictably during long running processes. Traditional approaches rely on either manual intervention or rigid, hardcoded recovery logic that doesn't scale, each new failure pattern requires code changes. This creates a bottleneck in resilience.

A potential solution to this space is a Tomporal workflow that uses an Agent within the workflow to detect changes, correct back to a happy path, and deciding what changed states within the workflow reqired the workflow to even restart fully.

---

## About this Demo

The system uses intentional sabotage to simulate real world failures, testing whether the agent can identify and correct issues without human intervention or pre-programmed logic.

---

## Setup

#### 1. Temporal Server
   
```
temporal server start-dev
```

### 2. Temporal Worker 

```
cd src
npm run worker
```

#### 3. Run Server  

```
npm run server
```

#### 4. Frontend UI

```
npm run dev
```

---