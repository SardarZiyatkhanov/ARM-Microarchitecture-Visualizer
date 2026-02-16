export type Register = 'R0' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'R7' | 'PC' | 'LR' | 'SP';

export type Opcode = 'ADD' | 'SUB' | 'MOV' | 'LDR' | 'STR' | 'CMP' | 'B' | 'BEQ' | 'BNE';

export interface Instruction {
    id: string;
    raw: string;
    opcode: Opcode;
    operands: string[];
    binary?: string;
    line: number;
}

export interface ParseError {
    line: number;
    message: string;
    content: string;
}

export interface AssemblyResult {
    instructions: Instruction[];
    errors: ParseError[];
}

export type PipelineStageName = 'Fetch' | 'Decode' | 'Execute' | 'Memory' | 'WriteBack';

export interface ControlSignals {
    regWrite: boolean;
    memRead: boolean;
    memWrite: boolean;
    branch: boolean;
    aluOp: string;
    aluSrc: 'reg' | 'imm';
    memToReg: boolean;
}

export interface Flags {
    N: boolean; // Negative
    Z: boolean; // Zero
    C: boolean; // Carry
    V: boolean; // Overflow
}

// Pipeline Stage Content
export interface StageContent {
    instruction: Instruction | null;
    decoded?: {
        src1Reg?: string;
        src2Reg?: string;
        destReg?: string;
        immValue?: number;
    };
    controlSignals?: ControlSignals;
    executionResult?: number;
    memoryAddress?: number;
}

// Full Pipeline State
export interface PipelineState {
    Fetch: StageContent;
    Decode: StageContent;
    Execute: StageContent;
    Memory: StageContent;
    WriteBack: StageContent;
}

// Full CPU State
export interface CpuState {
    pc: number;
    registers: Record<string, number>;
    memory: Record<number, number>; // address -> value
    flags: Flags;
    pipeline: PipelineState;
    clock: number;
}

export const INITIAL_REGISTERS: Record<string, number> = {
    R0: 0, R1: 0, R2: 0, R3: 0, R4: 0, R5: 0, R6: 0, R7: 0,
    PC: 0, LR: 0, SP: 1024
};

export const INITIAL_FLAGS: Flags = { N: false, Z: false, C: false, V: false };

export const EMPTY_STAGE: StageContent = { instruction: null };

export const INITIAL_PIPELINE_STATE: PipelineState = {
    Fetch: { ...EMPTY_STAGE },
    Decode: { ...EMPTY_STAGE },
    Execute: { ...EMPTY_STAGE },
    Memory: { ...EMPTY_STAGE },
    WriteBack: { ...EMPTY_STAGE }
};
