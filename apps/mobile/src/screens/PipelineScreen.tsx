import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet, Text, View, useWindowDimensions,
  TouchableOpacity, ScrollView, Platform, Share, Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '@/hooks/use-theme';
import type { AppPalette } from '@/constants/theme';
import VisualizerCanvas from '../components/VisualizerCanvas';
import TLBList from '../components/TLBList';
import MemoryList from '../components/MemoryList';
import RegisterGrid from '../components/RegisterGrid';
import StackPanel from '../components/StackPanel';
import PseudocodePanel from '../components/PseudocodePanel';
import AssemblyEditor from '../components/AssemblyEditor';
import EncodingPanel from '../components/EncodingPanel';
import StatsPanel from '../components/StatsPanel';
import SettingsModal, { AppSettings, loadSettings } from '../components/SettingsModal';
import { useSimulator } from '../context/SimulatorContext';
import {
  INITIAL_REGISTERS,
  INITIAL_PIPELINE_STATE,
  INITIAL_FLAGS,
  CpuState,
  advancePipeline,
  createEmptyTLB,
  translateAddress,
  TLBState,
  parseAssembly,
} from '@playarm/core';

// ── Types ─────────────────────────────────────────────────────────────────────

type BottomPanel = 'registers' | 'memory' | 'stack' | 'tlb' | 'pseudocode' | 'trace' | 'encoding' | 'stats';
type Speed = 'slow' | 'normal' | 'fast';

const SPEED_MS: Record<Speed, number> = { slow: 1400, normal: 800, fast: 250 };

interface HistoryEntry {
  cycle: number;
  pc: number;
  registers: Record<string, number>;
  memory: Record<number, number>;
  flags: typeof INITIAL_FLAGS;
  pipeline: typeof INITIAL_PIPELINE_STATE;
  tlb: TLBState;
}

interface TraceEntry {
  cycle: number;
  instruction: string;
  changedRegs: string[];
  flagChanges: string[];
  execResult?: number;
}

const PANEL_TABS: { key: BottomPanel; icon: string; label: string }[] = [
  { key: 'registers',  icon: '⊞', label: 'Regs' },
  { key: 'memory',     icon: '◫', label: 'Mem' },
  { key: 'stack',      icon: '≡', label: 'Stack' },
  { key: 'tlb',        icon: '◈', label: 'TLB' },
  { key: 'pseudocode', icon: '⇒', label: 'Pseudo' },
  { key: 'encoding',   icon: '⊟', label: 'Encode' },
  { key: 'stats',      icon: '◈', label: 'Stats' },
  { key: 'trace',      icon: '▤', label: 'Trace' },
];

// ── Screen ────────────────────────────────────────────────────────────────────

