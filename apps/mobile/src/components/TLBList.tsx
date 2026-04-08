import React, { memo, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import type { TLBState } from '@playarm/core';
import { useAppTheme } from '@/hooks/use-theme';
import type { AppPalette } from '@/constants/theme';

interface TLBEntryWithIndex {
  index: number; valid: boolean; vpn: number; pfn: number; dirty: boolean; lastUsed: number;
}

function makeStyles(c: AppPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg2, borderRadius: 8, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
    header: { backgroundColor: c.bg1, borderBottomWidth: 1, borderBottomColor: c.border },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 },
    title: { color: c.text, fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
    glossaryBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5, borderWidth: 1, borderColor: c.border, backgroundColor: c.bg2 },
    glossaryBtnActive: { borderColor: c.accentBorder, backgroundColor: c.accentBg },
    glossaryBtnText: { color: c.textDim, fontSize: 10, fontWeight: '700' },
    glossaryBtnTextActive: { color: c.accent },
    statsRow: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 8, gap: 6 },
    pill: { flex: 1, alignItems: 'center', backgroundColor: c.bg2, borderRadius: 6, borderWidth: 1, borderColor: c.border, paddingVertical: 5 },
    pillValue: { fontSize: 12, fontWeight: '700', fontFamily: 'monospace' },
    pillLabel: { color: c.textDim, fontSize: 8, fontWeight: '700', letterSpacing: 0.4, marginTop: 1 },
    hitRateBarTrack: {
      marginHorizontal: 12, marginBottom: 8, height: 18, backgroundColor: c.bg2,
      borderRadius: 4, overflow: 'hidden', borderWidth: 1, borderColor: c.border, justifyContent: 'center',
    },
    hitRateBarFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4 },
    barGood: { backgroundColor: c.greenBg },
    barFair: { backgroundColor: c.amberBg },
    barPoor: { backgroundColor: c.redBg },
    hitRateBarLabel: { color: c.textDim, fontSize: 9, textAlign: 'center', fontStyle: 'italic' },
    glossary: { marginHorizontal: 12, marginBottom: 10, backgroundColor: c.bg2, borderRadius: 7, borderWidth: 1, borderColor: c.border, padding: 10, gap: 6 },
    glossaryTitle: { color: c.textSec, fontSize: 11, fontWeight: '700' },
    glossaryText: { color: c.textMuted, fontSize: 10, lineHeight: 15 },
    glossaryGrid: { gap: 3 },
    glossaryRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
    glossaryTerm: { color: c.textBody, fontSize: 10, fontWeight: '700', fontFamily: 'monospace', width: 72 },
    glossaryDef: { flex: 1, color: c.textMuted, fontSize: 10, lineHeight: 14 },
    dirtyWarning: { backgroundColor: c.orangeBg, borderRadius: 5, borderWidth: 1, borderColor: c.orangeBorder, padding: 6 },
    dirtyWarningText: { color: c.orange, fontSize: 10 },
    colHeader: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 6, borderTopWidth: 1, borderTopColor: c.borderSubtle, gap: 0 },
    colHeaderText: { color: c.textDim, fontSize: 9, fontWeight: '800', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 0.5 },
    colHeaderWide: { flex: 1 },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, gap: 0 },
    rowInvalid: { opacity: 0.45 },
    cellIdx: { color: c.textDim, fontSize: 10, fontFamily: 'monospace', width: 24 },
    cell: { fontSize: 11, fontFamily: 'monospace', width: 24 },
    cellWide: { flex: 1 },
    sep: { height: 1, backgroundColor: c.sep },
  });
}

interface TLBListProps { tlbState?: TLBState }

