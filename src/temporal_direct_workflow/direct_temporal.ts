import { FUNCTIONS, TeaStateManager } from '../script';
import { temporalClient, WorkflowHandle, TeaState } from './client';

export class DirectTemporalProcessHandler {
  private isRunning = false;
  private workflowHandle: WorkflowHandle | null = null;
  private statusCheckInterval: number | null = null;
  private previousCompletedCount = 0;
  private uiStateListener: (() => void) | null = null;

  constructor(
    private stateManager: TeaStateManager,
    private completedFunctions: string[]
  ) {}

  init() {
    this.attachStartListener();
    this.attachStopListener();
    this.attachStateChangeListeners();
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

  private attachStateChangeListeners() {
    // Listen to counter changes
    const counterButtons = document.querySelectorAll('.counter-btn');
    counterButtons.forEach(button => {
      button.addEventListener('click', () => {
        setTimeout(() => this.sendStateUpdate(), 50);
      });
    });

    // Listen to toggle changes
    const toggles = document.querySelectorAll('.toggle');
    toggles.forEach(toggle => {
      toggle.addEventListener('click', () => {
        setTimeout(() => this.sendStateUpdate(), 50);
      });
    });
  }

  private async sendStateUpdate() {
    if (!this.isRunning || !this.workflowHandle) return;

    try {
      const newState = {
        hotWater: parseInt(document.getElementById('hotWater')?.textContent || '0'),
        coldWater: parseInt(document.getElementById('coldWater')?.textContent || '0'),
        teabag: parseInt(document.getElementById('teabag')?.textContent || '0'),
        sugar: parseInt(document.getElementById('sugar')?.textContent || '0'),
        milk: parseInt(document.getElementById('milk')?.textContent || '0'),
        salt: parseInt(document.getElementById('salt')?.textContent || '0'),
        kettleCups: parseInt(document.getElementById('kettleCups')?.textContent || '0'),
        toggleMilk: document.getElementById('toggleMilk')?.classList.contains('active') || false,
        toggleSugar: document.getElementById('toggleSugar')?.classList.contains('active') || false,
        toggleSalt: document.getElementById('toggleSalt')?.classList.contains('active') || false,
        toggleCupCounter: document.getElementById('toggleCupCounter')?.classList.contains('active') || false,
        toggleBoiled: document.getElementById('toggleBoiled')?.classList.contains('active') || false,
        toggleSwitchedOn: document.getElementById('toggleSwitchedOn')?.classList.contains('active') || false,
        toggleEmpty: document.getElementById('toggleEmpty')?.classList.contains('active') || false,
        toggleMashed: document.getElementById('toggleMashed')?.classList.contains('active') || false,
        toggleStirred: document.getElementById('toggleStirred')?.classList.contains('active') || false,
        toggleDrunk: document.getElementById('toggleDrunk')?.classList.contains('active') || false,
      };

      await this.workflowHandle.updateState(newState);
    } catch (error) {
      console.error('Error updating state:', error);
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
      const teaInput = {
        teaState: {
          hotWater: parseInt(document.getElementById('hotWater')?.textContent || '0'),
          coldWater: parseInt(document.getElementById('coldWater')?.textContent || '0'),
          teabag: parseInt(document.getElementById('teabag')?.textContent || '0'),
          sugar: parseInt(document.getElementById('sugar')?.textContent || '0'),
          milk: parseInt(document.getElementById('milk')?.textContent || '0'),
          salt: parseInt(document.getElementById('salt')?.textContent || '0'),
          kettleCups: parseInt(document.getElementById('kettleCups')?.textContent || '0'),
          toggleMilk: document.getElementById('toggleMilk')?.classList.contains('active') || false,
          toggleSugar: document.getElementById('toggleSugar')?.classList.contains('active') || false,
          toggleSalt: document.getElementById('toggleSalt')?.classList.contains('active') || false,
          toggleCupCounter: document.getElementById('toggleCupCounter')?.classList.contains('active') || false,
          toggleBoiled: document.getElementById('toggleBoiled')?.classList.contains('active') || false,
          toggleSwitchedOn: document.getElementById('toggleSwitchedOn')?.classList.contains('active') || false,
          toggleEmpty: document.getElementById('toggleEmpty')?.classList.contains('active') || false,
          toggleMashed: document.getElementById('toggleMashed')?.classList.contains('active') || false,
          toggleStirred: document.getElementById('toggleStirred')?.classList.contains('active') || false,
          toggleDrunk: document.getElementById('toggleDrunk')?.classList.contains('active') || false,
        },
      };

      this.workflowHandle = await temporalClient.startWorkflow(teaInput);

      this.statusCheckInterval = window.setInterval(async () => {
        if (!this.workflowHandle) return;
        
        try {
          const { completedFunctions, state } = await this.workflowHandle.getProgress();
          
          // Check for newly completed functions
          const newFunctions = completedFunctions.slice(this.previousCompletedCount);
          for (const fn of newFunctions) {
            if (!fn.includes('_skipped')) {
              this.completedFunctions.push(fn);
              this.highlightFunction(fn);
              this.showMessage(`✓ ${fn} completed`, 'success');
            } else {
              const fnName = fn.replace('_skipped', '');
              this.highlightFunction(fnName);
              this.showMessage(`⊘ ${fnName} skipped`, 'success');
            }
          }
          
          this.previousCompletedCount = completedFunctions.length;

          // Always sync state to UI every poll
          if (state && Object.keys(state).length > 0) {
            this.syncStateToUI(state);
          }
        } catch (error) {
          console.error('Error polling progress:', error);
        }
      }, 200);

      const result = await this.workflowHandle.result();

      if (result.status === 'completed') {
        this.showMessage('All steps completed!', 'success');
      } else if (result.status === 'stopped') {
        this.showMessage('Workflow stopped by user', 'error');
      } else if (result.status === 'failed') {
        this.showMessage(`Workflow failed after retries: ${result.errors.join(', ')}`, 'error');
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

  private syncStateToUI(state: any) {
    if (!state) return;

    // Update counters
    if (state.hotWater !== undefined) {
      const el = document.getElementById('hotWater');
      if (el) el.textContent = state.hotWater.toString();
    }
    if (state.coldWater !== undefined) {
      const el = document.getElementById('coldWater');
      if (el) el.textContent = state.coldWater.toString();
    }
    if (state.teabag !== undefined) {
      const el = document.getElementById('teabag');
      if (el) el.textContent = state.teabag.toString();
    }
    if (state.sugar !== undefined) {
      const el = document.getElementById('sugar');
      if (el) el.textContent = state.sugar.toString();
    }
    if (state.milk !== undefined) {
      const el = document.getElementById('milk');
      if (el) el.textContent = state.milk.toString();
    }
    if (state.salt !== undefined) {
      const el = document.getElementById('salt');
      if (el) el.textContent = state.salt.toString();
    }
    if (state.kettleCups !== undefined) {
      const el = document.getElementById('kettleCups');
      if (el) el.textContent = state.kettleCups.toString();
    }

    // Update toggles
    const toggleIds = [
      'toggleMilk', 'toggleSugar', 'toggleSalt', 'toggleCupCounter',
      'toggleBoiled', 'toggleSwitchedOn', 'toggleEmpty', 'toggleMashed',
      'toggleStirred', 'toggleDrunk'
    ];

    toggleIds.forEach(id => {
      const stateKey = id as keyof typeof state;
      if (state[stateKey] !== undefined) {
        const el = document.getElementById(id);
        if (el) {
          if (state[stateKey]) {
            el.classList.add('active');
          } else {
            el.classList.remove('active');
          }
        }
      }
    });
  }

  private updateUIState(state: any) {
    // Deprecated - use syncStateToUI instead
    this.syncStateToUI(state);
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
    this.showMessage('Ready to start. Set Tea Requests and click Start. (You can update values during execution)', 'process-info');
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
    this.previousCompletedCount = 0;
    document.querySelectorAll('.function-item').forEach((item) => {
      item.classList.remove('highlight');
    });
  }
}