export default function PipelineScreen() {
  const c = useAppTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { width } = useWindowDimensions();
  const isTablet = width >= 800;
  const { program, setProgram, setRegisters: setCtxRegisters, setFlags: setCtxFlags } = useSimulator();

  // ── CPU state ──
  const [cycle, setCycle] = useState(0);
  const [pc, setPc] = useState(0);
  const [registers, setRegisters] = useState(INITIAL_REGISTERS);
  const [memory, setMemory] = useState<Record<number, number>>({});
  const [flags, setFlags] = useState(INITIAL_FLAGS);
  const [pipeline, setPipeline] = useState(INITIAL_PIPELINE_STATE);
  const [tlbState, setTlbState] = useState<TLBState>(createEmptyTLB());
  const tlbRef = useRef<TLBState>(createEmptyTLB());

  // ── Step history for step-back ──
  const historyRef = useRef<HistoryEntry[]>([]);

  // ── Diff tracking ──
  const [changedRegs, setChangedRegs] = useState<Set<string>>(new Set());
  const [changedFlags, setChangedFlags] = useState<Set<string>>(new Set());

  // ── Trace log ──
  const [traceLog, setTraceLog] = useState<TraceEntry[]>([]);

  // ── Playback ──
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>('normal');

  // ── Assembly ──
  const [instruction, setInstruction] = useState(program);
  const assemblyResult = useMemo(() => parseAssembly(instruction), [instruction]);
  const parsedInst = assemblyResult.instructions;

  // ── UI ──
  const [bottomPanel, setBottomPanel] = useState<BottomPanel>('registers');
  const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set());
  const [hazards, setHazards] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    defaultFormat: 'hex', defaultSpeed: 'normal', hapticsEnabled: true,
    editorFontSize: 13, showOnboarding: true,
  });
  const regHistoryRef = useRef<Record<string, number[]>>({});

  // Load settings on mount
  useEffect(() => {
    loadSettings().then(s => {
      setSettings(s);
      setSpeed(s.defaultSpeed);
    });
  }, []);

  // Sync when program loaded from Learn tab
  const prevProgramRef = useRef(program);
  useEffect(() => {
    if (program !== prevProgramRef.current) {
      prevProgramRef.current = program;
      setInstruction(program);
      doReset();
    }
  }, [program]);

  // Sync registers/flags to context so Learn tab can check exercise answers
  useEffect(() => { setCtxRegisters(registers); }, [registers]);
  useEffect(() => { setCtxFlags(flags); }, [flags]);

  // ── Simulation ─────────────────────────────────────────────────────────────

  function doStep() {
    if (assemblyResult.errors.length > 0) return;

    // Haptic feedback
    if (settings.hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    // Hazard detection
    const h: string[] = [];
    const decInstr = pipeline.Decode.instruction as any;
    const exInstr = pipeline.Execute.instruction as any;
    if (decInstr && exInstr) {
      const decSrcs = [decInstr.rn, decInstr.rm, decInstr.operand2?.reg].filter(Boolean);
      const exDst = exInstr.rd;
      if (exDst && decSrcs.includes(exDst)) h.push(`RAW: ${exDst}`);
    }
    if (exInstr) {
      const op = (exInstr.opcode ?? '') as string;
      if (['B','BEQ','BNE','BGT','BLT','BGE','BLE','BL','BX','BCS','BCC'].includes(op)) {
        h.push('Control hazard');
      }
    }
    setHazards(h);

    historyRef.current.push({
      cycle, pc, registers: { ...registers },
      memory: { ...memory }, flags: { ...flags },
      pipeline, tlb: tlbRef.current,
    });

    const currentCpuState: CpuState = { clock: cycle, pc, registers, memory, flags, pipeline };
    const nextState = advancePipeline(currentCpuState, parsedInst);

    // TLB
    const memStage = nextState.pipeline.Memory;
    if (
      memStage.instruction &&
      (memStage.instruction.opcode === 'LDR' || memStage.instruction.opcode === 'STR') &&
      memStage.memoryAddress !== undefined
    ) {
      const isWrite = memStage.instruction.opcode === 'STR';
      const { newTlbState } = translateAddress(
        memStage.memoryAddress, isWrite, nextState.clock, tlbRef.current,
      );
      tlbRef.current = newTlbState;
      setTlbState(newTlbState);
    }

    // Compute diffs
    const newChangedRegs = new Set<string>();
    for (const key of Object.keys(nextState.registers)) {
      if (nextState.registers[key] !== registers[key]) newChangedRegs.add(key);
    }
    const newChangedFlags = new Set<string>();
    for (const f of ['N', 'Z', 'C', 'V'] as const) {
      if (nextState.flags[f] !== flags[f]) newChangedFlags.add(f);
    }

    // Trace entry
    const fetchedInstr = pipeline.Fetch.instruction;
    const traceInstrName = fetchedInstr ? fetchedInstr.raw : '(bubble)';
    if (nextState.clock > 0) {
      setTraceLog(prev => [
        {
          cycle: nextState.clock,
          instruction: traceInstrName,
          changedRegs: Array.from(newChangedRegs),
          flagChanges: Array.from(newChangedFlags),
          execResult: nextState.pipeline.Execute.executionResult,
        },
        ...prev.slice(0, 99),
      ]);
    }

    // Track register history (last 8 values per register)
    for (const key of Object.keys(nextState.registers)) {
      const prev = regHistoryRef.current[key] ?? [];
      regHistoryRef.current[key] = [...prev.slice(-7), nextState.registers[key]];
    }

    setChangedRegs(newChangedRegs);
    setChangedFlags(newChangedFlags);
    setCycle(nextState.clock);
    setPc(nextState.pc);
    setRegisters(nextState.registers);
    setMemory(nextState.memory);
    setFlags(nextState.flags);
    setPipeline(nextState.pipeline);

    // Auto-pause at breakpoints
    const execLine = nextState.pipeline.Execute.instruction?.line ?? -1;
    if (execLine >= 1 && breakpoints.has(execLine)) {
      setIsPlaying(false);
    }
  }

  function doStepBack() {
    const prev = historyRef.current.pop();
    if (!prev) return;
    setIsPlaying(false);
    setChangedRegs(new Set());
    setChangedFlags(new Set());
    setTraceLog(log => log.slice(1));
    setCycle(prev.cycle);
    setPc(prev.pc);
    setRegisters(prev.registers);
    setMemory(prev.memory);
    setFlags(prev.flags);
    setPipeline(prev.pipeline);
    tlbRef.current = prev.tlb;
    setTlbState(prev.tlb);
  }

  function doReset() {
    setIsPlaying(false);
    historyRef.current = [];
    regHistoryRef.current = {};
    setChangedRegs(new Set());
    setChangedFlags(new Set());
    setHazards([]);
    setTraceLog([]);
    setCycle(0); setPc(0);
    setRegisters(INITIAL_REGISTERS);
    setMemory({});
    setFlags(INITIAL_FLAGS);
    setPipeline(INITIAL_PIPELINE_STATE);
    const emptyTlb = createEmptyTLB();
    setTlbState(emptyTlb);
    tlbRef.current = emptyTlb;
  }

  function handleRun(code: string) {
    setInstruction(code);
    setProgram(code);
    doReset();
  }

  async function handleShare() {
    try {
      await Share.share({ message: instruction, title: 'PlayARM program' });
    } catch (_) {}
  }

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isPlaying) timeout = setTimeout(doStep, SPEED_MS[speed]);
    return () => clearTimeout(timeout);
  }, [isPlaying, cycle, speed]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const pipelineEmpty = !Object.values({
    Fetch: pipeline.Fetch.instruction,
    Decode: pipeline.Decode.instruction,
    Execute: pipeline.Execute.instruction,
    Memory: pipeline.Memory.instruction,
    WriteBack: pipeline.WriteBack.instruction,
  }).some(Boolean) && cycle === 0;

  const canStepBack = historyRef.current.length > 0;
  const executingLine = pipeline.Execute.instruction?.line ?? -1;

  // ── Sub-components ─────────────────────────────────────────────────────────

  const Header = () => (
    <View style={styles.header}>
      {/* Row 1: branding + stats */}
      <View style={styles.headerRow1}>
        <View style={styles.brandRow}>
          <View style={styles.brandDot} />
          <Text style={styles.title}>PlayARM</Text>
          <Text style={styles.titleSub}>Pipeline Simulator</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statPillLabel}>CYC</Text>
            <Text style={styles.statPillValue}>{cycle}</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statPillLabel}>PC</Text>
            <Text style={styles.statPillValue}>
              {pc.toString(16).toUpperCase().padStart(2, '0')}
            </Text>
          </View>
          {breakpoints.size > 0 && (
            <View style={[styles.statPill, styles.statPillBp]}>
              <Text style={styles.statPillLabel}>BP</Text>
              <Text style={[styles.statPillValue, { color: c.red }]}>{breakpoints.size}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.settingsBtn} onPress={() => setShowSettings(true)}>
            <Text style={styles.settingsBtnText}>⚙</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Row 2: controls */}
      <View style={styles.headerRow2}>
        {/* Speed selector */}
        <View style={styles.speedGroup}>
          {(['slow', 'normal', 'fast'] as Speed[]).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.speedBtn, speed === s && styles.speedBtnActive]}
              onPress={() => setSpeed(s)}
            >
              <Text style={[styles.speedText, speed === s && styles.speedTextActive]}>
                {s === 'slow' ? '🐢' : s === 'fast' ? '⚡' : '▷'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.controlsRight}>
          {/* Play / Pause */}
          <TouchableOpacity
            style={[styles.ctrlBtn, isPlaying && styles.ctrlBtnActive]}
            onPress={() => setIsPlaying(p => !p)}
          >
            <Text style={[styles.ctrlBtnText, isPlaying && styles.ctrlBtnTextActive]}>
              {isPlaying ? '⏸' : '▶'}
            </Text>
          </TouchableOpacity>

          {/* Step */}
          <TouchableOpacity
            style={[styles.ctrlBtn, isPlaying && styles.ctrlBtnDisabled]}
            onPress={doStep}
            disabled={isPlaying}
          >
            <Text style={[styles.ctrlBtnText, isPlaying && { opacity: 0.35 }]}>⏭</Text>
          </TouchableOpacity>

          {/* Step back */}
          <TouchableOpacity
            style={[styles.ctrlBtn, styles.ctrlBtnBack, !canStepBack && styles.ctrlBtnDisabled]}
            onPress={doStepBack}
            disabled={!canStepBack}
          >
            <Text style={[styles.ctrlBtnText, styles.ctrlBtnBackText, !canStepBack && { opacity: 0.3 }]}>⏮</Text>
          </TouchableOpacity>

          {/* Reset */}
          <TouchableOpacity style={[styles.ctrlBtn, styles.ctrlBtnReset]} onPress={doReset}>
            <Text style={[styles.ctrlBtnText, styles.ctrlBtnResetText]}>↺</Text>
          </TouchableOpacity>

          {/* Share */}
          <TouchableOpacity style={styles.ctrlBtn} onPress={handleShare}>
            <Text style={styles.ctrlBtnText}>⬆</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const PanelSwitcher = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.panelSwitcher}
      contentContainerStyle={styles.panelSwitcherContent}
    >
      {PANEL_TABS.map((tab) => {
        const active = bottomPanel === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.panelTab, active && styles.panelTabActive]}
            onPress={() => setBottomPanel(tab.key)}
          >
            <Text style={[styles.panelTabIcon, active && styles.panelTabIconActive]}>
              {tab.icon}
            </Text>
            <Text style={[styles.panelTabText, active && styles.panelTabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const TraceLog = () => {
    const copyTrace = () => {
      const text = traceLog
        .map(e => `#${e.cycle} ${e.instruction}${e.changedRegs.length ? ' [' + e.changedRegs.join(',') + ']' : ''}`)
        .join('\n');
      Clipboard.setString(text);
    };

    return (
      <View style={styles.traceContainer}>
        <View style={styles.traceTitleRow}>
          <View style={styles.traceTitleLeft}>
            <Text style={styles.traceTitle}>Trace</Text>
            {traceLog.length > 0 && (
              <View style={styles.traceCountBadge}>
                <Text style={styles.traceCountText}>{traceLog.length}</Text>
              </View>
            )}
          </View>
          <View style={styles.traceActions}>
            {traceLog.length > 0 && (
              <TouchableOpacity style={styles.traceActionBtn} onPress={copyTrace}>
                <Text style={styles.traceActionText}>Copy</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.traceActionBtn, styles.traceActionBtnRed]} onPress={() => setTraceLog([])}>
              <Text style={styles.traceActionTextRed}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView>
          {traceLog.length === 0 ? (
            <View style={styles.traceEmpty}>
              <Text style={styles.traceEmptyIcon}>◎</Text>
              <Text style={styles.traceEmptyText}>No cycles executed yet</Text>
            </View>
          ) : (
            traceLog.map((entry, i) => (
              <View key={i} style={[styles.traceRow, i === 0 && styles.traceRowLatest]}>
                <Text style={styles.traceCycle}>#{entry.cycle}</Text>
                <Text style={styles.traceInstr} numberOfLines={1}>{entry.instruction}</Text>
                <View style={styles.traceChanges}>
                  {entry.changedRegs.map(r => (
                    <Text key={r} style={styles.traceRegBadge}>{r}</Text>
                  ))}
                  {entry.flagChanges.map(f => (
                    <Text key={f} style={styles.traceFlagBadge}>{f}</Text>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  };

  const EmptyHint = () => (
    <View style={styles.emptyPipeline}>
      <Text style={styles.emptyPipelineIcon}>⬡</Text>
      <Text style={styles.emptyPipelineText}>Pipeline empty</Text>
      <Text style={styles.emptyPipelineHint}>Press ▶ Play or ⏭ Step to start</Text>
    </View>
  );

  const ActivePanel = () => {
    switch (bottomPanel) {
      case 'registers':  return <RegisterGrid registers={registers} flags={flags} changedRegs={changedRegs} changedFlags={changedFlags} regHistory={regHistoryRef.current} />;
      case 'memory':     return <MemoryList memory={memory} />;
      case 'stack':      return <StackPanel memory={memory} registers={registers} />;
      case 'tlb':        return <TLBList tlbState={tlbState} />;
      case 'pseudocode': return <PseudocodePanel code={instruction} executingLine={executingLine} />;
      case 'encoding':   return <EncodingPanel instructions={parsedInst} executingLine={executingLine} />;
      case 'stats':      return <StatsPanel cycle={cycle} traceLog={traceLog} registers={registers} />;
      case 'trace':      return <TraceLog />;
    }
  };

  // ── Tablet layout ──────────────────────────────────────────────────────────

  if (isTablet) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header />
        <SettingsModal
          visible={showSettings}
          onClose={() => setShowSettings(false)}
          settings={settings}
          onSettingsChange={s => { setSettings(s); setSpeed(s.defaultSpeed); }}
        />
        <View style={styles.tabletBody}>
          <View style={styles.tabletLeft}>
            <AssemblyEditor
              code={instruction}
              errors={assemblyResult.errors}
              onRun={handleRun}
              fontSize={settings.editorFontSize}
              executingLine={executingLine}
              breakpoints={breakpoints}
              onBreakpointsChange={setBreakpoints}
            />
            <View style={[styles.canvasContainer, { flex: 1, marginTop: 10 }]}>
              {pipelineEmpty
                ? <EmptyHint />
                : <VisualizerCanvas pipeline={pipeline} hazards={hazards} />}
            </View>
          </View>
          <View style={styles.tabletRight}>
            <View style={{ flex: 1 }}>
              <RegisterGrid registers={registers} flags={flags} changedRegs={changedRegs} changedFlags={changedFlags} />
            </View>
            <View style={{ flex: 1, marginTop: 8 }}>
              <PseudocodePanel code={instruction} executingLine={executingLine} />
            </View>
            <View style={{ flex: 1, marginTop: 8 }}>
              <StackPanel memory={memory} registers={registers} />
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Phone layout ───────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header />
      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSettingsChange={s => { setSettings(s); setSpeed(s.defaultSpeed); }}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.phoneBody}
        keyboardShouldPersistTaps="handled"
      >
        <AssemblyEditor
          code={instruction}
          errors={assemblyResult.errors}
          onRun={handleRun}
          executingLine={executingLine}
          breakpoints={breakpoints}
          onBreakpointsChange={setBreakpoints}
        />

        <View style={[styles.canvasContainer, { height: 260, marginTop: 10 }]}>
          {pipelineEmpty
            ? <EmptyHint />
            : <VisualizerCanvas pipeline={pipeline} hazards={hazards} />}
        </View>

        <PanelSwitcher />
        <View style={{ height: 340 }}>
          <ActivePanel />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(c: AppPalette) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.bg0, paddingTop: Platform.OS === 'web' ? 48 : 0 },
    header: { backgroundColor: c.bg1, borderBottomWidth: 1, borderBottomColor: c.borderSubtle, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8, gap: 8 },
    headerRow1: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    brandDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent },
    title: { color: c.text, fontSize: 16, fontWeight: '900', letterSpacing: 0.3 },
    titleSub: { color: c.textDim, fontSize: 11, fontWeight: '500' },
    statsRow: { flexDirection: 'row', gap: 5 },
    statPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.bg2, borderRadius: 5, borderWidth: 1, borderColor: c.border, paddingHorizontal: 7, paddingVertical: 3 },
    statPillBp: { borderColor: c.redBorder },
    statPillLabel: { color: c.textDim, fontSize: 8, fontWeight: '800', fontFamily: 'monospace', letterSpacing: 0.5 },
    statPillValue: { color: c.accentLight, fontSize: 11, fontWeight: '700', fontFamily: 'monospace' },
    settingsBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: c.bg2, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
    settingsBtnText: { color: c.textMuted, fontSize: 13 },
    headerRow2: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    speedGroup: { flexDirection: 'row', backgroundColor: c.bg2, borderRadius: 7, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
    speedBtn: { paddingHorizontal: 10, paddingVertical: 6 },
    speedBtnActive: { backgroundColor: c.accentBg },
    speedText: { fontSize: 13, color: c.textDim },
    speedTextActive: { color: c.accent },
    controlsRight: { flexDirection: 'row', gap: 5 },
    ctrlBtn: { backgroundColor: c.accentBg, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 7, borderWidth: 1, borderColor: c.accentBorder },
    ctrlBtnActive: { backgroundColor: c.accentStrong, borderColor: c.accent },
    ctrlBtnDisabled: { opacity: 0.35 },
    ctrlBtnBack: { backgroundColor: c.purpleBg, borderColor: c.purpleBg },
    ctrlBtnBackText: { color: c.purpleDark },
    ctrlBtnReset: { backgroundColor: c.redBg, borderColor: c.redBorder },
    ctrlBtnResetText: { color: c.red },
    ctrlBtnText: { color: c.accent, fontWeight: '700', fontSize: 14 },
    ctrlBtnTextActive: { color: c.accentCode },
    panelSwitcher: { marginTop: 10, marginBottom: 6 },
    panelSwitcherContent: { paddingHorizontal: 0, gap: 4 },
    panelTab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: c.bg2, borderWidth: 1, borderColor: c.border },
    panelTabActive: { backgroundColor: c.accentBg, borderColor: c.accentBorder },
    panelTabIcon: { color: c.textDim, fontSize: 13 },
    panelTabIconActive: { color: c.accent },
    panelTabText: { color: c.textMuted, fontSize: 11, fontWeight: '700' },
    panelTabTextActive: { color: c.accent },
    phoneBody: { padding: 12, paddingBottom: 28, gap: 0 },
    canvasContainer: { backgroundColor: c.bg0, borderColor: c.borderSubtle, borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
    tabletBody: { flex: 1, flexDirection: 'row', padding: 12, gap: 12 },
    tabletLeft: { flex: 0.55 },
    tabletRight: { flex: 0.45 },
    emptyPipeline: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
    emptyPipelineIcon: { color: c.borderSubtle, fontSize: 32 },
    emptyPipelineText: { color: c.textDim, fontSize: 13, fontWeight: '600' },
    emptyPipelineHint: { color: c.textGhost, fontSize: 11 },
    traceContainer: { flex: 1, backgroundColor: c.bg2, borderRadius: 8, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
    traceTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: c.bg1, borderBottomWidth: 1, borderBottomColor: c.border },
    traceTitleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    traceTitle: { color: c.text, fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
    traceCountBadge: { backgroundColor: c.accentBg, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 },
    traceCountText: { color: c.accent, fontSize: 10, fontWeight: '700' },
    traceActions: { flexDirection: 'row', gap: 6 },
    traceActionBtn: { backgroundColor: c.accentBg, borderRadius: 5, borderWidth: 1, borderColor: c.accentBorder, paddingHorizontal: 8, paddingVertical: 4 },
    traceActionBtnRed: { backgroundColor: c.redBg, borderColor: c.redBorder },
    traceActionText: { color: c.accent, fontSize: 11, fontWeight: '700' },
    traceActionTextRed: { color: c.red, fontSize: 11, fontWeight: '700' },
    traceEmpty: { padding: 28, alignItems: 'center', gap: 6 },
    traceEmptyIcon: { color: c.textGhost, fontSize: 24 },
    traceEmptyText: { color: c.textDim, fontSize: 12 },
    traceRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.sep, gap: 8 },
    traceRowLatest: { backgroundColor: c.accentFaint },
    traceCycle: { color: c.textDim, fontSize: 10, fontFamily: 'monospace', width: 30 },
    traceInstr: { color: c.accentCode, fontSize: 11, fontFamily: 'monospace', flex: 1 },
    traceChanges: { flexDirection: 'row', gap: 3, flexWrap: 'wrap' },
    traceRegBadge: { color: c.greenCode, backgroundColor: c.greenBg, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1, fontSize: 9, fontFamily: 'monospace' },
    traceFlagBadge: { color: c.amber, backgroundColor: c.amberBg, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1, fontSize: 9, fontFamily: 'monospace' },
  });
}
