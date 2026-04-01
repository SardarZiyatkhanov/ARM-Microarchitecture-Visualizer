import { Instruction, CpuState, StageContent, EMPTY_STAGE, ControlSignals } from './types';

export const getControlSignals = (opcode: string): ControlSignals => {
    const signals: ControlSignals = {
        regWrite: false,
        memRead: false,
        memWrite: false,
        branch: false,
        aluOp: 'ADD',
        aluSrc: 'reg',
        memToReg: false
    };

    switch (opcode) {
        case 'ADD':
            signals.regWrite = true;
            signals.aluOp = 'ADD';
            break;
        case 'SUB':
            signals.regWrite = true;
            signals.aluOp = 'SUB';
            break;
        case 'SUBS':
            signals.regWrite = true;
            signals.aluOp = 'SUBS';
            break;
        case 'MOV':
            signals.regWrite = true;
            signals.aluOp = 'MOV';
            signals.aluSrc = 'imm';
            break;
        case 'MUL':
            signals.regWrite = true;
            signals.aluOp = 'MUL';
            break;
        case 'LSL':
            signals.regWrite = true;
            signals.aluOp = 'LSL';
            break;
        case 'LSR':
            signals.regWrite = true;
            signals.aluOp = 'LSR';
            break;
        case 'AND':
            signals.regWrite = true;
            signals.aluOp = 'AND';
            break;
        case 'ORR':
            signals.regWrite = true;
            signals.aluOp = 'ORR';
            break;
        case 'EOR':
            signals.regWrite = true;
            signals.aluOp = 'EOR';
            break;
        case 'CMP':
            signals.aluOp = 'SUB';
            break;
        case 'LDR':
        case 'POP':
            signals.regWrite = true;
            signals.memRead = true;
            signals.memToReg = true;
            signals.aluOp = 'ADD';
            break;
        case 'STR':
        case 'PUSH':
            signals.memWrite = true;
            signals.aluOp = 'ADD';
            break;
        case 'B':
        case 'BEQ':
        case 'BNE':
        case 'BGT':
        case 'BLT':
        case 'BGE':
        case 'BLE':
        case 'BL':
        case 'BX':
            signals.branch = true;
            signals.aluOp = 'ADD';
            break;
    }
    return signals;
};

const isRegister = (op: string) => op && (op.startsWith('R') || op === 'LR' || op === 'SP' || op === 'PC');

/** Parse memory operand from inst.operands[1..] for LDR/STR/PUSH/POP.
 *  Handles: [Rn], [Rn, #off], [Rn, #off]!, [Rn], #off */
