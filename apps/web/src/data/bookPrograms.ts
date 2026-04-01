export interface BookProgram {
    id: string;
    chapter: number;
    chapterTitle: string;
    title: string;
    concept: string;
    code: string;
}

export const BOOK_PROGRAMS: BookProgram[] = [
    // ── Chapter 3: Arithmetic ────────────────────────────────────────────────
    {
        id: 'ch3-add-sub',
        chapter: 3,
        chapterTitle: 'Arithmetic Operations',
        title: 'ADD and SUB',
        concept: 'Register arithmetic — adding and subtracting two values',
        code: `MOV R0, #25
MOV R1, #10
ADD R2, R0, R1
SUB R3, R0, R1`,
    },
    {
        id: 'ch3-mul',
        chapter: 3,
        chapterTitle: 'Arithmetic Operations',
        title: 'Multiply',
        concept: 'Integer multiplication with MUL',
        code: `MOV R0, #6
MOV R1, #7
MUL R2, R0, R1`,
    },
    {
        id: 'ch3-imm',
        chapter: 3,
        chapterTitle: 'Arithmetic Operations',
        title: 'Immediate operands',
        concept: 'Using immediate (#) values in ADD and SUB',
        code: `MOV R0, #100
ADD R1, R0, #5
SUB R2, R0, #5`,
    },

    // ── Chapter 4: Loops and Branches ────────────────────────────────────────
    {
        id: 'ch4-count-loop',
        chapter: 4,
        chapterTitle: 'Loops and Branches',
        title: 'Counting loop (BNE)',
        concept: 'Loop using CMP + BNE — count up to N',
        code: `MOV R0, #5
MOV R1, #0
LOOP:
ADD R1, R1, #1
CMP R1, R0
BNE LOOP`,
    },
    {
        id: 'ch4-countdown',
        chapter: 4,
        chapterTitle: 'Loops and Branches',
        title: 'Countdown loop (BGT)',
        concept: 'Loop using SUBS + BGT — decrement until zero',
        code: `MOV R0, #5
LOOP:
SUBS R0, R0, #1
BGT LOOP`,
    },
    {
        id: 'ch4-if-else',
        chapter: 4,
        chapterTitle: 'Loops and Branches',
        title: 'If-else (BEQ)',
        concept: 'Conditional execution — branch on equal',
        code: `MOV R0, #10
MOV R1, #10
CMP R0, R1
BEQ EQUAL
MOV R2, #0
B END
EQUAL:
MOV R2, #1
END:`,
    },

    // ── Chapter 5: Bitwise Operations ────────────────────────────────────────
    {
        id: 'ch5-and-or',
        chapter: 5,
        chapterTitle: 'Bitwise Operations',
        title: 'AND and ORR',
        concept: 'Bitwise AND to mask bits, ORR to set bits',
        code: `MOV R0, #0xFF
MOV R1, #0x0F
AND R2, R0, R1
ORR R3, R0, R1`,
    },
    {
        id: 'ch5-eor-shifts',
        chapter: 5,
        chapterTitle: 'Bitwise Operations',
        title: 'EOR and Shifts',
        concept: 'XOR for toggling bits; LSL/LSR to multiply and divide by powers of 2',
        code: `MOV R0, #0b10101010
MOV R1, #0b11110000
EOR R2, R0, R1
MOV R3, #3
LSL R4, R3, #3
LSR R5, R4, #1`,
    },

    // ── Chapter 7: Function Calls and the Stack ───────────────────────────────
    {
        id: 'ch7-bl-bx',
        chapter: 7,
        chapterTitle: 'Functions and the Stack',
        title: 'BL / BX LR — simple call and return',
        concept: 'BL saves the return address in LR; BX LR returns to caller',
        code: `BL DOUBLE
B END
DOUBLE:
MOV R0, #21
LSL R0, R0, #1
BX LR
END:`,
    },
    {
        id: 'ch7-push-pop',
        chapter: 7,
        chapterTitle: 'Functions and the Stack',
        title: 'PUSH and POP — stack round-trip',
        concept: 'PUSH decrements SP then stores; POP loads then increments SP',
        code: `MOV R0, #42
MOV R1, #99
PUSH {R0}
PUSH {R1}
POP {R2}
POP {R3}`,
    },
    {
        id: 'ch7-stack-frame',
        chapter: 7,
        chapterTitle: 'Functions and the Stack',
        title: 'Stack frame — prologue / epilogue',
        concept: 'Function saves LR on entry (prologue) and restores it on exit (epilogue)',
        code: `BL FUNC
MOV R3, #1
B END
FUNC:
PUSH {LR}
MOV R0, #10
MOV R1, #20
ADD R2, R0, R1
POP {LR}
BX LR
END:`,
    },
    {
        id: 'ch7-pre-index',
        chapter: 7,
        chapterTitle: 'Functions and the Stack',
        title: 'Pre-index addressing [SP, #-4]!',
        concept: 'Manual stack push using pre-index write-back addressing',
        code: `MOV R0, #55
STR R0, [SP, #-4]!
LDR R1, [SP], #4`,
    },
];

/** Normalise code for comparison: collapse whitespace, trim, lowercase. */
function normalise(code: string): string {
    return code.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Return the BookProgram whose code matches the given assembly, or null. */
export function matchBookProgram(code: string): BookProgram | null {
    const n = normalise(code);
    return BOOK_PROGRAMS.find(p => normalise(p.code) === n) ?? null;
}
