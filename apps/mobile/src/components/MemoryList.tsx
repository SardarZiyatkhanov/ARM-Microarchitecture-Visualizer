import React, { memo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';

interface MemoryEntry {
  address: string;
  value: string;
}

// Formatter to match web app
const formatVal = (val: number) => '0x' + val.toString(16).toUpperCase().padStart(4, '0');

// Memoize bounds rendering calls per item
const MemoryRow = memo(({ item }: { item: MemoryEntry }) => {
  return (
    <View style={styles.row}>
      <Text style={styles.address}>{item.address}</Text>
      <Text style={styles.value}>{item.value}</Text>
    </View>
  );
});

interface MemoryListProps {
  memory?: Record<number, number>;
}

export default function MemoryList({ memory }: MemoryListProps) {
  // Convert strictly active allocated dictionary addresses
  const memoryArray: MemoryEntry[] = memory 
    ? Object.entries(memory)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .map(([addr, val]) => ({
          address: '0x' + parseInt(addr).toString(16).toUpperCase().padStart(4, '0'),
          value: formatVal(val),
        }))
    : [];

  // TODO: Add support for scrolling smoothly through non-modified memory bounds 
  // like the web app might do, rather than just showing active keys.

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Memory Dump</Text>
      </View>
      
      {/* Table Header */}
      <View style={styles.header}>
        <Text style={styles.headerCell}>Address</Text>
        <Text style={[styles.headerCell, { textAlign: 'right' }]}>Value</Text>
      </View>

      <FlatList
        data={memoryArray}
        keyExtractor={(item) => item.address}
        renderItem={({ item }) => <MemoryRow item={item} />}
        initialNumToRender={30}
        maxToRenderPerBatch={30}
        windowSize={5}
        removeClippedSubviews={true} // Off-loads offscreen rows
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
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  headerCell: {
    color: '#8b949e',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  address: {
    color: '#c9d1d9',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  value: {
    color: '#7ee787', // Distinct green for values similar to web app
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
});
