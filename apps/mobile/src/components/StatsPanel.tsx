import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAppTheme } from '@/hooks/use-theme';
import type { AppPalette } from '@/constants/theme';

interface TraceEntry {
  cycle: number; instruction: string; changedRegs: string[]; flagChanges: string[];
}

interface StatsPanelProps {
  cycle: number; traceLog: TraceEntry[]; registers: Record<string, number>;
}

function categorize(instr: string): string {
  const op = instr.trim().split(/\s+/)[0]?.toUpperCase() ?? '';
  if (['MOV', 'MVN'].includes(op)) return 'move';
  if (['ADD', 'SUB', 'SUBS', 'MUL', 'ADDS'].includes(op)) return 'arithmetic';
  if (['AND', 'ORR', 'EOR', 'LSL', 'LSR'].includes(op)) return 'bitwise';
  if (['CMP'].includes(op)) return 'compare';
  if (['B', 'BEQ', 'BNE', 'BGT', 'BLT', 'BGE', 'BLE', 'BL', 'BX'].includes(op)) return 'branch';
  if (['LDR', 'STR', 'PUSH', 'POP'].includes(op)) return 'memory';
  return 'other';
}

function makeStyles(c: AppPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg2, borderRadius: 8, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.bg1, borderBottomWidth: 1, borderBottomColor: c.border, paddingHorizontal: 12, paddingVertical: 10 },
    title: { color: c.text, fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
    subtitle: { color: c.textDim, fontSize: 10, fontFamily: 'monospace' },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
    emptyIcon: { color: c.border, fontSize: 26 },
    emptyTitle: { color: c.textDim, fontSize: 13, fontWeight: '600' },
    emptyHint: { color: c.textGhost, fontSize: 11 },
    content: { padding: 12, gap: 10 },
    sectionLabel: { color: c.textGhost, fontSize: 9, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
    metricsRow: { flexDirection: 'row', gap: 6 },
    metricCard: { flex: 1, backgroundColor: c.bg1, borderRadius: 7, borderWidth: 1, padding: 8, alignItems: 'center', gap: 2 },
    metricValue: { fontSize: 18, fontWeight: '800', fontFamily: 'monospace' },
    metricLabel: { color: c.textDim, fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    metricSub: { color: c.textGhost, fontSize: 8, textAlign: 'center' },
    mixBars: { gap: 5 },
    mixRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    mixLabel: { width: 68, fontSize: 10, fontWeight: '600' },
    mixBarTrack: { flex: 1, height: 6, backgroundColor: c.bg3, borderRadius: 3, overflow: 'hidden' },
    mixBarFill: { height: 6, borderRadius: 3 },
    mixCount: { color: c.textMuted, fontSize: 10, fontFamily: 'monospace', width: 22, textAlign: 'right' },
    mixPct: { color: c.textDim, fontSize: 10, fontFamily: 'monospace', width: 28, textAlign: 'right' },
    regActivityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    regActivityCell: { backgroundColor: c.bg1, borderRadius: 6, borderWidth: 1, borderColor: c.borderSubtle, paddingHorizontal: 10, paddingVertical: 5, alignItems: 'center', gap: 2 },
    regActivityName: { color: c.greenCode, fontSize: 11, fontWeight: '700', fontFamily: 'monospace' },
    regActivityCount: { color: c.textDim, fontSize: 9, fontFamily: 'monospace' },
    flagRow: { flexDirection: 'row', gap: 8 },
    flagCell: { flex: 1, backgroundColor: c.bg1, borderRadius: 6, borderWidth: 1, borderColor: c.borderSubtle, padding: 8, alignItems: 'center', gap: 2 },
    flagCellName: { color: c.purple, fontSize: 13, fontWeight: '800' },
    flagCellCount: { color: c.textDim, fontSize: 11, fontFamily: 'monospace' },
  });
}

function MetricCard({ label, value, color, sub, styles }: { label: string; value: string; color: string; sub?: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={[styles.metricCard, { borderColor: color + '40' }]}>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {sub && <Text style={styles.metricSub}>{sub}</Text>}
    </View>
  );
}

