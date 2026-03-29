import React, { memo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import type { TLBState } from '@playarm/core';

interface TLBEntryWithIndex {
  index: number;
  valid: boolean;
  vpn: number;
  pfn: number;
  dirty: boolean;
  lastUsed: number;
}

// Memoize row component to eliminate rerenders on scrolling
const TLBRow = memo(({ item }: { item: TLBEntryWithIndex }) => {
  return (
    <View style={styles.row}>
      <Text style={styles.cell}>{item.index}</Text>
      <Text style={[styles.cell, { color: item.valid ? '#22c55e' : '#475569', fontWeight: 'bold' }]}>
        {item.valid ? '1' : '0'}
      </Text>
      <Text style={[styles.cell, { flex: 2, color: item.valid ? '#818cf8' : '#c9d1d9' }]}>
        {item.valid ? '0x' + item.vpn.toString(16).toUpperCase() : '—'}
      </Text>
      <Text style={[styles.cell, { flex: 2, color: item.valid ? '#38bdf8' : '#c9d1d9' }]}>
        {item.valid ? '0x' + item.pfn.toString(16).toUpperCase() : '—'}
      </Text>
      <Text style={[styles.cell, { color: item.valid ? (item.dirty ? '#f97316' : '#64748b') : '#c9d1d9' }]}>
        {item.valid ? (item.dirty ? '1' : '0') : '—'}
      </Text>
    </View>
  );
});

interface TLBListProps {
  tlbState?: TLBState;
}

export default function TLBList({ tlbState }: TLBListProps) {
  // Map core TLB entries to have an index for FlatList
  const entries: TLBEntryWithIndex[] = (tlbState?.entries || []).map((e, index) => ({
    ...e,
    index,
  }));

  // TODO: Add support for showing hits, misses, and the recent access log
  // similar to the web TLBVisualizer.

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>TLB Entries & Virtual Memory</Text>
      </View>
      
      {/* Table Header */}
      <View style={styles.header}>
        <Text style={styles.headerCell}>#</Text>
        <Text style={styles.headerCell}>V</Text>
        <Text style={[styles.headerCell, { flex: 2 }]}>VPN</Text>
        <Text style={[styles.headerCell, { flex: 2 }]}>PFN</Text>
        <Text style={styles.headerCell}>D</Text>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.index.toString()}
        renderItem={({ item }) => <TLBRow item={item} />}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={5}
        removeClippedSubviews={true} // Performance boost
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#161b22',
    borderRadius: 8,
    borderColor: '#30363d',
    borderWidth: 1,
    overflow: 'hidden',
  },
  titleContainer: {
    backgroundColor: '#0d1117',
    borderBottomWidth: 1,
    borderColor: '#30363d',
    padding: 12,
  },
  title: {
    color: '#f0f6fc',
    fontWeight: 'bold',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#30363d',
    backgroundColor: '#0a0c10',
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  headerCell: {
    flex: 1,
    color: '#8b949e',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  cell: {
    flex: 1,
    color: '#c9d1d9',
    fontSize: 13,
    fontFamily: 'monospace',
  },
});
