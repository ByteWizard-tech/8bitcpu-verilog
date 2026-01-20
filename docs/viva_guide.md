# Viva Preparation Guide
## 8-bit RISC CPU in Verilog

---

## Quick Overview (Memorize This)

> "I built an 8-bit RISC CPU in Verilog with 16 instructions, 4 registers, and separate instruction/data memories. It uses an FSM-based control unit with 7 states implementing the fetch-decode-execute cycle."

---

## Expected Questions & Answers

### 1. Basic Questions

**Q: What is RISC?**
> RISC stands for Reduced Instruction Set Computer. It uses simple instructions that execute in one cycle, fixed instruction format, and load-store architecture. My CPU has only 16 instructions, all 8 bits wide.

**Q: Why 8-bit?**
> 8-bit is sufficient for demonstration while keeping complexity manageable. Data bus, registers, ALU, and addresses are all 8-bit wide.

**Q: How many registers does your CPU have?**
> 4 general-purpose registers: R0, R1, R2, R3. Each is 8 bits wide.

---

### 2. Architecture Questions

**Q: Explain the CPU architecture**
> The CPU has 6 main components:
> 1. **Program Counter** - points to current instruction address
> 2. **Instruction Memory** - stores the program (256 bytes ROM)
> 3. **Register File** - 4 registers for data storage
> 4. **ALU** - performs ADD, SUB, AND, OR, XOR, NOT, shifts
> 5. **Data Memory** - stores runtime data (256 bytes RAM)
> 6. **Control Unit** - FSM that generates control signals

**Q: What is the instruction format?**
> ```
> | OPCODE (4 bits) | Rd (2 bits) | Rs (2 bits) |
> ```
> - OPCODE: selects one of 16 operations
> - Rd: destination register (R0-R3)
> - Rs: source register (R0-R3)

**Q: Explain the fetch-decode-execute cycle**
> 1. **FETCH**: Load instruction from memory[PC], increment PC
> 2. **DECODE**: Identify opcode and operands
> 3. **EXECUTE**: Perform ALU operation or calculate address
> 4. **MEMORY**: Read/write data memory (for LD/ST)
> 5. **WRITEBACK**: Store result back to register

---

### 3. Component Questions

**Q: How does the ALU work?**
> The ALU is combinational logic. It takes two 8-bit operands and a 4-bit operation code. Using a case statement, it selects the operation:
> - ADD: `result = a + b`
> - SUB: `result = a - b`
> - AND/OR/XOR: bitwise operations
> - NOT: `result = ~a`
> - SHL/SHR: shift left/right by 1 bit
> 
> It also outputs a zero_flag when result equals zero.

**Q: How does the register file work?**
> - **Read**: Asynchronous - output immediately reflects stored value
> - **Write**: Synchronous - data written on clock edge when write_enable is high
> - Has 2 read ports (for Rd and Rs) and 1 write port

**Q: Explain the control unit FSM**
> The control unit is a Moore FSM with 7 states:
> ```
> FETCH → DECODE → EXECUTE → WRITEBACK → (back to FETCH)
>                   ↓
>               MEMORY (for LD/ST)
>                   ↓
>               WRITEBACK
> ```
> For LDI/JMP/JZ, there's an extra FETCH_IMM state to get the immediate value.

**Q: What is the difference between instruction memory and data memory?**
> | Instruction Memory | Data Memory |
> |--------------------|-------------|
> | ROM (read-only) | RAM (read-write) |
> | Stores program | Stores runtime data |
> | Addressed by PC | Addressed by register |

---

### 4. Verilog Questions

**Q: What is the difference between `assign` and `always`?**
> - `assign`: Continuous assignment for combinational logic
> - `always @(*)`: Combinational block (like ALU)
> - `always @(posedge clk)`: Sequential block (like registers)

**Q: What is `reg` vs `wire`?**
> - `wire`: Represents physical connection, driven by continuous assignment
> - `reg`: Can hold a value, assigned inside always blocks

**Q: Why use `posedge clk or posedge reset`?**
> Asynchronous reset - the reset works immediately regardless of clock. This ensures the CPU starts in a known state.

**Q: What is a testbench?**
> A testbench is a Verilog module that:
> - Generates clock signal
> - Applies reset
> - Monitors outputs
> - Verifies expected behavior
> Our testbench runs the sample program and checks if R0=6.

---

### 5. Design Decisions

**Q: Why FSM-based control instead of hardwired?**
> FSM is easier to understand, modify, and debug. Each state generates specific control signals. Adding new instructions just requires adding cases.

**Q: Why separate instruction and data memory?**
> Harvard architecture - allows simultaneous fetch and data access. Simpler than Von Neumann where instruction and data share memory.

**Q: Why only 4 registers?**
> 4 registers need only 2 bits to address (00, 01, 10, 11). This fits our 8-bit instruction format: 4-bit opcode + 2-bit Rd + 2-bit Rs = 8 bits.

---

### 6. Sample Program Questions

**Q: Explain the test program**
> ```
> LDI R0, 5    ; Load 5 into R0
> LDI R1, 3    ; Load 3 into R1
> ADD R0, R1   ; R0 = 5 + 3 = 8
> LDI R2, 2    ; Load 2 into R2
> SUB R0, R2   ; R0 = 8 - 2 = 6
> ST  R0, R3   ; Store R0 to memory address 0
> HLT          ; Stop
> ```
> Final result: R0 = 6, stored at memory[0]

**Q: How is LDI encoded?**
> LDI uses 2 bytes:
> - Byte 1: `1001_RR_XX` (opcode=1001, Rd=RR, Rs=ignored)
> - Byte 2: immediate value
> Example: LDI R0, 5 = `10010000` followed by `00000101`

---

### 7. Troubleshooting Questions

**Q: What if the simulation fails?**
> Check:
> 1. All modules compiled without errors
> 2. Clock is generating (toggle every 5ns)
> 3. Reset is released after 20ns
> 4. Watch control signals in waveform viewer

**Q: How to add a new instruction?**
> 1. Choose unused opcode
> 2. Add case in ALU (if arithmetic/logic)
> 3. Add case in control unit for signal generation
> 4. Update testbench to verify

---

## Key Points to Remember

1. **8-bit RISC** with **16 instructions**
2. **4 registers** (R0-R3), each 8-bit
3. **Harvard architecture** (separate instruction/data memory)
4. **FSM control** with 7 states
5. **Pipelined registers**: IR, immediate, ALU result
6. Test program calculates **(5 + 3) - 2 = 6**

---

## Quick Reference Card

| Component | Size | Type |
|-----------|------|------|
| Registers | 4 × 8-bit | Synchronous |
| Instruction Memory | 256 × 8-bit | ROM |
| Data Memory | 256 × 8-bit | RAM |
| ALU | 8-bit | Combinational |
| PC | 8-bit | Sequential |
| Control Unit | 7 states | FSM |

---

**Good luck with your viva!** 🎓
