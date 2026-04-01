import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Flags } from '@playarm/core';

// Registers keyed as SP/LR/PC are special (they already have alias names)
const SPECIAL_REGS = new Set(['SP', 'LR', 'PC']);

interface RegisterGridProps {
  registers: Record<string, number>;
  flags: Flags;
}

export default function RegisterGrid({ registers, flags }: RegisterGridProps) {
  const entries = Object.entries(registers) as [string, number][];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Registers &amp; Flags</Text>
      </View>

      {/* Flags row */}
      <View style={styles.flagsRow}>
        <FlagBadge label="N" value={flags.N} />
        <FlagBadge label="Z" value={flags.Z} />
        <FlagBadge label="C" value={flags.C} />
        <FlagBadge label="V" value={flags.V} />
      </View>

      {/* Register grid — 4 columns */}
      <View style={styles.grid}>
        {entries.map(([key, val]) => {
          const label = key;
          const isSpecial = SPECIAL_REGS.has(key);
          return (
            <View key={key} style={[styles.regCell, isSpecial && styles.regCellSpecial]}>
              <Text style={[styles.regLabel, isSpecial && styles.regLabelSpecial]}>{label}</Text>
              <Text style={styles.regValue}>
                {val < 0
                  ? '-0x' + Math.abs(val).toString(16).toUpperCase().padStart(4, '0')
                  : '0x' + val.toString(16).toUpperCase().padStart(4, '0')}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const FlagBadge: React.FC<{ label: string; value: boolean }> = ({ label, value }) => (
  <View style={[styles.flagBadge, value && styles.flagBadgeActive]}>
    <Text style={[styles.flagLabel, value && styles.flagLabelActive]}>{label}</Text>
    <Text style={[styles.flagValue, value && styles.flagValueActive]}>{value ? '1' : '0'}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#161b22',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#30363d',
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
  flagsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#21262d',
    backgroundColor: '#0d1117',
  },
  flagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#30363d',
    backgroundColor: '#161b22',
  },
  flagBadgeActive: {
    borderColor: 'rgba(47,129,247,0.5)',
    backgroundColor: 'rgba(47,129,247,0.12)',
  },
  flagLabel: {
    color: '#8b949e',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  flagLabelActive: {
    color: '#2f81f7',
  },
  flagValue: {
    color: '#484f58',
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  flagValueActive: {
    color: '#58a6ff',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 4,
  },
  regCell: {
    width: '23%',
    backgroundColor: '#0d1117',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#21262d',
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  regCellSpecial: {
    borderColor: 'rgba(129,140,248,0.3)',
    backgroundColor: 'rgba(129,140,248,0.05)',
  },
  regLabel: {
    color: '#8b949e',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  regLabelSpecial: {
    color: '#818cf8',
  },
  regValue: {
    color: '#e6edf3',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
});
