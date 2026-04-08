import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  Platform, TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSimulator } from '@/context/SimulatorContext';
import CallingConventionViz from '@/components/CallingConventionViz';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';
import type { AppPalette } from '@/constants/theme';

const PROGRESS_KEY = 'playarm_exercise_progress';

// ── Data ─────────────────────────────────────────────────────────────────────

const CHAPTER_COLORS: Record<number, string> = {
  3: '#3fb950',
  4: '#d29922',
  5: '#a371f7',
  7: '#2f81f7',
};

interface BookProgram {
  id: string;
  chapter: number;
  title: string;
  concept: string;
  code: string;
}

const BOOK_PROGRAMS: BookProgram[] = [
  { id: 'ch3-add-sub', chapter: 3, title: 'ADD and SUB',
    concept: 'Register arithmetic — adding and subtracting two values',
    code: 'MOV R0, #25\nMOV R1, #10\nADD R2, R0, R1\nSUB R3, R0, R1' },
  { id: 'ch3-mul', chapter: 3, title: 'Multiply',
    concept: 'Integer multiplication with MUL',
    code: 'MOV R0, #6\nMOV R1, #7\nMUL R2, R0, R1' },
  { id: 'ch3-imm', chapter: 3, title: 'Immediate operands',
    concept: 'Using immediate (#) values in ADD and SUB',
    code: 'MOV R0, #100\nADD R1, R0, #5\nSUB R2, R0, #5' },
  { id: 'ch4-count-loop', chapter: 4, title: 'Counting loop (BNE)',
    concept: 'Loop using CMP + BNE — count up to N',
    code: 'MOV R0, #5\nMOV R1, #0\nLOOP:\nADD R1, R1, #1\nCMP R1, R0\nBNE LOOP' },
  { id: 'ch4-countdown', chapter: 4, title: 'Countdown loop (BGT)',
    concept: 'Loop using SUBS + BGT — decrement until zero',
    code: 'MOV R0, #5\nLOOP:\nSUBS R0, R0, #1\nBGT LOOP' },
  { id: 'ch4-if-else', chapter: 4, title: 'If-else (BEQ)',
    concept: 'Conditional branch — two paths through code',
    code: 'MOV R0, #10\nMOV R1, #10\nCMP R0, R1\nBEQ EQUAL\nMOV R2, #0\nB END\nEQUAL:\nMOV R2, #1\nEND:' },
  { id: 'ch5-and-or', chapter: 5, title: 'AND and ORR',
    concept: 'Bitwise AND to mask bits, ORR to set bits',
    code: 'MOV R0, #0xFF\nMOV R1, #0x0F\nAND R2, R0, R1\nORR R3, R0, R1' },
  { id: 'ch5-eor-shifts', chapter: 5, title: 'EOR and Shifts',
    concept: 'XOR for toggling bits; LSL/LSR to multiply/divide by powers of 2',
    code: 'MOV R0, #0xAA\nMOV R1, #0xF0\nEOR R2, R0, R1\nMOV R3, #3\nLSL R4, R3, #3\nLSR R5, R4, #1' },
  { id: 'ch7-bl-bx', chapter: 7, title: 'BL / BX LR',
    concept: 'BL saves return address in LR; BX LR returns to caller',
    code: 'BL DOUBLE\nB END\nDOUBLE:\nMOV R0, #21\nLSL R0, R0, #1\nBX LR\nEND:' },
  { id: 'ch7-push-pop', chapter: 7, title: 'PUSH and POP',
    concept: 'PUSH decrements SP then stores; POP loads then increments SP',
    code: 'MOV R0, #42\nMOV R1, #99\nPUSH {R0}\nPUSH {R1}\nPOP {R2}\nPOP {R3}' },
  { id: 'ch7-stack-frame', chapter: 7, title: 'Stack frame',
    concept: 'Function saves LR on entry (prologue) and restores on exit (epilogue)',
    code: 'BL FUNC\nMOV R3, #1\nB END\nFUNC:\nPUSH {LR}\nMOV R0, #10\nMOV R1, #20\nADD R2, R0, R1\nPOP {LR}\nBX LR\nEND:' },
];

interface Exercise {
  id: string;
  chapter: number;
  title: string;
  description: string;
  hint: string;
  starterCode: string;
  /** returns null on pass, or a failure message explaining what's wrong */
  check: (regs: Record<string, number>) => string | null;
  successMsg: string;
}

