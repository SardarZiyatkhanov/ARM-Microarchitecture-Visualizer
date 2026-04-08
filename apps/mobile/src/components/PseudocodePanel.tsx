import React, { useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAppTheme } from '@/hooks/use-theme';
import type { AppPalette } from '@/constants/theme';

// ── Translator ────────────────────────────────────────────────────────────────

function toPseudocode(line: string): string {
  const t = line.trim();
  let m: RegExpMatchArray | null;

  // MOV
  m = t.match(/^MOV\s+(\w+),\s*#(-?\w+)$/i);
  if (m) return `${m[1]} = ${m[2]}`;
  m = t.match(/^MOV\s+(\w+),\s*(\w+)$/i);
  if (m) return `${m[1]} = ${m[2]}`;

  // Arithmetic
  m = t.match(/^ADDS?\s+(\w+),\s*(\w+),\s*(\w+)$/i);
  if (m) return `${m[1]} = ${m[2]} + ${m[3]}`;
  m = t.match(/^ADDS?\s+(\w+),\s*(\w+),\s*#(-?\w+)$/i);
  if (m) return `${m[1]} = ${m[2]} + ${m[3]}`;
  m = t.match(/^SUBS\s+(\w+),\s*(\w+),\s*#(-?\w+)$/i);
  if (m) return `${m[1]} = ${m[2]} \u2212 ${m[3]}; flags`;
  m = t.match(/^SUBS\s+(\w+),\s*(\w+),\s*(\w+)$/i);
  if (m) return `${m[1]} = ${m[2]} \u2212 ${m[3]}; flags`;
  m = t.match(/^SUB\s+(\w+),\s*(\w+),\s*(\w+)$/i);
  if (m) return `${m[1]} = ${m[2]} \u2212 ${m[3]}`;
  m = t.match(/^SUB\s+(\w+),\s*(\w+),\s*#(-?\w+)$/i);
  if (m) return `${m[1]} = ${m[2]} \u2212 ${m[3]}`;
  m = t.match(/^MUL\s+(\w+),\s*(\w+),\s*(\w+)$/i);
  if (m) return `${m[1]} = ${m[2]} \u00d7 ${m[3]}`;

  // Bitwise
  m = t.match(/^AND\s+(\w+),\s*(\w+),\s*(\w+)$/i);
  if (m) return `${m[1]} = ${m[2]} & ${m[3]}`;
  m = t.match(/^AND\s+(\w+),\s*(\w+),\s*#(-?\w+)$/i);
  if (m) return `${m[1]} = ${m[2]} & ${m[3]}`;
  m = t.match(/^ORR\s+(\w+),\s*(\w+),\s*(\w+)$/i);
  if (m) return `${m[1]} = ${m[2]} | ${m[3]}`;
  m = t.match(/^ORR\s+(\w+),\s*(\w+),\s*#(-?\w+)$/i);
  if (m) return `${m[1]} = ${m[2]} | ${m[3]}`;
  m = t.match(/^EOR\s+(\w+),\s*(\w+),\s*(\w+)$/i);
  if (m) return `${m[1]} = ${m[2]} ^ ${m[3]}`;
  m = t.match(/^EOR\s+(\w+),\s*(\w+),\s*#(-?\w+)$/i);
  if (m) return `${m[1]} = ${m[2]} ^ ${m[3]}`;
  m = t.match(/^LSL\s+(\w+),\s*(\w+),\s*#(-?\w+)$/i);
  if (m) return `${m[1]} = ${m[2]} << ${m[3]}  \u00d7 2\u207f`;
  m = t.match(/^LSL\s+(\w+),\s*(\w+),\s*(\w+)$/i);
  if (m) return `${m[1]} = ${m[2]} << ${m[3]}`;
  m = t.match(/^LSR\s+(\w+),\s*(\w+),\s*#(-?\w+)$/i);
  if (m) return `${m[1]} = ${m[2]} >> ${m[3]}  \u00f72\u207f`;
  m = t.match(/^LSR\s+(\w+),\s*(\w+),\s*(\w+)$/i);
  if (m) return `${m[1]} = ${m[2]} >> ${m[3]}`;

  // Compare
  m = t.match(/^CMP\s+(\w+),\s*(\w+)$/i);
  if (m) return `flags \u2190 ${m[1]} \u2212 ${m[2]}`;
  m = t.match(/^CMP\s+(\w+),\s*#(-?\w+)$/i);
  if (m) return `flags \u2190 ${m[1]} \u2212 ${m[2]}`;

  // Branches
  if (/^BX\s+LR$/i.test(t)) return 'return  // PC \u2190 LR';
  m = t.match(/^BL\s+(\S+)$/i);
  if (m) return `call ${m[1]}  // LR \u2190 PC+4`;
  m = t.match(/^BEQ\s+(\S+)$/i); if (m) return `if Z goto ${m[1]}`;
  m = t.match(/^BNE\s+(\S+)$/i); if (m) return `if !Z goto ${m[1]}`;
  m = t.match(/^BGT\s+(\S+)$/i); if (m) return `if !Z\u2227N=V goto ${m[1]}`;
  m = t.match(/^BLT\s+(\S+)$/i); if (m) return `if N\u2260V goto ${m[1]}`;
  m = t.match(/^BGE\s+(\S+)$/i); if (m) return `if N=V goto ${m[1]}`;
  m = t.match(/^BLE\s+(\S+)$/i); if (m) return `if Z\u2228N\u2260V goto ${m[1]}`;
  m = t.match(/^B\s+(\S+)$/i);   if (m) return `goto ${m[1]}`;

  // LDR
  m = t.match(/^LDR\s+(\w+),\s*\[(\w+),\s*#(-?\w+)\]!$/i);
  if (m) return `${m[2]} += ${m[3]}; ${m[1]} = mem[${m[2]}]`;
  m = t.match(/^LDR\s+(\w+),\s*\[(\w+)\],\s*#(-?\w+)$/i);
  if (m) return `${m[1]} = mem[${m[2]}]; ${m[2]} += ${m[3]}`;
  m = t.match(/^LDR\s+(\w+),\s*\[(\w+),\s*#(-?\w+)\]$/i);
  if (m) return `${m[1]} = mem[${m[2]} + ${m[3]}]`;
  m = t.match(/^LDR\s+(\w+),\s*\[(\w+)\]$/i);
  if (m) return `${m[1]} = mem[${m[2]}]`;

  // STR
  m = t.match(/^STR\s+(\w+),\s*\[(\w+),\s*#(-?\w+)\]!$/i);
  if (m) return `${m[2]} += ${m[3]}; mem[${m[2]}] = ${m[1]}`;
  m = t.match(/^STR\s+(\w+),\s*\[(\w+)\],\s*#(-?\w+)$/i);
  if (m) return `mem[${m[2]}] = ${m[1]}; ${m[2]} += ${m[3]}`;
  m = t.match(/^STR\s+(\w+),\s*\[(\w+),\s*#(-?\w+)\]$/i);
  if (m) return `mem[${m[2]} + ${m[3]}] = ${m[1]}`;
  m = t.match(/^STR\s+(\w+),\s*\[(\w+)\]$/i);
  if (m) return `mem[${m[2]}] = ${m[1]}`;

  // Stack
  m = t.match(/^PUSH\s+\{([^}]+)\}$/i);
  if (m) return `SP \u2212= 4; mem[SP] = {${m[1].trim()}}`;
  m = t.match(/^POP\s+\{([^}]+)\}$/i);
  if (m) return `{${m[1].trim()}} = mem[SP]; SP += 4`;

  return '';
}

// ── Row builder ───────────────────────────────────────────────────────────────

interface Row {
  kind: 'blank' | 'label' | 'instr';
  asm: string;
  pseudo: string;
  sourceLine: number;
}

const ROW_HEIGHT = 32;

function buildRows(code: string): Row[] {
  const lines = code.split('\n');
  const rows: Row[] = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === '') {
      rows.push({ kind: 'blank', asm: '', pseudo: '', sourceLine: i });
      continue;
    }
    if (/^\w+:$/.test(t)) {
      rows.push({ kind: 'label', asm: t, pseudo: '', sourceLine: i });
      continue;
    }
    const withoutLabel = t.replace(/^\w+:\s*/, '');
    if (withoutLabel === '' || withoutLabel.startsWith(';')) continue;
    rows.push({ kind: 'instr', asm: withoutLabel, pseudo: toPseudocode(withoutLabel), sourceLine: i });
  }
  return rows;
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(c: AppPalette) {
  return StyleSheet.create({
    container: {
      flex: 1, backgroundColor: c.bg2, borderRadius: 8,
      borderWidth: 1, borderColor: c.border, overflow: 'hidden',
    },
    titleRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: c.bg1, borderBottomWidth: 1, borderColor: c.border,
      paddingHorizontal: 12, paddingVertical: 10,
    },
    title: { color: c.text, fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
    subtitle: { color: c.textDim, fontSize: 10, fontStyle: 'italic' },
    scroll: { flex: 1 },
    scrollContent: { paddingVertical: 4 },
    blankRow: { height: ROW_HEIGHT / 2 },
    row: { height: ROW_HEIGHT, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
    labelRow: {},
    labelText: { color: c.amber, fontSize: 11, fontFamily: 'monospace', fontWeight: '700' },
    instrRow: {},
    instrRowActive: { backgroundColor: c.accentFaint, borderLeftWidth: 2.5, borderLeftColor: c.accent },
    asmText: { color: c.accentCode, fontSize: 11, fontFamily: 'monospace', width: 136 },
    asmTextActive: { color: c.accentLight, fontWeight: '700' },
    arrow: { color: c.textGhost, fontSize: 11 },
    arrowActive: { color: c.accent },
    pseudoText: { flex: 1, color: c.textDim, fontSize: 11, fontFamily: 'monospace' },
    pseudoTextActive: { color: c.textSec },
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

interface PseudocodePanelProps {
  code: string;
  executingLine: number;
}

export default function PseudocodePanel({ code, executingLine }: PseudocodePanelProps) {
  const c = useAppTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const rows = useMemo(() => buildRows(code), [code]);
  const activeLine0 = executingLine >= 1 ? executingLine - 1 : -1;
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (activeLine0 < 0) return;
    const rowIndex = rows.findIndex(r => r.sourceLine === activeLine0);
    if (rowIndex < 0) return;
    const y = rowIndex * ROW_HEIGHT;
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - ROW_HEIGHT * 2), animated: true });
    }, 80);
    return () => clearTimeout(t);
  }, [activeLine0, rows]);

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Pseudocode</Text>
        <Text style={styles.subtitle}>ARM → readable</Text>
      </View>

      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {rows.map((row, i) => {
          if (row.kind === 'blank') return <View key={i} style={styles.blankRow} />;

          if (row.kind === 'label') return (
            <View key={i} style={[styles.row, styles.labelRow]}>
              <Text style={styles.labelText}>{row.asm}</Text>
            </View>
          );

          const isActive = row.sourceLine === activeLine0;
          return (
            <View key={i} style={[styles.row, styles.instrRow, isActive && styles.instrRowActive]}>
              <Text style={[styles.asmText, isActive && styles.asmTextActive]} numberOfLines={1}>
                {row.asm}
              </Text>
              {row.pseudo !== '' && (
                <>
                  <Text style={[styles.arrow, isActive && styles.arrowActive]}>→</Text>
                  <Text style={[styles.pseudoText, isActive && styles.pseudoTextActive]} numberOfLines={1}>
                    {row.pseudo}
                  </Text>
                </>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
