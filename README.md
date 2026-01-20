# 8-bit RISC CPU in Verilog

**ADLD & CO Project (CS-244AI) - Semester End Examination**

A complete 8-bit RISC (Reduced Instruction Set Computer) CPU implemented in Verilog HDL.

## Quick Start

```bash
# Install Icarus Verilog (macOS)
brew install icarus-verilog

# Compile
iverilog -o cpu_sim src/*.v testbench/cpu_tb.v

# Run simulation
vvp cpu_sim

# View waveforms (optional)
brew install gtkwave
gtkwave cpu_waveform.vcd
```

## Project Structure

```
├── src/
│   ├── alu.v              # 8-bit ALU (ADD, SUB, AND, OR, XOR, NOT, SHL, SHR)
│   ├── register_file.v    # 4 × 8-bit register file
│   ├── program_counter.v  # 8-bit program counter
│   ├── instruction_mem.v  # 256-byte instruction ROM
│   ├── data_memory.v      # 256-byte data RAM
│   ├── control_unit.v     # FSM-based control unit
│   └── cpu_top.v          # Top-level integration
├── testbench/
│   └── cpu_tb.v           # Simulation testbench
└── docs/
    ├── project_report.md  # Full documentation
    └── viva_guide.md      # Viva Q&A preparation
```

## CPU Architecture

```
┌─────────────────────────────────────────────────────┐
│                  8-bit RISC CPU                     │
├─────────────────────────────────────────────────────┤
│  PC → Instruction Memory → Control Unit             │
│         ↓                       ↓                   │
│  Register File ←→ ALU ←→ Data Memory               │
└─────────────────────────────────────────────────────┘
```

## Instruction Set (16 Instructions)

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
| 1100 | JMP | PC = address |
| 1101 | JZ | if(Z) PC = address |
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
  8-bit RISC CPU Simulation
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

## Syllabus Coverage

| Topic | Module |
|-------|--------|
| Binary Adders (Unit II) | ALU |
| Flip-Flops (Unit II) | Register File |
| Counters (Unit III) | Program Counter |
| ISA (Unit IV) | Instruction Set |
| Memory (Unit V) | Data Memory |
| Control Unit (Unit V) | Control Unit |

## Author

ADLD & CO (CS-244AI) Project - 2026
