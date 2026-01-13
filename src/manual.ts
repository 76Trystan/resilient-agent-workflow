// Manual Process Module
class ManualProcessHandler {
    constructor(stateManager, completedFunctions) {
        this.stateManager = stateManager;
        this.completedFunctions = completedFunctions;
        this.currentStep = 0;
    }

    init() {
        this.attachStepListener();
    }

    attachStepListener() {
        const stepBtn = document.getElementById('stepBtn');
        if (stepBtn) {
            stepBtn.addEventListener('click', () => this.executeStep());
        }
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
            document.getElementById('stepBtn').disabled = true;
            return;
        }

        // Check if trying to drink from an empty cup
        const func_1 = FUNCTIONS[this.currentStep];
        if (func_1.name === 'selfDrinkCup' && document.getElementById('toggleEmpty').classList.contains('active')) {
            this.showMessage('oh no cup empty', 'error');
            return;
        }

        // Check if trying to mash tea with no teabag
        if (func_1.name === 'cupMashTea' && parseInt(document.getElementById('teabag').textContent) === 0) {
            this.showMessage('oh no there is no teabag', 'error');
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
            document.getElementById('stepBtn').disabled = true;
            return;
        }

        const func = FUNCTIONS[this.currentStep];
        const depCheck = this.checkDependencies(func.name);

        if (!depCheck.valid) {
            this.showMessage(`Error: dependency required: ${depCheck.missing.join(', ')}`, 'error');
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

        if (this.currentStep >= FUNCTIONS.length) {
            document.getElementById('stepBtn').disabled = true;
        }
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
        document.querySelectorAll('.function-item').forEach(item => {
            item.classList.remove('highlight');
        });
        document.getElementById('stepBtn').disabled = false;
        this.showMessage('Ready to start. Set Tea Requests and click Next Step.', 'process-info');
    }

    enable() {
        const stepBtn = document.getElementById('stepBtn');
        const processMessage = document.getElementById('processMessage');
        stepBtn.style.display = 'block';
        this.reset();
        this.showMessage('Ready to start. Set Tea Requests and click Next Step.', 'process-info');
    }

    disable() {
        const stepBtn = document.getElementById('stepBtn');
        const processMessage = document.getElementById('processMessage');
        stepBtn.style.display = 'none';
        processMessage.classList.remove('active');
    }
}