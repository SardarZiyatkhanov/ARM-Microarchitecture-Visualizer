import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { PipelineState } from '@playarm/core';
import { useAppTheme } from '@/hooks/use-theme';
import type { AppPalette } from '@/constants/theme';

interface StageInfo {
  num: number; name: string; abbrev: string;
  instruction: string | null; detail: string | null; subDetail: string | null; active: boolean;
}

function buildStages(pipeline: PipelineState): StageInfo[] {
  const decode = pipeline.Decode;
  const exec = pipeline.Execute;
  const mem = pipeline.Memory;
  const wb = pipeline.WriteBack;

  const decodeDetail = decode.decoded
    ? [decode.decoded.destReg, decode.decoded.src1Reg, decode.decoded.src2Reg].filter(Boolean).join(', ')
    : null;

  const execDetail = exec.executionResult !== undefined
    ? `= ${(exec.executionResult >>> 0).toString(16).toUpperCase().padStart(8, '0')}`
    : null;

  const memDetail = mem.memoryAddress !== undefined
    ? `addr 0x${mem.memoryAddress.toString(16).toUpperCase()}`
    : null;

  return [
    { num: 1, name: 'Fetch', abbrev: 'IF', instruction: pipeline.Fetch.instruction?.raw ?? null, detail: pipeline.Fetch.instruction ? `line ${pipeline.Fetch.instruction.line}` : null, subDetail: pipeline.Fetch.instruction?.machineCode ?? null, active: !!pipeline.Fetch.instruction },
    { num: 2, name: 'Decode', abbrev: 'ID', instruction: decode.instruction?.raw ?? null, detail: decodeDetail, subDetail: decode.controlSignals ? decode.controlSignals.aluOp : null, active: !!decode.instruction },
    { num: 3, name: 'Execute', abbrev: 'EX', instruction: exec.instruction?.raw ?? null, detail: execDetail, subDetail: exec.controlSignals?.aluSrc === 'imm' ? 'imm operand' : exec.instruction ? 'reg operand' : null, active: !!exec.instruction },
    { num: 4, name: 'Memory', abbrev: 'MEM', instruction: mem.instruction?.raw ?? null, detail: memDetail, subDetail: mem.instruction ? (mem.controlSignals?.memWrite ? 'WRITE' : mem.controlSignals?.memRead ? 'READ' : 'pass-thru') : null, active: !!mem.instruction },
    { num: 5, name: 'Write Back', abbrev: 'WB', instruction: wb.instruction?.raw ?? null, detail: wb.decoded?.destReg ? `→ ${wb.decoded.destReg}` : wb.instruction ? '→ REG FILE' : null, subDetail: null, active: !!wb.instruction },
  ];
}

function makeStyles(c: AppPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg0, paddingVertical: 10, gap: 8 },
    stagesScroll: { paddingHorizontal: 12, alignItems: 'stretch', gap: 0 },
    card: { width: 92, minHeight: 90, backgroundColor: c.bg1, borderRadius: 8, borderWidth: 1.5, borderColor: c.border, padding: 8, gap: 4 },
    cardActive: { borderColor: c.accentBorder, backgroundColor: c.accentBg },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginBottom: 2 },
    numBadge: { width: 18, height: 18, borderRadius: 9, backgroundColor: c.bg3, borderWidth: 1, borderColor: c.border, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
    numBadgeActive: { backgroundColor: c.accentBg, borderColor: c.accent },
    numBadgeText: { color: c.textDim, fontSize: 9, fontWeight: '800' },
    numBadgeTextActive: { color: c.accent },
    cardName: { color: c.textDim, fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
    cardNameActive: { color: c.accent },
    cardAbbrev: { color: c.borderSubtle, fontSize: 8, fontWeight: '700', letterSpacing: 0.5 },
    cardBody: { flex: 1, gap: 2 },
    instrText: { color: c.textDim, fontSize: 10, fontFamily: 'monospace', lineHeight: 14 },
    instrTextActive: { color: c.accentCode },
    detailText: { color: c.amber, fontSize: 9, fontFamily: 'monospace', marginTop: 1 },
    subDetailText: { color: c.textDim, fontSize: 8, fontFamily: 'monospace' },
    bubbleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    bubbleDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: c.bg3 },
    bubbleText: { color: c.bg3, fontSize: 9, fontStyle: 'italic' },
    pipelineArrow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', width: 18, marginTop: 0 },
    arrowLine: { flex: 1, height: 1.5, backgroundColor: c.border },
    arrowLineActive: { backgroundColor: c.accent },
    arrowHead: { width: 0, height: 0, borderTopWidth: 4, borderBottomWidth: 4, borderLeftWidth: 6, borderStyle: 'solid', borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: c.border },
    arrowHeadActive: { borderLeftColor: c.accent },
    divider: { height: 1, backgroundColor: c.borderSubtle, marginHorizontal: 12 },
    datapathRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, gap: 0 },
    block: { width: 64, height: 52, backgroundColor: c.bg2, borderRadius: 6, borderWidth: 1.5, borderColor: c.border, justifyContent: 'center', alignItems: 'center', padding: 4 },
    blockActive: { borderColor: c.accentBorder, backgroundColor: c.accentBg },
    blockLabel: { color: c.textDim, fontSize: 9, fontWeight: '700', textAlign: 'center', lineHeight: 13, fontFamily: 'monospace' },
    blockLabelActive: { color: c.accent },
    dpArrow: { flexDirection: 'row', alignItems: 'center', width: 20 },
    wbLabel: { color: c.borderSubtle, fontSize: 9, fontFamily: 'monospace', textAlign: 'center', paddingHorizontal: 12 },
    wbLabelActive: { color: c.textDim },
    hazardRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, flexWrap: 'wrap' },
    hazardBadge: { borderRadius: 5, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
    hazardRaw: { backgroundColor: c.amberBg, borderColor: c.amberBorder },
    hazardControl: { backgroundColor: c.orangeBg, borderColor: c.orangeBorder },
    hazardText: { fontSize: 10, fontWeight: '700', fontFamily: 'monospace' },
    hazardRawText: { color: c.amber },
    hazardControlText: { color: c.orange },
  });
}

