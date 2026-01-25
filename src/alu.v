/*
 * ALU (Arithmetic Logic Unit) Module
 * 16-bit ALU with 8 operations
 * 
 * ADLD & CO Project - 16-bit RISC CPU
 */

module alu (
    input  wire [15:0] operand_a,   // First operand (from register Rd)
    input  wire [15:0] operand_b,   // Second operand (from register Rs)
    input  wire [3:0]  alu_op,      // ALU operation select
    output reg  [15:0] result,      // Result of operation
    output wire        zero_flag    // Zero flag (1 if result is 0)
);

    // ALU Operation Codes
    localparam ALU_ADD = 4'b0001;   // Addition
    localparam ALU_SUB = 4'b0010;   // Subtraction
    localparam ALU_AND = 4'b0011;   // Bitwise AND
    localparam ALU_OR  = 4'b0100;   // Bitwise OR
    localparam ALU_XOR = 4'b0101;   // Bitwise XOR
    localparam ALU_NOT = 4'b0110;   // Bitwise NOT
    localparam ALU_SHL = 4'b0111;   // Shift Left
    localparam ALU_SHR = 4'b1000;   // Shift Right
    localparam ALU_MOV = 4'b1111;   // Move (pass through B)

    // Zero flag is set when result equals zero
    assign zero_flag = (result == 16'b0);

    // ALU operation logic (combinational)
    always @(*) begin
        case (alu_op)
            ALU_ADD: result = operand_a + operand_b;
            ALU_SUB: result = operand_a - operand_b;
            ALU_AND: result = operand_a & operand_b;
            ALU_OR:  result = operand_a | operand_b;
            ALU_XOR: result = operand_a ^ operand_b;
            ALU_NOT: result = ~operand_a;
            ALU_SHL: result = operand_a << 1;
            ALU_SHR: result = operand_a >> 1;
            ALU_MOV: result = operand_b;
            default: result = 16'b0;
        endcase
    end

endmodule
