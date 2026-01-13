// Dependency and Action Definitions
const FUNCTIONS = [
    { name: 'selfGetCup', dependencies: [] },
    { name: 'kettleFill', dependencies: [] },
    { name: 'kettleTurnOn', dependencies: ['kettleFill'] },
    { name: 'kettleWaitWhistle', dependencies: ['kettleTurnOn'] },
    { name: 'cupAddTeabag', dependencies: ['selfGetCup'] },
    { name: 'cupAddWater', dependencies: ['selfGetCup', 'kettleWaitWhistle'] },
    { name: 'cupMashTea', dependencies: ['cupAddWater', 'cupAddTeabag'] },
    { name: 'cupRemoveTeabag', dependencies: ['cupAddTeabag'] },
    { name: 'cupAddMilk', dependencies: ['toggleMilk', 'selfGetCup'] },
    { name: 'cupAddSugar', dependencies: ['toggleSugar', 'selfGetCup'] },
    { name: 'cupAddSalt', dependencies: ['selfGetCup'] },
    { name: 'cupStir', dependencies: ['cupMashTea'] },
    { name: 'selfDrinkCup', dependencies: ['cupStir'] },
    { name: 'selfEmptyCup', dependencies: [] },
    { name: 'selfTidyUp', dependencies: [] }
];

const FUNCTION_ACTIONS = {
    selfGetCup: { toggles: { toggleCupCounter: true } },
    kettleFill: { counters: { kettleCups: 1 } },
    kettleTurnOn: { toggles: { toggleSwitchedOn: true } },
    kettleWaitWhistle: { toggles: { toggleBoiled: true } },
    cupAddTeabag: { counters: { teabag: 1 } },
    cupAddWater: { counters: { hotWater: 1 } },
    cupMashTea: { toggles: { toggleMashed: true } },
    cupRemoveTeabag: { counters: { teabag: -1 } },
    cupAddMilk: { counters: { milk: 1 } },
    cupAddSugar: { counters: { sugar: 1 } },
    cupAddSalt: { counters: { salt: 1 } },
    cupStir: { toggles: { toggleStirred: true } },
    selfDrinkCup: { toggles: { toggleDrunk: true } },
    selfEmptyCup: { counters: { hotWater: -1, coldWater: -1, milk: -1, sugar: -1, salt: -1 }, toggles: { toggleEmpty: true } },
    selfTidyUp: { toggles: { toggleCupCounter: false } }
};

// Tea Process State Manager
class TeaStateManager {
    constructor() {
        this.toggleIds = [
            'toggleMilk', 'toggleSugar', 'toggleSalt', 'toggleCupCounter', 'toggleStirred',
            'toggleMashed', 'toggleBoiled', 'toggleSwitchedOn', 'toggleObscured', 'toggleDrunk', 'toggleEmpty'
        ];
        this.counterIds = [
            'hotWater', 'coldWater', 'teabag', 'sugar', 'milk', 'salt', 'kettleCups'
        ];
    }

    getState() {
        const state = {};

        this.toggleIds.forEach(id => {
            const element = document.getElementById(id);
            state[id] = element ? element.classList.contains('active') : false;
        });

        this.counterIds.forEach(id => {
            const element = document.getElementById(id);
            state[id] = element ? parseInt(element.textContent) : 0;
        });

        return state;
    }

    reset() {
        this.toggleIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.remove('active');
            }
        });

        this.counterIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = '0';
            }
        });
    }
}

// Toggle Handler
class ToggleHandler {
    constructor(stateManager) {
        this.stateManager = stateManager;
    }

    toggle(id) {
        const element = document.getElementById(id);
        if (!element) return;

        element.classList.toggle('active');

        if (id === 'toggleMilk') {
            this.handleMilkToggle(element);
        } else if (id === 'toggleSugar') {
            this.handleSugarToggle(element);
        } else if (id === 'toggleSalt') {
            this.handleSaltToggle(element);
        }
    }

    handleMilkToggle(element) {
        if (element.classList.contains('active')) {
            this.incrementCounter('milk', 4);
        } else {
            document.getElementById('milk').textContent = '0';
        }
    }

    handleSugarToggle(element) {
        if (element.classList.contains('active')) {
            this.incrementCounter('sugar', 4);
        } else {
            document.getElementById('sugar').textContent = '0';
        }
    }

    handleSaltToggle(element) {
        if (element.classList.contains('active')) {
            this.incrementCounter('salt', 4);
        } else {
            document.getElementById('salt').textContent = '0';
        }
    }

