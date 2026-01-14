import { FUNCTIONS, FUNCTION_ACTIONS, TeaStateManager } from '../script';
import { temporalClient, WorkflowHandle } from './client';

export class DirectTemporalProcessHandler {
  private isRunning = false;
  private workflowHandle: WorkflowHandle | null = null;
  private statusCheckInterval: number | null = null;

  constructor(
    private stateManager: TeaStateManager,
    private completedFunctions: string[]
  ) {}

  init() {
    this.attachStartListener();
    this.attachStopListener();
  }

  private attachStartListener() {
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.start());
    }
  }

  private attachStopListener() {
    const stopBtn = document.getElementById('stopBtn');
    if (stopBtn) {
      stopBtn.addEventListener('click', () => this.stop());
    }
  }

  private async start() {
    if (this.isRunning) return;

    this.isRunning = true;
    const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
    const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;

    if (startBtn) startBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;

    this.showMessage('Starting temporal workflow...', 'process-info');

    try {
      // Prepare input from UI state
      const teaInput = {
        hasMilk: document.getElementById('toggleMilk')?.classList.contains('active') || false,
        hasSugar: document.getElementById('toggleSugar')?.classList.contains('active') || false,
        hasSalt: document.getElementById('toggleSalt')?.classList.contains('active') || false,
        teabagCount: parseInt(document.getElementById('teabag')?.textContent || '0'),
      };

      // Start the workflow
      this.workflowHandle = await temporalClient.startWorkflow(teaInput);

      // Poll for completed functions
      this.statusCheckInterval = window.setInterval(async () => {
        // In a real implementation, you'd query workflow state
        // For now, we'll listen to the result when it completes
      }, 1000);

      // Wait for result
      const result = await this.workflowHandle.result();

      // Process the result
      this.completedFunctions.length = 0;
      result.completedFunctions.forEach((fn) => {
        if (!fn.includes('_skipped')) {
          this.completedFunctions.push(fn);
          this.highlightFunction(fn);
          this.showMessage(`✓ ${fn} completed`, 'success');
        } else {
          const fnName = fn.replace('_skipped', '');
          this.highlightFunction(fnName);
          this.showMessage(`⊘ ${fnName} skipped`, 'success');
        }
      });

      if (result.status === 'completed') {
        this.showMessage('All steps completed!', 'success');
      } else {
        this.showMessage('Workflow stopped', 'error');
      }

      this.cleanup();
    } catch (error) {
      this.showMessage(`Error: ${(error as Error).message}`, 'error');
      this.cleanup();
    }
  }

  async stop() {
    if (!this.workflowHandle) return;

    try {
      await this.workflowHandle.terminate();
      this.showMessage('Workflow stopped', 'error');
    } catch (error) {
      console.error('Error stopping workflow:', error);
    }

    this.cleanup();
  }

  private cleanup() {
    this.isRunning = false;
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }

    const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
    const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;

    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;

    this.workflowHandle = null;
  }

  private highlightFunction(functionName: string) {
    document.querySelectorAll('.function-item').forEach((item) => {
      const element = item as HTMLElement;
      if (element.dataset.function === functionName) {
        element.classList.add('highlight');
      }
    });
  }

  private showMessage(text: string, type: 'error' | 'success' | 'process-info') {
    const messageDiv = document.getElementById('processMessage');
    if (!messageDiv) return;

    messageDiv.textContent = text;
    messageDiv.classList.add('active');

    if (type === 'error') {
      messageDiv.className = 'message active error-message';
    } else if (type === 'success') {
      messageDiv.className = 'message active success-message';
    } else if (type === 'process-info') {
      messageDiv.className = 'message active process-info';
    }
  }

  enable() {
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    if (startBtn) startBtn.style.display = 'block';
    if (stopBtn) stopBtn.style.display = 'block';
    this.reset();
    this.showMessage('Ready to start. Set Tea Requests and click Start.', 'process-info');
  }

  disable() {
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const processMessage = document.getElementById('processMessage');
    if (startBtn) startBtn.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'none';
    if (processMessage) processMessage.classList.remove('active');
  }

  reset() {
    this.isRunning = false;
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }
    const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
    const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;
    this.completedFunctions.length = 0;
    document.querySelectorAll('.function-item').forEach((item) => {
      item.classList.remove('highlight');
    });
  }
}