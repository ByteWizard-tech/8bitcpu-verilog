/**
 * API Client for 16-bit RISC CPU Backend
 * Communicates with Flask server for Verilog simulation
 */

const API_BASE_URL = 'http://localhost:5000';

/**
 * Check if the backend server is running and healthy
 * @returns {Promise<{ok: boolean, iverilog: boolean}>}
 */
async function checkBackendHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            return { ok: false, iverilog: false, error: 'Server not responding' };
        }
        
        const data = await response.json();
        return {
            ok: true,
            iverilog: data.iverilog,
            vvp: data.vvp,
            iverilog_path: data.iverilog_path,
            vvp_path: data.vvp_path
        };
    } catch (error) {
        return {
            ok: false,
            iverilog: false,
            error: error.message || 'Cannot connect to backend'
        };
    }
}

/**
 * Run Verilog simulation with assembly code
 * @param {string} assembly - Assembly code to simulate
 * @returns {Promise<{success: boolean, trace: Array, error: string}>}
 */
async function runVerilogSimulation(assembly) {
    console.log('[VerilogAPI] runVerilogSimulation called');
    console.log('[VerilogAPI] Sending to:', `${API_BASE_URL}/simulate`);
    
    try {
        const response = await fetch(`${API_BASE_URL}/simulate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ assembly })
        });
        
        console.log('[VerilogAPI] Response status:', response.status);
        
        const data = await response.json();
        
        console.log('[VerilogAPI] Response data success:', data.success);
        
        if (!response.ok) {
            return {
                success: false,
                trace: [],
                error: data.error || `Server error: ${response.status}`
            };
        }
        
        return data;
        
    } catch (error) {
        console.error('[VerilogAPI] Network error:', error);
        return {
            success: false,
            trace: [],
            error: `Network error: ${error.message}`
        };
    }
}

/**
 * VerilogTracePlayer - Plays back a pre-computed trace
 */
class VerilogTracePlayer {
    constructor() {
        this.trace = [];
        this.currentIndex = 0;
        this.isLoaded = false;
    }
    
    /**
     * Load a trace from the backend
     * @param {Array} trace - Array of trace states
     */
    loadTrace(trace) {
        this.trace = trace;
        this.currentIndex = 0;
        this.isLoaded = trace.length > 0;
    }
    
    /**
     * Reset to beginning of trace
     */
    reset() {
        this.currentIndex = 0;
    }
    
    /**
     * Get current state
     * @returns {Object|null}
     */
    getCurrentState() {
        if (!this.isLoaded || this.currentIndex >= this.trace.length) {
            return null;
        }
        return this.trace[this.currentIndex];
    }
    
    /**
     * Step forward one cycle
     * @returns {Object|null} The new current state
     */
    step() {
        if (!this.isLoaded) return null;
        
        if (this.currentIndex < this.trace.length - 1) {
            this.currentIndex++;
        }
        
        return this.getCurrentState();
    }
    
    /**
     * Step backward one cycle
     * @returns {Object|null} The new current state
     */
    stepBack() {
        if (!this.isLoaded) return null;
        
        if (this.currentIndex > 0) {
            this.currentIndex--;
        }
        
        return this.getCurrentState();
    }
    
    /**
     * Check if at end of trace
     * @returns {boolean}
     */
    isAtEnd() {
        return this.currentIndex >= this.trace.length - 1;
    }
    
    /**
     * Check if trace is halted
     * @returns {boolean}
     */
    isHalted() {
        const state = this.getCurrentState();
        return state ? state.halt : false;
    }
    
    /**
     * Get total number of cycles in trace
     * @returns {number}
     */
    getTotalCycles() {
        return this.trace.length;
    }
    
    /**
     * Get current cycle number
     * @returns {number}
     */
    getCurrentCycle() {
        return this.currentIndex + 1;
    }
}

// Export for use in cpu.js
window.VerilogAPI = {
    checkBackendHealth,
    runVerilogSimulation,
    VerilogTracePlayer
};