export default function StatsPanel({ cycle, traceLog, registers }: StatsPanelProps) {
  const c = useAppTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const CATEGORY_META: Record<string, { label: string; color: string }> = {
    move:       { label: 'Move',       color: c.purple },
    arithmetic: { label: 'Arithmetic', color: c.accent },
    bitwise:    { label: 'Bitwise',    color: c.purpleDark },
    compare:    { label: 'Compare',    color: c.amber },
    branch:     { label: 'Branch',     color: c.orange },
    memory:     { label: 'Memory',     color: c.cyan },
    other:      { label: 'Other',      color: c.textDim },
  };

  const retired = traceLog.filter(e => e.instruction !== '(bubble)').length;
  const cpi = retired > 0 ? (cycle / retired).toFixed(2) : '—';
  const ipc = retired > 0 && cycle > 0 ? (retired / cycle).toFixed(2) : '—';

  const mix: Record<string, number> = {};
  for (const entry of traceLog) {
    if (entry.instruction === '(bubble)') continue;
    const cat = categorize(entry.instruction);
    mix[cat] = (mix[cat] ?? 0) + 1;
  }
  const mixEntries = Object.entries(mix).sort((a, b) => b[1] - a[1]);

  const regActivity: Record<string, number> = {};
  for (const entry of traceLog) {
    for (const r of entry.changedRegs) {
      regActivity[r] = (regActivity[r] ?? 0) + 1;
    }
  }
  const topRegs = Object.entries(regActivity).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const flagActivity: Record<string, number> = {};
  for (const entry of traceLog) {
    for (const f of entry.flagChanges) {
      flagActivity[f] = (flagActivity[f] ?? 0) + 1;
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Execution Stats</Text>
        {cycle > 0 && <Text style={styles.subtitle}>{cycle} cycles · {retired} instructions</Text>}
      </View>

      {cycle === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>◎</Text>
          <Text style={styles.emptyTitle}>No data yet</Text>
          <Text style={styles.emptyHint}>Run the simulator to see stats</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionLabel}>PERFORMANCE</Text>
          <View style={styles.metricsRow}>
            <MetricCard label="Cycles"  value={String(cycle)}   color={c.accent} styles={styles} />
            <MetricCard label="Retired" value={String(retired)} color={c.green}  styles={styles} />
            <MetricCard label="CPI"     value={cpi}             color={c.amber}  sub="cycles per instr" styles={styles} />
            <MetricCard label="IPC"     value={ipc}             color={c.purple} sub="instrs per cycle" styles={styles} />
          </View>

          {mixEntries.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>INSTRUCTION MIX</Text>
              <View style={styles.mixBars}>
                {mixEntries.map(([cat, count]) => {
                  const meta = CATEGORY_META[cat] ?? CATEGORY_META.other;
                  const pct = retired > 0 ? (count / retired) * 100 : 0;
                  return (
                    <View key={cat} style={styles.mixRow}>
                      <Text style={[styles.mixLabel, { color: meta.color }]}>{meta.label}</Text>
                      <View style={styles.mixBarTrack}>
                        <View style={[styles.mixBarFill, { width: `${pct}%` as any, backgroundColor: meta.color + '55' }]} />
                      </View>
                      <Text style={styles.mixCount}>{count}</Text>
                      <Text style={styles.mixPct}>{pct.toFixed(0)}%</Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {topRegs.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>MOST CHANGED REGISTERS</Text>
              <View style={styles.regActivityRow}>
                {topRegs.map(([reg, count]) => (
                  <View key={reg} style={styles.regActivityCell}>
                    <Text style={styles.regActivityName}>{reg}</Text>
                    <Text style={styles.regActivityCount}>{count}×</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {Object.keys(flagActivity).length > 0 && (
            <>
              <Text style={styles.sectionLabel}>FLAG CHANGES</Text>
              <View style={styles.flagRow}>
                {(['N', 'Z', 'C', 'V'] as const).map(f => (
                  <View key={f} style={styles.flagCell}>
                    <Text style={styles.flagCellName}>{f}</Text>
                    <Text style={styles.flagCellCount}>{flagActivity[f] ?? 0}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}
