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

// Default sample program (matching Verilog instruction_mem.v)
const DEFAULT_PROGRAM = [
    0b1001_00_00_00000101,  // LDI R0, 5
    0b1001_01_00_00000011,  // LDI R1, 3
    0b0001_00_01_00000000,  // ADD R0, R1
    0b1001_10_00_00000010,  // LDI R2, 2
    0b0010_00_10_00000000,  // SUB R0, R2
    0b1001_11_00_00000000,  // LDI R3, 0
    0b1011_00_11_00000000,  // ST R0, R3
    0b1110_00_00_00000000   // HLT
];

// Example programs for quick loading
const EXAMPLE_PROGRAMS = {
    arithmetic: `; Arithmetic Operations Demo
; Add two numbers and subtract
LDI R0, 5      ; R0 = 5
LDI R1, 3      ; R1 = 3
ADD R0, R1     ; R0 = R0 + R1 = 8
LDI R2, 2      ; R2 = 2
SUB R0, R2     ; R0 = R0 - R2 = 6
HLT`,

    memory: `; Memory Operations Demo
; Store and load data
LDI R0, 42     ; Value to store
LDI R1, 0      ; Memory address
ST R0, R1      ; Store R0 at address in R1
LDI R0, 0      ; Clear R0
LD R0, R1      ; Load from address in R1
HLT`,

    logic: `; Logic Operations Demo
LDI R0, 0x0F   ; R0 = 15 (binary: 00001111)
LDI R1, 0xF0   ; R1 = 240 (binary: 11110000)
MOV R2, R0     ; R2 = R0 = 15
AND R2, R1     ; R2 = 15 AND 240 = 0
MOV R3, R0     ; R3 = R0 = 15
OR R3, R1      ; R3 = 15 OR 240 = 255
XOR R0, R1     ; R0 = 15 XOR 240 = 255
NOT R1         ; R1 = NOT 240 = 65295 (0xFF0F)
HLT`,

    shift: `; Shift Operations Demo
LDI R0, 1      ; R0 = 1
SHL R0         ; R0 = 2
SHL R0         ; R0 = 4
SHL R0         ; R0 = 8
SHR R0         ; R0 = 4
SHR R0         ; R0 = 2
HLT`,

    counting: `; Counting Demo (Countdown Loop)
; Addresses: 0=LDI, 1=LDI, 2=SUB, 3=JZ, 4=JMP, 5=HLT
LDI R0, 5      ; [0] Counter = 5
LDI R1, 1      ; [1] Decrement value = 1
SUB R0, R1     ; [2] R0 = R0 - 1 (sets zero flag when R0 becomes 0)
JZ 5           ; [3] If zero flag set, jump to HLT (address 5)
JMP 2          ; [4] Otherwise, loop back to SUB (address 2)
HLT            ; [5] End program`
};

/**
 * Assembler class - converts assembly text to machine code
 */
class Assembler {
    constructor() {
        // Opcode mapping (mnemonic -> opcode)
        this.opcodes = {
            'NOP': OP.NOP, 'ADD': OP.ADD, 'SUB': OP.SUB,
            'AND': OP.AND, 'OR': OP.OR, 'XOR': OP.XOR,
            'NOT': OP.NOT, 'SHL': OP.SHL, 'SHR': OP.SHR,
            'LDI': OP.LDI, 'LD': OP.LD, 'ST': OP.ST,
            'JMP': OP.JMP, 'JZ': OP.JZ, 'HLT': OP.HLT,
            'MOV': OP.MOV
        };

        // Instruction types for parsing
        this.instrTypes = {
            'NOP': 'none',      // No operands
            'HLT': 'none',
            'ADD': 'reg_reg',   // Rd, Rs
            'SUB': 'reg_reg',
            'AND': 'reg_reg',
            'OR': 'reg_reg',
            'XOR': 'reg_reg',
            'MOV': 'reg_reg',
            'NOT': 'reg',       // Rd only
            'SHL': 'reg',
            'SHR': 'reg',
            'LDI': 'reg_imm',   // Rd, immediate
            'LD': 'reg_regaddr', // Rd, [Rs]
            'ST': 'reg_regaddr', // Rd, [Rs] (store Rd to address in Rs)
            'JMP': 'imm',        // immediate address
            'JZ': 'imm'
        };
    }

