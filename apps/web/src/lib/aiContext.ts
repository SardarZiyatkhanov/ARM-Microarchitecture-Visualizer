import type { CpuState, Instruction } from '@playarm/core';

export interface TraceEntry {
    cycle: number;
    inst: string;
    regChanges: string[];
    flagChanges: string[];
}

export interface AIContext {
    cycle: number;
    pc: string;
    registers: Record<string, number>;
    flags: { N: boolean; Z: boolean; C: boolean; V: boolean };
    pipeline: {
        Fetch: string | null;
        Decode: string | null;
        Execute: string | null;
        Memory: string | null;
        WriteBack: string | null;
    };
    assemblySource: string;
    recentTrace: TraceEntry[];
    isDone: boolean;
}

export function buildAIContext(
    cpuState: CpuState,
    assemblySource: string,
    _instructions: Instruction[],
    traceLog: TraceEntry[],
    isDone: boolean,
): AIContext {
    return {
        cycle: cpuState.clock,
        pc: `0x${cpuState.pc.toString(16).toUpperCase().padStart(8, '0')}`,
        registers: cpuState.registers,
        flags: cpuState.flags,
        pipeline: {
            Fetch:     cpuState.pipeline.Fetch.instruction?.raw     ?? null,
            Decode:    cpuState.pipeline.Decode.instruction?.raw    ?? null,
            Execute:   cpuState.pipeline.Execute.instruction?.raw   ?? null,
            Memory:    cpuState.pipeline.Memory.instruction?.raw    ?? null,
            WriteBack: cpuState.pipeline.WriteBack.instruction?.raw ?? null,
        },
        assemblySource,
        recentTrace: traceLog.slice(-6),
        isDone,
    };
}
