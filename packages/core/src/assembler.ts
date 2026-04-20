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
function regNum(name: string | undefined): number {
    if (!name) return 0;
    const n = REG_MAP[name.toUpperCase()];
    return n !== undefined ? n : 0;
}

/**
 * Parse an immediate value operand.  Accepts:
 *   "#10"  →  10
 *   "#0xFF" → 255
 *   "5"    →  5
 */
function parseImm(op: string | undefined): number {
    if (!op) return 0;
    const s = op.replace('#', '').trim();
    return parseInt(s, s.startsWith('0x') || s.startsWith('0X') ? 16 : 10) || 0;
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
 *  L=1 for LDR, L=0 for STR.
 *  p=1 pre-index, p=0 post-index; u=1 add offset, u=0 subtract; w=1 write-back. */
function loadStore(cond: number, l: number,
    rn: number, rd: number, offset12: number, p = 1, u = 1, w = 0): number {
    // bits [27:26]=01, [24]=P, [23]=U, [22]=0 (word), [21]=W, [20]=L
    return ((cond & 0xF) << 28) |
        (0b01 << 26) |
        ((p & 0x1) << 24) |
        ((u & 0x1) << 23) |
        ((w & 0x1) << 21) |
        ((l & 0x1) << 20) |
        ((rn & 0xF) << 16) |
        ((rd & 0xF) << 12) |
        (Math.abs(offset12) & 0xFFF);
}

/**
 * Parse a memory operand from LDR/STR operands array.
 * Handles: [Rn], [Rn, #off], [Rn, #off]!, [Rn], #off
 */
function parseMemOp(operands: string[]): { baseReg: string; offset: number; writeBack: boolean; postIndex: boolean } {
    // Join all but first operand to handle commas within brackets
    const memStr = operands.slice(1).join(', ');
    // Post-index: "[Rn], #off" — bracket closes before the comma offset
    const postMatch = memStr.match(/^\[(\w+)\]\s*,\s*#(-?\d+)/);
    if (postMatch) {
        return { baseReg: postMatch[1].toUpperCase(), offset: parseInt(postMatch[2]), writeBack: false, postIndex: true };
    }
    // Pre-index with writeback: "[Rn, #off]!" or "[Rn]!"
    const preWbMatch = memStr.match(/^\[(\w+)(?:\s*,\s*#(-?\d+))?\]!/);
    if (preWbMatch) {
        return { baseReg: preWbMatch[1].toUpperCase(), offset: preWbMatch[2] ? parseInt(preWbMatch[2]) : 0, writeBack: true, postIndex: false };
    }
    // Offset: "[Rn, #off]"
    const offMatch = memStr.match(/^\[(\w+)\s*,\s*#(-?\d+)\]/);
    if (offMatch) {
        return { baseReg: offMatch[1].toUpperCase(), offset: parseInt(offMatch[2]), writeBack: false, postIndex: false };
    }
    // Simple: "[Rn]"
    const simpleMatch = memStr.match(/^\[(\w+)\]/);
    if (simpleMatch) {
        return { baseReg: simpleMatch[1].toUpperCase(), offset: 0, writeBack: false, postIndex: false };
    }
    return { baseReg: 'R0', offset: 0, writeBack: false, postIndex: false };
}

/** Build a multiply instruction: MUL Rd, Rm, Rs → cond 0000 00AS Rd 0000 Rs 1001 Rm */
function multiply(cond: number, rd: number, rs: number, rm: number): number {
    return ((cond & 0xF) << 28) |
        ((rd & 0xF) << 16) |
        ((rs & 0xF) << 8) |
        (0b1001 << 4) |
        (rm & 0xF);
}

/** Build a shift instruction as a data-processing (register) with shift amount.
 *  LSL = shift type 00, LSR = shift type 01 */
function shiftImm(cond: number, opcode4: number, rd: number, rm: number, shiftType: number, shiftAmt: number): number {
    // ARM32 MOV Rd, Rm, LSL #imm: cond 000 1101 0 0000 Rd shiftAmt shiftType 0 Rm
    return ((cond & 0xF) << 28) |
        ((opcode4 & 0xF) << 21) |
        ((rd & 0xF) << 12) |
        ((shiftAmt & 0x1F) << 7) |
        ((shiftType & 0x3) << 5) |
        (rm & 0xF);
}

/** Build a branch instruction.
 *  The signed 24-bit offset encodes (target_addr - current_addr - 8) / 4. */
function branch(cond: number, offset: number): number {
    // bits [27:24] = 1010
    return ((cond & 0xF) << 28) |
        (0b1010 << 24) |
        (mask(offset, 24));
}

/** Build a branch-with-link instruction (BL).
 *  Same as branch but bit 24 (L) = 1 → bits [27:24] = 1011. */
function branchLink(cond: number, offset: number): number {
    return ((cond & 0xF) << 28) |
        (0b1011 << 24) |
        (mask(offset, 24));
}

/** Build a branch-and-exchange instruction (BX Rm).
 *  Encoding: cond 000100101111111111110001 Rm */
function branchExchange(cond: number, rm: number): number {
    return ((cond & 0xF) << 28) |
        (0x12 << 20) |          // bits [27:20] = 0001 0010
        (0xFFF << 8) |          // bits [19:8]  = 1111 1111 1111
        (0x1 << 4) |            // bits [7:4]   = 0001
        (rm & 0xF);             // bits [3:0]   = Rm
}

// ARM32 ALU opcode fields (bits 24-21)
const ALU_AND = 0b0000;
const ALU_EOR = 0b0001;
const ALU_SUB = 0b0010;
const ALU_ADD = 0b0100;
const ALU_CMP = 0b1010;
const ALU_ORR = 0b1100;
const ALU_MOV = 0b1101;

// Additional condition codes
const COND_GT = 0b1100;
const COND_LT = 0b1011;
const COND_GE = 0b1010;
const COND_LE = 0b1101;

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

        /* ── LDR Rd, [Rn] / [Rn, #off] / [Rn, #off]! / [Rn], #off ── */
        case 'LDR': {
            const rd = regNum(operands[0]);
            const { baseReg, offset, writeBack, postIndex } = parseMemOp(operands);
            const rn = regNum(baseReg);
            const u = offset >= 0 ? 1 : 0;
            const p = postIndex ? 0 : 1;
            const w = writeBack ? 1 : 0;
            return encode(loadStore(COND_AL, 1, rn, rd, offset, p, u, w));
        }

        /* ── STR Rd, [Rn] / [Rn, #off] / [Rn, #off]! / [Rn], #off ── */
        case 'STR': {
            const rd = regNum(operands[0]);
            const { baseReg, offset, writeBack, postIndex } = parseMemOp(operands);
            const rn = regNum(baseReg);
            const u = offset >= 0 ? 1 : 0;
            const p = postIndex ? 0 : 1;
            const w = writeBack ? 1 : 0;
            return encode(loadStore(COND_AL, 0, rn, rd, offset, p, u, w));
        }

        /* ── PUSH {Rn}  →  STR Rn, [SP, #-4]! ── */
        case 'PUSH': {
            const rn = regNum(operands[0]?.replace(/[{}]/g, ''));
            return encode(loadStore(COND_AL, 0, 13, rn, -4, 1, 0, 1));
        }

        /* ── POP {Rn}  →  LDR Rn, [SP], #4 ── */
        case 'POP': {
            const rn = regNum(operands[0]?.replace(/[{}]/g, ''));
            return encode(loadStore(COND_AL, 1, 13, rn, 4, 0, 1, 0));
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

        /* ── BL label  (branch with link — saves PC+4 to LR) ── */
        case 'BL': {
            const targetAddr = labels[operands[0]] ?? 0;
            const offset = ((targetAddr - instIndex * 4) / 4) - 2;
            return encode(branchLink(COND_AL, offset));
        }

        /* ── BX Rm  (branch and exchange — typically BX LR to return) ── */
        case 'BX': {
            const rm = regNum(operands[0]);
            return encode(branchExchange(COND_AL, rm));
        }

        /* ── MUL Rd, Rm, Rs ── */
        case 'MUL': {
            const rd = regNum(operands[0]);
            const rm = regNum(operands[1]);
            const rs = regNum(operands[2]);
            return encode(multiply(COND_AL, rd, rs, rm));
        }

        /* ── LSL Rd, Rn, #imm  (logical shift left) ── */
        case 'LSL': {
            const rd = regNum(operands[0]);
            const rn = regNum(operands[1]);
            const shamt = parseImm(operands[2]);
            return encode(shiftImm(COND_AL, ALU_MOV, rd, rn, 0b00, shamt));
        }

        /* ── LSR Rd, Rn, #imm  (logical shift right) ── */
        case 'LSR': {
            const rd = regNum(operands[0]);
            const rn = regNum(operands[1]);
            const shamt = parseImm(operands[2]);
            return encode(shiftImm(COND_AL, ALU_MOV, rd, rn, 0b01, shamt));
        }

        /* ── AND Rd, Rn, #imm  OR  AND Rd, Rn, Rm ── */
        case 'AND': {
            const rd = regNum(operands[0]);
            const rn = regNum(operands[1]);
            if (operands[2]?.startsWith('#')) {
                return encode(dpImm(COND_AL, ALU_AND, 0, rn, rd, parseImm(operands[2])));
            }
            return encode(dpReg(COND_AL, ALU_AND, 0, rn, rd, regNum(operands[2])));
        }

        /* ── ORR Rd, Rn, #imm  OR  ORR Rd, Rn, Rm ── */
        case 'ORR': {
            const rd = regNum(operands[0]);
            const rn = regNum(operands[1]);
            if (operands[2]?.startsWith('#')) {
                return encode(dpImm(COND_AL, ALU_ORR, 0, rn, rd, parseImm(operands[2])));
            }
            return encode(dpReg(COND_AL, ALU_ORR, 0, rn, rd, regNum(operands[2])));
        }

        /* ── EOR Rd, Rn, #imm  OR  EOR Rd, Rn, Rm ── */
        case 'EOR': {
            const rd = regNum(operands[0]);
            const rn = regNum(operands[1]);
            if (operands[2]?.startsWith('#')) {
                return encode(dpImm(COND_AL, ALU_EOR, 0, rn, rd, parseImm(operands[2])));
            }
            return encode(dpReg(COND_AL, ALU_EOR, 0, rn, rd, regNum(operands[2])));
        }

        /* ── SUBS Rd, Rn, #imm  OR  SUBS Rd, Rn, Rm  (SUB + set flags) ── */
        case 'SUBS': {
            const rd = regNum(operands[0]);
            const rn = regNum(operands[1]);
            if (operands[2]?.startsWith('#')) {
                return encode(dpImm(COND_AL, ALU_SUB, 1, rn, rd, parseImm(operands[2])));
            }
            return encode(dpReg(COND_AL, ALU_SUB, 1, rn, rd, regNum(operands[2])));
        }

        /* ── BGT / BLT / BGE / BLE ── */
        case 'BGT': {
            const targetAddr = labels[operands[0]] ?? 0;
            const offset = ((targetAddr - instIndex * 4) / 4) - 2;
            return encode(branch(COND_GT, offset));
        }
        case 'BLT': {
            const targetAddr = labels[operands[0]] ?? 0;
            const offset = ((targetAddr - instIndex * 4) / 4) - 2;
            return encode(branch(COND_LT, offset));
        }
        case 'BGE': {
            const targetAddr = labels[operands[0]] ?? 0;
            const offset = ((targetAddr - instIndex * 4) / 4) - 2;
            return encode(branch(COND_GE, offset));
        }
        case 'BLE': {
            const targetAddr = labels[operands[0]] ?? 0;
            const offset = ((targetAddr - instIndex * 4) / 4) - 2;
            return encode(branch(COND_LE, offset));
        }

        default:
            return encode(0xE7F000F0); // ARM32 undefined instruction (safe NOP-like)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API — same interface as before, now with real encoding
// ─────────────────────────────────────────────────────────────────────────────

const VALID_OPCODES: Opcode[] = [
    'ADD', 'SUB', 'MOV', 'LDR', 'STR', 'CMP', 'B', 'BEQ', 'BNE', 'BL', 'BX',
    'PUSH', 'POP', 'MUL', 'LSL', 'LSR', 'AND', 'ORR', 'EOR', 'SUBS',
    'BGT', 'BLT', 'BGE', 'BLE',
];

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

        // Split opcode from the rest, then split operands on commas outside brackets/braces
        const spaceIdx = trimmed.search(/\s/);
        if (spaceIdx === -1 && trimmed.length === 0) return;
        const opcodeStr = (spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx)).toUpperCase();
        const rest = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1).trim();

        if (!VALID_OPCODES.includes(opcodeStr as Opcode)) {
            errors.push({
                line: lineNumber,
                message: `Unknown opcode: ${opcodeStr}`,
                content: originalText
            });
            return;
        }

        const opcode = opcodeStr as Opcode;
        // Split on commas not inside [] or {}
        const operands: string[] = rest.length === 0 ? [] : (() => {
            const result: string[] = [];
            let depth = 0;
            let cur = '';
            for (const ch of rest) {
                if (ch === '[' || ch === '{') { depth++; cur += ch; }
                else if (ch === ']' || ch === '}') { depth--; cur += ch; }
                else if (ch === ',' && depth === 0) { result.push(cur.trim()); cur = ''; }
                else { cur += ch; }
            }
            if (cur.trim()) result.push(cur.trim());
            return result;
        })();

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
