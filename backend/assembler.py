"""
Python Assembler for 16-bit RISC CPU
Matches the JavaScript implementation in cpu.js
"""

# Opcodes (matching Verilog)
OPCODES = {
    'NOP': 0b0000,
    'ADD': 0b0001,
    'SUB': 0b0010,
    'AND': 0b0011,
    'OR':  0b0100,
    'XOR': 0b0101,
    'NOT': 0b0110,
    'SHL': 0b0111,
    'SHR': 0b1000,
    'LDI': 0b1001,
    'LD':  0b1010,
    'ST':  0b1011,
    'JMP': 0b1100,
    'JZ':  0b1101,
    'HLT': 0b1110,
    'MOV': 0b1111
}

# Instruction types for parsing
INSTR_TYPES = {
    'NOP': 'none',
    'HLT': 'none',
    'ADD': 'reg_reg',
    'SUB': 'reg_reg',
    'AND': 'reg_reg',
    'OR':  'reg_reg',
    'XOR': 'reg_reg',
    'MOV': 'reg_reg',
    'NOT': 'reg',
    'SHL': 'reg',
    'SHR': 'reg',
    'LDI': 'reg_imm',
    'LD':  'reg_regaddr',
    'ST':  'reg_regaddr',
    'JMP': 'imm',
    'JZ':  'imm'
}


def parse_register(s: str) -> int:
    """Parse a register (R0-R3)"""
    reg = s.upper().replace('[', '').replace(']', '')
    if reg.startswith('R') and len(reg) == 2 and reg[1] in '0123':
        return int(reg[1])
    raise ValueError(f"Invalid register: {s} (use R0, R1, R2, or R3)")


def parse_immediate(s: str) -> int:
    """Parse an immediate value (decimal, hex, or binary)"""
    s = s.strip()
    try:
        if s.lower().startswith('0x'):
            value = int(s, 16)
        elif s.lower().startswith('0b'):
            value = int(s[2:], 2)
        else:
            value = int(s, 10)
    except ValueError:
        raise ValueError(f"Invalid immediate value: {s}")
    
    if value < 0 or value > 255:
        raise ValueError(f"Immediate value out of range (0-255): {value}")
    
    return value


def parse_line(line: str, line_num: int) -> int:
    """Parse a single line of assembly into machine code"""
    # Split by whitespace and commas
    parts = line.replace(',', ' ').split()
    
    if not parts:
        raise ValueError("Empty instruction")
    
    mnemonic = parts[0].upper()
    
    if mnemonic not in OPCODES:
        raise ValueError(f"Unknown instruction: {mnemonic}")
    
    opcode = OPCODES[mnemonic]
    instr_type = INSTR_TYPES[mnemonic]
    
    rd, rs, imm = 0, 0, 0
    
    if instr_type == 'none':
        # No operands needed
        pass
    
    elif instr_type == 'reg':
        # Single register: Rd
        if len(parts) < 2:
            raise ValueError(f"{mnemonic} requires a register")
        rd = parse_register(parts[1])
    
    elif instr_type == 'reg_reg':
        # Two registers: Rd, Rs
        if len(parts) < 3:
            raise ValueError(f"{mnemonic} requires two registers (Rd, Rs)")
        rd = parse_register(parts[1])
        rs = parse_register(parts[2])
    
    elif instr_type == 'reg_imm':
        # Register and immediate: Rd, imm
        if len(parts) < 3:
            raise ValueError(f"{mnemonic} requires register and immediate (Rd, value)")
        rd = parse_register(parts[1])
        imm = parse_immediate(parts[2])
    
    elif instr_type == 'reg_regaddr':
        # Register and register address: Rd, [Rs]
        if len(parts) < 3:
            raise ValueError(f"{mnemonic} requires register and address register (Rd, [Rs] or Rd, Rs)")
        rd = parse_register(parts[1])
        rs = parse_register(parts[2].replace('[', '').replace(']', ''))
    
    elif instr_type == 'imm':
        # Immediate only (jump)
        if len(parts) < 2:
            raise ValueError(f"{mnemonic} requires an address")
        imm = parse_immediate(parts[1])
    
    else:
        raise ValueError(f"Unknown instruction type for {mnemonic}")
    
    # Encode instruction: [opcode(4)][rd(2)][rs(2)][immediate(8)]
    instruction = (opcode << 12) | (rd << 10) | (rs << 8) | (imm & 0xFF)
    return instruction


def assemble(text: str) -> dict:
    """
    Assemble a program text into machine code
    Returns: {'success': bool, 'program': list[int], 'errors': list[str]}
    """
    lines = text.split('\n')
    program = []
    errors = []
    
    for i, line in enumerate(lines):
        line_num = i + 1
        line = line.strip()
        
        # Remove comments (everything after ;)
        if ';' in line:
            line = line[:line.index(';')].strip()
        
        # Skip empty lines
        if not line:
            continue
        
        try:
            instruction = parse_line(line, line_num)
            program.append(instruction)
        except ValueError as e:
            errors.append(f"Line {line_num}: {str(e)}")
    
    return {
        'success': len(errors) == 0,
        'program': program,
        'errors': errors
    }


def to_hex_file(program: list) -> str:
    """Convert program to hex file format for $readmemh"""
    lines = []
    for instr in program:
        lines.append(f"{instr:04X}")
    # Pad with NOPs to fill minimum memory
    while len(lines) < 8:
        lines.append("0000")
    return '\n'.join(lines)


if __name__ == '__main__':
    # Test the assembler
    test_program = """
    ; Test program
    LDI R0, 5      ; R0 = 5
    LDI R1, 3      ; R1 = 3
    ADD R0, R1     ; R0 = R0 + R1 = 8
    HLT
    """
    
    result = assemble(test_program)
    print(f"Success: {result['success']}")
    print(f"Program: {[hex(x) for x in result['program']]}")
    print(f"Errors: {result['errors']}")
    print()
    print("Hex file output:")
    print(to_hex_file(result['program']))
