# 8-bit RISC CPU - Project Report
## ADLD & CO (CS-244AI) Semester End Examination

---

## 1. Introduction

This project implements a complete 8-bit RISC (Reduced Instruction Set Computer) CPU in Verilog HDL. The CPU demonstrates fundamental concepts of computer organization including instruction fetch-decode-execute cycles, ALU operations, register files, and memory systems.

### Objectives
- Design a functional 8-bit processor with custom instruction set
- Implement core CPU components: ALU, registers, memory, control unit
- Demonstrate understanding of digital logic and computer architecture
- Verify correctness through simulation

---

## 2. CPU Architecture

### 2.1 Block Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                      8-bit RISC CPU                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌────────────┐     ┌─────────────────┐                    │
│   │  Program   │────▶│   Instruction   │                    │
│   │  Counter   │     │     Memory      │                    │
│   │   (8-bit)  │     │   (256 bytes)   │                    │
│   └────────────┘     └────────┬────────┘                    │
│         ▲                     │                              │
│         │                     ▼                              │
│         │            ┌─────────────────┐                    │
│         │            │   Instruction   │                    │
│         │            │    Register     │                    │
│         │            └────────┬────────┘                    │
│         │                     │                              │
│         │                     ▼                              │
│   ┌─────┴──────┐     ┌─────────────────┐                    │
│   │  Control   │◀────│     Decoder     │                    │
│   │   Unit     │     │                 │                    │
│   │   (FSM)    │     └─────────────────┘                    │
│   └─────┬──────┘                                            │
│         │ Control Signals                                    │
│         ▼                                                    │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              Register File (4 × 8-bit)              │   │
│   │         R0      R1      R2      R3                  │   │
│   └─────────────────────┬───────────────────────────────┘   │
│                         │                                    │
│              ┌──────────┴──────────┐                        │
│              ▼                     ▼                        │
│   ┌─────────────────┐    ┌─────────────────┐               │
│   │       ALU       │    │   Data Memory   │               │
│   │  8 operations   │    │   (256 bytes)   │               │
│   └─────────────────┘    └─────────────────┘               │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Key Features
| Feature | Specification |
|---------|---------------|
| Data Width | 8 bits |
| Registers | 4 general-purpose (R0-R3) |
| Instruction Memory | 256 bytes (ROM) |
| Data Memory | 256 bytes (RAM) |
| Instruction Set | 16 instructions |
| Control | FSM-based (7 states) |

---

## 3. Instruction Set Architecture

### 3.1 Instruction Format

```
┌───────────┬─────────┬─────────┐
│  OPCODE   │   Rd    │   Rs    │
│  (4 bits) │ (2 bits)│ (2 bits)│
└───────────┴─────────┴─────────┘
    [7:4]      [3:2]     [1:0]
```

### 3.2 Complete Instruction Set

| Opcode | Binary | Mnemonic | Operation | Description |
|--------|--------|----------|-----------|-------------|
| 0 | 0000 | NOP | - | No operation |
| 1 | 0001 | ADD | Rd = Rd + Rs | Addition |
| 2 | 0010 | SUB | Rd = Rd - Rs | Subtraction |
| 3 | 0011 | AND | Rd = Rd & Rs | Bitwise AND |
| 4 | 0100 | OR | Rd = Rd \| Rs | Bitwise OR |
| 5 | 0101 | XOR | Rd = Rd ^ Rs | Bitwise XOR |
| 6 | 0110 | NOT | Rd = ~Rd | Bitwise NOT |
| 7 | 0111 | SHL | Rd = Rd << 1 | Shift left |
| 8 | 1000 | SHR | Rd = Rd >> 1 | Shift right |
| 9 | 1001 | LDI | Rd = imm | Load immediate |
| 10 | 1010 | LD | Rd = MEM[Rs] | Load from memory |
| 11 | 1011 | ST | MEM[Rs] = Rd | Store to memory |
| 12 | 1100 | JMP | PC = addr | Unconditional jump |
| 13 | 1101 | JZ | if(Z) PC = addr | Jump if zero |
| 14 | 1110 | HLT | - | Halt CPU |
| 15 | 1111 | MOV | Rd = Rs | Register move |

---

## 4. Module Descriptions

### 4.1 ALU (alu.v)
**Function**: Performs arithmetic and logic operations
- **Inputs**: 8-bit operand_a, operand_b, 4-bit alu_op
- **Outputs**: 8-bit result, zero_flag
- **Operations**: ADD, SUB, AND, OR, XOR, NOT, SHL, SHR, MOV

### 4.2 Register File (register_file.v)
**Function**: Stores 4 general-purpose registers
- **Type**: Synchronous write, asynchronous read
- **Ports**: 2 read ports, 1 write port
- **Reset**: All registers cleared to 0

