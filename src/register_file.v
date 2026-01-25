/*
 * Register File Module
 * 4 x 16-bit general purpose registers (R0-R3)
 * 
 * ADLD & CO Project - 16-bit RISC CPU
 */

module register_file (
    input  wire         clk,          // Clock signal
    input  wire         reset,        // Reset signal
    input  wire         write_enable, // Write enable
    input  wire [1:0]   read_addr1,   // Read address 1 (Rd)
    input  wire [1:0]   read_addr2,   // Read address 2 (Rs)
    input  wire [1:0]   write_addr,   // Write address
    input  wire [15:0]  write_data,   // Data to write
    output wire [15:0]  read_data1,   // Data from Rd
    output wire [15:0]  read_data2    // Data from Rs
);

    // 4 registers, 16 bits each
    reg [15:0] registers [0:3];
    
    // Asynchronous read (combinational)
    assign read_data1 = registers[read_addr1];
    assign read_data2 = registers[read_addr2];
    
    // Synchronous write
    integer i;
    always @(posedge clk or posedge reset) begin
        if (reset) begin
            // Clear all registers on reset
            for (i = 0; i < 4; i = i + 1) begin
                registers[i] <= 16'b0;
            end
        end else if (write_enable) begin
            registers[write_addr] <= write_data;
        end
    end

endmodule
