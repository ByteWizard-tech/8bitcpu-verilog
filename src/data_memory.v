/*
 * Data Memory Module (RAM)
 * 256 x 16-bit read-write memory for data
 * 
 * ADLD & CO Project - 16-bit RISC CPU
 */

module data_memory (
    input  wire         clk,          // Clock signal
    input  wire         write_enable, // Write enable
    input  wire [15:0]  address,      // Memory address
    input  wire [15:0]  write_data,   // Data to write
    output wire [15:0]  read_data     // Data read from address
);

    // 256 words of 16-bit data memory
    reg [15:0] memory [0:255];
    
    // Asynchronous read (use lower 8 bits of address)
    assign read_data = memory[address[7:0]];
    
    // Synchronous write
    always @(posedge clk) begin
        if (write_enable) begin
            memory[address[7:0]] <= write_data;
        end
    end
    
    // Initialize memory to zeros
    integer i;
    initial begin
        for (i = 0; i < 256; i = i + 1) begin
            memory[i] = 16'b0;
        end
    end

endmodule
