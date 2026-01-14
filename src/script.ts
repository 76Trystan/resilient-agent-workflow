import { ManualProcessHandler } from './processes/manual'
import { DirectProcessHandler } from './processes/direct'
import { DirectTemporalProcessHandler } from './temporal_direct_workflow/direct_temporal'
import { temporalClient } from './temporal_direct_workflow/client'

// Dependency and Action Definitions
export const FUNCTIONS = [
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

export const FUNCTION_ACTIONS: Record<string, any> = {
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
export class TeaStateManager {
    toggleIds = [
        'toggleMilk', 'toggleSugar', 'toggleSalt', 'toggleCupCounter', 'toggleStirred',
        'toggleMashed', 'toggleBoiled', 'toggleSwitchedOn', 'toggleObscured', 'toggleDrunk', 'toggleEmpty'
    ];
    counterIds = [
        'hotWater', 'coldWater', 'teabag', 'sugar', 'milk', 'salt', 'kettleCups'
    ];

    getState() {
        const state: Record<string, any> = {};

        this.toggleIds.forEach(id => {
            const element = document.getElementById(id);
            state[id] = element ? element.classList.contains('active') : false;
        });

        this.counterIds.forEach(id => {
            const element = document.getElementById(id);
            state[id] = element ? parseInt(element.textContent || '0') : 0;
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
export class ToggleHandler {
    constructor(private stateManager: TeaStateManager) {}

    toggle(id: string) {
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

    private handleMilkToggle(element: HTMLElement) {
        if (element.classList.contains('active')) {
            this.incrementCounter('milk', 4);
        } else {
            const milk = document.getElementById('milk');
            if (milk) milk.textContent = '0';
        }
    }

    private handleSugarToggle(element: HTMLElement) {
        if (element.classList.contains('active')) {
            this.incrementCounter('sugar', 4);
        } else {
            const sugar = document.getElementById('sugar');
            if (sugar) sugar.textContent = '0';
        }
    }

    private handleSaltToggle(element: HTMLElement) {
        if (element.classList.contains('active')) {
            this.incrementCounter('salt', 4);
        } else {
            const salt = document.getElementById('salt');
            if (salt) salt.textContent = '0';
        }
    }

    private incrementCounter(id: string, max: number) {
        const element = document.getElementById(id);
        if (!element) return;

        let value = parseInt(element.textContent || '0');
        if (value < max) {
            element.textContent = (value + 1).toString();
        }
    }
}

// Counter Handler
export class CounterHandler {
    increment(id: string, max: number) {
        const element = document.getElementById(id);
        if (!element) return;

        let value = parseInt(element.textContent || '0');
        if (value < max) {
            element.textContent = (value + 1).toString();
        }
    }

    decrement(id: string) {
        const element = document.getElementById(id);
        if (!element) return;

        let value = parseInt(element.textContent || '0');
        if (value > 0) {
            element.textContent = (value - 1).toString();
        }
    }
}

// Event Manager
export class EventManager {
    constructor(private toggleHandler: ToggleHandler, private counterHandler: CounterHandler) {}

    init() {
        this.attachToggleListeners();
        this.attachCounterListeners();
    }

    private attachToggleListeners() {
        const toggles = document.querySelectorAll('.toggle');
        toggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                this.toggleHandler.toggle(target.id);
            });
        });
    }

    private attachCounterListeners() {
        const buttons = document.querySelectorAll('.counter-btn');
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const action = target.dataset.action;
                const targetId = target.dataset.target;
                const max = target.dataset.max;

                if (action === 'increment' && targetId && max) {
                    this.counterHandler.increment(targetId, parseInt(max));
                } else if (action === 'decrement' && targetId) {
                    this.counterHandler.decrement(targetId);
                }
            });
        });
    }
}

// Main Application
class TeaProcessApp {
    stateManager: TeaStateManager;
    toggleHandler: ToggleHandler;
    counterHandler: CounterHandler;
    eventManager: EventManager;
    completedFunctions: string[] = [];
    manualProcessHandler: ManualProcessHandler | null = null;
    directProcessHandler: DirectProcessHandler | null = null;
    directTemporalProcessHandler: DirectTemporalProcessHandler | null = null;
    temporalClientReady = false;