    /**
     * Assemble a program text into machine code
     * @param {string} text - Assembly code text
     * @returns {Object} - { success: boolean, program: number[], errors: string[] }
     */
    assemble(text) {
        const lines = text.split('\n');
        const program = [];
        const errors = [];

        for (let i = 0; i < lines.length; i++) {
            const lineNum = i + 1;
            let line = lines[i].trim();

            // Remove comments (everything after ;)
            const commentIdx = line.indexOf(';');
            if (commentIdx !== -1) {
                line = line.substring(0, commentIdx).trim();
            }

            // Skip empty lines
            if (line === '') continue;

            try {
                const instruction = this.parseLine(line, lineNum);
                program.push(instruction);
            } catch (e) {
                errors.push(`Line ${lineNum}: ${e.message}`);
            }
        }

        return {
            success: errors.length === 0,
            program: program,
            errors: errors
        };
    }

    /**
     * Parse a single line of assembly
     */
    parseLine(line, lineNum) {
        // Split by whitespace and commas
        const parts = line.replace(/,/g, ' ').split(/\s+/).filter(p => p !== '');
        
        if (parts.length === 0) {
            throw new Error('Empty instruction');
        }

        const mnemonic = parts[0].toUpperCase();
        
        if (!(mnemonic in this.opcodes)) {
            throw new Error(`Unknown instruction: ${mnemonic}`);
        }

        const opcode = this.opcodes[mnemonic];
        const type = this.instrTypes[mnemonic];

        let rd = 0, rs = 0, imm = 0;

        switch (type) {
            case 'none':
                // No operands needed
                break;

            case 'reg':
                // Single register: Rd
                if (parts.length < 2) {
                    throw new Error(`${mnemonic} requires a register`);
                }
                rd = this.parseRegister(parts[1]);
                break;

            case 'reg_reg':
                // Two registers: Rd, Rs
                if (parts.length < 3) {
                    throw new Error(`${mnemonic} requires two registers (Rd, Rs)`);
                }
                rd = this.parseRegister(parts[1]);
                rs = this.parseRegister(parts[2]);
                break;

            case 'reg_imm':
                // Register and immediate: Rd, imm
                if (parts.length < 3) {
                    throw new Error(`${mnemonic} requires register and immediate (Rd, value)`);
                }
                rd = this.parseRegister(parts[1]);
                imm = this.parseImmediate(parts[2]);
                break;

            case 'reg_regaddr':
                // Register and register address: Rd, [Rs]
                if (parts.length < 3) {
                    throw new Error(`${mnemonic} requires register and address register (Rd, [Rs] or Rd, Rs)`);
                }
                rd = this.parseRegister(parts[1]);
                // Handle both [R0] and R0 syntax
                rs = this.parseRegister(parts[2].replace(/[\[\]]/g, ''));
                break;

            case 'imm':
                // Immediate only (jump)
                if (parts.length < 2) {
                    throw new Error(`${mnemonic} requires an address`);
                }
                imm = this.parseImmediate(parts[1]);
                break;

            default:
                throw new Error(`Unknown instruction type for ${mnemonic}`);
        }

        // Encode instruction: [opcode(4)][rd(2)][rs(2)][immediate(8)]
        const instruction = (opcode << 12) | (rd << 10) | (rs << 8) | (imm & 0xFF);
        return instruction;
    }

    /**
     * Parse a register (R0-R3)
     */
    parseRegister(str) {
        const reg = str.toUpperCase().replace(/[\[\]]/g, '');
        const match = reg.match(/^R([0-3])$/);
        if (!match) {
            throw new Error(`Invalid register: ${str} (use R0, R1, R2, or R3)`);
        }
        return parseInt(match[1]);
    }

