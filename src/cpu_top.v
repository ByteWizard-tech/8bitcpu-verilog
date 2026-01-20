/*
 * CPU Top Module
 * Integrates all components into a complete 8-bit RISC CPU
 * 
 * ADLD & CO Project - 8-bit RISC CPU
 */

module cpu_top (
    input  wire        clk,          // Clock signal
    input  wire        reset,        // Reset signal
    output wire        halt,         // CPU halted indicator
    output wire [7:0]  pc_out,       // Program counter (for debug)
    output wire [7:0]  alu_result    // ALU result (for debug)
);

    // Internal wires
    wire [7:0] instruction_from_mem;
    wire [7:0] reg_data1, reg_data2;
    wire [7:0] alu_out;
    wire [7:0] mem_read_data;
    reg  [7:0] write_back_data;
    wire       zero_flag;
    
    // Control signals
    wire       pc_enable, pc_load;
    wire       reg_write;
    wire       mem_write;
    wire       mem_to_reg;
    wire       imm_load;
    wire       ir_load;
    wire       alu_latch;      // Latch ALU result
    wire [3:0] alu_op;
    wire       use_imm;
    
    // Instruction Register - latches instruction during FETCH
    reg [7:0] instruction_reg;
    wire [7:0] instruction = instruction_reg;
    
    always @(posedge clk or posedge reset) begin
        if (reset)
            instruction_reg <= 8'b0;
        else if (ir_load)
            instruction_reg <= instruction_from_mem;
    end
    
    // Instruction decode from latched instruction
    wire [3:0] opcode = instruction[7:4];
    wire [1:0] rd     = instruction[3:2];
    wire [1:0] rs     = instruction[1:0];
    
    // Immediate value register - latches during FETCH_IMM
    reg [7:0] imm_reg;
    always @(posedge clk or posedge reset) begin
        if (reset)
            imm_reg <= 8'b0;
        else if (imm_load)
            imm_reg <= instruction_from_mem;
    end
    
    // ALU result register - latches during EXECUTE
    reg [7:0] alu_result_reg;
    always @(posedge clk or posedge reset) begin
        if (reset)
            alu_result_reg <= 8'b0;
        else if (alu_latch)
            alu_result_reg <= alu_out;
    end
    
    // ALU operand B selection
    wire [7:0] alu_operand_b = reg_data2;
    
    // Write-back data selection - controlled by control unit signals
    always @(*) begin
        if (mem_to_reg)
            write_back_data = mem_read_data;
        else if (use_imm)
            write_back_data = imm_reg;
        else
            write_back_data = alu_result_reg;  // Use latched result
    end
    
    // Debug outputs
    assign alu_result = alu_out;

    // =====================================================
    // Module Instantiations
    // =====================================================
    
    // Program Counter
    program_counter pc_inst (
        .clk        (clk),
        .reset      (reset),
        .pc_enable  (pc_enable),
        .pc_load    (pc_load),
        .pc_in      (imm_reg),
        .pc_out     (pc_out)
    );
    
    // Instruction Memory (ROM)
    instruction_memory imem_inst (
        .address    (pc_out),
        .instruction(instruction_from_mem)
    );
    
    // Register File
    register_file regfile_inst (
        .clk         (clk),
        .reset       (reset),
        .write_enable(reg_write),
        .read_addr1  (rd),
        .read_addr2  (rs),
        .write_addr  (rd),
        .write_data  (write_back_data),
        .read_data1  (reg_data1),
        .read_data2  (reg_data2)
    );
    
    // ALU
    alu alu_inst (
        .operand_a  (reg_data1),
        .operand_b  (alu_operand_b),
        .alu_op     (alu_op),
        .result     (alu_out),
        .zero_flag  (zero_flag)
    );
    
    // Data Memory (RAM)
    data_memory dmem_inst (
        .clk         (clk),
        .write_enable(mem_write),
        .address     (reg_data2),
        .write_data  (reg_data1),
        .read_data   (mem_read_data)
    );
    
    // Control Unit
    control_unit ctrl_inst (
        .clk        (clk),
        .reset      (reset),
        .instruction(instruction),
        .zero_flag  (zero_flag),
        .pc_enable  (pc_enable),
        .pc_load    (pc_load),
        .reg_write  (reg_write),
        .mem_write  (mem_write),
        .mem_to_reg (mem_to_reg),
        .use_imm    (use_imm),
        .ir_load    (ir_load),
        .imm_load   (imm_load),
        .alu_latch  (alu_latch),
        .alu_op     (alu_op),
        .halt       (halt)
    );

endmodule