const EXERCISES: Exercise[] = [
  {
    id: 'ex-add', chapter: 3, title: 'Sum two numbers',
    description: 'Write ARM assembly to compute 15 + 27 and store the result in R0.',
    hint: 'Use MOV to load values into two registers, then ADD to compute the sum into R0.',
    starterCode: 'MOV R1, #15\nMOV R2, #27\n; ADD into R0 here',
    check: regs => {
      if (regs['R0'] === 42) return null;
      if (regs['R0'] === 0) return 'R0 is still 0 — did you run the program? Use ADD R0, R1, R2';
      return `R0 = ${regs['R0']}, expected 42 (15 + 27). Check your ADD destination register.`;
    },
    successMsg: 'R0 = 42 ✓',
  },
  {
    id: 'ex-loop', chapter: 4, title: 'Count to 5',
    description: 'Use a loop to count from 0 to 5. When the loop finishes, R0 should equal 5.',
    hint: 'Use ADD R0, R0, #1 inside a loop, then CMP R0, #5 followed by BNE back to the label.',
    starterCode: 'MOV R0, #0\nLOOP:\n; increment and compare here',
    check: regs => {
      if (regs['R0'] === 5) return null;
      if (regs['R0'] === 0) return 'R0 is still 0 — did you run the program?';
      if (regs['R0'] > 5) return `R0 = ${regs['R0']} — loop ran too many times. Check your CMP/BNE condition.`;
      return `R0 = ${regs['R0']}, expected 5. The loop may have exited too early.`;
    },
    successMsg: 'R0 = 5 ✓ — loop finished correctly!',
  },
  {
    id: 'ex-bit', chapter: 5, title: 'Isolate lower nibble',
    description: 'Extract the lower 4 bits of 0xAB into R0. R0 should equal 0xB (11).',
    hint: 'Load 0xAB with MOV, then AND with 0x0F to clear the upper nibble.',
    starterCode: 'MOV R1, #0xAB\n; AND into R0 here',
    check: regs => {
      if (regs['R0'] === 0x0b) return null;
      if (regs['R0'] === 0) return 'R0 is 0 — did you AND into R0? Try: AND R0, R1, #0x0F';
      if (regs['R0'] === 0xab) return 'R0 = 0xAB — you moved the value but forgot the AND mask.';
      return `R0 = 0x${regs['R0'].toString(16).toUpperCase()}, expected 0xB. Check your AND mask (#0x0F).`;
    },
    successMsg: 'R0 = 0xB ✓ — lower nibble isolated!',
  },
  {
    id: 'ex-shift', chapter: 5, title: 'Multiply by 8 with a shift',
    description: 'Use a left shift to compute 3 × 8 without MUL. Store the result in R0.',
    hint: 'LSL by 3 multiplies by 2³ = 8. Try: LSL R0, R1, #3',
    starterCode: 'MOV R1, #3\n; LSL into R0 here',
    check: regs => {
      if (regs['R0'] === 24) return null;
      if (regs['R0'] === 0) return 'R0 is 0 — did you run the program? Try: LSL R0, R1, #3';
      if (regs['R0'] === 3) return 'R0 = 3 — you loaded but did not shift. Add an LSL instruction.';
      return `R0 = ${regs['R0']}, expected 24 (3 << 3). Check your shift amount.`;
    },
    successMsg: 'R0 = 24 ✓ — shift-as-multiply works!',
  },
  {
    id: 'ex-stack', chapter: 7, title: 'Stack round-trip',
    description: 'Push R1 = 99 onto the stack, then pop it back into R0. R0 should equal 99.',
    hint: 'MOV R1, #99 → PUSH {R1} → POP {R0}. SP changes but returns to original value.',
    starterCode: 'MOV R1, #99\n; PUSH and POP here',
    check: regs => {
      if (regs['R0'] === 99) return null;
      if (regs['R0'] === 0) return 'R0 is 0 — did you run the program? Did you POP into R0?';
      if (regs['R1'] === 99 && regs['R0'] !== 99) return `R1 = 99 but R0 = ${regs['R0']} — check your POP destination.`;
      return `R0 = ${regs['R0']}, expected 99. Check your PUSH/POP pair.`;
    },
    successMsg: 'R0 = 99 ✓ — stack round-trip complete!',
  },
  // ── 10 new exercises ────────────────────────────────────────────────────────
  {
    id: 'ex-negate', chapter: 3, title: 'Negate a number',
    description: 'Compute the two\'s complement of 42 and store it in R0. R0 should equal -42 (as a signed 32-bit value).',
    hint: 'MVN (Move Not) flips all bits. Then add 1: MVN R0, R1; ADD R0, R0, #1. Or use RSBS R0, R1, #0.',
    starterCode: 'MOV R1, #42\n; Negate R1 into R0',
    check: regs => {
      const expected = (-42) | 0;
      if ((regs['R0'] | 0) === expected) return null;
      if (regs['R0'] === 42) return 'R0 = 42 — you copied but did not negate. Try MVN + ADD #1.';
      if (regs['R0'] === 0) return 'R0 is 0 — did you run the program?';
      return `R0 = ${regs['R0']}, expected ${expected} (two\'s complement of 42).`;
    },
    successMsg: 'R0 = -42 ✓ — two\'s complement works!',
  },
  {
    id: 'ex-power2', chapter: 5, title: 'Power of 2 check',
    description: 'Check if R1 = 16 is a power of 2. Store 1 in R0 if yes, 0 if no. Hint: a power of 2 satisfies (n & (n-1)) == 0.',
    hint: 'SUB R2, R1, #1 → AND R2, R1, R2 → if R2 == 0, set R0 = 1 using MOVEQ.',
    starterCode: 'MOV R1, #16\n; Check if R1 is power of 2 → result in R0',
    check: regs => {
      if (regs['R0'] === 1) return null;
      if (regs['R0'] === 0) return '16 is a power of 2 (2^4) — R0 should be 1. Use AND to test (n & (n-1)).';
      return `R0 = ${regs['R0']}, expected 1. Check your CMP/branch logic.`;
    },
    successMsg: 'R0 = 1 ✓ — 16 is indeed 2⁴!',
  },
  {
    id: 'ex-modulo', chapter: 4, title: 'Modulo by repeated subtraction',
    description: 'Compute 17 mod 5 using repeated subtraction. Store the result in R0.',
    hint: 'Load R0 = 17, R1 = 5. Loop: CMP R0, R1; BLT done; SUB R0, R0, R1; B loop.',
    starterCode: 'MOV R0, #17\nMOV R1, #5\n; Subtract R1 from R0 until R0 < R1',
    check: regs => {
      if (regs['R0'] === 2) return null;
      if (regs['R0'] === 17) return 'R0 is still 17 — did you run the subtraction loop?';
      if (regs['R0'] === 0) return 'R0 is 0 — your loop may have subtracted too much. Check BLT condition.';
      return `R0 = ${regs['R0']}, expected 2 (17 mod 5). Check when your loop exits.`;
    },
    successMsg: 'R0 = 2 ✓ — 17 mod 5 = 2!',
  },
  {
    id: 'ex-max', chapter: 4, title: 'Maximum of two numbers',
    description: 'Find the larger of R1 = 13 and R2 = 27. Store the result in R0.',
    hint: 'CMP R1, R2 → if R1 > R2, MOV R0, R1, else MOV R0, R2. Use BGT or conditional execution.',
    starterCode: 'MOV R1, #13\nMOV R2, #27\n; Store max(R1, R2) in R0',
    check: regs => {
      if (regs['R0'] === 27) return null;
      if (regs['R0'] === 13) return 'R0 = 13 — that\'s the minimum. Did your branch go the right way?';
      if (regs['R0'] === 0) return 'R0 is 0 — did you run the program?';
      return `R0 = ${regs['R0']}, expected 27.`;
    },
    successMsg: 'R0 = 27 ✓ — max found!',
  },
  {
    id: 'ex-abs', chapter: 3, title: 'Absolute value',
    description: 'Compute |R1| where R1 = -7 (stored as 0xFFFFFFF9). Store the result in R0.',
    hint: 'Check if R1 is negative (MSB = 1, or use CMP with #0). If negative, negate it using MVN R0,R1 + ADD R0,R0,#1.',
    starterCode: 'MVN R1, #6\n; R1 = -7, compute |R1| into R0',
    check: regs => {
      if (regs['R0'] === 7) return null;
      if ((regs['R0'] | 0) === -7) return 'R0 = -7 — you copied the negative value. Negate it when negative.';
      if (regs['R0'] === 0) return 'R0 is 0 — did you run the program?';
      return `R0 = ${regs['R0']}, expected 7 (|-7| = 7).`;
    },
    successMsg: 'R0 = 7 ✓ — absolute value correct!',
  },
  {
    id: 'ex-swap', chapter: 4, title: 'Swap two registers',
    description: 'Swap the values of R0 and R1. Start: R0 = 10, R1 = 20. End: R0 = 20, R1 = 10.',
    hint: 'Use a temporary register R2 to hold one value during the swap.',
    starterCode: 'MOV R0, #10\nMOV R1, #20\n; Swap R0 and R1 using R2 as temp',
    check: regs => {
      if (regs['R0'] === 20 && regs['R1'] === 10) return null;
      if (regs['R0'] === 10 && regs['R1'] === 20) return 'Values not swapped yet — use R2 as temp: MOV R2,R0 / MOV R0,R1 / MOV R1,R2.';
      return `R0 = ${regs['R0']}, R1 = ${regs['R1']}, expected R0=20, R1=10.`;
    },
    successMsg: 'R0=20, R1=10 ✓ — swap complete!',
  },
  {
    id: 'ex-countbits', chapter: 5, title: 'Count set bits',
    description: 'Count how many bits are 1 in R1 = 0b10110101 (= 0xB5). Store the count in R0.',
    hint: 'Loop 8 times: AND R2, R1, #1 to test LSB; ADD R0, R0, R2 to count; LSR R1, R1, #1 to shift.',
    starterCode: 'MOV R1, #0xB5\nMOV R0, #0\nMOV R3, #8\nLOOP:\n; AND LSB into R2, add to R0, shift R1 right',
    check: regs => {
      if (regs['R0'] === 5) return null;
      if (regs['R0'] === 0) return 'R0 is 0 — did you run the loop? AND R1 with #1, add to R0, then LSR R1.';
      return `R0 = ${regs['R0']}, expected 5 (0xB5 = 10110101 has five 1-bits).`;
    },
    successMsg: 'R0 = 5 ✓ — 5 set bits in 0xB5!',
  },
  {
    id: 'ex-bitpack', chapter: 5, title: 'Pack two nibbles',
    description: 'Pack R1 = 0xA (upper nibble) and R2 = 0x5 (lower nibble) into R0. R0 should equal 0xA5.',
    hint: 'LSL R1 left by 4, then ORR with R2: LSL R0, R1, #4 → ORR R0, R0, R2.',
    starterCode: 'MOV R1, #0xA\nMOV R2, #0x5\n; Pack into R0',
    check: regs => {
      if (regs['R0'] === 0xA5) return null;
      if (regs['R0'] === 0xA) return 'R0 = 0xA — you shifted but forgot the ORR. Try ORR R0, R0, R2.';
      if (regs['R0'] === 0x5) return 'R0 = 0x5 — you have the lower nibble only. Shift R1 left by 4 first.';
      return `R0 = 0x${(regs['R0'] >>> 0).toString(16).toUpperCase()}, expected 0xA5.`;
    },
    successMsg: 'R0 = 0xA5 ✓ — nibbles packed!',
  },
  {
    id: 'ex-mul3', chapter: 3, title: 'Multiply by 3 without MUL',
    description: 'Compute 3 × 7 using only ADD and LSL. Store the result in R0.',
    hint: 'x × 3 = x × 2 + x = (x LSL 1) + x. Try: LSL R0, R1, #1 → ADD R0, R0, R1.',
    starterCode: 'MOV R1, #7\n; Compute R1 × 3 into R0 without MUL',
    check: regs => {
      if (regs['R0'] === 21) return null;
      if (regs['R0'] === 7) return 'R0 = 7 — you copied R1 but didn\'t multiply. Add the shifted value.';
      if (regs['R0'] === 14) return 'R0 = 14 — that\'s 7 × 2. Add R1 one more time: ADD R0, R0, R1.';
      return `R0 = ${regs['R0']}, expected 21 (7 × 3).`;
    },
    successMsg: 'R0 = 21 ✓ — 7 × 3 without MUL!',
  },
  {
    id: 'ex-gcd', chapter: 4, title: 'GCD (Euclidean)',
    description: 'Compute GCD(48, 18) using the Euclidean algorithm (repeated subtraction). Store result in R0.',
    hint: 'Loop: CMP R0, R1; if equal, done; if R0 > R1, SUB R0,R0,R1; else SUB R1,R1,R0; repeat.',
    starterCode: 'MOV R0, #48\nMOV R1, #18\nGCD:\nCMP R0, R1\n; equal → done, else subtract smaller from larger',
    check: regs => {
      if (regs['R0'] === 6 && regs['R1'] === 6) return null;
      if (regs['R0'] === 6 || regs['R1'] === 6) return `GCD is 6, but check both R0 and R1 converge to 6.`;
      if (regs['R0'] === 48) return 'R0 = 48 — loop didn\'t run. Check your branch instruction.';
      return `R0 = ${regs['R0']}, R1 = ${regs['R1']}, expected both = 6 (GCD of 48 and 18).`;
    },
    successMsg: 'R0 = R1 = 6 ✓ — GCD(48,18) = 6!',
  },
];