    /**
     * Parse an immediate value
     */
    parseImmediate(str) {
        let value;
        
        // Handle hex (0x prefix)
        if (str.toLowerCase().startsWith('0x')) {
            value = parseInt(str, 16);
        }
        // Handle binary (0b prefix)
        else if (str.toLowerCase().startsWith('0b')) {
            value = parseInt(str.substring(2), 2);
        }
        // Decimal
        else {
            value = parseInt(str, 10);
        }

        if (isNaN(value)) {
            throw new Error(`Invalid immediate value: ${str}`);
        }

        if (value < 0 || value > 255) {
            throw new Error(`Immediate value out of range (0-255): ${value}`);
        }

        return value;
    }
}

// Create global assembler instance
const assembler = new Assembler();

class CPU {
    constructor() {
        this.currentProgram = DEFAULT_PROGRAM;
        this.reset();
    }

    reset() {
        this.pc = 0;
        this.registers = [0, 0, 0, 0];
        this.memory = new Array(256).fill(0);
        this.instructionMemory = [...this.currentProgram, ...new Array(256 - this.currentProgram.length).fill(0)];
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

    /**
     * Load a new program into the CPU
     * @param {number[]} program - Array of 16-bit machine code instructions
     */
    loadProgram(program) {
        this.currentProgram = program;
        this.reset();
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
        this.connections = [];
        this.svgNS = "http://www.w3.org/2000/svg";

        this.initElements();
        this.bindEvents();
        this.initConnections();
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

        // Program input
        this.programInput = document.getElementById('program-input');
        this.btnLoad = document.getElementById('btn-load');
        this.btnExample = document.getElementById('btn-example');
        this.parseStatus = document.getElementById('parse-status');

        // Components for highlighting
        this.components = {
            pc: document.getElementById('pc'),
            imem: document.getElementById('imem'),
            regfile: document.getElementById('regfile'),
            alu: document.getElementById('alu'),
            dmem: document.getElementById('dmem'),
            control: document.getElementById('control')
        };

        // SVG container
        this.busesSvg = document.getElementById('buses');
        this.cpuDiagram = document.querySelector('.cpu-diagram');

        // Current example index for cycling through examples
        this.currentExampleIndex = 0;
        this.exampleNames = Object.keys(EXAMPLE_PROGRAMS);
    }

    // Get the center point of a component relative to the SVG
    getComponentCenter(componentId) {
        const component = this.components[componentId];
        if (!component) return { x: 0, y: 0 };

        const diagramRect = this.cpuDiagram.getBoundingClientRect();
        const compRect = component.getBoundingClientRect();

        return {
            x: compRect.left - diagramRect.left + compRect.width / 2,
            y: compRect.top - diagramRect.top + compRect.height / 2,
            width: compRect.width,
            height: compRect.height,
            top: compRect.top - diagramRect.top,
            bottom: compRect.top - diagramRect.top + compRect.height,
            left: compRect.left - diagramRect.left,
            right: compRect.left - diagramRect.left + compRect.width
        };
    }

    // Get connection point on a component edge
    getEdgePoint(componentId, direction) {
        const bounds = this.getComponentCenter(componentId);
        const padding = 5;

        switch (direction) {
            case 'top': return { x: bounds.x, y: bounds.top - padding };
            case 'bottom': return { x: bounds.x, y: bounds.bottom + padding };
            case 'left': return { x: bounds.left - padding, y: bounds.y };
            case 'right': return { x: bounds.right + padding, y: bounds.y };
            default: return { x: bounds.x, y: bounds.y };
        }
    }

    // Create an orthogonal path between two points
    createOrthogonalPath(from, to, fromDir, toDir) {
        const offset = 25; // Distance from component before turning

        let path = `M ${from.x} ${from.y}`;

        // Calculate intermediate points based on directions
        if (fromDir === 'right' && toDir === 'left') {
            const midX = (from.x + to.x) / 2;
            path += ` L ${midX} ${from.y}`;
            path += ` L ${midX} ${to.y}`;
            path += ` L ${to.x} ${to.y}`;
        } else if (fromDir === 'bottom' && toDir === 'top') {
            const midY = (from.y + to.y) / 2;
            path += ` L ${from.x} ${midY}`;
            path += ` L ${to.x} ${midY}`;
            path += ` L ${to.x} ${to.y}`;
        } else if (fromDir === 'bottom' && toDir === 'left') {
            path += ` L ${from.x} ${from.y + offset}`;
            path += ` L ${to.x - offset} ${from.y + offset}`;
            path += ` L ${to.x - offset} ${to.y}`;
            path += ` L ${to.x} ${to.y}`;
        } else if (fromDir === 'right' && toDir === 'top') {
            path += ` L ${from.x + offset} ${from.y}`;
            path += ` L ${from.x + offset} ${to.y - offset}`;
            path += ` L ${to.x} ${to.y - offset}`;
            path += ` L ${to.x} ${to.y}`;
        } else if (fromDir === 'left' && toDir === 'right') {
            const midX = (from.x + to.x) / 2;
            path += ` L ${midX} ${from.y}`;
            path += ` L ${midX} ${to.y}`;
            path += ` L ${to.x} ${to.y}`;
        } else if (fromDir === 'top' && toDir === 'bottom') {
            const midY = (from.y + to.y) / 2;
            path += ` L ${from.x} ${midY}`;
            path += ` L ${to.x} ${midY}`;
            path += ` L ${to.x} ${to.y}`;
        } else {
            // Default: simple L-shaped path
            path += ` L ${from.x} ${to.y}`;
            path += ` L ${to.x} ${to.y}`;
        }

        return path;
    }

    // Initialize all connections
    initConnections() {
        // Clear existing paths
        const existingPaths = this.busesSvg.querySelectorAll('.bus, .bus-flow, .connection-glow');
        existingPaths.forEach(p => p.remove());

        this.connections = [];

        // Define connection routes
        const connectionDefs = [
            { id: 'pc-imem', from: 'pc', to: 'imem', fromDir: 'right', toDir: 'left', label: 'Address' },
            { id: 'imem-control', from: 'imem', to: 'control', fromDir: 'right', toDir: 'left', label: 'Instruction' },
            { id: 'control-regfile', from: 'control', to: 'regfile', fromDir: 'bottom', toDir: 'top', label: 'Control' },
            { id: 'regfile-alu', from: 'regfile', to: 'alu', fromDir: 'right', toDir: 'left', label: 'Operands' },
            { id: 'alu-regfile', from: 'alu', to: 'regfile', fromDir: 'left', toDir: 'right', label: 'Result', offsetY: 30 },
            { id: 'regfile-dmem', from: 'regfile', to: 'dmem', fromDir: 'right', toDir: 'left', label: 'Store', offsetY: -20 },
            { id: 'dmem-regfile', from: 'dmem', to: 'regfile', fromDir: 'left', toDir: 'right', label: 'Load', offsetY: 20 },
            { id: 'imem-regfile', from: 'imem', to: 'regfile', fromDir: 'bottom', toDir: 'top', label: 'Immediate' }
        ];

        connectionDefs.forEach(def => {
            this.createConnection(def);
        });

        // Redraw on resize
        window.addEventListener('resize', () => this.redrawConnections());
    }

    createConnection(def) {
        const fromPoint = this.getEdgePoint(def.from, def.fromDir);
        const toPoint = this.getEdgePoint(def.to, def.toDir);

        // Apply offsets if specified
        if (def.offsetY) {
            fromPoint.y += def.offsetY;
            toPoint.y += def.offsetY;
        }

        const pathD = this.createOrthogonalPath(fromPoint, toPoint, def.fromDir, def.toDir);

        // Create glow path (background)
        const glowPath = document.createElementNS(this.svgNS, 'path');
        glowPath.setAttribute('d', pathD);
        glowPath.setAttribute('class', 'connection-glow');
        glowPath.setAttribute('id', `glow-${def.id}`);
        this.busesSvg.appendChild(glowPath);

        // Create main path
        const path = document.createElementNS(this.svgNS, 'path');
        path.setAttribute('d', pathD);
        path.setAttribute('class', 'bus');
        path.setAttribute('id', `bus-${def.id}`);
        path.setAttribute('marker-end', 'url(#arrowhead)');
        this.busesSvg.appendChild(path);

        // Create flow overlay path
        const flowPath = document.createElementNS(this.svgNS, 'path');
        flowPath.setAttribute('d', pathD);
        flowPath.setAttribute('class', 'bus-flow');
        flowPath.setAttribute('id', `flow-${def.id}`);
        this.busesSvg.appendChild(flowPath);

        this.connections.push({
            id: def.id,
            from: def.from,
            to: def.to,
            path: path,
            flowPath: flowPath,
            glowPath: glowPath,
            def: def
        });
    }

    redrawConnections() {
        this.connections.forEach(conn => {
            const fromPoint = this.getEdgePoint(conn.def.from, conn.def.fromDir);
            const toPoint = this.getEdgePoint(conn.def.to, conn.def.toDir);

            if (conn.def.offsetY) {
                fromPoint.y += conn.def.offsetY;
                toPoint.y += conn.def.offsetY;
            }

            const pathD = this.createOrthogonalPath(fromPoint, toPoint, conn.def.fromDir, conn.def.toDir);
            conn.path.setAttribute('d', pathD);
            conn.flowPath.setAttribute('d', pathD);
            conn.glowPath.setAttribute('d', pathD);
        });
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

        // Program input handlers
        this.btnLoad.addEventListener('click', () => this.loadProgramFromInput());
        this.btnExample.addEventListener('click', () => this.loadExample());
    }

    /**
     * Load program from the textarea input
     */
    loadProgramFromInput() {
        const text = this.programInput.value.trim();
        
        if (!text) {
            this.showParseStatus('Please enter some assembly code', 'error');
            return;
        }

        const result = assembler.assemble(text);

        if (result.success) {
            if (result.program.length === 0) {
                this.showParseStatus('No instructions found', 'error');
                return;
            }

            this.stop();
            this.cpu.loadProgram(result.program);
            this.traceLog.innerHTML = '';
            this.updateDisplay();
            this.clearHighlights();
            this.clearAllConnections();
            
            this.showParseStatus(`✓ Loaded ${result.program.length} instructions`, 'success');
        } else {
            this.showParseStatus(result.errors.join('\n'), 'error');
        }
    }

    /**
     * Load an example program (cycles through available examples)
     */
    loadExample() {
        const exampleName = this.exampleNames[this.currentExampleIndex];
        const exampleCode = EXAMPLE_PROGRAMS[exampleName];
        
        // Set the textarea content
        this.programInput.value = exampleCode;
        
        // Advance to next example for next click
        this.currentExampleIndex = (this.currentExampleIndex + 1) % this.exampleNames.length;
        
        // Show which example was loaded
        const displayName = exampleName.charAt(0).toUpperCase() + exampleName.slice(1);
        this.showParseStatus(`Loaded: ${displayName} Demo. Click "Load Program" to run.`, 'success');
    }

    /**
     * Show parse status message
     */
    showParseStatus(message, type) {
        this.parseStatus.textContent = message;
        this.parseStatus.className = 'parse-status ' + type;
        
        // Auto-hide success messages after a delay
        if (type === 'success') {
            setTimeout(() => {
                if (this.parseStatus.classList.contains('success')) {
                    this.parseStatus.className = 'parse-status';
                }
            }, 5000);
        }
    }

    reset() {
        this.stop();
        this.cpu.reset();
        this.traceLog.innerHTML = '';
        this.updateDisplay();
        this.clearHighlights();
        this.clearAllConnections();
    }

    step() {
        if (this.cpu.halted) return;

        const result = this.cpu.step();
        this.updateDisplay();
        this.highlightState(result.state);
        this.animateDataFlow(result.dataFlow, result.state, result.prevState);

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

    clearAllConnections() {
        this.connections.forEach(conn => {
            conn.path.classList.remove('active');
            conn.path.setAttribute('marker-end', 'url(#arrowhead)');
            conn.flowPath.classList.remove('flowing');
            conn.glowPath.classList.remove('active');
        });
    }

    activateConnection(connectionId) {
        const conn = this.connections.find(c => c.id === connectionId);
        if (conn) {
            // Activate the path
            conn.path.classList.add('active');
            conn.path.setAttribute('marker-end', 'url(#arrowhead-active)');
            
            // Trigger flow animation
            conn.flowPath.classList.remove('flowing');
            void conn.flowPath.offsetWidth; // Force reflow
            conn.flowPath.classList.add('flowing');

            // Trigger glow pulse
            conn.glowPath.classList.remove('active');
            void conn.glowPath.offsetWidth; // Force reflow
            conn.glowPath.classList.add('active');

            // Clear after animation
            setTimeout(() => {
                conn.path.classList.remove('active');
                conn.path.setAttribute('marker-end', 'url(#arrowhead)');
                conn.flowPath.classList.remove('flowing');
                conn.glowPath.classList.remove('active');
            }, 800);
        }
    }

    animateDataFlow(dataFlow, state, prevState) {
        // Clear previous connection highlights
        this.clearAllConnections();

        // Determine which connections to light up based on state transition
        switch (state) {
            case 'DECODE':
                // Fetch just happened: PC -> IMEM, IMEM -> Control
                this.activateConnection('pc-imem');
                setTimeout(() => this.activateConnection('imem-control'), 200);
                break;

            case 'EXECUTE':
                // Decode finished: Control signals go out
                this.activateConnection('control-regfile');
                setTimeout(() => this.activateConnection('regfile-alu'), 300);
                break;

            case 'MEMORY':
                // Memory operation
                if (this.cpu.opcode === OP.ST) {
                    this.activateConnection('regfile-dmem');
                } else if (this.cpu.opcode === OP.LD) {
                    this.activateConnection('regfile-dmem');
                }
                break;

            case 'WRITEBACK':
                // Write result back to register file
                if (this.cpu.opcode === OP.LD) {
                    this.activateConnection('dmem-regfile');
                } else if (this.cpu.opcode === OP.LDI) {
                    this.activateConnection('imem-regfile');
                } else if (this.cpu.opcode !== OP.NOP && 
                           this.cpu.opcode !== OP.ST && 
                           this.cpu.opcode !== OP.JMP && 
                           this.cpu.opcode !== OP.JZ) {
                    this.activateConnection('alu-regfile');
                }
                break;

            case 'FETCH':
                // Writeback just happened, now fetching new instruction
                if (prevState === 'WRITEBACK') {
                    this.activateConnection('pc-imem');
                }
                break;
        }
    }

    addTraceEntry() {
        const entry = document.createElement('div');
        entry.className = 'trace-entry';
        entry.innerHTML = `<span class="pc">[${this.cpu.cycleCount}]</span> <span class="instr">${this.cpu.disassemble(this.cpu.instruction)}</span>`;
        this.traceLog.appendChild(entry);
        this.traceLog.scrollTop = this.traceLog.scrollHeight;
    }

    // =========================================================
    // Verilog Simulation Mode (Trace and Replay)
    // =========================================================
    
    /**
     * Initialize Verilog mode elements
     */
    initVerilogMode() {
        console.log('[VerilogMode] Initializing...');
        
        this.verilogMode = false;
        
        // Check if API is available
        if (!window.VerilogAPI) {
            console.error('[VerilogMode] window.VerilogAPI not found! api.js may not be loaded.');
            return;
        }
        
        try {
            this.tracePlayer = new window.VerilogAPI.VerilogTracePlayer();
            console.log('[VerilogMode] TracePlayer created');
        } catch (e) {
            console.error('[VerilogMode] Failed to create TracePlayer:', e);
            return;
        }
        
        // Get Verilog mode elements
        this.btnVerilogRun = document.getElementById('btn-verilog-run');
        this.btnStepBack = document.getElementById('btn-step-back');
        this.verilogStatus = document.getElementById('verilog-status');
        this.modeIndicator = document.getElementById('mode-indicator');
        this.cycleCounter = document.getElementById('cycle-counter');
        
        console.log('[VerilogMode] Button found:', this.btnVerilogRun ? 'YES' : 'NO');
        
        if (this.btnVerilogRun) {
            this.btnVerilogRun.addEventListener('click', () => {
                console.log('[VerilogMode] Run Verilog button clicked!');
                this.runVerilogSimulation();
            });
            console.log('[VerilogMode] Click listener attached to Run Verilog button');
        } else {
            console.error('[VerilogMode] btn-verilog-run element not found!');
        }
        
        if (this.btnStepBack) {
            this.btnStepBack.addEventListener('click', () => this.stepBackVerilog());
        }
        
        // Check backend health on load
        this.checkBackendStatus();
        console.log('[VerilogMode] Initialization complete');
    }
    
    /**
     * Check if backend is available
     */
    async checkBackendStatus() {
        if (!window.VerilogAPI) {
            this.setVerilogStatus('API not loaded', 'error');
            return;
        }
        
        const health = await window.VerilogAPI.checkBackendHealth();
        
        if (health.ok && health.iverilog) {
            this.setVerilogStatus('Backend ready', 'success');
            if (this.btnVerilogRun) this.btnVerilogRun.disabled = false;
        } else if (health.ok) {
            this.setVerilogStatus('iverilog not found', 'warning');
        } else {
            this.setVerilogStatus('Backend offline', 'warning');
        }
    }
    
    /**
     * Run Verilog simulation
     */
    async runVerilogSimulation() {
        console.log('[VerilogMode] runVerilogSimulation called');
        const text = this.programInput.value.trim();
        
        console.log('[VerilogMode] Assembly code length:', text.length);
        
        if (!text) {
            this.showParseStatus('Please enter some assembly code', 'error');
            return;
        }
        
        this.stop();
        this.setVerilogStatus('Simulating...', 'loading');
        if (this.btnVerilogRun) this.btnVerilogRun.disabled = true;
        
        console.log('[VerilogMode] Calling backend API...');
        
        try {
            const result = await window.VerilogAPI.runVerilogSimulation(text);
            
            console.log('[VerilogMode] API result:', result.success, 'trace length:', result.trace?.length);
            
            if (!result.success) {
                this.setVerilogStatus('Simulation failed', 'error');
                this.showParseStatus(result.error || 'Unknown error', 'error');
                if (this.btnVerilogRun) this.btnVerilogRun.disabled = false;
                return;
            }
            
            // Load trace into player
            this.tracePlayer.loadTrace(result.trace);
            this.verilogMode = true;
            
            // Update UI
            this.setVerilogStatus(`Loaded ${result.trace.length} cycles`, 'success');
            this.showParseStatus(`✓ Verilog simulation complete: ${result.trace.length} cycles`, 'success');
            this.updateModeIndicator('verilog');
            
            // Reset and display first state
            this.traceLog.innerHTML = '';
            this.updateDisplayFromTrace();
            
        } catch (error) {
            this.setVerilogStatus('Error', 'error');
            this.showParseStatus(`Error: ${error.message}`, 'error');
        }
        
        if (this.btnVerilogRun) this.btnVerilogRun.disabled = false;
    }
    
    /**
     * Step forward in Verilog trace
     */
    stepVerilog() {
        if (!this.verilogMode || !this.tracePlayer.isLoaded) return;
        
        const state = this.tracePlayer.step();
        if (state) {
            this.updateDisplayFromTrace();
            this.addVerilogTraceEntry(state);
        }
    }
    
    /**
     * Step backward in Verilog trace
     */
    stepBackVerilog() {
        if (!this.verilogMode || !this.tracePlayer.isLoaded) return;
        
        this.tracePlayer.stepBack();
        this.updateDisplayFromTrace();
    }
    
    /**
     * Update display from current trace state
     */
    updateDisplayFromTrace() {
        const state = this.tracePlayer.getCurrentState();
        if (!state) return;
        
        // Update cycle counter
        if (this.cycleCounter) {
            this.cycleCounter.textContent = `Cycle: ${this.tracePlayer.getCurrentCycle()} / ${this.tracePlayer.getTotalCycles()}`;
        }
        
        // PC
        this.pcValue.textContent = `0x${state.pc.toString(16).toUpperCase().padStart(4, '0')}`;
        
        // Instruction
        const instr = state.instruction || 0;
        this.imemValue.textContent = `0x${instr.toString(16).toUpperCase().padStart(4, '0')}`;
        this.instructionDecode.textContent = state.opcode || 'NOP';
        
        // Registers
        this.updateRegister(this.r0, state.r0);
        this.updateRegister(this.r1, state.r1);
        this.updateRegister(this.r2, state.r2);
        this.updateRegister(this.r3, state.r3);
        
        // ALU
        this.aluOp.textContent = state.opcode || 'NOP';
        this.aluResult.textContent = state.alu_result;
        
        // State
        const stateName = state.state;
        this.stateDisplay.textContent = stateName;
        this.stateDisplay.className = 'state-display ' + stateName.toLowerCase();
        
        // Binary instruction
        this.instBinary.textContent = instr.toString(2).padStart(16, '0');
        this.instAsm.textContent = state.opcode || 'NOP';
        
        // Highlight current state
        this.highlightState(stateName);
    }
    
    /**
     * Add trace entry for Verilog mode
     */
    addVerilogTraceEntry(state) {
        if (state.state !== 'WRITEBACK' && state.state !== 'HALT') return;
        
        const entry = document.createElement('div');
        entry.className = 'trace-entry';
        entry.innerHTML = `<span class="pc">[${state.cycle}]</span> <span class="instr">${state.opcode} R${state.rd}</span>`;
        this.traceLog.appendChild(entry);
        this.traceLog.scrollTop = this.traceLog.scrollHeight;
    }
    
    /**
     * Set Verilog status indicator
     */
    setVerilogStatus(message, type) {
        if (this.verilogStatus) {
            this.verilogStatus.textContent = message;
            this.verilogStatus.className = 'verilog-status ' + type;
        }
    }
    
    /**
     * Update mode indicator
     */
    updateModeIndicator(mode) {
        if (this.modeIndicator) {
            this.modeIndicator.textContent = mode === 'verilog' ? 'Verilog Mode' : 'JS Mode';
            this.modeIndicator.className = 'mode-indicator ' + mode;
        }
    }
    
    /**
     * Override step to support both modes
     */
    stepWithMode() {
        if (this.verilogMode) {
            this.stepVerilog();
        } else {
            this.step();
        }
    }
    
    /**
     * Override reset to handle both modes
     */
    resetWithMode() {
        if (this.verilogMode) {
            this.tracePlayer.reset();
            this.updateDisplayFromTrace();
            this.traceLog.innerHTML = '';
        } else {
            this.reset();
        }
    }
    
    /**
     * Exit Verilog mode and return to JS simulation
     */
    exitVerilogMode() {
        this.verilogMode = false;
        this.tracePlayer = new window.VerilogAPI.VerilogTracePlayer();
        this.updateModeIndicator('js');
        if (this.cycleCounter) this.cycleCounter.textContent = '';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    window.cpuViz = new CPUVisualizer();
    
    // Initialize Verilog mode after a short delay to ensure API is loaded
    setTimeout(() => {
        if (window.cpuViz && typeof window.cpuViz.initVerilogMode === 'function') {
            window.cpuViz.initVerilogMode();
            
            // Override step button if in Verilog mode
            const btnStep = document.getElementById('btn-step');
            if (btnStep) {
                const originalClick = btnStep.onclick;
                btnStep.onclick = null;
                btnStep.addEventListener('click', () => {
                    window.cpuViz.stepWithMode();
                });
            }
            
            // Override reset button
            const btnReset = document.getElementById('btn-reset');
            if (btnReset) {
                btnReset.addEventListener('click', () => {
                    window.cpuViz.exitVerilogMode();
                });
            }
        }
    }, 100);
});

