/*
 * Data Memory Module (RAM)
 * 256 x 8-bit read-write memory for data
 * 
 * ADLD & CO Project - 8-bit RISC CPU
 */

module data_memory (
    input  wire        clk,          // Clock signal
    input  wire        write_enable, // Write enable
    input  wire [7:0]  address,      // Memory address
    input  wire [7:0]  write_data,   // Data to write
    output wire [7:0]  read_data     // Data read from address
);

    // 256 bytes of data memory
    reg [7:0] memory [0:255];
    
    // Asynchronous read
    assign read_data = memory[address];
    
    // Synchronous write
    always @(posedge clk) begin
        if (write_enable) begin
            memory[address] <= write_data;
        end
    end
    
    // Initialize memory to zeros
    integer i;
    initial begin
        for (i = 0; i < 256; i = i + 1) begin
            memory[i] = 8'b0;
        end
    end

endmodule
