import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, LayoutAnimation, Platform, UIManager, Modal,
} from 'react-native';
import type { ParseError } from '@playarm/core';
import { useAppTheme } from '@/hooks/use-theme';
import type { AppPalette } from '@/constants/theme';

// ── Syntax highlighting ────────────────────────────────────────────────────────

const KEYWORDS = new Set([
  'MOV','MOVS','MVN','MVNS','ADD','ADDS','ADC','SUB','SUBS','SBC','RSB','MUL','MLA',
  'AND','ORR','EOR','BIC','LSL','LSR','ASR','ROR','CMP','CMN','TST','TEQ',
  'B','BEQ','BNE','BGT','BLT','BGE','BLE','BCS','BCC','BMI','BPL','BVS','BVC',
  'BL','BX','BLX','LDR','STR','LDRB','STRB','LDM','STM','PUSH','POP','SWI','NOP',
]);
const REGISTERS = new Set([
  'R0','R1','R2','R3','R4','R5','R6','R7','R8','R9','R10','R11','R12',
  'SP','LR','PC','CPSR',
]);

interface Token { text: string; color: string }

function tokenizeLine(line: string, c: AppPalette): Token[] {
  const tokens: Token[] = [];
  const commentIdx = line.indexOf(';');
  const code = commentIdx >= 0 ? line.slice(0, commentIdx) : line;
  const comment = commentIdx >= 0 ? line.slice(commentIdx) : '';

  const parts = code.split(/(\s+|,|\[|\]|\{|\}|!)/);
  for (const part of parts) {
    if (!part) continue;
    const up = part.toUpperCase().replace(/,$/, '');
    if (KEYWORDS.has(up)) {
      tokens.push({ text: part, color: c.accentCode });
    } else if (REGISTERS.has(up)) {
      tokens.push({ text: part, color: c.greenCode });
    } else if (/^#-?\d/.test(part) || /^#0x/i.test(part)) {
      tokens.push({ text: part, color: c.orange });
    } else if (/^\w+:$/.test(part.trim())) {
      tokens.push({ text: part, color: c.purpleDark });
    } else {
      tokens.push({ text: part, color: c.textBody });
    }
  }
  if (comment) tokens.push({ text: comment, color: c.textDim });
  return tokens;
}

// ── Snippets ───────────────────────────────────────────────────────────────────

const SNIPPETS = [
  { label: 'Count loop', code: 'MOV R0, #0\nMOV R1, #10\nLOOP:\nADD R0, R0, #1\nCMP R0, R1\nBNE LOOP' },
  { label: 'Factorial', code: 'MOV R0, #5\nMOV R1, #1\nFACT:\nMUL R1, R1, R0\nSUBS R0, R0, #1\nBNE FACT' },
  { label: 'Fibonacci', code: 'MOV R0, #0\nMOV R1, #1\nMOV R2, #8\nFIB:\nADD R3, R0, R1\nMOV R0, R1\nMOV R1, R3\nSUBS R2, R2, #1\nBNE FIB' },
  { label: 'Array sum', code: 'MOV R0, #0\nMOV R1, #4\nMOV R2, #100\nLOOP:\nLDR R3, [R2]\nADD R0, R0, R3\nADD R2, R2, #4\nSUBS R1, R1, #1\nBNE LOOP' },
  { label: 'Stack call', code: 'BL FUNC\nB END\nFUNC:\nPUSH {LR}\nMOV R0, #3\nMOV R1, #4\nADD R0, R0, R1\nPOP {LR}\nBX LR\nEND:' },
];

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const LINE_HEIGHT = 20;
const FONT_SIZE = 13;

interface AssemblyEditorProps {
  code: string;
  errors: ParseError[];
  onRun: (code: string) => void;
  /** 1-based source line number of the instruction currently in the Execute stage. -1 = nothing. */
  executingLine?: number;
  /** 1-based line numbers that have breakpoints set */
  breakpoints?: Set<number>;
  onBreakpointsChange?: (bp: Set<number>) => void;
}

