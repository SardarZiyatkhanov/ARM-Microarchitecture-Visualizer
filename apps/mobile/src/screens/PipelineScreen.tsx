import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet, Text, View, useWindowDimensions,
  TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VisualizerCanvas from '../components/VisualizerCanvas';
import TLBList from '../components/TLBList';
import MemoryList from '../components/MemoryList';
import RegisterGrid from '../components/RegisterGrid';
import AssemblyEditor from '../components/AssemblyEditor';
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

const DEFAULT_PROGRAM =
  'MOV R0, #10\n' +
  'MOV R1, #0\n' +
  'LOOP:\n' +
  'ADD R1, R1, R0\n' +
  'SUBS R0, R0, #1\n' +
  'BGT LOOP\n' +
  'MOV R2, #0\n' +
  'STR R1, [R2]';

type BottomPanel = 'registers' | 'memory' | 'tlb';

export default function PipelineScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 800;

  // ── CPU State ──────────────────────────────────────────────────────────────
  const [cycle, setCycle] = useState(0);
  const [pc, setPc] = useState(0);
  const [registers, setRegisters] = useState(INITIAL_REGISTERS);
  const [memory, setMemory] = useState<Record<number, number>>({});
  const [flags, setFlags] = useState(INITIAL_FLAGS);
  const [pipeline, setPipeline] = useState(INITIAL_PIPELINE_STATE);
  const [tlbState, setTlbState] = useState<TLBState>(createEmptyTLB());
  const tlbRef = useRef<TLBState>(createEmptyTLB());

  const [isPlaying, setIsPlaying] = useState(false);

  // ── Assembly ───────────────────────────────────────────────────────────────
  const [instruction, setInstruction] = useState(DEFAULT_PROGRAM);
  const assemblyResult = useMemo(() => parseAssembly(instruction), [instruction]);
  const parsedInst = assemblyResult.instructions;

  // ── UI State ───────────────────────────────────────────────────────────────
  const [bottomPanel, setBottomPanel] = useState<BottomPanel>('registers');

  // ── Simulation ─────────────────────────────────────────────────────────────
  const performStep = () => {
    if (assemblyResult.errors.length > 0) return;

    const currentCpuState: CpuState = {
      clock: cycle, pc, registers, memory, flags, pipeline,
    };
    const nextState = advancePipeline(currentCpuState, parsedInst);

    // TLB translation on memory-stage LDR/STR
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

    setCycle(nextState.clock);
    setPc(nextState.pc);
    setRegisters(nextState.registers);
    setMemory(nextState.memory);
    setFlags(nextState.flags);
    setPipeline(nextState.pipeline);
  };

  const performReset = () => {
    setIsPlaying(false);
    setCycle(0);
    setPc(0);
    setRegisters(INITIAL_REGISTERS);
    setMemory({});
    setFlags(INITIAL_FLAGS);
    setPipeline(INITIAL_PIPELINE_STATE);
    const emptyTlb = createEmptyTLB();
    setTlbState(emptyTlb);
    tlbRef.current = emptyTlb;
  };

  const handleRun = (code: string) => {
    setInstruction(code);
    performReset();
  };

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isPlaying) {
      timeout = setTimeout(performStep, 900);
    }
    return () => clearTimeout(timeout);
  }, [isPlaying, cycle]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const activeStages = {
    Fetch:     !!pipeline.Fetch.instruction,
    Decode:    !!pipeline.Decode.instruction,
    Execute:   !!pipeline.Execute.instruction,
    Memory:    !!pipeline.Memory.instruction,
    WriteBack: !!pipeline.WriteBack.instruction,
  };

  // ── Sub-components ─────────────────────────────────────────────────────────
  const Header = () => (
    <View style={styles.headerRow}>
      <Text style={styles.title}>PlayARM</Text>
      <View style={styles.controls}>
        <Text style={styles.stat}>Cycle {cycle}</Text>

        <TouchableOpacity
          style={[styles.btn, isPlaying && styles.btnActive]}
          onPress={() => setIsPlaying(p => !p)}
        >
          <Text style={[styles.btnText, isPlaying && styles.btnActiveText]}>
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={performStep} disabled={isPlaying}>
          <Text style={[styles.btnText, isPlaying && { opacity: 0.4 }]}>⏭ Step</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.btnReset]} onPress={performReset}>
          <Text style={[styles.btnText, styles.btnResetText]}>↺ Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const PanelSwitcher = () => (
    <View style={styles.segmented}>
      {(['registers', 'memory', 'tlb'] as BottomPanel[]).map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.segTab, bottomPanel === tab && styles.segTabActive]}
          onPress={() => setBottomPanel(tab)}
        >
          <Text style={[styles.segTabText, bottomPanel === tab && styles.segTabTextActive]}>
            {tab === 'registers' ? 'Registers' : tab === 'memory' ? 'Memory' : 'TLB'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const ActivePanel = () => {
    if (bottomPanel === 'registers') return <RegisterGrid registers={registers} flags={flags} />;
    if (bottomPanel === 'memory') return <MemoryList memory={memory} />;
    return <TLBList tlbState={tlbState} />;
  };

  // ── Tablet layout ──────────────────────────────────────────────────────────
  if (isTablet) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header />
        <View style={styles.tabletBody}>
          {/* Left column: editor + canvas */}
          <View style={styles.tabletLeft}>
            <AssemblyEditor
              code={instruction}
              errors={assemblyResult.errors}
              onRun={handleRun}
            />
            <View style={[styles.canvasContainer, { flex: 1, marginTop: 12 }]}>
              <VisualizerCanvas activeStages={activeStages} />
            </View>
          </View>

          {/* Right column: registers, memory, TLB */}
          <View style={styles.tabletRight}>
            <View style={{ flex: 1 }}>
              <RegisterGrid registers={registers} flags={flags} />
            </View>
            <View style={{ flex: 1, marginTop: 12 }}>
              <MemoryList memory={memory} />
            </View>
            <View style={{ flex: 1, marginTop: 12 }}>
              <TLBList tlbState={tlbState} />
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
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.phoneBody}
        keyboardShouldPersistTaps="handled"
      >
        {/* Assembly editor */}
        <AssemblyEditor
          code={instruction}
          errors={assemblyResult.errors}
          onRun={handleRun}
        />

        {/* Pipeline canvas */}
        <View style={[styles.canvasContainer, { height: 260, marginTop: 12 }]}>
          <VisualizerCanvas activeStages={activeStages} />
        </View>

        {/* Segmented panel switcher */}
        <PanelSwitcher />
        <View style={{ height: 340 }}>
          <ActivePanel />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f1115',
  },

  // ── Header ──
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#21262d',
  },
  title: {
    color: '#f0f6fc',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stat: {
    color: '#8b949e',
    fontWeight: '600',
    fontFamily: 'monospace',
    fontSize: 12,
    marginRight: 2,
  },
  btn: {
    backgroundColor: 'rgba(47,129,247,0.12)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(47,129,247,0.3)',
  },
  btnActive: {
    backgroundColor: 'rgba(47,129,247,0.25)',
    borderColor: 'rgba(47,129,247,0.6)',
  },
  btnText: {
    color: '#2f81f7',
    fontWeight: '700',
    fontSize: 12,
  },
  btnActiveText: {
    color: '#58a6ff',
  },
  btnReset: {
    backgroundColor: 'rgba(248,81,73,0.1)',
    borderColor: 'rgba(248,81,73,0.3)',
  },
  btnResetText: {
    color: '#f85149',
  },

  // ── Phone layout ──
  phoneBody: {
    padding: 12,
    paddingBottom: 24,
    gap: 0,
  },
  canvasContainer: {
    backgroundColor: '#161b22',
    borderColor: '#30363d',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },

  // ── Segmented switcher ──
  segmented: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: '#161b22',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#30363d',
    overflow: 'hidden',
  },
  segTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#30363d',
  },
  segTabActive: {
    backgroundColor: 'rgba(47,129,247,0.15)',
  },
  segTabText: {
    color: '#8b949e',
    fontSize: 12,
    fontWeight: '600',
  },
  segTabTextActive: {
    color: '#2f81f7',
  },

  // ── Tablet layout ──
  tabletBody: {
    flex: 1,
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  tabletLeft: {
    flex: 0.55,
    flexDirection: 'column',
  },
  tabletRight: {
    flex: 0.45,
    flexDirection: 'column',
  },
});
