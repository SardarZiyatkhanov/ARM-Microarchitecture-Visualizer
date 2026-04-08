import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import type { Instruction } from '@playarm/core';
import { useAppTheme } from '@/hooks/use-theme';
import type { AppPalette } from '@/constants/theme';

interface BitField { label: string; bits: string; value: string; colorKey: string }

function parseBitFields(binary: string): BitField[] {
  if (!binary || binary.length !== 32) return [];
  const b = binary;
  return [
    { label: 'cond',   bits: '31-28', value: b.slice(0, 4),   colorKey: 'cond'   },
    { label: 'op',     bits: '27-26', value: b.slice(4, 6),   colorKey: 'op'     },
    { label: 'I',      bits: '25',    value: b[6],             colorKey: 'I'      },
    { label: 'opcode', bits: '24-21', value: b.slice(7, 11),  colorKey: 'opcode' },
    { label: 'S',      bits: '20',    value: b[11],            colorKey: 'S'      },
    { label: 'Rn',     bits: '19-16', value: b.slice(12, 16), colorKey: 'Rn'     },
    { label: 'Rd',     bits: '15-12', value: b.slice(16, 20), colorKey: 'Rd'     },
    { label: 'imm/Rm', bits: '11-0',  value: b.slice(20, 32), colorKey: 'imm12'  },
  ];
}

function condName(bits: string): string {
  const map: Record<string, string> = {
    '1110': 'AL', '0000': 'EQ', '0001': 'NE', '1010': 'GE',
    '1011': 'LT', '1100': 'GT', '1101': 'LE', '0010': 'CS',
    '0011': 'CC', '0100': 'MI', '0101': 'PL', '0110': 'VS', '0111': 'VC',
  };
  return map[bits] ?? bits;
}

function getFieldColors(c: AppPalette): Record<string, string> {
  return {
    cond: c.purple, op: c.accent, I: c.amber, opcode: c.red,
    S: c.green, Rn: c.cyan, Rd: c.greenCode, imm12: c.orange, other: c.textDim,
  };
}

function makeStyles(c: AppPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg2, borderRadius: 8, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.bg1, borderBottomWidth: 1, borderBottomColor: c.border, paddingHorizontal: 12, paddingVertical: 10 },
    title: { color: c.text, fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
    viewToggle: { flexDirection: 'row', backgroundColor: c.bg2, borderRadius: 5, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
    viewBtn: { paddingHorizontal: 9, paddingVertical: 4 },
    viewBtnActive: { backgroundColor: c.accentBg },
    viewBtnText: { color: c.textDim, fontSize: 10, fontWeight: '700' },
    viewBtnTextActive: { color: c.accent },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 24 },
    emptyIcon: { color: c.textGhost, fontSize: 28 },
    emptyTitle: { color: c.textDim, fontSize: 13, fontWeight: '600' },
    emptyHint: { color: c.textGhost, fontSize: 11, fontFamily: 'monospace' },
    list: { paddingVertical: 2 },
    row: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.sep, gap: 4 },
    rowActive: { backgroundColor: c.accentFaint, borderLeftWidth: 2.5, borderLeftColor: c.accent },
    lineNum: { color: c.textDim, fontSize: 9, fontFamily: 'monospace', marginBottom: 1 },
    lineNumActive: { color: c.accent },
    rawText: { color: c.accentCode, fontSize: 11, fontFamily: 'monospace', fontWeight: '600' },
    rawTextActive: { color: c.accentLight },
    codeSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    hexCode: { color: c.greenCode, fontSize: 12, fontFamily: 'monospace', letterSpacing: 1 },
    hexCodeActive: { color: c.green },
    binCode: { color: c.textDim, fontSize: 9, fontFamily: 'monospace', letterSpacing: 0.5 },
    binCodeActive: { color: c.greenCode },
    expandChevron: { color: c.textGhost, fontSize: 9 },
    fieldsSection: { marginTop: 6, gap: 4 },
    bitStrip: { flexDirection: 'row', height: 22, borderRadius: 4, overflow: 'hidden', gap: 1 },
    bitSegment: { justifyContent: 'center', alignItems: 'center', borderRadius: 3 },
    bitSegText: { fontSize: 7, fontFamily: 'monospace', fontWeight: '700' },
    fieldLabels: { flexDirection: 'row', gap: 1 },
    fieldLabel: { alignItems: 'center' },
    fieldLabelName: { fontSize: 7, fontWeight: '800', fontFamily: 'monospace' },
    fieldLabelBits: { color: c.textGhost, fontSize: 6, fontFamily: 'monospace' },
    decodedRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginTop: 2 },
    decodedItem: { fontSize: 10 },
    decodedKey: { color: c.textDim, fontFamily: 'monospace' },
    decodedVal: { color: c.textBody, fontFamily: 'monospace' },
  });
}

