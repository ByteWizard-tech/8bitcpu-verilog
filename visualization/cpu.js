/**
 * 16-bit RISC CPU Simulator & Visualizer
 * JavaScript implementation mirroring the Verilog CPU behavior
 * ADLD & CO Project
 */

// Opcodes (matching Verilog)
const OP = {
    NOP: 0b0000,
    ADD: 0b0001,
    SUB: 0b0010,
    AND: 0b0011,
    OR: 0b0100,
    XOR: 0b0101,
    NOT: 0b0110,
    SHL: 0b0111,
    SHR: 0b1000,
    LDI: 0b1001,
    LD: 0b1010,
    ST: 0b1011,
    JMP: 0b1100,
    JZ: 0b1101,
    HLT: 0b1110,
    MOV: 0b1111
};

// Opcode names for display
const OP_NAMES = {
    [OP.NOP]: 'NOP', [OP.ADD]: 'ADD', [OP.SUB]: 'SUB',
    [OP.AND]: 'AND', [OP.OR]: 'OR', [OP.XOR]: 'XOR',
    [OP.NOT]: 'NOT', [OP.SHL]: 'SHL', [OP.SHR]: 'SHR',
    [OP.LDI]: 'LDI', [OP.LD]: 'LD', [OP.ST]: 'ST',
    [OP.JMP]: 'JMP', [OP.JZ]: 'JZ', [OP.HLT]: 'HLT',
    [OP.MOV]: 'MOV'
};

// FSM States
const STATE = {
    FETCH: 0,
    DECODE: 1,
    EXECUTE: 2,
    MEMORY: 3,
    WRITEBACK: 4,
    HALT: 5
};

const STATE_NAMES = ['FETCH', 'DECODE', 'EXECUTE', 'MEMORY', 'WRITEBACK', 'HALT'];

// Sample program (matching Verilog instruction_mem.v)
const PROGRAM = [
    0b1001_00_00_00000101,  // LDI R0, 5
    0b1001_01_00_00000011,  // LDI R1, 3
    0b0001_00_01_00000000,  // ADD R0, R1
    0b1001_10_00_00000010,  // LDI R2, 2
    0b0010_00_10_00000000,  // SUB R0, R2
    0b1001_11_00_00000000,  // LDI R3, 0
    0b1011_00_11_00000000,  // ST R0, R3
    0b1110_00_00_00000000   // HLT
];

class CPU {
    constructor() {
        this.reset();
    }

    reset() {
        this.pc = 0;
        this.registers = [0, 0, 0, 0];
        this.memory = new Array(256).fill(0);
        this.instructionMemory = [...PROGRAM, ...new Array(256 - PROGRAM.length).fill(0)];
        this.state = STATE.FETCH;
        this.instruction = 0;
        this.opcode = 0;
        this.rd = 0;
        this.rs = 0;
        this.imm = 0;
        this.aluResult = 0;
        this.zeroFlag = false;
        this.halted = false;
        this.cycleCount = 0;
    }

    // Decode instruction fields
    decode(instruction) {
        this.opcode = (instruction >> 12) & 0xF;
        this.rd = (instruction >> 10) & 0x3;
        this.rs = (instruction >> 8) & 0x3;
        this.imm = instruction & 0xFF;
    }

    // ALU operation
    alu(opcode, a, b) {
        let result = 0;
        switch (opcode) {
            case OP.ADD: result = (a + b) & 0xFFFF; break;
            case OP.SUB: result = (a - b) & 0xFFFF; break;
            case OP.AND: result = a & b; break;
            case OP.OR: result = a | b; break;
            case OP.XOR: result = a ^ b; break;
            case OP.NOT: result = (~a) & 0xFFFF; break;
            case OP.SHL: result = (a << 1) & 0xFFFF; break;
            case OP.SHR: result = a >> 1; break;
            case OP.MOV: result = b; break;
            default: result = 0;
        }
        this.zeroFlag = (result === 0);
        return result;
    }

