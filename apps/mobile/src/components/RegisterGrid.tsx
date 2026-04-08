import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Clipboard } from 'react-native';
import type { Flags } from '@playarm/core';
import { useAppTheme } from '@/hooks/use-theme';
import type { AppPalette } from '@/constants/theme';

const SPECIAL_REGS = new Set(['SP', 'LR', 'PC']);

const REG_GROUPS = [
  { label: 'Args / Return', regs: ['R0', 'R1', 'R2', 'R3'], colorKey: 'accent' as const },
  { label: 'Saved (callee)', regs: ['R4', 'R5', 'R6', 'R7'], colorKey: 'green' as const },
  { label: 'Special', regs: ['SP', 'LR', 'PC'], colorKey: 'purple' as const },
];

const FLAG_INFO: Record<string, string> = {
  N: 'Negative — result was negative',
  Z: 'Zero — result was zero',
  C: 'Carry — unsigned overflow',
  V: 'oVerflow — signed overflow',
};

type DisplayFormat = 'hex' | 'dec' | 'bin';

function formatValue(val: number, fmt: DisplayFormat): string {
  const u = val >>> 0;
  if (fmt === 'dec') return String(val);
  if (fmt === 'bin') return u.toString(2).padStart(32, '0').replace(/(.{8})/g, '$1 ').trim();
  return '0x' + u.toString(16).toUpperCase().padStart(8, '0');
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const unsigned = values.map(v => v >>> 0);
  const max = Math.max(...unsigned, 1);
  return (
    <View style={sparkStyles.row}>
      {unsigned.map((v, i) => (
        <View key={i} style={[sparkStyles.bar, { height: Math.max(2, Math.round((v / max) * 14)), opacity: 0.3 + (i / unsigned.length) * 0.7 }]} />
      ))}
    </View>
  );
}
const sparkStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 1, height: 14, marginTop: 3 },
  bar: { width: 3, backgroundColor: '#2f81f7', borderRadius: 1 },
});

function makeStyles(c: AppPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg2, borderRadius: 8, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.bg1, borderBottomWidth: 1, borderColor: c.border, paddingHorizontal: 12, paddingVertical: 8 },
    title: { color: c.text, fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
    fmtToggle: { flexDirection: 'row', backgroundColor: c.bg2, borderRadius: 5, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
    fmtBtn: { paddingHorizontal: 8, paddingVertical: 4 },
    fmtBtnActive: { backgroundColor: c.accentBg },
    fmtText: { color: c.textDim, fontSize: 10, fontWeight: '700' },
    fmtTextActive: { color: c.accent },
    flagsSection: { backgroundColor: c.bg1, borderBottomWidth: 1, borderBottomColor: c.borderSubtle, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6, gap: 6 },
    groupLabel: { color: c.textGhost, fontSize: 8, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
    flagsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    flagBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: c.border, backgroundColor: c.bg2 },
    flagBadgeActive: { borderColor: c.accentBorder, backgroundColor: c.accentBg },
    flagBadgeChanged: { borderColor: c.amberBorder, backgroundColor: c.amberBg },
    flagLetter: { color: c.textDim, fontSize: 12, fontWeight: '800' },
    flagLetterActive: { color: c.accent },
    flagVal: { color: c.textGhost, fontSize: 13, fontFamily: 'monospace', fontWeight: '700' },
    flagValActive: { color: c.accentLight },
    flagChanged: { color: c.amber, fontSize: 10 },
    flagHint: { color: c.borderSubtle, fontSize: 9, marginLeft: 4, fontStyle: 'italic' },
    flagGlossary: { gap: 1 },
    flagGlossaryText: { color: c.textGhost, fontSize: 9, lineHeight: 13 },
    flagGlossaryKey: { color: c.textDim, fontWeight: '800' },
    regsSection: { flex: 1, padding: 8, gap: 8 },
    regGroup: { gap: 4 },
    regRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    regCell: { width: '31.5%', backgroundColor: c.bg1, borderRadius: 6, borderWidth: 1, borderColor: c.borderSubtle, paddingVertical: 6, paddingHorizontal: 7, minHeight: 46, justifyContent: 'center' },
    regCellSpecial: { borderColor: c.purpleBg, backgroundColor: c.purpleBg },
    regCellChanged: { borderColor: c.greenBorder, backgroundColor: c.greenBg },
    regCellBin: { width: '48%', minHeight: 56 },
    regLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
    regLabel: { color: c.textDim, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    regLabelSpecial: { color: c.purple },
    regLabelChanged: { color: c.greenCode },
    changeDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: c.greenCode },
    regValue: { color: c.textBody, fontSize: 11, fontFamily: 'monospace', fontWeight: '600' },
    regValueSpecial: { color: c.purple },
    regValueChanged: { color: c.greenCode },
    regValueBin: { fontSize: 8, letterSpacing: 0.3, lineHeight: 12 },
    copiedText: { color: c.green, fontSize: 10, fontWeight: '700', fontStyle: 'italic' },
  });
}

