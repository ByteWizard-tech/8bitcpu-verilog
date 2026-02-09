/*
 * CPU Testbench for JSON Trace Output
 * Outputs simulation state as JSON for web frontend integration
 * 
 * ADLD & CO Project - 16-bit RISC CPU
 * Trace and Replay Architecture
 */

`timescale 1ns/1ps

module cpu_tb_json;

    // Testbench signals
    reg         clk;
    reg         reset;
    wire        halt;
    wire [15:0] pc_out;
    wire [15:0] alu_result;
    
    // Cycle counter
    integer cycle_count;
    integer max_cycles = 500;
    
    // State names for JSON output
    function [79:0] state_name;
        input [2:0] state;
        begin
            case (state)
                3'b000: state_name = "FETCH";
                3'b001: state_name = "DECODE";
                3'b010: state_name = "EXECUTE";
                3'b011: state_name = "MEMORY";
                3'b100: state_name = "WRITEBACK";
                3'b101: state_name = "HALT";
                default: state_name = "UNKNOWN";
            endcase
        end
    endfunction
    
    // Opcode names for JSON output
    function [31:0] opcode_name;
        input [3:0] op;
        begin
            case (op)
                4'b0000: opcode_name = "NOP";
                4'b0001: opcode_name = "ADD";
                4'b0010: opcode_name = "SUB";
                4'b0011: opcode_name = "AND";
                4'b0100: opcode_name = "OR";
                4'b0101: opcode_name = "XOR";
                4'b0110: opcode_name = "NOT";
                4'b0111: opcode_name = "SHL";
                4'b1000: opcode_name = "SHR";
                4'b1001: opcode_name = "LDI";
                4'b1010: opcode_name = "LD";
                4'b1011: opcode_name = "ST";
                4'b1100: opcode_name = "JMP";
                4'b1101: opcode_name = "JZ";
                4'b1110: opcode_name = "HLT";
                4'b1111: opcode_name = "MOV";
                default: opcode_name = "???";
            endcase
        end
    endfunction
    
    // Instantiate CPU
    cpu_top cpu (
        .clk        (clk),
        .reset      (reset),
        .halt       (halt),
        .pc_out     (pc_out),
        .alu_result (alu_result)
    );
    
    // Clock generation (10ns period = 100MHz)
    initial begin
        clk = 0;
        forever #5 clk = ~clk;
    end
    
    // Load program from hex file
    initial begin
        $readmemh("program.hex", cpu.imem_inst.memory);
    end
    
    // Main simulation with JSON output
    initial begin
        cycle_count = 0;
        
        // Start JSON array
        $display("[");
        
        // Apply reset
        reset = 1;
        #20;
        reset = 0;
        
        // Run simulation
        forever begin
            @(posedge clk);
            #1; // Small delay to let signals settle
            
            cycle_count = cycle_count + 1;
            
            // Output JSON object for this cycle
            // Using %0d for minimal integer formatting
            $write("{");
            $write("\"cycle\":%0d,", cycle_count);
            $write("\"pc\":%0d,", pc_out);
            $write("\"state\":\"%0s\",", state_name(cpu.ctrl_inst.state));
            $write("\"instruction\":%0d,", cpu.instruction_reg);
            $write("\"opcode\":\"%0s\",", opcode_name(cpu.instruction_reg[15:12]));
            $write("\"rd\":%0d,", cpu.instruction_reg[11:10]);
            $write("\"rs\":%0d,", cpu.instruction_reg[9:8]);
            $write("\"imm\":%0d,", cpu.instruction_reg[7:0]);
            $write("\"r0\":%0d,", cpu.regfile_inst.registers[0]);
            $write("\"r1\":%0d,", cpu.regfile_inst.registers[1]);
            $write("\"r2\":%0d,", cpu.regfile_inst.registers[2]);
            $write("\"r3\":%0d,", cpu.regfile_inst.registers[3]);
            $write("\"alu_result\":%0d,", alu_result);
            if (cpu.zero_flag)
                $write("\"zero_flag\":true,");
            else
                $write("\"zero_flag\":false,");
            $write("\"mem_addr\":%0d,", cpu.regfile_inst.registers[cpu.rs]);
            if (halt)
                $write("\"halt\":true");
            else
                $write("\"halt\":false");
            
            // End JSON object (with comma if not last)
            if (halt || cycle_count >= max_cycles) begin
                $display("}");
            end else begin
                $display("},");
            end
            
            // Stop when CPU halts or timeout
            if (halt) begin
                $display("]");
                $finish;
            end
            
            if (cycle_count >= max_cycles) begin
                $display("]");
                $display("/* Simulation timeout - CPU did not halt after %0d cycles */", max_cycles);
                $finish;
            end
        end
    end

endmodule
