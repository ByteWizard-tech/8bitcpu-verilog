/*
 * Instruction Memory Module (ROM)
 * 256 x 16-bit read-only memory for instructions
 * 
 * ADLD & CO Project - 16-bit RISC CPU
 * 
 * 16-bit Instruction Format:
 * [15:12] - Opcode (4 bits)
 * [11:10] - Rd (destination register, 2 bits)
 * [9:8]   - Rs (source register, 2 bits)
 * [7:0]   - Immediate value (8 bits, for LDI/JMP/JZ)
 */

module instruction_memory (
    input  wire [15:0] address,      // Address to read
    output wire [15:0] instruction   // Instruction at address
);

    // 256 words of 16-bit instruction memory
    reg [15:0] memory [0:255];
    
    // Asynchronous read (use lower 8 bits of address)
    assign instruction = memory[address[7:0]];
    
    // Initialize with sample program
    // This program demonstrates all CPU operations
    // New 16-bit format: {opcode[4], Rd[2], Rs[2], imm[8]}
    initial begin
        // Program: Calculate (5 + 3) - 2, store result, then halt
        
        // LDI R0, 5    (Load 5 into R0)
        // Opcode=1001, Rd=00, Rs=00, Imm=00000101
        memory[0]  = 16'b1001_00_00_00000101;
        
        // LDI R1, 3    (Load 3 into R1)
        // Opcode=1001, Rd=01, Rs=00, Imm=00000011
        memory[1]  = 16'b1001_01_00_00000011;
        
        // ADD R0, R1   (R0 = R0 + R1 = 5 + 3 = 8)
        // Opcode=0001, Rd=00, Rs=01, Imm=00000000
        memory[2]  = 16'b0001_00_01_00000000;
        
        // LDI R2, 2    (Load 2 into R2)
        // Opcode=1001, Rd=10, Rs=00, Imm=00000010
        memory[3]  = 16'b1001_10_00_00000010;
        
        // SUB R0, R2   (R0 = R0 - R2 = 8 - 2 = 6)
        // Opcode=0010, Rd=00, Rs=10, Imm=00000000
        memory[4]  = 16'b0010_00_10_00000000;
        
        // LDI R3, 0    (Load memory address 0 into R3)
        // Opcode=1001, Rd=11, Rs=00, Imm=00000000
        memory[5]  = 16'b1001_11_00_00000000;
        
        // ST R0, R3    (Store R0 to memory[R3] = memory[0])
        // Opcode=1011, Rd=00, Rs=11, Imm=00000000
        memory[6]  = 16'b1011_00_11_00000000;
        
        // HLT          (Halt the CPU)
        // Opcode=1110, Rd=00, Rs=00, Imm=00000000
        memory[7]  = 16'b1110_00_00_00000000;
        
        // Fill remaining memory with NOP (default 0)
    end

endmodule