interface RegisterGridProps {
  registers: Record<string, number>;
  flags: Flags;
  changedRegs?: Set<string>;
  changedFlags?: Set<string>;
  regHistory?: Record<string, number[]>;
}

export default function RegisterGrid({ registers, flags, changedRegs, changedFlags, regHistory }: RegisterGridProps) {
  const c = useAppTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [fmt, setFmt] = useState<DisplayFormat>('hex');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyValue = useCallback((key: string, val: number) => {
    Clipboard.setString(formatValue(val, fmt));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1400);
  }, [fmt]);

  const groupColors: Record<string, string> = { accent: c.accent, green: c.green, purple: c.purple };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Registers</Text>
        <View style={styles.fmtToggle}>
          {(['hex', 'dec', 'bin'] as DisplayFormat[]).map(f => (
            <TouchableOpacity key={f} style={[styles.fmtBtn, fmt === f && styles.fmtBtnActive]} onPress={() => setFmt(f)}>
              <Text style={[styles.fmtText, fmt === f && styles.fmtTextActive]}>{f.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.flagsSection}>
        <Text style={styles.groupLabel}>FLAGS</Text>
        <View style={styles.flagsRow}>
          {(['N', 'Z', 'C', 'V'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.flagBadge, flags[f] && styles.flagBadgeActive, changedFlags?.has(f) && styles.flagBadgeChanged]}
              onPress={() => Clipboard.setString(flags[f] ? '1' : '0')}
              activeOpacity={0.7}
            >
              <Text style={[styles.flagLetter, flags[f] && styles.flagLetterActive]}>{f}</Text>
              <Text style={[styles.flagVal, flags[f] && styles.flagValActive]}>{flags[f] ? '1' : '0'}</Text>
              {changedFlags?.has(f) && <Text style={styles.flagChanged}>↕</Text>}
            </TouchableOpacity>
          ))}
          <Text style={styles.flagHint}>tap to copy</Text>
        </View>
        <View style={styles.flagGlossary}>
          {(['N', 'Z', 'C', 'V'] as const).map(f => (
            <Text key={f} style={styles.flagGlossaryText}>
              <Text style={styles.flagGlossaryKey}>{f}</Text>{' '}{FLAG_INFO[f]}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.regsSection}>
        {REG_GROUPS.map(group => {
          const groupRegs = group.regs.filter(r => r in registers);
          if (groupRegs.length === 0) return null;
          const groupColor = groupColors[group.colorKey];
          return (
            <View key={group.label} style={styles.regGroup}>
              <Text style={[styles.groupLabel, { color: groupColor + 'aa' }]}>
                {group.label.toUpperCase()}
              </Text>
              <View style={styles.regRow}>
                {groupRegs.map(key => {
                  const val = registers[key];
                  const isChanged = changedRegs?.has(key);
                  const isCopied = copiedKey === key;
                  const isSpecial = SPECIAL_REGS.has(key);
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[styles.regCell, isSpecial && styles.regCellSpecial, isChanged && styles.regCellChanged, fmt === 'bin' && styles.regCellBin]}
                      onPress={() => copyValue(key, val)}
                      activeOpacity={0.65}
                    >
                      <View style={styles.regLabelRow}>
                        <Text style={[styles.regLabel, isSpecial && styles.regLabelSpecial, isChanged && styles.regLabelChanged]}>{key}</Text>
                        {isChanged && <View style={styles.changeDot} />}
                      </View>
                      {isCopied ? (
                        <Text style={styles.copiedText}>Copied!</Text>
                      ) : (
                        <Text style={[styles.regValue, isSpecial && styles.regValueSpecial, isChanged && styles.regValueChanged, fmt === 'bin' && styles.regValueBin]}
                          numberOfLines={fmt === 'bin' ? 3 : 1} adjustsFontSizeToFit>
                          {formatValue(val, fmt)}
                        </Text>
                      )}
                      {regHistory?.[key] && regHistory[key].length >= 2 && (
                        <Sparkline values={regHistory[key]} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
