/*
 * Control Unit Module
 * FSM-based control for instruction decode and signal generation
 * 
 * ADLD & CO Project - 8-bit RISC CPU
 */

module control_unit (
    input  wire        clk,              // Clock signal
    input  wire        reset,            // Reset signal
    input  wire [7:0]  instruction,      // Current instruction (from IR)
    input  wire        zero_flag,        // Zero flag from ALU
    
    // Control outputs
    output reg         pc_enable,        // Enable PC update
    output reg         pc_load,          // Load PC (for jumps)
    output reg         reg_write,        // Register write enable
    output reg         mem_write,        // Memory write enable
    output reg         mem_to_reg,       // Memory to register MUX
    output reg         use_imm,          // Use immediate for writeback
    output reg         ir_load,          // Instruction register load
    output reg         imm_load,         // Loading immediate value
    output reg         alu_latch,        // Latch ALU result
    output reg  [3:0]  alu_op,           // ALU operation
    output reg         halt              // CPU halt signal
);

    // Instruction opcodes
    localparam OP_NOP = 4'b0000;
    localparam OP_ADD = 4'b0001;
    localparam OP_SUB = 4'b0010;
    localparam OP_AND = 4'b0011;
    localparam OP_OR  = 4'b0100;
    localparam OP_XOR = 4'b0101;
    localparam OP_NOT = 4'b0110;
    localparam OP_SHL = 4'b0111;
    localparam OP_SHR = 4'b1000;
    localparam OP_LDI = 4'b1001;
    localparam OP_LD  = 4'b1010;
    localparam OP_ST  = 4'b1011;
    localparam OP_JMP = 4'b1100;
    localparam OP_JZ  = 4'b1101;
    localparam OP_HLT = 4'b1110;
    localparam OP_MOV = 4'b1111;

    // FSM States
    localparam STATE_FETCH     = 3'b000;
    localparam STATE_DECODE    = 3'b001;
    localparam STATE_EXECUTE   = 3'b010;
    localparam STATE_MEMORY    = 3'b011;
    localparam STATE_WRITEBACK = 3'b100;
    localparam STATE_HALT      = 3'b101;
    localparam STATE_FETCH_IMM = 3'b110;

    reg [2:0] state, next_state;
    
    // Latch opcode during decode
    reg [3:0] opcode_reg;
    wire [3:0] opcode = instruction[7:4];

    // State register
    always @(posedge clk or posedge reset) begin
        if (reset) begin
            state <= STATE_FETCH;
            opcode_reg <= 4'b0;
        end else begin
            state <= next_state;
            if (state == STATE_DECODE)
                opcode_reg <= opcode;
        end
    end

    // Next state logic
    always @(*) begin
        next_state = state;
        case (state)
            STATE_FETCH: begin
                next_state = STATE_DECODE;
            end
            
            STATE_DECODE: begin
                case (opcode)
                    OP_HLT:  next_state = STATE_HALT;
                    OP_LDI:  next_state = STATE_FETCH_IMM;
                    OP_JMP:  next_state = STATE_FETCH_IMM;
                    OP_JZ:   next_state = STATE_FETCH_IMM;
                    default: next_state = STATE_EXECUTE;
                endcase
            end
            
            STATE_FETCH_IMM: begin
                next_state = STATE_EXECUTE;
            end
            
            STATE_EXECUTE: begin
                if (opcode_reg == OP_LD || opcode_reg == OP_ST)
                    next_state = STATE_MEMORY;
                else
                    next_state = STATE_WRITEBACK;
            end
            
            STATE_MEMORY: begin
                next_state = STATE_WRITEBACK;
            end
            
            STATE_WRITEBACK: begin
                next_state = STATE_FETCH;
            end
            
            STATE_HALT: begin
                next_state = STATE_HALT;
            end
            
            default: next_state = STATE_FETCH;
        endcase
    end

    // Control signal generation
    always @(*) begin
        // Default values
        pc_enable  = 1'b0;
        pc_load    = 1'b0;
        reg_write  = 1'b0;
        mem_write  = 1'b0;
        mem_to_reg = 1'b0;
        use_imm    = 1'b0;
        ir_load    = 1'b0;
        imm_load   = 1'b0;
        alu_latch  = 1'b0;
        alu_op     = 4'b0000;
        halt       = 1'b0;

        case (state)
            STATE_FETCH: begin
                ir_load = 1'b1;    // Load instruction register
                pc_enable = 1'b1;  // Increment PC
            end
            
            STATE_DECODE: begin
                // Setup ALU opcode for next cycle
                alu_op = opcode;
            end
            
            STATE_FETCH_IMM: begin
                pc_enable = 1'b1;  // Move to next byte
                imm_load  = 1'b1;  // Load immediate value
            end
            
            STATE_EXECUTE: begin
                alu_op = opcode_reg;
                alu_latch = 1'b1;  // Latch ALU result
                case (opcode_reg)
                    OP_JMP: begin
                        pc_load = 1'b1;
                        pc_enable = 1'b1;
                    end
                    OP_JZ: begin
                        if (zero_flag) begin
                            pc_load = 1'b1;
                            pc_enable = 1'b1;
                        end
                    end
                    default: begin
                        // ALU operations - result latched
                    end
                endcase
            end
            
            STATE_MEMORY: begin
                if (opcode_reg == OP_ST) begin
                    mem_write = 1'b1;
                end
            end
            
            STATE_WRITEBACK: begin
                case (opcode_reg)
                    OP_NOP, OP_ST, OP_JMP, OP_JZ: begin
                        // No register write
                    end
                    OP_LD: begin
                        reg_write  = 1'b1;
                        mem_to_reg = 1'b1;
                    end
                    OP_LDI: begin
                        reg_write = 1'b1;
                        use_imm   = 1'b1;
                    end
                    default: begin
                        reg_write = 1'b1;  // Write latched ALU result
                    end
                endcase
            end
            
            STATE_HALT: begin
                halt = 1'b1;
            end
        endcase
    end

endmodule