const REF_CATEGORIES = [
  { title: 'Data Movement', instructions: [
    { syntax: 'MOV Rd, #n', description: 'Load immediate value n into Rd' },
    { syntax: 'MOV Rd, Rn', description: 'Copy value of Rn into Rd' },
  ]},
  { title: 'Arithmetic', instructions: [
    { syntax: 'ADD Rd, Rn, Rm', description: 'Rd = Rn + Rm' },
    { syntax: 'ADD Rd, Rn, #n', description: 'Rd = Rn + n' },
    { syntax: 'SUB Rd, Rn, Rm', description: 'Rd = Rn − Rm' },
    { syntax: 'SUB Rd, Rn, #n', description: 'Rd = Rn − n' },
    { syntax: 'SUBS Rd, Rn, #n', description: 'Rd = Rn − n, and update flags N/Z/C/V' },
    { syntax: 'MUL Rd, Rn, Rm', description: 'Rd = Rn × Rm' },
  ]},
  { title: 'Bitwise', instructions: [
    { syntax: 'AND Rd, Rn, Rm', description: 'Rd = Rn & Rm — clear selected bits (masking)' },
    { syntax: 'AND Rd, Rn, #n', description: 'Rd = Rn & n' },
    { syntax: 'ORR Rd, Rn, Rm', description: 'Rd = Rn | Rm — set selected bits' },
    { syntax: 'EOR Rd, Rn, Rm', description: 'Rd = Rn ^ Rm — toggle selected bits' },
    { syntax: 'LSL Rd, Rn, #n', description: 'Rd = Rn << n — multiply by 2ⁿ' },
    { syntax: 'LSR Rd, Rn, #n', description: 'Rd = Rn >> n — divide by 2ⁿ (unsigned)' },
  ]},
  { title: 'Compare & Branch', instructions: [
    { syntax: 'CMP Rn, Rm', description: 'Set flags from Rn − Rm (result discarded)' },
    { syntax: 'CMP Rn, #n', description: 'Set flags from Rn − n' },
    { syntax: 'B label', description: 'Unconditional jump to label' },
    { syntax: 'BEQ label', description: 'Jump if Z=1 (last result was zero / equal)' },
    { syntax: 'BNE label', description: 'Jump if Z=0 (not equal)' },
    { syntax: 'BGT label', description: 'Jump if greater than (Z=0 and N=V)' },
    { syntax: 'BLT label', description: 'Jump if less than (N≠V)' },
    { syntax: 'BGE label', description: 'Jump if greater than or equal (N=V)' },
    { syntax: 'BLE label', description: 'Jump if less than or equal (Z=1 or N≠V)' },
    { syntax: 'BL label', description: 'Call: jump and save return address in LR' },
    { syntax: 'BX LR', description: 'Return: jump to address stored in LR' },
  ]},
  { title: 'Memory (Load / Store)', instructions: [
    { syntax: 'LDR Rd, [Rn]', description: 'Rd = Memory[Rn]' },
    { syntax: 'LDR Rd, [Rn, #off]', description: 'Rd = Memory[Rn + off] — offset addressing' },
    { syntax: 'LDR Rd, [Rn], #off', description: 'Rd = Memory[Rn]; Rn += off — post-index' },
    { syntax: 'LDR Rd, [Rn, #off]!', description: 'Rn += off; Rd = Memory[Rn] — pre-index writeback' },
    { syntax: 'STR Rd, [Rn]', description: 'Memory[Rn] = Rd (store variants mirror LDR)' },
    { syntax: 'PUSH {Rx}', description: 'SP −= 4; Memory[SP] = Rx' },
    { syntax: 'POP {Rx}', description: 'Rx = Memory[SP]; SP += 4' },
  ]},
];

