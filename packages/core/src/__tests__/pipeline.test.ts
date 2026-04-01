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

    it('BL saves return address in LR and BX LR returns to caller', () => {
        // BL FUNC  → jump to FUNC, LR = address after BL (4)
        // MOV R0, #1  → executes after BX LR returns here
        // B END       → skip over function body
        // FUNC:
        // MOV R1, #42 → function body
        // BX LR       → return to caller
        // END:
        const { instructions, errors } = parseAssembly([
            'BL FUNC',
            'MOV R0, #1',
            'B END',
            'FUNC:',
            'MOV R1, #42',
            'BX LR',
            'END:',
        ].join('\n'));

        expect(errors).toHaveLength(0);

        let cpu: any = {
            pipeline: INITIAL_PIPELINE_STATE,
            registers: { ...INITIAL_REGISTERS },
            flags: { ...INITIAL_FLAGS },
            memory: {},
            pc: 0,
            clock: 0
        };

        // Run enough cycles for the full call/return sequence to complete
        for (let i = 0; i < 40; i++) {
            cpu = advancePipeline(cpu, instructions);
        }

        expect(cpu.registers['R1']).toBe(42);  // function body executed
        expect(cpu.registers['R0']).toBe(1);   // code after return executed
        expect(cpu.registers['LR']).toBe(4);   // return address saved correctly
    });

    it('MUL computes product', () => {
        const { instructions, errors } = parseAssembly([
            'MOV R1, #6',
            'MOV R2, #7',
            'MUL R0, R1, R2',
        ].join('\n'));
        expect(errors).toHaveLength(0);
        let cpu: any = { pipeline: INITIAL_PIPELINE_STATE, registers: { ...INITIAL_REGISTERS }, flags: { ...INITIAL_FLAGS }, memory: {}, pc: 0, clock: 0 };
        for (let i = 0; i < 30; i++) cpu = advancePipeline(cpu, instructions);
        expect(cpu.registers['R0']).toBe(42);
    });

    it('SUBS + BGT loop counts down to 0', () => {
        const { instructions, errors } = parseAssembly([
            'MOV R0, #3',
            'LOOP:',
            'SUBS R0, R0, #1',
            'BGT LOOP',
        ].join('\n'));
        expect(errors).toHaveLength(0);
        let cpu: any = { pipeline: INITIAL_PIPELINE_STATE, registers: { ...INITIAL_REGISTERS }, flags: { ...INITIAL_FLAGS }, memory: {}, pc: 0, clock: 0 };
        for (let i = 0; i < 60; i++) cpu = advancePipeline(cpu, instructions);
        expect(cpu.registers['R0']).toBe(0);
    });

    it('STR and LDR with offset round-trip', () => {
        const { instructions, errors } = parseAssembly([
            'MOV R1, #99',
            'MOV R0, #100',   // R0 = base address 100
            'STR R1, [R0]',
            'LDR R2, [R0]',
        ].join('\n'));
        expect(errors).toHaveLength(0);
        let cpu: any = { pipeline: INITIAL_PIPELINE_STATE, registers: { ...INITIAL_REGISTERS }, flags: { ...INITIAL_FLAGS }, memory: {}, pc: 0, clock: 0 };
        for (let i = 0; i < 40; i++) cpu = advancePipeline(cpu, instructions);
        expect(cpu.registers['R2']).toBe(99);
    });

    it('PUSH and POP round-trip via SP', () => {
        const { instructions, errors } = parseAssembly([
            'MOV R1, #55',
            'PUSH {R1}',
            'POP {R0}',
        ].join('\n'));
        expect(errors).toHaveLength(0);
        const initialSP = INITIAL_REGISTERS['SP'];
        let cpu: any = { pipeline: INITIAL_PIPELINE_STATE, registers: { ...INITIAL_REGISTERS }, flags: { ...INITIAL_FLAGS }, memory: {}, pc: 0, clock: 0 };
        for (let i = 0; i < 40; i++) cpu = advancePipeline(cpu, instructions);
        expect(cpu.registers['R0']).toBe(55);
        expect(cpu.registers['SP']).toBe(initialSP);  // SP restored
    });

    it('LSL shifts value left', () => {
        const { instructions, errors } = parseAssembly([
            'MOV R1, #5',
            'LSL R0, R1, #2',  // 5 << 2 = 20
        ].join('\n'));
        expect(errors).toHaveLength(0);
        let cpu: any = { pipeline: INITIAL_PIPELINE_STATE, registers: { ...INITIAL_REGISTERS }, flags: { ...INITIAL_FLAGS }, memory: {}, pc: 0, clock: 0 };
        for (let i = 0; i < 30; i++) cpu = advancePipeline(cpu, instructions);
        expect(cpu.registers['R0']).toBe(20);
    });

    it('AND, ORR, EOR bitwise operations', () => {
        const { instructions, errors } = parseAssembly([
            'MOV R1, #0xFF',
            'MOV R2, #0x0F',
            'AND R3, R1, R2',   // 0xFF & 0x0F = 0x0F = 15
            'ORR R4, R1, R2',   // 0xFF | 0x0F = 0xFF = 255
            'EOR R5, R1, R2',   // 0xFF ^ 0x0F = 0xF0 = 240
        ].join('\n'));
        expect(errors).toHaveLength(0);
        let cpu: any = { pipeline: INITIAL_PIPELINE_STATE, registers: { ...INITIAL_REGISTERS }, flags: { ...INITIAL_FLAGS }, memory: {}, pc: 0, clock: 0 };
        for (let i = 0; i < 60; i++) cpu = advancePipeline(cpu, instructions);
        expect(cpu.registers['R3']).toBe(0x0F);
        expect(cpu.registers['R4']).toBe(0xFF);
        expect(cpu.registers['R5']).toBe(0xF0);
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