    constructor() {
        this.stateManager = new TeaStateManager();
        this.toggleHandler = new ToggleHandler(this.stateManager);
        this.counterHandler = new CounterHandler();
        this.eventManager = new EventManager(this.toggleHandler, this.counterHandler);
        this.initTemporalClient();
    }

    private async initTemporalClient() {
        try {
            await temporalClient.connect();
            this.temporalClientReady = true;
            console.log('Temporal client connected');
        } catch (error) {
            console.warn('Temporal client failed to connect. Temporal workflows may not be available:', error);
            // App continues to work, just without temporal features
        }
    }

    init() {
        this.eventManager.init();
        this.renderFunctionList();
        this.attachProcessSelectListener();
        this.attachResetHandler();
    }

    private renderFunctionList() {
        const functionList = document.getElementById('functionList');
        if (!functionList) return;

        functionList.innerHTML = FUNCTIONS.map((fn, idx) => `
            <div class="function-item" data-function="${fn.name}">
                <div class="function-name">${fn.name}</div>
                <div class="function-desc">Step ${idx + 1}</div>
            </div>
        `).join('');
    }

    private attachProcessSelectListener() {
        const processSelect = document.getElementById('processSelect') as HTMLSelectElement;
        if (!processSelect) return;

        processSelect.addEventListener('change', (e) => {
            const value = (e.target as HTMLSelectElement).value;
            if (value === 'manual') {
                this.startManualProcess();
            } else if (value === 'direct') {
                this.startDirectProcess();
            } else if (value === 'direct_temporal') {
                if (this.temporalClientReady) {
                    this.startDirectTemporalProcess();
                } else {
                    alert('Temporal client not connected. Please ensure Temporal server is running.');
                    (e.target as HTMLSelectElement).value = 'none';
                }
            } else {
                this.stopCurrentProcess();
            }
        });
    }

    private startManualProcess() {
        if (!this.manualProcessHandler) {
            this.manualProcessHandler = new ManualProcessHandler(this.stateManager, this.completedFunctions);
            this.manualProcessHandler.init();
        }

        this.resetProcessState();
        this.manualProcessHandler.enable();
    }

    private startDirectProcess() {
        if (!this.directProcessHandler) {
            this.directProcessHandler = new DirectProcessHandler(this.stateManager, this.completedFunctions);
            this.directProcessHandler.init();
        }

        this.resetProcessState();
        this.directProcessHandler.enable();
    }

    private startDirectTemporalProcess() {
        if (!this.directTemporalProcessHandler) {
            this.directTemporalProcessHandler = new DirectTemporalProcessHandler(this.stateManager, this.completedFunctions);
            this.directTemporalProcessHandler.init();
        }

        this.resetProcessState();
        this.directTemporalProcessHandler.enable();
    }

    private stopCurrentProcess() {
        if (this.manualProcessHandler) {
            this.manualProcessHandler.disable();
        }
        if (this.directProcessHandler) {
            this.directProcessHandler.disable();
        }
        if (this.directTemporalProcessHandler) {
            this.directTemporalProcessHandler.disable();
        }
    }

    private resetProcessState() {
        this.completedFunctions.length = 0;
        document.querySelectorAll('.function-item').forEach(item => {
            item.classList.remove('highlight');
        });
    }

    private attachResetHandler() {
        const resetBtn = document.getElementById('resetBtn');
        if (!resetBtn) return;

        resetBtn.addEventListener('click', () => {
            this.stateManager.reset();
            this.resetProcessState();
            (document.getElementById('processSelect') as HTMLSelectElement).value = 'none';
            const processMessage = document.getElementById('processMessage');
            if (processMessage) processMessage.classList.remove('active');
            const stepBtn = document.getElementById('stepBtn');
            if (stepBtn) stepBtn.style.display = 'none';
            const startBtn = document.getElementById('startBtn');
            if (startBtn) startBtn.style.display = 'none';
            const stopBtn = document.getElementById('stopBtn');
            if (stopBtn) stopBtn.style.display = 'none';

            if (this.manualProcessHandler) {
                this.manualProcessHandler.reset();
            }
            if (this.directProcessHandler) {
                this.directProcessHandler.reset();
            }
            if (this.directTemporalProcessHandler) {
                this.directTemporalProcessHandler.reset();
            }
        });
    }

    getState() {
        return this.stateManager.getState();
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new TeaProcessApp();
    app.init();
    (window as any).teaApp = app;
});