export default function AssemblyEditor({
  code,
  errors,
  onRun,
  executingLine = -1,
  breakpoints: externalBreakpoints,
  onBreakpointsChange,
}: AssemblyEditorProps) {
  const [draft, setDraft] = useState(code);
  const [open, setOpen] = useState(true);
  const [internalBreakpoints, setInternalBreakpoints] = useState<Set<number>>(new Set());
  const [showSnippets, setShowSnippets] = useState(false);

  const breakpoints = externalBreakpoints ?? internalBreakpoints;

  // Sync draft when a program is loaded externally (e.g. from Learn tab)
  const prevCodeRef = useRef(code);
  React.useEffect(() => {
    if (code !== prevCodeRef.current) {
      prevCodeRef.current = code;
      setDraft(code);
    }
  }, [code]);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(v => !v);
  };

  const c = useAppTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const toggleBreakpoint = (lineNum: number) => {
    const next = new Set(breakpoints);
    if (next.has(lineNum)) next.delete(lineNum);
    else next.add(lineNum);
    if (onBreakpointsChange) onBreakpointsChange(next);
    else setInternalBreakpoints(next);
  };

  const lines = draft.split('\n');
  const errorCount = errors.length;
  const isExecuting = executingLine >= 1;

  // Error map: line number → message
  const errorMap: Record<number, string> = {};
  for (const e of errors) {
    errorMap[e.line] = e.message;
  }

  return (
    <View style={styles.container}>
      {/* ── Snippets modal ── */}
      <Modal visible={showSnippets} transparent animationType="fade" onRequestClose={() => setShowSnippets(false)}>
        <TouchableOpacity style={styles.snippetOverlay} onPress={() => setShowSnippets(false)} activeOpacity={1}>
          <View style={styles.snippetMenu}>
            <Text style={styles.snippetMenuTitle}>INSERT SNIPPET</Text>
            {SNIPPETS.map(s => (
              <TouchableOpacity
                key={s.label}
                style={styles.snippetItem}
                onPress={() => { setDraft(s.code); setShowSnippets(false); }}
              >
                <Text style={styles.snippetItemText}>{s.label}</Text>
                <Text style={styles.snippetItemArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Header ── */}
      <TouchableOpacity style={styles.header} onPress={toggle} activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Assembly Editor</Text>
          {errorCount > 0 && (
            <View style={styles.badge}>
              <View style={styles.badgeDot} />
              <Text style={styles.badgeTextError}>{errorCount} error{errorCount > 1 ? 's' : ''}</Text>
            </View>
          )}
          {errorCount === 0 && draft.trim().length > 0 && (
            <View style={[styles.badge, styles.badgeOk]}>
              <Text style={styles.badgeTextOk}>✓ OK</Text>
            </View>
          )}
          {isExecuting && (
            <View style={[styles.badge, styles.badgeExec]}>
              <Text style={styles.badgeTextExec}>⬡ L{executingLine}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.snippetBtn}
            onPress={(e) => { e.stopPropagation(); setShowSnippets(true); }}
          >
            <Text style={styles.snippetBtnText}>+ Snippet</Text>
          </TouchableOpacity>
          <Text style={styles.lineCount}>{lines.length}L</Text>
          <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {open && (
        <View style={styles.body}>
          {/* ── Executing line callout ── */}
          {isExecuting && (() => {
            const txt = (lines[executingLine - 1] ?? '').trim();
            return txt ? (
              <View style={styles.execCallout}>
                <Text style={styles.execCalloutLabel}>EX</Text>
                <Text style={styles.execCalloutCode} numberOfLines={1}>{txt}</Text>
                <Text style={styles.execCalloutLine}>L{executingLine}</Text>
              </View>
            ) : null;
          })()}

          {/* ── Code editor with line numbers ── */}
          <View style={styles.editorShell}>
            {/* Gutter: line numbers + breakpoints */}
            <ScrollView
              style={styles.gutter}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            >
              {lines.map((_, i) => {
                const lineNum = i + 1;
                const isExec = lineNum === executingLine;
                const hasBp = breakpoints.has(lineNum);
                const hasError = !!errorMap[lineNum];
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.gutterRow, isExec && styles.gutterRowExec]}
                    onPress={() => toggleBreakpoint(lineNum)}
                    activeOpacity={0.6}
                  >
                    <View style={[styles.bpSlot]}>
                      {hasBp && <View style={styles.bpDot} />}
                    </View>
                    <Text style={[
                      styles.lineNum,
                      isExec && styles.lineNumExec,
                      hasError && styles.lineNumError,
                    ]}>
                      {lineNum}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Syntax highlighting overlay */}
            <View style={styles.highlightOverlay} pointerEvents="none">
              {lines.map((line, i) => (
                <View key={i} style={styles.highlightLine}>
                  {tokenizeLine(line, c).map((tok, j) => (
                    <Text key={j} style={[styles.highlightToken, { color: tok.color }]}>
                      {tok.text}
                    </Text>
                  ))}
                </View>
              ))}
            </View>

            {/* TextInput (transparent so overlay shows through) */}
            <TextInput
              style={[styles.codeInput, styles.codeInputTransparent]}
              value={draft}
              onChangeText={setDraft}
              multiline
              scrollEnabled={false}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              spellCheck={false}
              placeholder="Enter ARM assembly here..."
              placeholderTextColor="#484f58"
              textAlignVertical="top"
            />
          </View>

          {/* ── Error list ── */}
          {errors.length > 0 && (
            <View style={styles.errorList}>
              {errors.map((err, i) => (
                <View key={i} style={styles.errorRow}>
                  <Text style={styles.errorLineTag}>L{err.line}</Text>
                  <Text style={styles.errorMsg} numberOfLines={1}>{err.message}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Run button ── */}
          <TouchableOpacity style={styles.runBtn} onPress={() => onRun(draft)} activeOpacity={0.8}>
            <Text style={styles.runBtnText}>▶  Run Program</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function makeStyles(c: AppPalette) {
  return StyleSheet.create({
    container: { backgroundColor: c.bg2, borderRadius: 10, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: c.bg1, borderBottomWidth: 1, borderBottomColor: c.border },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { color: c.text, fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
    lineCount: { color: c.textDim, fontSize: 10, fontFamily: 'monospace' },
    chevron: { color: c.textMuted, fontSize: 10 },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.redBg, borderRadius: 4, borderWidth: 1, borderColor: c.redBorder, paddingHorizontal: 6, paddingVertical: 2 },
    badgeDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: c.red },
    badgeTextError: { color: c.red, fontSize: 10, fontWeight: '700' },
    badgeOk: { backgroundColor: c.greenBg, borderColor: c.greenBorder },
    badgeTextOk: { color: c.green, fontSize: 10, fontWeight: '700' },
    badgeExec: { backgroundColor: c.accentBg, borderColor: c.accentBorder },
    badgeTextExec: { color: c.accent, fontSize: 10, fontWeight: '700' },
    execCallout: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.accentFaint, borderRadius: 6, borderWidth: 1, borderColor: c.accentBorder, borderLeftWidth: 3, borderLeftColor: c.accent, paddingHorizontal: 10, paddingVertical: 6 },
    execCalloutLabel: { color: c.accent, fontSize: 9, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', backgroundColor: c.accentBg, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 },
    execCalloutCode: { flex: 1, color: c.textSec, fontSize: 12, fontFamily: 'monospace' },
    execCalloutLine: { color: c.textDim, fontSize: 10, fontFamily: 'monospace' },
    body: { padding: 10, gap: 8 },
    editorShell: { flexDirection: 'row', backgroundColor: c.bg1, borderRadius: 7, borderWidth: 1, borderColor: c.borderSubtle, overflow: 'hidden' },
    gutter: { width: 44, backgroundColor: c.bg0, borderRightWidth: 1, borderRightColor: c.borderSubtle },
    gutterRow: { flexDirection: 'row', alignItems: 'center', height: LINE_HEIGHT, paddingRight: 6, gap: 2 },
    gutterRowExec: { backgroundColor: c.accentBg },
    bpSlot: { width: 14, height: LINE_HEIGHT, justifyContent: 'center', alignItems: 'center' },
    bpDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: c.red },
    lineNum: { color: c.textDim, fontSize: 10, fontFamily: 'monospace', textAlign: 'right', width: 20 },
    lineNumExec: { color: c.accent, fontWeight: '700' },
    lineNumError: { color: c.red },
    snippetBtn: { backgroundColor: c.accentBg, borderRadius: 4, borderWidth: 1, borderColor: c.accentBorder, paddingHorizontal: 7, paddingVertical: 3 },
    snippetBtnText: { color: c.accent, fontSize: 10, fontWeight: '700' },
    snippetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    snippetMenu: { width: '100%', maxWidth: 320, backgroundColor: c.bg1, borderRadius: 12, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
    snippetMenuTitle: { color: c.textDim, fontSize: 9, fontWeight: '800', letterSpacing: 1, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.borderSubtle },
    snippetItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.borderSubtle },
    snippetItemText: { color: c.textBody, fontSize: 13, fontWeight: '600' },
    snippetItemArrow: { color: c.textDim, fontSize: 13 },
    highlightOverlay: { position: 'absolute', top: 8, left: 10, right: 8, bottom: 0, pointerEvents: 'none' },
    highlightLine: { flexDirection: 'row', flexWrap: 'wrap', height: LINE_HEIGHT, alignItems: 'center' },
    highlightToken: { fontFamily: 'monospace', fontSize: FONT_SIZE, lineHeight: LINE_HEIGHT },
    codeInput: { flex: 1, color: c.textSec, fontFamily: 'monospace', fontSize: FONT_SIZE, lineHeight: LINE_HEIGHT, padding: 8, paddingLeft: 10, minHeight: 140, textAlignVertical: 'top' },
    codeInputTransparent: { color: 'transparent' },
    errorList: { gap: 3 },
    errorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.redBg, borderRadius: 5, borderLeftWidth: 2.5, borderLeftColor: c.red, paddingHorizontal: 10, paddingVertical: 5 },
    errorLineTag: { color: c.red, fontSize: 10, fontWeight: '800', fontFamily: 'monospace', width: 22 },
    errorMsg: { flex: 1, color: c.textBody, fontSize: 11, fontFamily: 'monospace' },
    runBtn: { backgroundColor: c.accentBg, borderRadius: 7, borderWidth: 1, borderColor: c.accentBorder, paddingVertical: 11, alignItems: 'center' },
    runBtnText: { color: c.accent, fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
  });
}
