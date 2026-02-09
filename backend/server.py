"""
Flask Backend Server for 16-bit RISC CPU Trace and Replay
Receives assembly code, runs Verilog simulation, returns JSON trace
"""

import os
import sys
import json
import subprocess
import tempfile
import shutil
from pathlib import Path

from flask import Flask, request, jsonify
from flask_cors import CORS

from assembler import assemble, to_hex_file

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend access

# Paths configuration
BASE_DIR = Path(__file__).parent.parent.absolute()
SRC_DIR = BASE_DIR / 'src'
TESTBENCH_DIR = BASE_DIR / 'testbench'

# Verilog source files (order matters for dependencies)
VERILOG_SOURCES = [
    SRC_DIR / 'alu.v',
    SRC_DIR / 'register_file.v',
    SRC_DIR / 'program_counter.v',
    SRC_DIR / 'instruction_mem.v',
    SRC_DIR / 'data_memory.v',
    SRC_DIR / 'control_unit.v',
    SRC_DIR / 'cpu_top.v',
    TESTBENCH_DIR / 'cpu_tb_json.v'
]


def find_iverilog():
    """Find iverilog executable"""
    # Try common locations
    candidates = [
        'iverilog',
        r'C:\iverilog\bin\iverilog.exe',
        r'C:\Program Files\Icarus Verilog\bin\iverilog.exe',
        '/usr/bin/iverilog',
        '/usr/local/bin/iverilog'
    ]
    
    for candidate in candidates:
        if shutil.which(candidate):
            return candidate
        if os.path.exists(candidate):
            return candidate
    
    return None


def find_vvp():
    """Find vvp executable"""
    candidates = [
        'vvp',
        r'C:\iverilog\bin\vvp.exe',
        r'C:\Program Files\Icarus Verilog\bin\vvp.exe',
        '/usr/bin/vvp',
        '/usr/local/bin/vvp'
    ]
    
    for candidate in candidates:
        if shutil.which(candidate):
            return candidate
        if os.path.exists(candidate):
            return candidate
    
    return None


IVERILOG = find_iverilog()
VVP = find_vvp()


def run_simulation(hex_program: str) -> dict:
    """
    Run Verilog simulation with the given program
    Returns: {'success': bool, 'trace': list, 'error': str}
    """
    if not IVERILOG:
        return {'success': False, 'trace': [], 'error': 'iverilog not found'}
    if not VVP:
        return {'success': False, 'trace': [], 'error': 'vvp not found'}
    
    # Create temp directory for simulation
    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir = Path(tmpdir)
        
        # Write program hex file
        program_file = tmpdir / 'program.hex'
        program_file.write_text(hex_program)
        
        # Compile Verilog
        sim_output = tmpdir / 'cpu_sim'
        
        compile_cmd = [
            IVERILOG,
            '-o', str(sim_output),
            '-I', str(SRC_DIR),
        ] + [str(f) for f in VERILOG_SOURCES]
        
        try:
            result = subprocess.run(
                compile_cmd,
                capture_output=True,
                text=True,
                timeout=30,
                cwd=str(tmpdir)
            )
            
            if result.returncode != 0:
                return {
                    'success': False,
                    'trace': [],
                    'error': f'Compilation failed: {result.stderr}'
                }
        except subprocess.TimeoutExpired:
            return {'success': False, 'trace': [], 'error': 'Compilation timeout'}
        except Exception as e:
            return {'success': False, 'trace': [], 'error': f'Compilation error: {str(e)}'}
        
        # Run simulation
        try:
            result = subprocess.run(
                [VVP, str(sim_output)],
                capture_output=True,
                text=True,
                timeout=30,
                cwd=str(tmpdir)
            )
            
            output = result.stdout
            
        except subprocess.TimeoutExpired:
            return {'success': False, 'trace': [], 'error': 'Simulation timeout'}
        except Exception as e:
            return {'success': False, 'trace': [], 'error': f'Simulation error: {str(e)}'}
        
        # Parse JSON output
        try:
            # Filter out warning/error lines and extract only JSON
            lines = output.split('\n')
            json_lines = []
            in_json = False
            
            for line in lines:
                line = line.strip()
                # Skip empty lines and warning lines
                if not line:
                    continue
                if line.startswith('WARNING:') or line.startswith('ERROR:'):
                    continue
                # Start of JSON array
                if line == '[':
                    in_json = True
                    json_lines.append(line)
                elif in_json:
                    json_lines.append(line)
                    # End of JSON array
                    if line == ']':
                        break
            
            if not json_lines:
                return {
                    'success': False,
                    'trace': [],
                    'error': f'No JSON output found. Raw output: {output[:500]}'
                }
            
            json_str = '\n'.join(json_lines)
            trace = json.loads(json_str)
            
            return {
                'success': True,
                'trace': trace,
                'error': None
            }
            
        except json.JSONDecodeError as e:
            return {
                'success': False,
                'trace': [],
                'error': f'JSON parse error: {str(e)}. Output: {output[:500]}'
            }


@app.route('/simulate', methods=['POST'])
def simulate():
    """
    Main API endpoint
    POST body: {"assembly": "LDI R0, 5\nHLT"}
    Returns: {"success": bool, "trace": [...], "error": str}
    """
    try:
        data = request.get_json()
        
        if not data or 'assembly' not in data:
            return jsonify({
                'success': False,
                'trace': [],
                'error': 'Missing "assembly" in request body'
            }), 400
        
        assembly_code = data['assembly']
        
        # Step 1: Assemble the code
        asm_result = assemble(assembly_code)
        
        if not asm_result['success']:
            return jsonify({
                'success': False,
                'trace': [],
                'error': 'Assembly errors:\n' + '\n'.join(asm_result['errors'])
            }), 400
        
        if not asm_result['program']:
            return jsonify({
                'success': False,
                'trace': [],
                'error': 'No instructions in program'
            }), 400
        
        # Step 2: Convert to hex format
        hex_program = to_hex_file(asm_result['program'])
        
        # Step 3: Run simulation
        sim_result = run_simulation(hex_program)
        
        if not sim_result['success']:
            return jsonify(sim_result), 500
        
        return jsonify({
            'success': True,
            'trace': sim_result['trace'],
            'program': asm_result['program'],
            'programHex': hex_program.split('\n'),
            'error': None
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'trace': [],
            'error': f'Server error: {str(e)}'
        }), 500


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'iverilog': IVERILOG is not None,
        'iverilog_path': IVERILOG,
        'vvp': VVP is not None,
        'vvp_path': VVP
    })


@app.route('/', methods=['GET'])
def index():
    """Root endpoint with API info"""
    return jsonify({
        'name': '16-bit RISC CPU Simulator API',
        'version': '1.0.0',
        'endpoints': {
            'POST /simulate': 'Run simulation with assembly code',
            'GET /health': 'Health check'
        }
    })


if __name__ == '__main__':
    print("=" * 50)
    print("16-bit RISC CPU Simulator Backend")
    print("=" * 50)
    print(f"iverilog: {IVERILOG or 'NOT FOUND'}")
    print(f"vvp: {VVP or 'NOT FOUND'}")
    print()
    
    if not IVERILOG or not VVP:
        print("WARNING: Icarus Verilog not found!")
        print("Please install Icarus Verilog and ensure it's in PATH")
    
    print("Starting server on http://localhost:5000")
    print("=" * 50)
    
    app.run(host='0.0.0.0', port=5000, debug=True)