    // Single clock cycle step
    step() {
        if (this.halted) return { state: 'HALT', changed: false };

        const prevState = this.state;
        let dataFlow = { from: null, to: null, value: null };

        switch (this.state) {
            case STATE.FETCH:
                this.instruction = this.instructionMemory[this.pc];
                this.pc = (this.pc + 1) & 0xFFFF;
                this.state = STATE.DECODE;
                dataFlow = { from: 'imem', to: 'control', value: this.instruction };
                break;

            case STATE.DECODE:
                this.decode(this.instruction);
                if (this.opcode === OP.HLT) {
                    this.state = STATE.HALT;
                    this.halted = true;
                } else {
                    this.state = STATE.EXECUTE;
                }
                break;

            case STATE.EXECUTE:
                const regA = this.registers[this.rd];
                const regB = this.registers[this.rs];

                switch (this.opcode) {
                    case OP.JMP:
                        this.pc = this.imm;
                        this.state = STATE.WRITEBACK;
                        break;
                    case OP.JZ:
                        if (this.zeroFlag) {
                            this.pc = this.imm;
                        }
                        this.state = STATE.WRITEBACK;
                        break;
                    case OP.LD:
                    case OP.ST:
                        this.aluResult = this.alu(this.opcode, regA, regB);
                        this.state = STATE.MEMORY;
                        break;
                    default:
                        this.aluResult = this.alu(this.opcode, regA, regB);
                        this.state = STATE.WRITEBACK;
                        dataFlow = { from: 'regfile', to: 'alu', value: `${regA} op ${regB}` };
                }
                break;

            case STATE.MEMORY:
                if (this.opcode === OP.ST) {
                    const addr = this.registers[this.rs] & 0xFF;
                    this.memory[addr] = this.registers[this.rd];
                    dataFlow = { from: 'regfile', to: 'dmem', value: this.registers[this.rd] };
                } else if (this.opcode === OP.LD) {
                    const addr = this.registers[this.rs] & 0xFF;
                    this.aluResult = this.memory[addr];
                    dataFlow = { from: 'dmem', to: 'regfile', value: this.aluResult };
                }
                this.state = STATE.WRITEBACK;
                break;

            case STATE.WRITEBACK:
                switch (this.opcode) {
                    case OP.NOP:
                    case OP.ST:
                    case OP.JMP:
                    case OP.JZ:
                        // No register write
                        break;
                    case OP.LD:
                        this.registers[this.rd] = this.aluResult;
                        dataFlow = { from: 'dmem', to: 'regfile', value: this.aluResult };
                        break;
                    case OP.LDI:
                        this.registers[this.rd] = this.imm;
                        dataFlow = { from: 'imem', to: 'regfile', value: this.imm };
                        break;
                    default:
                        this.registers[this.rd] = this.aluResult;
                        dataFlow = { from: 'alu', to: 'regfile', value: this.aluResult };
                }
                this.state = STATE.FETCH;
                this.cycleCount++;
                break;

            case STATE.HALT:
                this.halted = true;
                break;
        }

        return {
            state: STATE_NAMES[this.state],
            prevState: STATE_NAMES[prevState],
            dataFlow,
            changed: true
        };
    }

    // Disassemble instruction to readable format
    disassemble(instruction) {
        const opcode = (instruction >> 12) & 0xF;
        const rd = (instruction >> 10) & 0x3;
        const rs = (instruction >> 8) & 0x3;
        const imm = instruction & 0xFF;

        const opName = OP_NAMES[opcode] || '???';

        switch (opcode) {
            case OP.LDI:
                return `LDI R${rd}, ${imm}`;
            case OP.JMP:
                return `JMP ${imm}`;
            case OP.JZ:
                return `JZ ${imm}`;
            case OP.HLT:
                return 'HLT';
            case OP.NOP:
                return 'NOP';
            case OP.NOT:
                return `NOT R${rd}`;
            case OP.LD:
                return `LD R${rd}, [R${rs}]`;
            case OP.ST:
                return `ST R${rd}, [R${rs}]`;
            default:
                return `${opName} R${rd}, R${rs}`;
        }
    }
}

// UI Controller
class CPUVisualizer {
    constructor() {
        this.cpu = new CPU();
        this.running = false;
        this.intervalId = null;
        this.speed = 5;

        this.initElements();
        this.bindEvents();
        this.updateDisplay();
    }

    initElements() {
        // Values
        this.pcValue = document.getElementById('pc-value');
        this.imemValue = document.getElementById('imem-value');
        this.instructionDecode = document.getElementById('instruction-decode');
        this.r0 = document.getElementById('r0');
        this.r1 = document.getElementById('r1');
        this.r2 = document.getElementById('r2');
        this.r3 = document.getElementById('r3');
        this.aluOp = document.getElementById('alu-op');
        this.aluResult = document.getElementById('alu-result');
        this.dmemValue = document.getElementById('dmem-value');
        this.stateDisplay = document.getElementById('state');

        // Instruction display
        this.instBinary = document.getElementById('inst-binary');
        this.instAsm = document.getElementById('inst-asm');

        // Trace
        this.traceLog = document.getElementById('trace-log');

        // Controls
        this.btnReset = document.getElementById('btn-reset');
        this.btnStep = document.getElementById('btn-step');
        this.btnRun = document.getElementById('btn-run');
        this.btnStop = document.getElementById('btn-stop');
        this.speedSlider = document.getElementById('speed-slider');
        this.speedValue = document.getElementById('speed-value');

        // Components for highlighting
        this.components = {
            pc: document.getElementById('pc'),
            imem: document.getElementById('imem'),
            regfile: document.getElementById('regfile'),
            alu: document.getElementById('alu'),
            dmem: document.getElementById('dmem'),
            control: document.getElementById('control')
        };
    }