function decodeMemOp(operands: string[]): { baseReg: string; offset: number; writeBack: boolean; postIndex: boolean } {
    const memStr = operands.slice(1).join(', ');
    const postMatch = memStr.match(/^\[(\w+)\]\s*,\s*#(-?\d+)/);
    if (postMatch) return { baseReg: postMatch[1].toUpperCase(), offset: parseInt(postMatch[2]), writeBack: false, postIndex: true };
    const preWbMatch = memStr.match(/^\[(\w+)(?:\s*,\s*#(-?\d+))?\]!/);
    if (preWbMatch) return { baseReg: preWbMatch[1].toUpperCase(), offset: preWbMatch[2] ? parseInt(preWbMatch[2]) : 0, writeBack: true, postIndex: false };
    const offMatch = memStr.match(/^\[(\w+)\s*,\s*#(-?\d+)\]/);
    if (offMatch) return { baseReg: offMatch[1].toUpperCase(), offset: parseInt(offMatch[2]), writeBack: false, postIndex: false };
    const simpleMatch = memStr.match(/^\[(\w+)\]/);
    if (simpleMatch) return { baseReg: simpleMatch[1].toUpperCase(), offset: 0, writeBack: false, postIndex: false };
    return { baseReg: 'R0', offset: 0, writeBack: false, postIndex: false };
}

export const advancePipeline = (cpu: CpuState, instructions: Instruction[]): CpuState => {
    const { pipeline, registers, memory, flags, pc, clock } = cpu;
    const nextRegisters = { ...registers };
    const nextMemory = { ...memory };
    const nextFlags = { ...flags };
    let nextPc = pc;

    // Sequential 5-stage implementation:
    // We move the instruction through stages. Only one instruction is in the pipeline at a time.

    const { Fetch, Decode, Execute, Memory, WriteBack } = pipeline;

    // Create empty next pipeline
    const nextPipeline = {
        Fetch: { ...EMPTY_STAGE },
        Decode: { ...EMPTY_STAGE },
        Execute: { ...EMPTY_STAGE },
        Memory: { ...EMPTY_STAGE },
        WriteBack: { ...EMPTY_STAGE }
    };

    // 1. If WriteBack has an instruction, it finishes this cycle.
    if (WriteBack.instruction) {
        const signals = WriteBack.controlSignals;
        if (signals?.regWrite && WriteBack.decoded?.destReg) {
            const dest = WriteBack.decoded.destReg;
            if (dest === 'PC') {
                // POP {PC} — branch to loaded value
                nextPc = WriteBack.executionResult!;
            } else {
                nextRegisters[dest] = WriteBack.executionResult!;
            }
        }
        // Pipeline becomes empty (will fetch next below)
    }
    // 2. If Memory has an instruction, move to WriteBack
    else if (Memory.instruction) {
        const signals = Memory.controlSignals!;
        let result = Memory.executionResult!;

        if (signals.memRead) {
            // LDR: Load from memory
            result = nextMemory[Memory.memoryAddress!] || 0;
        } else if (signals.memWrite) {
            // STR: Store to memory
            const valToStore = nextRegisters[Memory.decoded!.src1Reg!]; // STR R0, [R1] -> src1 is R0
            nextMemory[Memory.memoryAddress!] = valToStore;
        }

        nextPipeline.WriteBack = {
            ...Memory,
            executionResult: result
        };
    }
    // 3. If Execute has an instruction, move to Memory
    else if (Execute.instruction) {
        const inst = Execute.instruction;
        const decoded = Execute.decoded!;

        let shouldBranch = false;
        if (inst.opcode === 'B') shouldBranch = true;
        if (inst.opcode === 'BEQ' && nextFlags.Z) shouldBranch = true;
        if (inst.opcode === 'BNE' && !nextFlags.Z) shouldBranch = true;
        if (inst.opcode === 'BGT') shouldBranch = !nextFlags.Z && (nextFlags.N === nextFlags.V);
        if (inst.opcode === 'BLT') shouldBranch = nextFlags.N !== nextFlags.V;
        if (inst.opcode === 'BGE') shouldBranch = nextFlags.N === nextFlags.V;
        if (inst.opcode === 'BLE') shouldBranch = nextFlags.Z || (nextFlags.N !== nextFlags.V);
        if (inst.opcode === 'BL') {
            // Save return address (pc is already blAddress+4 due to fetch advance)
            nextRegisters['LR'] = nextPc;
            shouldBranch = true;
        }
        if (inst.opcode === 'BX') {
            // Branch to register value (e.g. BX LR returns to caller)
            nextPc = nextRegisters[decoded.src1Reg || 'LR'];
        }

        if (shouldBranch) {
            const target = decoded.immValue !== undefined ? decoded.immValue : nextPc;
            nextPc = target;
        }

        nextPipeline.Memory = { ...Execute };
    }
    // 4. If Decode has an instruction, move to Execute
    else if (Decode.instruction) {
        const inst = Decode.instruction;
        const decoded = Decode.decoded!;
        const signals = Decode.controlSignals!;

        // Resolve ALU operands
        const val1 = decoded.src1Reg ? nextRegisters[decoded.src1Reg] : 0;
        // Use src2Reg if available, otherwise fall back to immValue (handles imm operands regardless of aluSrc signal)
        const val2 = decoded.src2Reg ? nextRegisters[decoded.src2Reg] : (decoded.immValue ?? 0);

        let res = 0;
        switch (signals.aluOp) {
            case 'ADD': res = val1 + val2; break;
            case 'SUB': res = val1 - val2; break;
            case 'SUBS': res = val1 - val2; break;
            case 'MOV': res = val2; break;
            case 'MUL': res = val1 * val2; break;
            case 'LSL': res = val1 << (decoded.immValue ?? 0); break;
            case 'LSR': res = val1 >>> (decoded.immValue ?? 0); break;
            case 'AND': res = val1 & val2; break;
            case 'ORR': res = val1 | val2; break;
            case 'EOR': res = val1 ^ val2; break;
        }

        // Flags update for CMP and SUBS
        if (inst.opcode === 'CMP' || inst.opcode === 'SUBS') {
            const cmpRes = val1 - val2;
            nextFlags.Z = cmpRes === 0;
            nextFlags.N = cmpRes < 0;
            nextFlags.C = val1 >= val2; // simplified carry
            nextFlags.V = ((val1 ^ val2) & (val1 ^ cmpRes)) < 0; // overflow
        }

        // Compute effective memory address for LDR/STR/PUSH/POP
        let memAddr = 0;
        if (signals.memRead || signals.memWrite) {
            const base = nextRegisters[decoded.src2Reg ?? 'R0'];
            const offset = decoded.memOffset ?? 0;
            memAddr = decoded.postIndex ? base : base + offset;
            // Apply write-back (pre-index with ! or post-index)
            if (decoded.writeBack || decoded.postIndex) {
                nextRegisters[decoded.src2Reg!] = base + offset;
            }
        }

        nextPipeline.Execute = {
            ...Decode,
            executionResult: res,
            memoryAddress: memAddr
        };
    }
    // 5. If Fetch has an instruction, move to Decode
    else if (Fetch.instruction) {
        const inst = Fetch.instruction;
        const signals = getControlSignals(inst.opcode);

        // Decode logic
        const decoded: StageContent['decoded'] = {};
        if (inst.opcode === 'ADD' || inst.opcode === 'SUB' || inst.opcode === 'SUBS') {
            decoded.destReg = inst.operands[0];
            decoded.src1Reg = inst.operands[1];
            if (isRegister(inst.operands[2])) decoded.src2Reg = inst.operands[2];
            else decoded.immValue = parseInt(inst.operands[2].replace('#', ''));
        } else if (inst.opcode === 'MOV' || inst.opcode === 'CMP') {
            decoded.destReg = inst.operands[0];
            decoded.src1Reg = inst.operands[0];
            if (isRegister(inst.operands[1])) decoded.src2Reg = inst.operands[1];
            else decoded.immValue = parseInt(inst.operands[1].replace('#', ''));
        } else if (inst.opcode === 'MUL') {
            decoded.destReg = inst.operands[0];
            decoded.src1Reg = inst.operands[1];
            decoded.src2Reg = inst.operands[2];
        } else if (inst.opcode === 'LSL' || inst.opcode === 'LSR') {
            decoded.destReg = inst.operands[0];
            decoded.src1Reg = inst.operands[1];
            decoded.immValue = parseInt(inst.operands[2].replace('#', ''));
        } else if (inst.opcode === 'AND' || inst.opcode === 'ORR' || inst.opcode === 'EOR') {
            decoded.destReg = inst.operands[0];
            decoded.src1Reg = inst.operands[1];
            if (isRegister(inst.operands[2])) decoded.src2Reg = inst.operands[2];
            else decoded.immValue = parseInt(inst.operands[2].replace('#', ''));
        } else if (inst.opcode === 'LDR' || inst.opcode === 'STR') {
            decoded.destReg = inst.operands[0];
            decoded.src1Reg = inst.operands[0]; // value register
            const mem = decodeMemOp(inst.operands);
            decoded.src2Reg = mem.baseReg;       // base address register
            decoded.memOffset = mem.offset;
            decoded.writeBack = mem.writeBack;
            decoded.postIndex = mem.postIndex;
        } else if (inst.opcode === 'PUSH') {
            // PUSH {Rn} → STR Rn, [SP, #-4]!
            const rn = inst.operands[0].replace(/[{}]/g, '');
            decoded.src1Reg = rn;
            decoded.src2Reg = 'SP';
            decoded.memOffset = -4;
            decoded.writeBack = true;
            decoded.postIndex = false;
        } else if (inst.opcode === 'POP') {
            // POP {Rn} → LDR Rn, [SP], #4
            const rn = inst.operands[0].replace(/[{}]/g, '');
            decoded.destReg = rn;
            decoded.src1Reg = rn;
            decoded.src2Reg = 'SP';
            decoded.memOffset = 4;
            decoded.writeBack = false;
            decoded.postIndex = true;
        } else if (inst.opcode === 'B' || inst.opcode === 'BEQ' || inst.opcode === 'BNE'
                || inst.opcode === 'BGT' || inst.opcode === 'BLT' || inst.opcode === 'BGE'
                || inst.opcode === 'BLE' || inst.opcode === 'BL') {
            decoded.immValue = parseInt(inst.operands[0].replace('#', ''));
        } else if (inst.opcode === 'BX') {
            decoded.src1Reg = inst.operands[0];
        }

        nextPipeline.Decode = {
            ...Fetch,
            controlSignals: signals,
            decoded
        };
    }
    // 6. If whole pipeline is empty, Fetch next instruction
    else {
        const pcIndex = nextPc / 4;
        if (pcIndex < instructions.length) {
            nextPipeline.Fetch = {
                instruction: instructions[pcIndex]
            };
            nextPc += 4;
        }
    }

    return {
        pc: nextPc,
        registers: nextRegisters,
        memory: nextMemory,
        flags: nextFlags,
        pipeline: nextPipeline,
        clock: clock + 1
    };
};
