import { startTeaProcess, getWorkflowStatus } from '../client';

export class DirectTemporalProcessHandler {
  private workflowId: string | null = null;
  private currentStep = 0;
  private isRunning = false;

  constructor(
    private stateManager: any,
    private completedFunctions: string[]
  ) {}

  init() {
    this.attachStartListener();
    this.attachStopListener();
  }

  private attachStartListener() {
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.startWithTemporal());
    }
  }

  private attachStopListener() {
    const stopBtn = document.getElementById('stopBtn');
    if (stopBtn) {
      stopBtn.addEventListener('click', () => this.stop());
    }
  }

  private async startWithTemporal() {
    if (this.isRunning) return;

    this.isRunning = true;
    const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
    const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
    if (startBtn) startBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;

    this.showMessage('Starting tea process via Temporal...', 'process-info');

    try {
      const includeMilk = document.getElementById('toggleMilk')?.classList.contains('active') || false;
      const includeSugar = document.getElementById('toggleSugar')?.classList.contains('active') || false;
      const includeSalt = document.getElementById('toggleSalt')?.classList.contains('active') || false;
      const teabagCount = parseInt(document.getElementById('teabag')?.textContent || '0');
      const cupEmpty = document.getElementById('toggleEmpty')?.classList.contains('active') || false;

      const requestId = `${Date.now()}`;
      const handle = await startTeaProcess(
        requestId,
        includeMilk,
        includeSugar,
        includeSalt,
        teabagCount,
        cupEmpty
      );

      this.workflowId = handle.workflowId;
      this.showMessage(`Workflow started: ${this.workflowId}`, 'process-info');

      // Poll for results
      const result = await handle.result();
      this.showMessage('Tea process completed successfully!', 'success');
      console.log('Workflow results:', result);

      this.isRunning = false;
      if (startBtn) startBtn.disabled = false;
      if (stopBtn) stopBtn.disabled = true;
    } catch (error) {
      this.showMessage(`Error: ${error instanceof Error ? error.message : String(error)}`, 'error');
      this.stop();
    }
  }

  private stop() {
    this.isRunning = false;
    this.resetProcessState();
    const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
    const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;
    this.showMessage('Process stopped.', 'error');
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

  private resetProcessState() {
    this.currentStep = 0;
    this.completedFunctions.length = 0;
    document.querySelectorAll('.function-item').forEach(item => {
      item.classList.remove('highlight');
    });
  }

  reset() {
    this.resetProcessState();
    this.isRunning = false;
    const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
    const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;
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
}