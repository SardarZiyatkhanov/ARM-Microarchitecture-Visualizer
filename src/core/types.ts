export type Register = 'R0' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'R7' | 'PC' | 'LR' | 'SP';

export type Opcode = 'ADD' | 'SUB' | 'MOV' | 'LDR' | 'STR';

export interface Instruction {
    id: string; // Unique ID for React keys
    raw: string; // Original assembly text
    opcode: Opcode;
    operands: string[];
    binary?: string; // Simulated binary representation
}

export type PipelineStageName = 'Fetch' | 'Decode' | 'Execute' | 'Memory' | 'WriteBack';

export interface PipelineState {
    currentInstruction?: Instruction;
    stage: PipelineStageName;
    cycle: number;
    registers: Record<string, number>; // Simplified register file
    memory: Record<number, number>; // Simplified memory
}

export const INITIAL_REGISTERS: Record<string, number> = {
    R0: 0, R1: 0, R2: 0, R3: 0, R4: 0, R5: 0, R6: 0, R7: 0,
    PC: 0, LR: 0, SP: 1024
};
