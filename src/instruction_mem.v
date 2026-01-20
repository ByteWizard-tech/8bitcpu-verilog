/*
 * Instruction Memory Module (ROM)
 * 256 x 8-bit read-only memory for instructions
 * 
 * ADLD & CO Project - 8-bit RISC CPU
 */

module instruction_memory (
    input  wire [7:0] address,       // Address to read
    output wire [7:0] instruction    // Instruction at address
);

    // 256 bytes of instruction memory
    reg [7:0] memory [0:255];
    
    // Asynchronous read
    assign instruction = memory[address];
    
    // Initialize with sample program
    // This program demonstrates all CPU operations
    initial begin
        // Program: Calculate (5 + 3) - 2, store result, then halt
        
        // LDI R0, 5    (Load 5 into R0)
        memory[0]  = 8'b1001_00_00;  // LDI opcode, Rd=R0
        memory[1]  = 8'd5;           // Immediate value = 5
        
        // LDI R1, 3    (Load 3 into R1)
        memory[2]  = 8'b1001_01_00;  // LDI opcode, Rd=R1
        memory[3]  = 8'd3;           // Immediate value = 3
        
        // ADD R0, R1   (R0 = R0 + R1 = 5 + 3 = 8)
        memory[4]  = 8'b0001_00_01;  // ADD opcode, Rd=R0, Rs=R1
        
        // LDI R2, 2    (Load 2 into R2)
        memory[5]  = 8'b1001_10_00;  // LDI opcode, Rd=R2
        memory[6]  = 8'd2;           // Immediate value = 2
        
        // SUB R0, R2   (R0 = R0 - R2 = 8 - 2 = 6)
        memory[7]  = 8'b0010_00_10;  // SUB opcode, Rd=R0, Rs=R2
        
        // LDI R3, 0    (Load memory address 0 into R3)
        memory[8]  = 8'b1001_11_00;  // LDI opcode, Rd=R3
        memory[9]  = 8'd0;           // Address = 0
        
        // ST R0, R3    (Store R0 to memory[R3] = memory[0])
        memory[10] = 8'b1011_00_11;  // ST opcode, Rd=R0, Rs=R3
        
        // HLT          (Halt the CPU)
        memory[11] = 8'b1110_00_00;  // HLT opcode
        
        // Fill remaining memory with NOP
        // (Handled by default initialization to 0)
    end

endmodule
