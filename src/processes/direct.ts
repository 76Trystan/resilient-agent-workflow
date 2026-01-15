import { FUNCTIONS, FUNCTION_ACTIONS, TeaStateManager } from '../script'

export class DirectProcessHandler {
    private currentStep = 0;
    private isRunning = false;
    private interval: number | null = null;

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

    private start() {
        if (this.isRunning) return;

        this.isRunning = true;
        const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
        const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
        if (startBtn) startBtn.disabled = true;
        if (stopBtn) stopBtn.disabled = false;
        this.showMessage('Starting direct process...', 'process-info');

        this.interval = window.setInterval(() => {
            this.executeStep();
        }, 1000);
    }

    stop() {
        this.isRunning = false;
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }

        this.stateManager.reset();
        this.resetProcessState();
        const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
        const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
        this.showMessage('Direct process stopped and reset.', 'error');
    }

    private checkDependencies(functionName: string) {
        const func = FUNCTIONS.find(f => f.name === functionName);
        if (!func) return { valid: false, missing: [] };

        const missing: string[] = [];
        for (const dep of func.dependencies) {
            if (dep === 'toggleMilk') {
                if (!document.getElementById('toggleMilk')?.classList.contains('active')) {
                    missing.push('Milk toggle must be ON');
                }
            } else if (dep === 'toggleSugar') {
                if (!document.getElementById('toggleSugar')?.classList.contains('active')) {
                    missing.push('Sugar toggle must be ON');
                }
            } else if (dep === 'toggleSalt') {
                if (!document.getElementById('toggleSalt')?.classList.contains('active')) {
                    missing.push('Salt toggle must be ON');
                }
            } else if (!this.completedFunctions.includes(dep)) {
                missing.push(`${dep} must be completed first`);
            }
        }

        return { valid: missing.length === 0, missing };
    }

    private executeStep() {
        if (this.currentStep >= FUNCTIONS.length) {
            this.showMessage('All steps completed!', 'success');
            this.isRunning = false;
            if (this.interval) {
                clearInterval(this.interval);
                this.interval = null;
            }
            const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
            const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
            if (startBtn) startBtn.disabled = false;
            if (stopBtn) stopBtn.disabled = true;
            return;
        }

        const func_1 = FUNCTIONS[this.currentStep];
        if (func_1.name === 'selfDrinkCup' && document.getElementById('toggleEmpty')?.classList.contains('active')) {
            this.showMessage('oh no cup empty', 'error');
            this.stop();
            return;
        }

        if (func_1.name === 'cupMashTea' && parseInt(document.getElementById('teabag')?.textContent || '0') === 0) {
            this.showMessage('oh no there is no teabag', 'error');
            this.stop();
            return;
        }

        while (this.currentStep < FUNCTIONS.length) {
            const func = FUNCTIONS[this.currentStep];

            if (func.name === 'cupAddMilk' && !document.getElementById('toggleMilk')?.classList.contains('active')) {
                this.completedFunctions.push(func.name);
                this.highlightFunction(func.name);
                this.showMessage(`⊘ ${func.name} skipped (Milk not requested)`, 'success');
                this.currentStep++;
                continue;
            }
            if (func.name === 'cupAddSugar' && !document.getElementById('toggleSugar')?.classList.contains('active')) {
                this.completedFunctions.push(func.name);
                this.highlightFunction(func.name);
                this.showMessage(`${func.name} skipped (Sugar not requested)`, 'success');
                this.currentStep++;
                continue;
            }
            if (func.name === 'cupAddSalt' && !document.getElementById('toggleSalt')?.classList.contains('active')) {
                this.completedFunctions.push(func.name);
                this.highlightFunction(func.name);
                this.showMessage(`${func.name} skipped (Salt not requested)`, 'success');
                this.currentStep++;
                continue;
            }

            break;
        }

        if (this.currentStep >= FUNCTIONS.length) {
            this.showMessage('All steps completed!', 'success');
            this.isRunning = false;
            if (this.interval) {
                clearInterval(this.interval);
                this.interval = null;
            }
            const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
            const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
            if (startBtn) startBtn.disabled = false;
            if (stopBtn) stopBtn.disabled = true;
            return;
        }

        const func = FUNCTIONS[this.currentStep];
        const depCheck = this.checkDependencies(func.name);

        if (!depCheck.valid) {
            this.showMessage(`Error: dependency required: ${depCheck.missing.join(', ')}`, 'error');
            this.stop();
            return;
        }

        const actions = FUNCTION_ACTIONS[func.name];
        if (actions) {
            if (actions.toggles) {
                for (const [toggleId, value] of Object.entries(actions.toggles)) {
                    const el = document.getElementById(toggleId);
                    if (el) {
                        if (value) {
                            el.classList.add('active');
                        } else {
                            el.classList.remove('active');
                        }
                    }
                }
            }

            if (actions.counters) {
                for (const [counterId, delta] of Object.entries(actions.counters)) {
                    const el = document.getElementById(counterId);
                    if (el) {
                        let value = parseInt(el.textContent || '0');
                        value = Math.max(0, value + (delta as number));
                        el.textContent = value.toString();
                    }
                }
            }
        }

        this.completedFunctions.push(func.name);
        this.highlightFunction(func.name);
        this.showMessage(` ${func.name} completed`, 'success');
        this.currentStep++;
    }

    private highlightFunction(functionName: string) {
    document.querySelectorAll('.function-item').forEach(item => {
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
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
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