    bindEvents() {
        this.btnReset.addEventListener('click', () => this.reset());
        this.btnStep.addEventListener('click', () => this.step());
        this.btnRun.addEventListener('click', () => this.run());
        this.btnStop.addEventListener('click', () => this.stop());
        this.speedSlider.addEventListener('input', (e) => {
            this.speed = parseInt(e.target.value);
            this.speedValue.textContent = this.speed;
            if (this.running) {
                this.stop();
                this.run();
            }
        });
    }

    reset() {
        this.stop();
        this.cpu.reset();
        this.traceLog.innerHTML = '';
        this.updateDisplay();
        this.clearHighlights();
    }

    step() {
        if (this.cpu.halted) return;

        const result = this.cpu.step();
        this.updateDisplay();
        this.highlightState(result.state);
        this.animateDataFlow(result.dataFlow);

        if (result.prevState === 'WRITEBACK' || result.state === 'HALT') {
            this.addTraceEntry();
        }
    }

    run() {
        if (this.cpu.halted) return;

        this.running = true;
        this.btnRun.disabled = true;
        this.btnStep.disabled = true;
        this.btnStop.disabled = false;

        const delay = Math.max(50, 1000 - (this.speed * 90));
        this.intervalId = setInterval(() => {
            this.step();
            if (this.cpu.halted) {
                this.stop();
            }
        }, delay);
    }

    stop() {
        this.running = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.btnRun.disabled = false;
        this.btnStep.disabled = false;
        this.btnStop.disabled = true;
    }

    updateDisplay() {
        // PC
        this.pcValue.textContent = `0x${this.cpu.pc.toString(16).toUpperCase().padStart(4, '0')}`;

        // Instruction Memory
        const currentInstr = this.cpu.instruction;
        this.imemValue.textContent = `0x${currentInstr.toString(16).toUpperCase().padStart(4, '0')}`;
        this.instructionDecode.textContent = this.cpu.disassemble(currentInstr);

        // Registers
        this.updateRegister(this.r0, this.cpu.registers[0]);
        this.updateRegister(this.r1, this.cpu.registers[1]);
        this.updateRegister(this.r2, this.cpu.registers[2]);
        this.updateRegister(this.r3, this.cpu.registers[3]);

        // ALU
        this.aluOp.textContent = OP_NAMES[this.cpu.opcode] || 'NOP';
        this.aluResult.textContent = this.cpu.aluResult;

        // Data Memory (show address 0)
        this.dmemValue.textContent = this.cpu.memory[0] || '---';

        // State
        const stateName = STATE_NAMES[this.cpu.state];
        this.stateDisplay.textContent = stateName;
        this.stateDisplay.className = 'state-display ' + stateName.toLowerCase();

        // Instruction display
        this.instBinary.textContent = currentInstr.toString(2).padStart(16, '0');
        this.instAsm.textContent = this.cpu.disassemble(currentInstr);
    }

    updateRegister(element, value) {
        const oldValue = parseInt(element.textContent);
        element.textContent = value;
        if (oldValue !== value) {
            element.classList.add('updated');
            setTimeout(() => element.classList.remove('updated'), 500);
        }
    }

    highlightState(state) {
        this.clearHighlights();

        switch (state) {
            case 'FETCH':
                this.components.pc.classList.add('active');
                this.components.imem.classList.add('active');
                break;
            case 'DECODE':
                this.components.control.classList.add('active');
                break;
            case 'EXECUTE':
                this.components.regfile.classList.add('active');
                this.components.alu.classList.add('active');
                break;
            case 'MEMORY':
                this.components.dmem.classList.add('active');
                break;
            case 'WRITEBACK':
                this.components.regfile.classList.add('active');
                break;
            case 'HALT':
                this.components.control.classList.add('active');
                break;
        }
    }

    clearHighlights() {
        Object.values(this.components).forEach(comp => {
            comp.classList.remove('active');
        });
    }

    animateDataFlow(dataFlow) {
        if (!dataFlow || !dataFlow.from) return;
        // Add visual feedback for data flow (components already highlighted)
    }

    addTraceEntry() {
        const entry = document.createElement('div');
        entry.className = 'trace-entry';
        entry.innerHTML = `<span class="pc">[${this.cpu.cycleCount}]</span> <span class="instr">${this.cpu.disassemble(this.cpu.instruction)}</span>`;
        this.traceLog.appendChild(entry);
        this.traceLog.scrollTop = this.traceLog.scrollHeight;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    window.cpuViz = new CPUVisualizer();
});