interface Props { pipeline: PipelineState; hazards?: string[] }

export default function VisualizerCanvas({ pipeline, hazards = [] }: Props) {
  const c = useAppTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const stages = buildStages(pipeline);

  const BLOCKS = [
    { label: 'INST\nMEM', active: stages[0].active },
    { label: 'REG\nFILE', active: stages[1].active || stages[4].active },
    { label: 'ALU', active: stages[2].active },
    { label: 'DATA\nMEM', active: stages[3].active },
  ];

  return (
    <View style={styles.root}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stagesScroll}>
        {stages.map((stage, i) => (
          <React.Fragment key={stage.name}>
            <View style={[styles.card, stage.active && styles.cardActive]}>
              <View style={styles.cardHeader}>
                <View style={[styles.numBadge, stage.active && styles.numBadgeActive]}>
                  <Text style={[styles.numBadgeText, stage.active && styles.numBadgeTextActive]}>{stage.num}</Text>
                </View>
                <View>
                  <Text style={[styles.cardName, stage.active && styles.cardNameActive]}>{stage.name}</Text>
                  <Text style={styles.cardAbbrev}>{stage.abbrev}</Text>
                </View>
              </View>
              <View style={styles.cardBody}>
                {stage.instruction ? (
                  <>
                    <Text style={[styles.instrText, stage.active && styles.instrTextActive]} numberOfLines={2}>{stage.instruction}</Text>
                    {stage.detail && <Text style={styles.detailText} numberOfLines={1}>{stage.detail}</Text>}
                    {stage.subDetail && <Text style={styles.subDetailText} numberOfLines={1}>{stage.subDetail}</Text>}
                  </>
                ) : (
                  <View style={styles.bubbleRow}>
                    <View style={styles.bubbleDot} />
                    <Text style={styles.bubbleText}>bubble</Text>
                  </View>
                )}
              </View>
            </View>
            {i < stages.length - 1 && (
              <View style={styles.pipelineArrow}>
                <View style={[styles.arrowLine, stage.active && stages[i + 1].active && styles.arrowLineActive]} />
                <View style={[styles.arrowHead, stage.active && stages[i + 1].active && styles.arrowHeadActive]} />
              </View>
            )}
          </React.Fragment>
        ))}
      </ScrollView>

      <View style={styles.divider} />

      <View style={styles.datapathRow}>
        {BLOCKS.map((b, i) => (
          <React.Fragment key={b.label}>
            <View style={[styles.block, b.active && styles.blockActive]}>
              <Text style={[styles.blockLabel, b.active && styles.blockLabelActive]}>{b.label}</Text>
            </View>
            {i < BLOCKS.length - 1 && (
              <View style={styles.dpArrow}>
                <View style={[styles.arrowLine, BLOCKS[i + 1].active && styles.arrowLineActive]} />
                <View style={[styles.arrowHead, BLOCKS[i + 1].active && styles.arrowHeadActive]} />
              </View>
            )}
          </React.Fragment>
        ))}
      </View>

      <Text style={[styles.wbLabel, stages[4].active && styles.wbLabelActive]}>
        ↖ WriteBack: ALU / DATA MEM → REG FILE
      </Text>

      {hazards.length > 0 && (
        <View style={styles.hazardRow}>
          {hazards.map(h => {
            const isRaw = h.startsWith('RAW');
            return (
              <View key={h} style={[styles.hazardBadge, isRaw ? styles.hazardRaw : styles.hazardControl]}>
                <Text style={[styles.hazardText, isRaw ? styles.hazardRawText : styles.hazardControlText]}>
                  {isRaw ? `⚠ ${h}` : `⚡ ${h}`}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
