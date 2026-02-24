import { Instruction, Opcode, AssemblyResult, ParseError } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// ARM32 Machine-Code Encoder
// ─────────────────────────────────────────────────────────────────────────────
//
// Every ARM32 instruction is exactly 32 bits (4 bytes).  We build it as a
// JavaScript number (unsigned 32-bit integer) then convert to a binary string
// and an 8-digit hex string so the UI can display both views.
//
// Register encoding: R0=0, R1=1, …, R7=7, SP=13, LR=14, PC=15
// ─────────────────────────────────────────────────────────────────────────────

const REG_MAP: Record<string, number> = {
    R0: 0, R1: 1, R2: 2, R3: 3,
    R4: 4, R5: 5, R6: 6, R7: 7,
    SP: 13, LR: 14, PC: 15,
};

/** Parse a register name like "R0", "SP" → its 4-bit number (0-15). */
function regNum(name: string): number {
    const n = REG_MAP[name.toUpperCase()];
    return n !== undefined ? n : 0;
}

/**
 * Parse an immediate value operand.  Accepts:
 *   "#10"  →  10
 *   "#0xFF" → 255
 *   "5"    →  5
 */
function parseImm(op: string): number {
    const s = op.replace('#', '').trim();
    return parseInt(s, s.startsWith('0x') || s.startsWith('0X') ? 16 : 10) || 0;
}

/** Parse a memory operand like "[R2]" → register number 2. */
function parseMemBase(op: string): number {
    const match = op.match(/\[(\w+)\]/);
    return match ? regNum(match[1]) : 0;
}

/**
 * Zero-extend `value` to `bits` bits, returned as a number.
 * Any value that won't fit is masked to fit.
 */
function mask(value: number, bits: number): number {
    return value & ((1 << bits) - 1);
}

/**
 * Convert a 32-bit unsigned integer to a 32-character binary string
 * and an 8-character uppercase hex string.
 */
function encode(word: number): { binary: string; machineCode: string } {
    // >>> 0  forces unsigned 32-bit interpretation in JS
    const u32 = word >>> 0;
    const binary = u32.toString(2).padStart(32, '0');
    const machineCode = u32.toString(16).toUpperCase().padStart(8, '0');
    return { binary, machineCode };
}

// ─────────────────────────────────────────────────────────────────────────────
// ARM32 instruction word builders
//
// ARM32 Data-Processing (register):
//   [31:28] cond  [27:26] 00  [25] 0  [24:21] opcode  [20] S
//   [19:16] Rn    [15:12] Rd  [11:0]  operand2
//
// ARM32 Data-Processing (immediate):
//   [31:28] cond  [27:26] 00  [25] 1  [24:21] opcode  [20] S
//   [19:16] Rn    [15:12] Rd  [11:8] rotate  [7:0] imm8
//
// Condition codes: AL (always) = 0b1110 = 14
//                  EQ          = 0b0000 = 0
//                  NE          = 0b0001 = 1
// ─────────────────────────────────────────────────────────────────────────────

/** AL = "always" condition — used for most instructions (bits 31-28 = 1110) */
const COND_AL = 0b1110;
const COND_EQ = 0b0000;
const COND_NE = 0b0001;

/** Build a data-processing (immediate) word.
 *  opcode4 is the 4-bit ALU opcode field (bits 24-21). */
function dpImm(cond: number, opcode4: number, s: number,
    rn: number, rd: number, imm8: number): number {
    // bit 25 = 1 (immediate form), bit 27-26 = 00
    return ((cond & 0xF) << 28) |
        (1 << 25) |
        ((opcode4 & 0xF) << 21) |
        ((s & 0x1) << 20) |
        ((rn & 0xF) << 16) |
        ((rd & 0xF) << 12) |
        (imm8 & 0xFF);       // rotate=0, imm8 in [7:0]
}

/** Build a data-processing (register) word. */
function dpReg(cond: number, opcode4: number, s: number,
    rn: number, rd: number, rm: number): number {
    // bit 25 = 0 (register form)
    return ((cond & 0xF) << 28) |
        ((opcode4 & 0xF) << 21) |
        ((s & 0x1) << 20) |
        ((rn & 0xF) << 16) |
        ((rd & 0xF) << 12) |
        (rm & 0xF);
}

/** Build a load/store word-addressing instruction.
 *  L=1 for LDR, L=0 for STR. */
function loadStore(cond: number, l: number,
    rn: number, rd: number, offset12: number): number {
    // bits [27:26]=01, [24]=1 (pre-index), [23]=1 (add), [22]=0 (word), [21]=0, [20]=L
    return ((cond & 0xF) << 28) |
        (0b01 << 26) |
        (1 << 24) |   // P (pre-index)
        (1 << 23) |   // U (add offset)
        ((l & 0x1) << 20) |
        ((rn & 0xF) << 16) |
        ((rd & 0xF) << 12) |
        (offset12 & 0xFFF);
}

/** Build a branch instruction.
 *  The signed 24-bit offset encodes (target_addr - current_addr - 8) / 4. */
function branch(cond: number, offset: number): number {
    // bits [27:24] = 1010
    return ((cond & 0xF) << 28) |
        (0b1010 << 24) |
        (mask(offset, 24));
}

// ARM32 ALU opcode fields (bits 24-21)
const ALU_AND = 0b0000;
const ALU_EOR = 0b0001;
const ALU_SUB = 0b0010;
const ALU_ADD = 0b0100;
const ALU_CMP = 0b1010;
const ALU_MOV = 0b1101;

