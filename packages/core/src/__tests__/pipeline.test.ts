import { describe, it, expect } from 'vitest';
import { parseAssembly } from '../assembler';
import { advancePipeline } from '../pipeline';
import { INITIAL_PIPELINE_STATE, INITIAL_REGISTERS, INITIAL_FLAGS } from '../types';

describe('CPU Pipeline Core', () => {
    it('should correctly parse instructions into 32-bit machine code', () => {
       const parsedState = parseAssembly("ADD R1, R2, R3");
       expect(parsedState.errors).toHaveLength(0);
       expect(parsedState.instructions).toHaveLength(1);
       expect(parsedState.instructions[0].opcode).toBe("ADD");
       expect(parsedState.instructions[0].binary).toHaveLength(32);
    });

    it('should fetch and decode instructions through the pipeline', () => {
       const parsedState = parseAssembly("MOV R1, #10");
       let cpu: any = {
           pipeline: INITIAL_PIPELINE_STATE,
           registers: { ...INITIAL_REGISTERS },
           flags: { ...INITIAL_FLAGS },
           memory: {},
           pc: 0,
           clock: 0
       };

       // Step 1: Fetch
       cpu = advancePipeline(cpu, parsedState.instructions);
       expect(cpu.pipeline.Fetch?.instruction?.opcode).toBe("MOV");

       // Step 2: Decode
       cpu = advancePipeline(cpu, parsedState.instructions);
       expect(cpu.pipeline.Decode?.instruction?.opcode).toBe("MOV");
       expect(cpu.pipeline.Decode?.controlSignals?.aluOp).toBe("MOV");
    });
});