    incrementCounter(id, max) {
        const element = document.getElementById(id);
        if (!element) return;

        let value = parseInt(element.textContent);
        if (value < max) {
            element.textContent = value + 1;
        }
    }
}

// Counter Handler
class CounterHandler {
    increment(id, max) {
        const element = document.getElementById(id);
        if (!element) return;

        let value = parseInt(element.textContent);
        if (value < max) {
            element.textContent = value + 1;
        }
    }

    decrement(id) {
        const element = document.getElementById(id);
        if (!element) return;

        let value = parseInt(element.textContent);
        if (value > 0) {
            element.textContent = value - 1;
        }
    }
}

// Event Manager
class EventManager {
    constructor(toggleHandler, counterHandler) {
        this.toggleHandler = toggleHandler;
        this.counterHandler = counterHandler;
    }

    init() {
        this.attachToggleListeners();
        this.attachCounterListeners();
    }

    attachToggleListeners() {
        const toggles = document.querySelectorAll('.toggle');
        toggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                this.toggleHandler.toggle(e.target.id);
            });
        });
    }

    attachCounterListeners() {
        const buttons = document.querySelectorAll('.counter-btn');
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const target = e.target.dataset.target;
                const max = e.target.dataset.max;

                if (action === 'increment') {
                    this.counterHandler.increment(target, parseInt(max));
                } else if (action === 'decrement') {
                    this.counterHandler.decrement(target);
                }
            });
        });
    }
}

// Main Application
class TeaProcessApp {
    constructor() {
        this.stateManager = new TeaStateManager();
        this.toggleHandler = new ToggleHandler(this.stateManager);
        this.counterHandler = new CounterHandler();
        this.eventManager = new EventManager(this.toggleHandler, this.counterHandler);

        this.completedFunctions = [];
        this.manualProcessHandler = null;
        this.directProcessHandler = null;
    }

    init() {
        this.eventManager.init();
        this.renderFunctionList();
        this.attachProcessSelectListener();
        this.attachResetHandler();
    }

    renderFunctionList() {
        const functionList = document.getElementById('functionList');
        functionList.innerHTML = FUNCTIONS.map((fn, idx) => `
            <div class="function-item" data-function="${fn.name}">
                <div class="function-name">${fn.name}</div>
                <div class="function-desc">Step ${idx + 1}</div>
            </div>
        `).join('');
    }

    attachProcessSelectListener() {
        const processSelect = document.getElementById('processSelect');
        processSelect.addEventListener('change', (e) => {
            if (e.target.value === 'manual') {
                this.startManualProcess();
            } else if (e.target.value === 'direct') {
                this.startDirectProcess();
            } else {
                this.stopCurrentProcess();
            }
        });
    }

    startManualProcess() {
        // Initialize manual process handler if not already done
        if (!this.manualProcessHandler) {
            this.manualProcessHandler = new ManualProcessHandler(this.stateManager, this.completedFunctions);
            this.manualProcessHandler.init();
        }

        // Reset and enable manual process
        this.resetProcessState();
        this.manualProcessHandler.enable();
    }

    startDirectProcess() {
        // Initialize direct process handler if not already done
        if (!this.directProcessHandler) {
            this.directProcessHandler = new DirectProcessHandler(this.stateManager, this.completedFunctions);
            this.directProcessHandler.init();
        }

        // Reset and enable direct process
        this.resetProcessState();
        this.directProcessHandler.enable();
    }

    stopCurrentProcess() {
        if (this.manualProcessHandler) {
            this.manualProcessHandler.disable();
        }
        if (this.directProcessHandler) {
            this.directProcessHandler.disable();
        }
    }

    resetProcessState() {
        this.completedFunctions.length = 0;
        document.querySelectorAll('.function-item').forEach(item => {
            item.classList.remove('highlight');
        });
    }

    attachResetHandler() {
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.stateManager.reset();
                this.resetProcessState();
                document.getElementById('processSelect').value = 'none';
                document.getElementById('processMessage').classList.remove('active');
                document.getElementById('stepBtn').style.display = 'none';
                document.getElementById('startBtn').style.display = 'none';
                document.getElementById('stopBtn').style.display = 'none';

                if (this.manualProcessHandler) {
                    this.manualProcessHandler.reset();
                }
                if (this.directProcessHandler) {
                    this.directProcessHandler.reset();
                }
            });
        }
    }

    getState() {
        return this.stateManager.getState();
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new TeaProcessApp();
    app.init();
    window.teaApp = app;
});