### 4.3 Program Counter (program_counter.v)
**Function**: Tracks current instruction address
- **Features**: Increment, load (for jumps)
- **Width**: 8 bits (256 addresses)

### 4.4 Instruction Memory (instruction_mem.v)
**Function**: Stores program instructions
- **Type**: ROM (read-only)
- **Size**: 256 × 8 bits
- **Access**: Asynchronous read

### 4.5 Data Memory (data_memory.v)
**Function**: Stores runtime data
- **Type**: RAM (read-write)
- **Size**: 256 × 8 bits
- **Access**: Synchronous write, asynchronous read

### 4.6 Control Unit (control_unit.v)
**Function**: Generates control signals based on instruction
- **Type**: Finite State Machine (FSM)
- **States**: FETCH, DECODE, FETCH_IMM, EXECUTE, MEMORY, WRITEBACK, HALT

### 4.7 CPU Top (cpu_top.v)
**Function**: Integrates all modules
- **Pipeline Registers**: Instruction register, immediate register, ALU result register

---

## 5. FSM State Diagram

```
         ┌─────────┐
    ────▶│  FETCH  │◀──────────────────────┐
         └────┬────┘                       │
              │                            │
              ▼                            │
         ┌─────────┐                       │
         │ DECODE  │                       │
         └────┬────┘                       │
              │                            │
    ┌─────────┼─────────┐                  │
    │         │         │                  │
    ▼         ▼         ▼                  │
┌───────┐ ┌───────┐ ┌───────┐             │
│FETCH_ │ │EXECUTE│ │ HALT  │             │
│ IMM   │ └───┬───┘ └───────┘             │
└───┬───┘     │                            │
    │         │                            │
    ▼         ▼                            │
┌───────┐ ┌───────┐                       │
│EXECUTE│ │MEMORY │                       │
└───┬───┘ └───┬───┘                       │
    │         │                            │
    ▼         ▼                            │
┌────────────────────┐                    │
│    WRITEBACK       │────────────────────┘
└────────────────────┘
```

---

## 6. Test Program and Results

### 6.1 Sample Program: Calculate (5 + 3) - 2

```assembly
; Program: Compute (5 + 3) - 2 = 6, store to memory

LDI R0, 5      ; R0 = 5
LDI R1, 3      ; R1 = 3
ADD R0, R1     ; R0 = 5 + 3 = 8
LDI R2, 2      ; R2 = 2
SUB R0, R2     ; R0 = 8 - 2 = 6
LDI R3, 0      ; R3 = 0 (memory address)
ST  R0, R3     ; MEM[0] = 6
HLT            ; Stop execution
```

### 6.2 Simulation Results

```
========================================
  CPU HALTED
========================================

Final Register Values:
  R0 = 6 (expected: 6) ✓
  R1 = 3 (expected: 3) ✓
  R2 = 2 (expected: 2) ✓
  R3 = 0 (expected: 0) ✓

Data Memory[0] = 6 (expected: 6) ✓

*** TEST PASSED ***
```

---

## 7. Syllabus Mapping

| Syllabus Topic | Unit | Implementation |
|----------------|------|----------------|
| Binary Adders and Subtractors | II | ALU (ADD, SUB operations) |
| Flip-Flops and Registers | II | Register File, Pipeline registers |
| Counters | III | Program Counter |
| Instruction Set Architecture | IV | Custom 16-instruction ISA |
| Assembly Language | IV | Sample program |
| Memory Operations | IV | LD, ST instructions |
| Control Signals | V | Control Unit signals |
| Instruction Execution | V | Fetch-Decode-Execute cycle |
| Hardware Components | V | Complete CPU datapath |

---

## 8. How to Run

### Prerequisites
- Icarus Verilog simulator
- GTKWave (optional, for waveforms)

### Commands
```bash
# Install (macOS)
brew install icarus-verilog gtkwave

# Compile
iverilog -o cpu_sim src/*.v testbench/cpu_tb.v

# Run simulation
vvp cpu_sim

# View waveforms
gtkwave cpu_waveform.vcd
```

---

## 9. Conclusion

This project successfully demonstrates a working 8-bit RISC CPU with:
- Complete fetch-decode-execute pipeline
- 16-instruction ISA with arithmetic, logic, memory, and control operations
- FSM-based control unit
- Verified through simulation

The design covers all major topics from the ADLD & CO syllabus and provides a practical understanding of computer organization principles.

---

## 10. References

1. "Computer Organization and Design" - Patterson & Hennessy
2. "Digital Design and Computer Architecture" - Harris & Harris
3. Course syllabus - ADLD & CO (CS-244AI)

---

**Project by**: [Your Name]  
**Course**: ADLD & CO (CS-244AI)  
**Date**: January 2026
