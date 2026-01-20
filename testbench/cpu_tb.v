/*
 * CPU Testbench
 * Simulates the 8-bit RISC CPU and displays execution trace
 * 
 * ADLD & CO Project - 8-bit RISC CPU
 */

`timescale 1ns/1ps

module cpu_tb;

    // Testbench signals
    reg        clk;
    reg        reset;
    wire       halt;
    wire [7:0] pc_out;
    wire [7:0] alu_result;
    
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
    
    // VCD dump for waveform viewing
    initial begin
        $dumpfile("cpu_waveform.vcd");
        $dumpvars(0, cpu_tb);
    end
    
    // Test sequence
    initial begin
        $display("========================================");
        $display("  8-bit RISC CPU Simulation");
        $display("  ADLD & CO Project");
        $display("========================================");
        $display("");
        
        // Apply reset
        reset = 1;
        #20;
        reset = 0;
        
        $display("Time\tPC\tInstruction\tR0\tR1\tR2\tR3\tALU Out\tState");
        $display("----\t--\t-----------\t--\t--\t--\t--\t-------\t-----");
        
        // Run simulation for enough cycles
        repeat (100) begin
            @(posedge clk);
            #1; // Small delay to let signals settle
            
            $display("%0t\t%d\t%b\t%d\t%d\t%d\t%d\t%d\t%d",
                $time,
                pc_out,
                cpu.imem_inst.memory[pc_out],
                cpu.regfile_inst.registers[0],
                cpu.regfile_inst.registers[1],
                cpu.regfile_inst.registers[2],
                cpu.regfile_inst.registers[3],
                alu_result,
                cpu.ctrl_inst.state
            );
            
            // Stop when CPU halts
            if (halt) begin
                $display("");
                $display("========================================");
                $display("  CPU HALTED");
                $display("========================================");
                $display("");
                $display("Final Register Values:");
                $display("  R0 = %d (expected: 6)", cpu.regfile_inst.registers[0]);
                $display("  R1 = %d (expected: 3)", cpu.regfile_inst.registers[1]);
                $display("  R2 = %d (expected: 2)", cpu.regfile_inst.registers[2]);
                $display("  R3 = %d (expected: 0)", cpu.regfile_inst.registers[3]);
                $display("");
                $display("Data Memory[0] = %d (expected: 6)", cpu.dmem_inst.memory[0]);
                $display("");
                
                // Verify results
                if (cpu.regfile_inst.registers[0] == 6 &&
                    cpu.dmem_inst.memory[0] == 6) begin
                    $display("*** TEST PASSED ***");
                end else begin
                    $display("*** TEST FAILED ***");
                end
                
                $finish;
            end
        end
        
        $display("Simulation timeout - CPU did not halt");
        $finish;
    end

endmodule