export default function TLBList({ tlbState }: TLBListProps) {
  const c = useAppTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [glossaryOpen, setGlossaryOpen] = useState(false);

  const entries: TLBEntryWithIndex[] = (tlbState?.entries || []).map((e, i) => ({ ...e, index: i }));
  const hitCount  = tlbState?.hitCount  ?? 0;
  const missCount = tlbState?.missCount ?? 0;
  const total = hitCount + missCount;
  const hitRate = total > 0 ? (hitCount / total) * 100 : -1;
  const hitRateStr = hitRate >= 0 ? hitRate.toFixed(1) + '%' : '—';
  const validCount = entries.filter(e => e.valid).length;
  const dirtyCount = entries.filter(e => e.valid && e.dirty).length;

  const TLBRow = memo(({ item }: { item: TLBEntryWithIndex }) => (
    <View style={[styles.row, !item.valid && styles.rowInvalid]}>
      <Text style={styles.cellIdx}>{item.index}</Text>
      <Text style={[styles.cell, { color: item.valid ? c.green : c.textGhost, fontWeight: '700' }]}>
        {item.valid ? '1' : '0'}
      </Text>
      <Text style={[styles.cell, styles.cellWide, { color: item.valid ? c.purple : c.textGhost }]}>
        {item.valid ? '0x' + item.vpn.toString(16).toUpperCase().padStart(4, '0') : '—'}
      </Text>
      <Text style={[styles.cell, styles.cellWide, { color: item.valid ? c.cyan : c.textGhost }]}>
        {item.valid ? '0x' + item.pfn.toString(16).toUpperCase().padStart(4, '0') : '—'}
      </Text>
      <Text style={[styles.cell, { color: item.valid ? (item.dirty ? c.orange : c.textDim) : c.textGhost }]}>
        {item.valid ? (item.dirty ? '✦' : '○') : '—'}
      </Text>
    </View>
  ));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>TLB</Text>
          <TouchableOpacity style={[styles.glossaryBtn, glossaryOpen && styles.glossaryBtnActive]} onPress={() => setGlossaryOpen(v => !v)}>
            <Text style={[styles.glossaryBtnText, glossaryOpen && styles.glossaryBtnTextActive]}>
              {glossaryOpen ? '▲ hide' : '? guide'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <StatPill label="Hits" value={String(hitCount)} color={c.green} styles={styles} />
          <StatPill label="Misses" value={String(missCount)} color={c.orange} styles={styles} />
          <StatPill label="Hit Rate" value={hitRateStr} styles={styles}
            color={hitRate < 0 ? c.textDim : hitRate >= 70 ? c.green : hitRate >= 40 ? c.amber : c.red} />
          <StatPill label="Entries" value={`${validCount}/${entries.length}`} color={c.textMuted} styles={styles} />
        </View>

        {hitRate >= 0 && (
          <View style={styles.hitRateBarTrack}>
            <View style={[styles.hitRateBarFill, { width: `${hitRate}%` as any },
              hitRate >= 70 ? styles.barGood : hitRate >= 40 ? styles.barFair : styles.barPoor]} />
            <Text style={styles.hitRateBarLabel}>
              {hitRate >= 70 ? 'Good cache performance' : hitRate >= 40 ? 'Moderate — some page misses' : 'Poor — frequent misses'}
            </Text>
          </View>
        )}

        {glossaryOpen && (
          <View style={styles.glossary}>
            <Text style={styles.glossaryTitle}>What is the TLB?</Text>
            <Text style={styles.glossaryText}>
              The Translation Lookaside Buffer (TLB) is a hardware cache that speeds up virtual-to-physical address translation. Instead of walking the page table every time, the CPU checks the TLB first.
            </Text>
            <View style={styles.glossaryGrid}>
              <GlossaryRow term="V (Valid)" def="1 = entry is active; 0 = empty slot" styles={styles} />
              <GlossaryRow term="VPN" def="Virtual Page Number — the page address your program uses" color={c.purple} styles={styles} />
              <GlossaryRow term="PFN" def="Physical Frame Number — the real memory location" color={c.cyan} styles={styles} />
              <GlossaryRow term="D (Dirty)" def="✦ = page was written; must be saved before eviction" color={c.orange} styles={styles} />
              <GlossaryRow term="Hit" def="TLB had the translation — fast path (1 cycle)" color={c.green} styles={styles} />
              <GlossaryRow term="Miss" def="TLB lacked the translation — page table walk needed" color={c.orange} styles={styles} />
            </View>
            {dirtyCount > 0 && (
              <View style={styles.dirtyWarning}>
                <Text style={styles.dirtyWarningText}>
                  ⚠ {dirtyCount} dirty page{dirtyCount > 1 ? 's' : ''} — eviction would require writeback to memory
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.colHeader}>
          <Text style={[styles.colHeaderText, { width: 24 }]}>#</Text>
          <Text style={[styles.colHeaderText, { width: 24 }]}>V</Text>
          <Text style={[styles.colHeaderText, styles.colHeaderWide]}>VPN</Text>
          <Text style={[styles.colHeaderText, styles.colHeaderWide]}>PFN</Text>
          <Text style={[styles.colHeaderText, { width: 28 }]}>D</Text>
        </View>
      </View>

      <FlatList
        data={entries}
        keyExtractor={e => e.index.toString()}
        renderItem={({ item }) => <TLBRow item={item} />}
        initialNumToRender={16} maxToRenderPerBatch={16} windowSize={3} removeClippedSubviews
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </View>
  );
}

function StatPill({ label, value, color, styles }: { label: string; value: string; color: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.pill}>
      <Text style={[styles.pillValue, { color }]}>{value}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

function GlossaryRow({ term, def, color, styles }: { term: string; def: string; color?: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.glossaryRow}>
      <Text style={[styles.glossaryTerm, color ? { color } : {}]}>{term}</Text>
      <Text style={styles.glossaryDef}>{def}</Text>
    </View>
  );
}
