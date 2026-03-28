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
        case 'MOV':
            signals.regWrite = true;
            signals.aluOp = 'MOV';
            signals.aluSrc = 'imm';
            break;
        case 'CMP':
            signals.aluOp = 'SUB';
            break;
        case 'LDR':
            signals.regWrite = true;
            signals.memRead = true;
            signals.memToReg = true;
            signals.aluOp = 'ADD';
            break;
        case 'STR':
            signals.memWrite = true;
            signals.aluOp = 'ADD';
            break;
        case 'B':
        case 'BEQ':
        case 'BNE':
            signals.branch = true;
            signals.aluOp = 'ADD';
            break;
    }
    return signals;
};

const isRegister = (op: string) => op && (op.startsWith('R') || op === 'LR' || op === 'SP' || op === 'PC');

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
            if (dest !== 'PC') {
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

        if (shouldBranch) {
            // Branch: Update PC. Note: Real ARM uses offsets, we'll use immediate or label mapping
            // For this demo, let's assume the operand is an index or we look it up.
            // Simplified: if it's #number, it's absolute PC for now.
            const target = decoded.immValue !== undefined ? decoded.immValue : nextPc;
            nextPc = target;
            // Branch typically flushes, but in sequential it just finishes.
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
        const val2 = signals.aluSrc === 'imm' ? (decoded.immValue || 0) : (decoded.src2Reg ? nextRegisters[decoded.src2Reg] : 0);

        let res = 0;
        switch (signals.aluOp) {
            case 'ADD': res = val1 + val2; break;
            case 'SUB': res = val1 - val2; break;
            case 'MOV': res = val2; break;
        }

        // Flags update for CMP
        if (inst.opcode === 'CMP') {
            const cmpRes = val1 - val2;
            nextFlags.Z = cmpRes === 0;
            nextFlags.N = cmpRes < 0;
            // Simplified C/V
        }

        nextPipeline.Execute = {
            ...Decode,
            executionResult: res,
            memoryAddress: signals.memRead || signals.memWrite ? (inst.opcode === 'LDR' || inst.opcode === 'STR' ? nextRegisters[decoded.src2Reg!] : 0) : 0
        };
    }
    // 5. If Fetch has an instruction, move to Decode
    else if (Fetch.instruction) {
        const inst = Fetch.instruction;
        const signals = getControlSignals(inst.opcode);

        // Decode logic
        const decoded: StageContent['decoded'] = {};
        if (inst.opcode === 'ADD' || inst.opcode === 'SUB') {
            decoded.destReg = inst.operands[0];
            decoded.src1Reg = inst.operands[1];
            if (isRegister(inst.operands[2])) decoded.src2Reg = inst.operands[2];
            else decoded.immValue = parseInt(inst.operands[2].replace('#', ''));
        } else if (inst.opcode === 'MOV' || inst.opcode === 'CMP') {
            decoded.destReg = inst.operands[0]; // For CMP it's src1
            decoded.src1Reg = inst.operands[0];
            if (isRegister(inst.operands[1])) decoded.src2Reg = inst.operands[1];
            else decoded.immValue = parseInt(inst.operands[1].replace('#', ''));
        } else if (inst.opcode === 'LDR' || inst.opcode === 'STR') {
            decoded.destReg = inst.operands[0]; // For STR it's value source
            decoded.src1Reg = inst.operands[0];
            // Format: LDR R0, [R1]
            const addrPart = inst.operands[1].replace('[', '').replace(']', '');
            decoded.src2Reg = addrPart;
        } else if (inst.opcode === 'B' || inst.opcode === 'BEQ' || inst.opcode === 'BNE') {
            // For absolute branching in this demo
            decoded.immValue = parseInt(inst.operands[0].replace('#', ''));
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
