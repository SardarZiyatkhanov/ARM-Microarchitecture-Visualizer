import { Instruction, Opcode, AssemblyResult, ParseError } from './types';

const VALID_OPCODES: Opcode[] = ['ADD', 'SUB', 'MOV', 'LDR', 'STR', 'CMP', 'B', 'BEQ', 'BNE'];

export const parseAssembly = (input: string): AssemblyResult => {
    const lines = input.split('\n');
    const instructions: Instruction[] = [];
    const errors: ParseError[] = [];
    const labels: Record<string, number> = {};

    // First pass: identify labels
    let instCount = 0;
    lines.forEach((line) => {
        const trimmed = line.split('@')[0].trim(); // Ignore comments
        if (!trimmed) return;

        if (trimmed.includes(':')) {
            const [label, rest] = trimmed.split(':');
            const labelName = label.trim();
            if (labelName) {
                labels[labelName] = instCount * 4;
            }
            if (rest && rest.trim()) instCount++;
        } else {
            instCount++;
        }
    });

    // Second pass: parse instructions
    instCount = 0;
    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        let originalText = line.trim();
        let trimmed = line.split('@')[0].trim();
        if (!trimmed) return;

        // Extract instruction if there's a label
        if (trimmed.includes(':')) {
            trimmed = trimmed.split(':').slice(1).join(':').trim();
        }
        if (!trimmed) return;

        const parts = trimmed.split(/[\s,]+/).filter(p => p.length > 0);
        if (parts.length === 0) return;

        const opcodeStr = parts[0].toUpperCase();

        if (!VALID_OPCODES.includes(opcodeStr as Opcode)) {
            errors.push({
                line: lineNumber,
                message: `Unknown opcode: ${opcodeStr}`,
                content: originalText
            });
            return;
        }

        const opcode = opcodeStr as Opcode;
        const operands = parts.slice(1);

        // Resolve labels in operands
        const resolvedOperands = operands.map(op => {
            if (labels[op] !== undefined) return `#${labels[op]}`;
            return op;
        });

        instructions.push({
            id: `inst-${instCount}-${Date.now()}`,
            raw: trimmed,
            opcode,
            operands: resolvedOperands,
            binary: '0101' + Math.random().toString(16).substr(2, 28), // Placeholder binary
            line: lineNumber
        });
        instCount++;
    });

    return { instructions, errors };
};
