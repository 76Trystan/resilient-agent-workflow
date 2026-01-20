// Currently a test file to try out the Ollama integration

import { ChatOllama } from "@langchain/community/chat_models/ollama";

const model = new ChatOllama({
  model: "llama3.1:8b",
  temperature: 0,
});

export async function plannerAgent(input: string): Promise<string> {
  const response = await model.invoke([
    {
      role: "system",
      content: "You are a planning agent. Produce a short actionable plan.",
    },
    {
      role: "user",
      content: input,
    },
  ]);

  return response.content;
}

export async function executorAgent(plan: string): Promise<string> {
  const response = await model.invoke([
    {
      role: "system",
      content: "You are an execution agent. Execute the plan and summarize the result.",
    },
    {
      role: "user",
      content: plan,
    },
  ]);

  return response.content;
}