// ── Screen ────────────────────────────────────────────────────────────────────

type Section = 'programs' | 'exercises' | 'reference';

export default function LearnScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setProgram, registers } = useSimulator();
  const c = useAppTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [section, setSection] = useState<Section>('programs');
  const [activeChapter, setActiveChapter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedExId, setExpandedExId] = useState<string | null>(null);
  const [hintsShown, setHintsShown] = useState<Set<string>>(new Set());
  const [exResults, setExResults] = useState<Record<string, string | null>>({});
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [refExpanded, setRefExpanded] = useState<Set<string>>(new Set());

  const paddingBottom = insets.bottom + BottomTabInset + Spacing.three;
  const topOffset = Platform.OS === 'web' ? 48 : insets.top;

  // Load persisted progress
  useEffect(() => {
    AsyncStorage.getItem(PROGRESS_KEY)
      .then(raw => {
        if (raw) setCompletedIds(new Set(JSON.parse(raw)));
      })
      .catch(() => {});
  }, []);

  const markCompleted = useCallback((id: string) => {
    setCompletedIds(prev => {
      const next = new Set(prev).add(id);
      AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  function loadProgram(code: string) {
    setProgram(code);
    router.navigate('/');
  }

  // ── Filtered programs ──
  const chapters = [...new Set(BOOK_PROGRAMS.map(p => p.chapter))].sort((a, b) => a - b);

  const filteredPrograms = BOOK_PROGRAMS.filter(p => {
    const matchChapter = activeChapter === null || p.chapter === activeChapter;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q || p.title.toLowerCase().includes(q) || p.concept.toLowerCase().includes(q);
    return matchChapter && matchSearch;
  });

  const completedExCount = EXERCISES.filter(e => completedIds.has(e.id)).length;

  return (
    <View style={[styles.root, { paddingTop: topOffset }]}>
      {/* ── Screen header ── */}
      <View style={styles.screenHeader}>
        <View style={styles.screenHeaderRow}>
          <View>
            <Text style={styles.screenTitle}>Learn</Text>
            <Text style={styles.screenSubtitle}>ARM Assembly</Text>
          </View>
          {completedExCount > 0 && (
            <View style={styles.progressPill}>
              <Text style={styles.progressPillText}>
                {completedExCount}/{EXERCISES.length} exercises done
              </Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressBarFill, { width: `${(completedExCount / EXERCISES.length) * 100}%` as any }]} />
              </View>
            </View>
          )}
        </View>
      </View>

      {/* ── Section tabs ── */}
      <View style={styles.sectionTabs}>
        {([
          { key: 'programs', label: 'Book Programs' },
          { key: 'exercises', label: `Exercises${completedExCount > 0 ? ` · ${completedExCount}/${EXERCISES.length}` : ''}` },
          { key: 'reference', label: 'Reference' },
        ] as { key: Section; label: string }[]).map(s => (
          <TouchableOpacity
            key={s.key}
            style={[styles.sectionTab, section === s.key && styles.sectionTabActive]}
            onPress={() => setSection(s.key)}
          >
            <Text style={[styles.sectionTabText, section === s.key && styles.sectionTabTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ══ Book Programs ══ */}
        {section === 'programs' && (
          <>
            {/* Search */}
            <View style={styles.searchRow}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search programs…"
                placeholderTextColor={c.textDim}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text style={styles.searchClear}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Chapter filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chapterFilter}>
              <TouchableOpacity
                style={[styles.chTab, activeChapter === null && styles.chTabActive]}
                onPress={() => setActiveChapter(null)}
              >
                <Text style={[styles.chTabText, activeChapter === null && styles.chTabTextActive]}>All</Text>
              </TouchableOpacity>
              {chapters.map(ch => {
                const active = activeChapter === ch;
                const color = CHAPTER_COLORS[ch];
                return (
                  <TouchableOpacity
                    key={ch}
                    style={[styles.chTab, active && { borderColor: color, backgroundColor: color + '22' }]}
                    onPress={() => setActiveChapter(active ? null : ch)}
                  >
                    <Text style={[styles.chTabText, active && { color }]}>Ch {ch}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {filteredPrograms.length === 0 && (
              <View style={styles.emptySearch}>
                <Text style={styles.emptySearchText}>No programs match "{searchQuery}"</Text>
              </View>
            )}

            {filteredPrograms.map(prog => {
              const color = CHAPTER_COLORS[prog.chapter] ?? '#8b949e';
              return (
                <TouchableOpacity
                  key={prog.id}
                  style={styles.card}
                  onPress={() => loadProgram(prog.code)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <View style={[styles.chBadge, { borderColor: color + '55' }]}>
                      <Text style={[styles.chBadgeText, { color }]}>Ch {prog.chapter}</Text>
                    </View>
                    <Text style={styles.cardTitle}>{prog.title}</Text>
                    <View style={styles.openBtn}>
                      <Text style={styles.openBtnText}>Open →</Text>
                    </View>
                  </View>
                  <Text style={styles.cardConcept}>{prog.concept}</Text>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* ══ Exercises ══ */}
        {section === 'exercises' && (
          <>
            <View style={styles.exHeaderRow}>
              <Text style={styles.sectionNote}>
                Load starter code → run → tap Check Answer
              </Text>
              <Text style={styles.progressText}>
                {completedExCount}/{EXERCISES.length} done
              </Text>
            </View>

            {EXERCISES.map(ex => {
              const isExpanded = expandedExId === ex.id;
              const hintVisible = hintsShown.has(ex.id);
              const completed = completedIds.has(ex.id);
              const color = CHAPTER_COLORS[ex.chapter] ?? '#8b949e';

              return (
                <View key={ex.id} style={[styles.card, completed && styles.cardCompleted]}>
                  <TouchableOpacity
                    style={styles.cardHeader}
                    onPress={() => setExpandedExId(isExpanded ? null : ex.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.chBadge, { borderColor: color + '55' }]}>
                      <Text style={[styles.chBadgeText, { color }]}>Ch {ex.chapter}</Text>
                    </View>
                    <Text style={styles.cardTitle}>{ex.title}</Text>
                    {completed
                      ? <View style={styles.doneBadge}><Text style={styles.doneBadgeText}>✓ Done</Text></View>
                      : <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
                    }
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.exBody}>
                      <Text style={styles.exDesc}>{ex.description}</Text>

                      {hintVisible ? (
                        <View style={styles.hintBox}>
                          <Text style={styles.hintLabel}>Hint</Text>
                          <Text style={styles.hintText}>{ex.hint}</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.hintBtn}
                          onPress={() => setHintsShown(prev => new Set(prev).add(ex.id))}
                        >
                          <Text style={styles.hintBtnText}>Show hint</Text>
                        </TouchableOpacity>
                      )}

                      <View style={styles.exActions}>
                        <TouchableOpacity style={styles.loadBtn} onPress={() => loadProgram(ex.starterCode)}>
                          <Text style={styles.loadBtnText}>Load starter →</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.checkBtn}
                          onPress={() => {
                            const failMsg = ex.check(registers);
                            setExResults(prev => ({ ...prev, [ex.id]: failMsg }));
                            if (failMsg === null) markCompleted(ex.id);
                          }}
                        >
                          <Text style={styles.checkBtnText}>Check Answer</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Result feedback */}
                      {exResults[ex.id] !== undefined && (
                        <View style={[
                          styles.resultBox,
                          exResults[ex.id] === null ? styles.resultPass : styles.resultFail,
                        ]}>
                          {exResults[ex.id] === null ? (
                            <View style={styles.resultPassRow}>
                              <Text style={styles.resultPassIcon}>✓</Text>
                              <Text style={styles.resultPassText}>{ex.successMsg}</Text>
                            </View>
                          ) : (
                            <>
                              <Text style={styles.resultFailTitle}>Not correct yet</Text>
                              <Text style={styles.resultFailMsg}>{exResults[ex.id]}</Text>
                            </>
                          )}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}

        {/* ══ Reference ══ */}
        {section === 'reference' && (
          <>
            <View style={{ height: 400, marginBottom: 8 }}>
              <CallingConventionViz />
            </View>

            {REF_CATEGORIES.map(cat => {
              const isOpen = refExpanded.has(cat.title);
              return (
                <View key={cat.title} style={styles.refSection}>
                  <TouchableOpacity
                    style={styles.refSectionHeader}
                    onPress={() => setRefExpanded(prev => {
                      const next = new Set(prev);
                      isOpen ? next.delete(cat.title) : next.add(cat.title);
                      return next;
                    })}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.refSectionTitle}>{cat.title}</Text>
                    <View style={styles.refCountBadge}>
                      <Text style={styles.refCountText}>{cat.instructions.length}</Text>
                    </View>
                    <Text style={styles.chevron}>{isOpen ? '▲' : '▼'}</Text>
                  </TouchableOpacity>

                  {isOpen && (
                    <View style={styles.refTable}>
                      {cat.instructions.map((instr, i) => (
                        <View
                          key={instr.syntax}
                          style={[styles.refRow, i % 2 === 1 && styles.refRowAlt]}
                        >
                          <Text style={styles.refSyntax}>{instr.syntax}</Text>
                          <Text style={styles.refDesc}>{instr.description}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(c: AppPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg0 },

    screenHeader: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: c.borderSubtle,
      backgroundColor: c.bg1,
    },
    screenHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    screenTitle: { color: c.text, fontSize: 20, fontWeight: '900', letterSpacing: 0.3 },
    screenSubtitle: { color: c.textDim, fontSize: 11, marginTop: 1 },

    progressPill: {
      backgroundColor: c.bg2,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 10,
      paddingVertical: 6,
      gap: 4,
      alignItems: 'flex-end',
    },
    progressPillText: { color: c.green, fontSize: 10, fontWeight: '700' },
    progressBar: {
      width: 80,
      height: 3,
      backgroundColor: c.borderSubtle,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressBarFill: { height: 3, backgroundColor: c.green, borderRadius: 2 },

    // Section tabs
    sectionTabs: {
      flexDirection: 'row',
      backgroundColor: c.bg1,
      borderBottomWidth: 1,
      borderBottomColor: c.borderSubtle,
    },
    sectionTab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
    sectionTabActive: { borderBottomWidth: 2, borderBottomColor: c.accent },
    sectionTabText: { color: c.textDim, fontSize: 11, fontWeight: '600' },
    sectionTabTextActive: { color: c.accent },

    scrollContent: { padding: 12, gap: 8 },

    // Search
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.bg2,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 10,
      gap: 6,
      marginBottom: 4,
    },
    searchIcon: { color: c.textDim, fontSize: 15 },
    searchInput: { flex: 1, color: c.textSec, fontSize: 12, paddingVertical: 8 },
    searchClear: { color: c.textDim, fontSize: 13, paddingHorizontal: 4 },

    emptySearch: { padding: 24, alignItems: 'center' },
    emptySearchText: { color: c.textDim, fontSize: 12 },

    // Chapter filter
    chapterFilter: { marginBottom: 4 },
    chTab: {
      marginRight: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bg2,
    },
    chTabActive: { borderColor: c.accentBorder, backgroundColor: c.accentBg },
    chTabText: { color: c.textMuted, fontSize: 12, fontWeight: '600' },
    chTabTextActive: { color: c.accent },

    // Cards
    card: {
      backgroundColor: c.bg2,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    cardCompleted: { borderColor: c.greenBorder },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      gap: 8,
    },
    chBadge: {
      borderWidth: 1,
      borderRadius: 5,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    chBadgeText: { fontSize: 10, fontWeight: '700' },
    cardTitle: { flex: 1, color: c.textSec, fontSize: 13, fontWeight: '600' },
    cardConcept: { color: c.textDim, fontSize: 11, paddingHorizontal: 12, paddingBottom: 10, marginTop: -4 },
    chevron: { color: c.textDim, fontSize: 11 },
    openBtn: {
      backgroundColor: c.accentBg,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: c.accentBorder,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    openBtnText: { color: c.accent, fontSize: 11, fontWeight: '700' },
    doneBadge: {
      backgroundColor: c.greenBg,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: c.greenBorder,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    doneBadgeText: { color: c.green, fontSize: 10, fontWeight: '700' },

    // Exercise body
    exHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    sectionNote: { color: c.textDim, fontSize: 11, fontStyle: 'italic' },
    progressText: { color: c.green, fontSize: 11, fontWeight: '700' },

    exBody: {
      paddingHorizontal: 12,
      paddingBottom: 12,
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: c.borderSubtle,
    },
    exDesc: { color: c.textBody, fontSize: 13, lineHeight: 19, marginTop: 10 },

    hintBox: {
      backgroundColor: c.amberBg,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: c.amberBorder,
      padding: 10,
      gap: 4,
    },
    hintLabel: { color: c.amber, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    hintText: { color: c.textBody, fontSize: 12, lineHeight: 18 },
    hintBtn: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: c.amberBorder,
      backgroundColor: c.amberBg,
    },
    hintBtnText: { color: c.amber, fontSize: 11, fontWeight: '700' },

    exActions: { flexDirection: 'row', gap: 8 },
    loadBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: c.accentBorder,
      backgroundColor: c.accentBg,
    },
    loadBtnText: { color: c.accent, fontSize: 12, fontWeight: '700' },
    checkBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: c.greenBorder,
      backgroundColor: c.greenBg,
      alignItems: 'center',
    },
    checkBtnText: { color: c.green, fontSize: 12, fontWeight: '700' },

    // Result feedback
    resultBox: { borderRadius: 6, borderWidth: 1, padding: 10 },
    resultPass: { backgroundColor: c.greenBg, borderColor: c.greenBorder },
    resultFail: { backgroundColor: c.redBg, borderColor: c.redBorder },
    resultPassRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    resultPassIcon: { color: c.green, fontSize: 18, fontWeight: '700' },
    resultPassText: { color: c.green, fontSize: 13, fontWeight: '700', flex: 1 },
    resultFailTitle: { color: c.red, fontSize: 11, fontWeight: '800', marginBottom: 4 },
    resultFailMsg: { color: c.textBody, fontSize: 12, lineHeight: 18 },

    // Reference
    refSection: {
      backgroundColor: c.bg2,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    refSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      gap: 8,
    },
    refSectionTitle: { flex: 1, color: c.textSec, fontSize: 13, fontWeight: '700' },
    refCountBadge: {
      backgroundColor: c.bg3,
      borderRadius: 10,
      paddingHorizontal: 7,
      paddingVertical: 1,
    },
    refCountText: { color: c.textDim, fontSize: 10, fontWeight: '700' },
    refTable: { borderTopWidth: 1, borderTopColor: c.borderSubtle },
    refRow: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 9,
      gap: 12,
      alignItems: 'flex-start',
    },
    refRowAlt: { backgroundColor: c.sep },
    refSyntax: { color: c.accentCode, fontSize: 11, fontFamily: 'monospace', fontWeight: '600', width: 158 },
    refDesc: { flex: 1, color: c.textMuted, fontSize: 11, lineHeight: 16 },
  });
}
