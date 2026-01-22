export interface AgentAction {
  timestamp: number;
  triggerName: string;
  agentType: string;
  action: string;
  success: boolean;
  confidence: number;
  reasoning: string;
  llmUsed: boolean; // Track if LLM was used or fallback
}

export class AgentMemory {
  private actions: AgentAction[] = [];
  private readonly maxHistory = 1000;

  recordAction(
    triggerName: string,
    agentType: string,
    action: string,
    success: boolean,
    confidence: number,
    reasoning: string,
    llmUsed: boolean = true
  ): void {
    this.actions.push({
      timestamp: Date.now(),
      triggerName,
      agentType,
      action,
      success,
      confidence,
      reasoning,
      llmUsed,
    });

    if (this.actions.length > this.maxHistory) {
      this.actions = this.actions.slice(-this.maxHistory);
    }
  }

  getSuccessRate(triggerName: string): number {
    const relevant = this.actions.filter(a => a.triggerName === triggerName);
    if (relevant.length === 0) return 0;
    
    const successful = relevant.filter(a => a.success).length;
    return successful / relevant.length;
  }

  getLLMUsageStats() {
    const total = this.actions.length;
    const llmUsed = this.actions.filter(a => a.llmUsed).length;
    const fallbackUsed = total - llmUsed;

    return {
      total,
      llmUsed,
      fallbackUsed,
      llmPercentage: total > 0 ? (llmUsed / total) * 100 : 0,
    };
  }

  getHistory(): AgentAction[] {
    return [...this.actions];
  }

  getRecentActions(count: number = 10): AgentAction[] {
    return this.actions.slice(-count);
  }
}