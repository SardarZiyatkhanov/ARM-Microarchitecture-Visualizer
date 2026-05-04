import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useAppTheme } from '@/hooks/use-theme';
import type { AppPalette } from '@/constants/theme';

interface StackEntry {
  address: string;
  value: string;
  isSP: boolean;
}

interface StackPanelProps {
  memory?: Record<number, number>;
  registers?: Record<string, number>;
}

// Initial SP from INITIAL_REGISTERS is 1024, so STACK_BASE is one word below it.
// The loop runs from current SP up to STACK_BASE, showing only pushed entries.
const INITIAL_SP = 1024;
const STACK_BASE = INITIAL_SP - 4; // 1020
const MAX_STACK_ENTRIES = 32;

function makeStyles(c: AppPalette) {
  return StyleSheet.create({
    container: {
      flex: 1, backgroundColor: c.bg2, borderRadius: 8,
      borderColor: c.border, borderWidth: 1, overflow: 'hidden',
    },
    titleRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: c.bg1, borderBottomWidth: 1, borderColor: c.border,
      paddingHorizontal: 12, paddingVertical: 10,
    },
    title: { color: c.text, fontWeight: 'bold', fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
    spBadge: { color: c.purple, fontSize: 11, fontFamily: 'monospace', fontWeight: '600' },
    header: {
      flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8,
      borderBottomWidth: 1, borderColor: c.border, backgroundColor: c.bg0, justifyContent: 'space-between',
    },
    headerCell: { color: c.textMuted, fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
    growLabel: {
      paddingHorizontal: 16, paddingVertical: 4,
      borderBottomWidth: 1, borderBottomColor: c.purpleBg,
      backgroundColor: c.purpleBg,
    },
    growText: { color: c.purple + '80', fontSize: 10, fontStyle: 'italic' },
    row: {
      flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 9,
      alignItems: 'center', justifyContent: 'space-between',
    },
    rowSP: { backgroundColor: c.purpleBg, borderLeftWidth: 3, borderLeftColor: c.purple },
    addrCell: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    spArrow: { color: c.purple, fontSize: 10, fontWeight: '700', fontFamily: 'monospace' },
    addr: { color: c.textBody, fontSize: 13, fontFamily: 'monospace' },
    addrSP: { color: c.purple, fontWeight: '700' },
    value: { color: c.greenCode, fontSize: 13, fontFamily: 'monospace', fontWeight: '600' },
    valueSP: { color: c.accentLight },
    separator: { height: 1, backgroundColor: c.sep },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 6 },
    emptyText: { color: c.textDim, fontSize: 13, fontWeight: '600' },
    emptyHint: { color: c.textGhost, fontSize: 11, textAlign: 'center', fontFamily: 'monospace' },
  });
}

export default function StackPanel({ memory = {}, registers = {} }: StackPanelProps) {
  const c = useAppTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const sp = registers['SP'] ?? STACK_BASE + 4;

  const entries: StackEntry[] = [];
  for (let addr = sp; addr <= STACK_BASE && entries.length < MAX_STACK_ENTRIES; addr += 4) {
    const value = memory[addr] ?? 0;
    entries.push({
      address: '0x' + addr.toString(16).toUpperCase().padStart(4, '0'),
      value: '0x' + (value >>> 0).toString(16).toUpperCase().padStart(8, '0'),
      isSP: addr === sp,
    });
  }

  const isEmpty = entries.length === 0 || (entries.length === 1 && entries[0].address === '0x' + (STACK_BASE + 4).toString(16).toUpperCase().padStart(4, '0'));

  const StackRow = memo(({ item }: { item: StackEntry }) => (
    <View style={[styles.row, item.isSP && styles.rowSP]}>
      <View style={styles.addrCell}>
        {item.isSP && <Text style={styles.spArrow}>SP →</Text>}
        <Text style={[styles.addr, item.isSP && styles.addrSP]}>{item.address}</Text>
      </View>
      <Text style={[styles.value, item.isSP && styles.valueSP]}>{item.value}</Text>
    </View>
  ));

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Stack</Text>
        <Text style={styles.spBadge}>SP = 0x{sp.toString(16).toUpperCase().padStart(4, '0')}</Text>
      </View>

      <View style={styles.header}>
        <Text style={styles.headerCell}>Address</Text>
        <Text style={[styles.headerCell, { textAlign: 'right' }]}>Value</Text>
      </View>

      <View style={styles.growLabel}>
        <Text style={styles.growText}>↓ grows downward</Text>
      </View>

      {isEmpty ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Stack is empty</Text>
          <Text style={styles.emptyHint}>Use PUSH or STR [SP, #-4]! to push values</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.address}
          renderItem={({ item }) => <StackRow item={item} />}
          initialNumToRender={20}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}
