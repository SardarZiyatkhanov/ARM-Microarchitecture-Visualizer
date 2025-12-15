import { Instruction, Opcode } from './types';

export const parseAssembly = (input: string): Instruction[] => {
    const lines = input.split('\n').filter(line => line.trim().length > 0);

    return lines.map((line, index) => {
        // Simple regex to split opcode and operands
        // Example: ADD R0, R1, #5
        const parts = line.trim().split(/[\s,]+/);
        const opcode = parts[0].toUpperCase() as Opcode;
        const operands = parts.slice(1);

        // Mock binary generation for visualization
        const mockBinary = '111000' + Math.random().toString(2).substr(2, 26);

        return {
            id: `inst-${index}-${Date.now()}`,
            raw: line.trim(),
            opcode,
            operands,
            binary: mockBinary
        };
    });
};
