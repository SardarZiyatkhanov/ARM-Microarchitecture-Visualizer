import React, { memo, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { useAppTheme } from '@/hooks/use-theme';
import type { AppPalette } from '@/constants/theme';

interface MemoryEntry { addr: number; value: number }

function toHex8(v: number) { return (v >>> 0).toString(16).toUpperCase().padStart(8, '0'); }
function toHex4(v: number) { return v.toString(16).toUpperCase().padStart(4, '0'); }
function toBin(v: number)  { return (v >>> 0).toString(2).padStart(32, '0'); }
function toAscii(v: number) {
  const chars = [];
  for (let b = 3; b >= 0; b--) {
    const byte = (v >> (b * 8)) & 0xff;
    chars.push(byte >= 32 && byte < 127 ? String.fromCharCode(byte) : '·');
  }
  return chars.join('');
}

type Fmt = 'hex' | 'dec' | 'bin';

function makeStyles(c: AppPalette) {
  return StyleSheet.create({
    container: {
      flex: 1, backgroundColor: c.bg2, borderRadius: 8,
      borderWidth: 1, borderColor: c.border, overflow: 'hidden',
    },
    header: { backgroundColor: c.bg1, borderBottomWidth: 1, borderBottomColor: c.border },
    headerTop: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6, gap: 8,
    },
    title: { color: c.text, fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, flex: 1 },
    fmtRow: {
      flexDirection: 'row', backgroundColor: c.bg2, borderRadius: 5,
      borderWidth: 1, borderColor: c.border, overflow: 'hidden',
    },
    fmtBtn: { paddingHorizontal: 7, paddingVertical: 4 },
    fmtBtnActive: { backgroundColor: c.accentBg },
    fmtBtnText: { color: c.textDim, fontSize: 9, fontWeight: '700', fontFamily: 'monospace' },
    fmtBtnTextActive: { color: c.accent },
    countBadge: { color: c.textDim, fontSize: 10, fontFamily: 'monospace' },
    searchRow: {
      flexDirection: 'row', alignItems: 'center',
      marginHorizontal: 12, marginBottom: 8, backgroundColor: c.bg2,
      borderRadius: 6, borderWidth: 1, borderColor: c.border,
      paddingHorizontal: 8, gap: 6,
    },
    searchIcon: { color: c.textDim, fontSize: 14 },
    searchInput: { flex: 1, color: c.textSec, fontSize: 11, fontFamily: 'monospace', paddingVertical: 6 },
    searchClear: { color: c.textDim, fontSize: 12, paddingHorizontal: 4 },
    colHeader: {
      flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 6,
      borderTopWidth: 1, borderTopColor: c.borderSubtle,
    },
    colHeaderText: { color: c.textDim, fontSize: 9, fontWeight: '700', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 0.5 },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7 },
    rowAddr: { color: c.purple, fontSize: 11, fontFamily: 'monospace', width: 56 },
    rowVal: { flex: 1, color: c.greenCode, fontSize: 11, fontFamily: 'monospace', fontWeight: '700' },
    rowValBin: { fontSize: 9, letterSpacing: 0.5 },
    rowAscii: { color: c.textDim, fontSize: 10, fontFamily: 'monospace', width: 36, textAlign: 'right' },
    sep: { height: 1, backgroundColor: c.sep },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 24 },
    emptyIcon: { color: c.textGhost, fontSize: 28 },
    emptyTitle: { color: c.textDim, fontSize: 13, fontWeight: '600' },
    emptyHint: { color: c.textGhost, fontSize: 11, fontFamily: 'monospace', textAlign: 'center' },
  });
}

interface MemoryListProps { memory?: Record<number, number> }

export default function MemoryList({ memory }: MemoryListProps) {
  const c = useAppTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [search, setSearch] = useState('');
  const [fmt, setFmt] = useState<Fmt>('hex');

  const allEntries: MemoryEntry[] = useMemo(() => {
    if (!memory) return [];
    return Object.entries(memory)
      .map(([addr, val]) => ({ addr: parseInt(addr), value: val }))
      .sort((a, b) => a.addr - b.addr);
  }, [memory]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allEntries;
    return allEntries.filter(e => {
      const hexAddr = e.addr.toString(16).toLowerCase();
      const decAddr = e.addr.toString(10);
      return hexAddr.includes(q.replace('0x', '')) || decAddr.includes(q);
    });
  }, [allEntries, search]);

  const MemoryRow = memo(({ entry, fmt: f }: { entry: MemoryEntry; fmt: Fmt }) => {
    const addrStr = `0x${toHex4(entry.addr)}`;
    let valStr: string;
    if (f === 'hex') valStr = `0x${toHex8(entry.value)}`;
    else if (f === 'dec') valStr = entry.value.toString(10);
    else valStr = toBin(entry.value).replace(/(.{8})/g, '$1 ').trim();
    return (
      <View style={styles.row}>
        <Text style={styles.rowAddr}>{addrStr}</Text>
        <Text style={[styles.rowVal, f === 'bin' && styles.rowValBin]} numberOfLines={1}>{valStr}</Text>
        <Text style={styles.rowAscii}>{toAscii(entry.value)}</Text>
      </View>
    );
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Memory</Text>
          <View style={styles.fmtRow}>
            {(['hex', 'dec', 'bin'] as Fmt[]).map(f => (
              <TouchableOpacity key={f} style={[styles.fmtBtn, fmt === f && styles.fmtBtnActive]} onPress={() => setFmt(f)}>
                <Text style={[styles.fmtBtnText, fmt === f && styles.fmtBtnTextActive]}>{f.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.countBadge}>{allEntries.length}w</Text>
        </View>
        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput} value={search} onChangeText={setSearch}
            placeholder="Filter by address (e.g. 0x00)" placeholderTextColor={c.textDim}
            autoCapitalize="none" autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.colHeader}>
          <Text style={[styles.colHeaderText, { width: 56 }]}>ADDR</Text>
          <Text style={[styles.colHeaderText, { flex: 1 }]}>VALUE</Text>
          <Text style={[styles.colHeaderText, { width: 36 }]}>ASCII</Text>
        </View>
      </View>

      {allEntries.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>◎</Text>
          <Text style={styles.emptyTitle}>No memory written</Text>
          <Text style={styles.emptyHint}>Use STR or PUSH to allocate memory</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No match for "{search}"</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={e => e.addr.toString()}
          renderItem={({ item }) => <MemoryRow entry={item} fmt={fmt} />}
          initialNumToRender={30} maxToRenderPerBatch={30} windowSize={5} removeClippedSubviews
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      )}
    </View>
  );
}
