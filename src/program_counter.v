/*
 * Program Counter Module
 * 8-bit PC with increment and load functionality
 * 
 * ADLD & CO Project - 8-bit RISC CPU
 */

module program_counter (
    input  wire        clk,          // Clock signal
    input  wire        reset,        // Reset signal
    input  wire        pc_enable,    // Enable PC update
    input  wire        pc_load,      // Load new address (for jumps)
    input  wire [7:0]  pc_in,        // Address to load
    output reg  [7:0]  pc_out        // Current PC value
);

    always @(posedge clk or posedge reset) begin
        if (reset) begin
            pc_out <= 8'b0;          // Reset to address 0
        end else if (pc_enable) begin
            if (pc_load) begin
                pc_out <= pc_in;     // Jump to new address
            end else begin
                pc_out <= pc_out + 1; // Increment PC
            end
        end
    end

endmodule
