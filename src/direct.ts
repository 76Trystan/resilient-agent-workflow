// Direct Process Module
class DirectProcessHandler {
    constructor(stateManager, completedFunctions) {
        this.stateManager = stateManager;
        this.completedFunctions = completedFunctions;
        this.currentStep = 0;
        this.isRunning = false;
        this.interval = null;
    }

    init() {
        this.attachStartListener();
        this.attachStopListener();
    }

    attachStartListener() {
        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.start());
        }
    }

    attachStopListener() {
        const stopBtn = document.getElementById('stopBtn');
        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.stop());
        }
    }

    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        document.getElementById('startBtn').disabled = true;
        document.getElementById('stopBtn').disabled = false;
        this.showMessage('Starting direct process...', 'process-info');

        this.interval = setInterval(() => {
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
        document.getElementById('startBtn').disabled = false;
        document.getElementById('stopBtn').disabled = true;
        this.showMessage('Direct process stopped and reset.', 'error');
    }

    checkDependencies(functionName) {
        const func = FUNCTIONS.find(f => f.name === functionName);
        if (!func) return { valid: false, missing: [] };

        const missing = [];
        for (const dep of func.dependencies) {
            if (dep === 'toggleMilk') {
                if (!document.getElementById('toggleMilk').classList.contains('active')) {
                    missing.push('Milk toggle must be ON');
                }
            } else if (dep === 'toggleSugar') {
                if (!document.getElementById('toggleSugar').classList.contains('active')) {
                    missing.push('Sugar toggle must be ON');
                }
            } else if (dep === 'toggleSalt') {
                if (!document.getElementById('toggleSalt').classList.contains('active')) {
                    missing.push('Salt toggle must be ON');
                }
            } else if (!this.completedFunctions.includes(dep)) {
                missing.push(`${dep} must be completed first`);
            }
        }

        return { valid: missing.length === 0, missing };
    }

    executeStep() {
        if (this.currentStep >= FUNCTIONS.length) {
            this.showMessage('All steps completed!', 'success');
            this.isRunning = false;
            clearInterval(this.interval);
            this.interval = null;
            document.getElementById('startBtn').disabled = false;
            document.getElementById('stopBtn').disabled = true;
            return;
        }

        // Check if trying to drink from an empty cup
        const func_1 = FUNCTIONS[this.currentStep];
        if (func_1.name === 'selfDrinkCup' && document.getElementById('toggleEmpty').classList.contains('active')) {
            this.showMessage('oh no cup empty', 'error');
            this.stop();
            return;
        }

        // Check if trying to mash tea with no teabag
        if (func_1.name === 'cupMashTea' && parseInt(document.getElementById('teabag').textContent) === 0) {
            this.showMessage('oh no there is no teabag', 'error');
            this.stop();
            return;
        }

        // Skip functions if their toggle conditions aren't met
        while (this.currentStep < FUNCTIONS.length) {
            const func = FUNCTIONS[this.currentStep];

            // Check if function should be skipped
            if (func.name === 'cupAddMilk' && !document.getElementById('toggleMilk').classList.contains('active')) {
                this.completedFunctions.push(func.name);
                this.highlightFunction(func.name);
                this.showMessage(`⊘ ${func.name} skipped (Milk not requested)`, 'success');
                this.currentStep++;
                continue;
            }
            if (func.name === 'cupAddSugar' && !document.getElementById('toggleSugar').classList.contains('active')) {
                this.completedFunctions.push(func.name);
                this.highlightFunction(func.name);
                this.showMessage(`${func.name} skipped (Sugar not requested)`, 'success');
                this.currentStep++;
                continue;
            }
            if (func.name === 'cupAddSalt' && !document.getElementById('toggleSalt').classList.contains('active')) {
                this.completedFunctions.push(func.name);
                this.highlightFunction(func.name);
                this.showMessage(`${func.name} skipped (Salt not requested)`, 'success');
                this.currentStep++;
                continue;
            }

            // If not skipped, break and execute
            break;
        }

        if (this.currentStep >= FUNCTIONS.length) {
            this.showMessage('All steps completed!', 'success');
            this.isRunning = false;
            clearInterval(this.interval);
            this.interval = null;
            document.getElementById('startBtn').disabled = false;
            document.getElementById('stopBtn').disabled = true;
            return;
        }

        const func = FUNCTIONS[this.currentStep];
        const depCheck = this.checkDependencies(func.name);

        if (!depCheck.valid) {
            this.showMessage(`Error: dependency required: ${depCheck.missing.join(', ')}`, 'error');
            this.stop();
            return;
        }

        // Execute the function
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
                        let value = parseInt(el.textContent);
                        value = Math.max(0, value + delta);
                        el.textContent = value;
                    }
                }
            }
        }

        this.completedFunctions.push(func.name);
        this.highlightFunction(func.name);
        this.showMessage(`✓ ${func.name} completed`, 'success');
        this.currentStep++;
    }

    highlightFunction(functionName) {
        document.querySelectorAll('.function-item').forEach(item => {
            if (item.dataset.function === functionName) {
                item.classList.add('highlight');
            }
        });
    }

    showMessage(text, type) {
        const messageDiv = document.getElementById('processMessage');
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

    reset() {
        this.currentStep = 0;
        this.completedFunctions.length = 0;
        this.isRunning = false;
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        document.querySelectorAll('.function-item').forEach(item => {
            item.classList.remove('highlight');
        });
        document.getElementById('startBtn').disabled = false;
        document.getElementById('stopBtn').disabled = true;
    }

    enable() {
        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');
        const processMessage = document.getElementById('processMessage');

        startBtn.style.display = 'block';
        stopBtn.style.display = 'block';
        this.reset();
        this.showMessage('Ready to start. Set Tea Requests and click Start.', 'process-info');
    }

    disable() {
        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');
        const processMessage = document.getElementById('processMessage');

        startBtn.style.display = 'none';
        stopBtn.style.display = 'none';
        processMessage.classList.remove('active');
    }
}