/**
 * Encode a single parsed instruction into its 32-bit machine word.
 * Returns { binary, machineCode } or undefined if encoding fails.
 */
function encodeInstruction(
    opcode: Opcode,
    operands: string[],
    instIndex: number,
    labels: Record<string, number>
): ReturnType<typeof encode> {

    switch (opcode) {

        /* ── MOV Rd, #imm  ── */
        case 'MOV': {
            const rd = regNum(operands[0]);
            const imm = parseImm(operands[1]);
            // MOV uses Rn=0, the S bit is 0 (don't update flags)
            return encode(dpImm(COND_AL, ALU_MOV, 0, 0, rd, imm));
        }

        /* ── ADD Rd, Rn, #imm  OR  ADD Rd, Rn, Rm ── */
        case 'ADD': {
            const rd = regNum(operands[0]);
            const rn = regNum(operands[1]);
            if (operands[2]?.startsWith('#')) {
                const imm = parseImm(operands[2]);
                return encode(dpImm(COND_AL, ALU_ADD, 0, rn, rd, imm));
            } else {
                const rm = regNum(operands[2]);
                return encode(dpReg(COND_AL, ALU_ADD, 0, rn, rd, rm));
            }
        }

        /* ── SUB Rd, Rn, #imm  OR  SUB Rd, Rn, Rm ── */
        case 'SUB': {
            const rd = regNum(operands[0]);
            const rn = regNum(operands[1]);
            if (operands[2]?.startsWith('#')) {
                const imm = parseImm(operands[2]);
                return encode(dpImm(COND_AL, ALU_SUB, 0, rn, rd, imm));
            } else {
                const rm = regNum(operands[2]);
                return encode(dpReg(COND_AL, ALU_SUB, 0, rn, rd, rm));
            }
        }

        /* ── CMP Rn, #imm  (sets flags, no dest register → Rd=0) ── */
        case 'CMP': {
            const rn = regNum(operands[0]);
            const imm = parseImm(operands[1]);
            // CMP always sets flags → S=1.  Rd field is 0000 (ignored).
            return encode(dpImm(COND_AL, ALU_CMP, 1, rn, 0, imm));
        }

        /* ── LDR Rd, [Rn]  ── */
        case 'LDR': {
            const rd = regNum(operands[0]);
            const rn = parseMemBase(operands[1]);
            return encode(loadStore(COND_AL, 1, rn, rd, 0));
        }

        /* ── STR Rd, [Rn]  ── */
        case 'STR': {
            const rd = regNum(operands[0]);
            const rn = parseMemBase(operands[1]);
            return encode(loadStore(COND_AL, 0, rn, rd, 0));
        }

        /* ── B label  ── */
        case 'B': {
            const targetAddr = labels[operands[0]] ?? 0;
            const offset = ((targetAddr - instIndex * 4) / 4) - 2;
            return encode(branch(COND_AL, offset));
        }

        /* ── BEQ label  ── */
        case 'BEQ': {
            const targetAddr = labels[operands[0]] ?? 0;
            const offset = ((targetAddr - instIndex * 4) / 4) - 2;
            return encode(branch(COND_EQ, offset));
        }

        /* ── BNE label  ── */
        case 'BNE': {
            const targetAddr = labels[operands[0]] ?? 0;
            const offset = ((targetAddr - instIndex * 4) / 4) - 2;
            return encode(branch(COND_NE, offset));
        }

        default:
            return encode(0xE7F000F0); // ARM32 undefined instruction (safe NOP-like)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API — same interface as before, now with real encoding
// ─────────────────────────────────────────────────────────────────────────────

const VALID_OPCODES: Opcode[] = ['ADD', 'SUB', 'MOV', 'LDR', 'STR', 'CMP', 'B', 'BEQ', 'BNE'];

export const parseAssembly = (input: string): AssemblyResult => {
    const lines = input.split('\n');
    const instructions: Instruction[] = [];
    const errors: ParseError[] = [];
    const labels: Record<string, number> = {};

    // ── First pass: identify labels and their byte addresses ──────────────────
    let instCount = 0;
    lines.forEach((line) => {
        const trimmed = line.split('@')[0].trim(); // ignore @-comments
        if (!trimmed) return;

        if (trimmed.includes(':')) {
            const [label, rest] = trimmed.split(':');
            const labelName = label.trim();
            if (labelName) {
                labels[labelName] = instCount * 4; // each instruction = 4 bytes
            }
            if (rest && rest.trim()) instCount++;
        } else {
            instCount++;
        }
    });

    // ── Second pass: parse and encode instructions ─────────────────────────────
    instCount = 0;
    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        const originalText = line.trim();
        let trimmed = line.split('@')[0].trim();
        if (!trimmed) return;

        // Strip label prefix (e.g. "LOOP: ADD …" → "ADD …")
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

        // Resolve label references in operands (e.g. "BNE LOOP" → offset stays as label name)
        const resolvedOperands = operands.map(op => {
            if (labels[op] !== undefined) return `#${labels[op]}`;
            return op;
        });

        // Encode to real ARM32 machine code
        const { binary, machineCode } = encodeInstruction(opcode, operands, instCount, labels);

        instructions.push({
            id: `inst-${instCount}-${Date.now()}`,
            raw: trimmed,
            opcode,
            operands: resolvedOperands,
            binary,
            machineCode,
            address: instCount * 4,
            line: lineNumber
        });
        instCount++;
    });

    return { instructions, errors };
};
