# 16-bit RISC CPU in Verilog

**ADLD & CO Project (CS-244AI) - Semester End Examination**

A complete 16-bit RISC (Reduced Instruction Set Computer) CPU implemented in Verilog HDL with an interactive data flow visualizer.

## Quick Start

```bash
# Install Icarus Verilog (macOS)
brew install icarus-verilog

# Compile and run simulation
iverilog -o cpu_sim src/*.v testbench/cpu_tb.v
vvp cpu_sim
```

## Data Flow Visualizer

Open `visualization/index.html` in a browser to see an interactive visualization of the CPU:
- **Step**: Execute one clock cycle at a time
- **Run**: Continuous execution with speed control
- **FSM States**: Watch FETCH → DECODE → EXECUTE → MEMORY → WRITEBACK
- **Data Flow**: See values move between PC, registers, ALU, and memory

## Project Structure

```
├── src/
│   ├── alu.v              # 16-bit ALU (ADD, SUB, AND, OR, XOR, NOT, SHL, SHR)
│   ├── register_file.v    # 4 × 16-bit register file
│   ├── program_counter.v  # 16-bit program counter
│   ├── instruction_mem.v  # 256 × 16-bit instruction ROM
│   ├── data_memory.v      # 256 × 16-bit data RAM
│   ├── control_unit.v     # FSM-based control unit
│   └── cpu_top.v          # Top-level integration
├── testbench/
│   └── cpu_tb.v           # Simulation testbench
├── visualization/
│   ├── index.html         # Data flow visualizer
│   ├── style.css          # Styling
│   └── cpu.js             # CPU simulation in JavaScript
└── docs/
    ├── cpu_block_diagram.png    # CPU block diagram
    ├── cpu_datapath.png         # CPU datapath diagram
    ├── fsm_state_diagram.png    # FSM state diagram
    └── methodology_flowchart.png # Methodology flowchart
```

## CPU Architecture

```
┌─────────────────────────────────────────────────────┐
│                  16-bit RISC CPU                    │
├─────────────────────────────────────────────────────┤
│  PC → Instruction Memory → Control Unit             │
│         ↓                       ↓                   │
│  Register File ←→ ALU ←→ Data Memory               │
└─────────────────────────────────────────────────────┘
```

## 16-bit Instruction Format

```
[15:12] Opcode  [11:10] Rd  [9:8] Rs  [7:0] Immediate
```

| Opcode | Mnemonic | Operation |
|--------|----------|-----------|
| 0000 | NOP | No operation |
| 0001 | ADD | Rd = Rd + Rs |
| 0010 | SUB | Rd = Rd - Rs |
| 0011 | AND | Rd = Rd & Rs |
| 0100 | OR | Rd = Rd \| Rs |
| 0101 | XOR | Rd = Rd ^ Rs |
| 0110 | NOT | Rd = ~Rd |
| 0111 | SHL | Rd = Rd << 1 |
| 1000 | SHR | Rd = Rd >> 1 |
| 1001 | LDI | Rd = immediate |
| 1010 | LD | Rd = MEM[Rs] |
| 1011 | ST | MEM[Rs] = Rd |
| 1100 | JMP | PC = immediate |
| 1101 | JZ | if(Z) PC = immediate |
| 1110 | HLT | Halt CPU |
| 1111 | MOV | Rd = Rs |

## Sample Program

The CPU comes preloaded with a test program that calculates `(5 + 3) - 2 = 6`:

```assembly
LDI R0, 5      ; R0 = 5
LDI R1, 3      ; R1 = 3
ADD R0, R1     ; R0 = 5 + 3 = 8
LDI R2, 2      ; R2 = 2
SUB R0, R2     ; R0 = 8 - 2 = 6
LDI R3, 0      ; R3 = 0 (address)
ST  R0, R3     ; MEM[0] = 6
HLT            ; Stop
```

## Expected Output

```
========================================
  16-bit RISC CPU Simulation
  ADLD & CO Project
========================================

Final Register Values:
  R0 = 6 (expected: 6)
  R1 = 3 (expected: 3)
  R2 = 2 (expected: 2)
  R3 = 0 (expected: 0)

Data Memory[0] = 6 (expected: 6)

*** TEST PASSED ***
```

## Authors

- **Nithin Eashwar** (1RV24CS173)
- **Omesh Sengar** (1RV24CS178)
- **Pranav Bhandi**
- **Poojith K**

ADLD & CO (CS-244AI) Project - 2026