interface EncodingPanelProps { instructions: Instruction[]; executingLine?: number }

export default function EncodingPanel({ instructions, executingLine = -1 }: EncodingPanelProps) {
  const c = useAppTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const fieldColors = useMemo(() => getFieldColors(c), [c]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [view, setView] = useState<'hex' | 'bin'>('hex');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Instruction Encoding</Text>
        <View style={styles.viewToggle}>
          {(['hex', 'bin'] as const).map(v => (
            <TouchableOpacity key={v} style={[styles.viewBtn, view === v && styles.viewBtnActive]} onPress={() => setView(v)}>
              <Text style={[styles.viewBtnText, view === v && styles.viewBtnTextActive]}>{v.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {instructions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>⊟</Text>
          <Text style={styles.emptyTitle}>No instructions loaded</Text>
          <Text style={styles.emptyHint}>Write assembly code and press Run</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {instructions.map((instr) => {
            const isActive = instr.line === executingLine;
            const isExpanded = expandedId === instr.id;
            const fields = parseBitFields(instr.binary ?? '');

            return (
              <TouchableOpacity
                key={instr.id}
                style={[styles.row, isActive && styles.rowActive]}
                onPress={() => setExpandedId(isExpanded ? null : instr.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.lineNum, isActive && styles.lineNumActive]}>{instr.line}</Text>
                <Text style={[styles.rawText, isActive && styles.rawTextActive]} numberOfLines={1}>{instr.raw}</Text>

                <View style={styles.codeSection}>
                  {view === 'hex' ? (
                    <Text style={[styles.hexCode, isActive && styles.hexCodeActive]}>{instr.machineCode ?? '????????'}</Text>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <Text style={[styles.binCode, isActive && styles.binCodeActive]}>
                        {instr.binary ? instr.binary.replace(/(.{4})/g, '$1 ').trim() : '—'}
                      </Text>
                    </ScrollView>
                  )}
                  <Text style={styles.expandChevron}>{isExpanded ? '▲' : '▼'}</Text>
                </View>

                {isExpanded && fields.length > 0 && (
                  <View style={styles.fieldsSection}>
                    <View style={styles.bitStrip}>
                      {fields.map(f => (
                        <View key={f.label} style={[styles.bitSegment, { flex: f.value.length, backgroundColor: (fieldColors[f.colorKey] ?? c.textDim) + '30' }]}>
                          <Text style={[styles.bitSegText, { color: fieldColors[f.colorKey] ?? c.textDim }]} numberOfLines={1} adjustsFontSizeToFit>{f.value}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.fieldLabels}>
                      {fields.map(f => (
                        <View key={f.label} style={[styles.fieldLabel, { flex: f.value.length }]}>
                          <Text style={[styles.fieldLabelName, { color: fieldColors[f.colorKey] ?? c.textDim }]} numberOfLines={1} adjustsFontSizeToFit>{f.label}</Text>
                          <Text style={styles.fieldLabelBits} numberOfLines={1}>{f.bits}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.decodedRow}>
                      <Text style={styles.decodedItem}>
                        <Text style={styles.decodedKey}>cond </Text>
                        <Text style={{ color: fieldColors.cond }}>{condName(fields[0]?.value ?? '')}</Text>
                      </Text>
                      <Text style={styles.decodedItem}>
                        <Text style={styles.decodedKey}>addr </Text>
                        <Text style={styles.decodedVal}>0x{(instr.address ?? 0).toString(16).toUpperCase().padStart(4, '0')}</Text>
                      </Text>
                      {instr.machineCode && (
                        <Text style={styles.decodedItem}>
                          <Text style={styles.decodedKey}>hex </Text>
                          <Text style={styles.decodedVal}>{instr.machineCode}</Text>
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
