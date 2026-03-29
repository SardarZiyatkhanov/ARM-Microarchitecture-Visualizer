import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VisualizerCanvas from '../components/VisualizerCanvas';
import TLBList from '../components/TLBList';
import MemoryList from '../components/MemoryList';
import {
  INITIAL_REGISTERS,
  INITIAL_PIPELINE_STATE,
  INITIAL_FLAGS,
  CpuState,
  advancePipeline,
  createEmptyTLB,
  translateAddress,
  TLBState,
  parseAssembly
} from '@playarm/core';

export default function PipelineScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 800;

  // -- LIVE CPU STATE --
  const [cycle, setCycle] = useState(0);
  const [pc, setPc] = useState(0);
  const [registers, setRegisters] = useState(INITIAL_REGISTERS);
  const [memory, setMemory] = useState<Record<number, number>>({});
  const [flags, setFlags] = useState(INITIAL_FLAGS);
  const [pipeline, setPipeline] = useState(INITIAL_PIPELINE_STATE);
  const [tlbState, setTlbState] = useState<TLBState>(createEmptyTLB());
  
  const tlbRef = useRef<TLBState>(createEmptyTLB());

  const [isPlaying, setIsPlaying] = useState(false);

  // Hardcoded assembly for now
  // TODO: Add a proper mobile instruction editor component or input view
  const [instruction] = useState(
    'MOV R2, #0\n' +
    'MOV R1, #42\n' +
    'MOV R7, #0\nMOV R7, #0\nMOV R7, #0\n' +
    'STR R1, [R2]\n' +
    'MOV R2, #4\n' +
    'MOV R1, #84\n' +
    'MOV R7, #0\nMOV R7, #0\nMOV R7, #0\n' +
    'STR R1, [R2]\n' +
    'MOV R2, #8\n' +
    'MOV R1, #126\n' +
    'MOV R7, #0\nMOV R7, #0\nMOV R7, #0\n' +
    'STR R1, [R2]'
  );
  
  const assemblyResult = useMemo(() => parseAssembly(instruction), [instruction]);
  const parsedInst = assemblyResult.instructions;

  const performStep = () => {
    if (assemblyResult.errors.length > 0) return;

    const currentCpuState: CpuState = {
        clock: cycle,
        pc,
        registers,
        memory,
        flags,
        pipeline
    };

    const nextState = advancePipeline(currentCpuState, parsedInst);

    // TLB Translation on LDR/STR
    const memStage = nextState.pipeline.Memory;
    if (memStage.instruction &&
        (memStage.instruction.opcode === 'LDR' || memStage.instruction.opcode === 'STR') &&
        memStage.memoryAddress !== undefined) {
        const isWrite = memStage.instruction.opcode === 'STR';
        const { newTlbState } = translateAddress(
            memStage.memoryAddress,
            isWrite,
            nextState.clock,
            tlbRef.current
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

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isPlaying) {
      timeout = setTimeout(() => {
        performStep();
      }, 1200); // 1.2s delay per tick for easy native visualization 
    }
    return () => clearTimeout(timeout);
  }, [isPlaying, cycle]);

  // Resolve which stages to highlight concurrently based exactly on core engine presence
  const currentActiveStages = {
    Fetch: !!pipeline.Fetch.instruction,
    Decode: !!pipeline.Decode.instruction,
    Execute: !!pipeline.Execute.instruction,
    Memory: !!pipeline.Memory.instruction,
    WriteBack: !!pipeline.WriteBack.instruction,
  };

  const CustomHeader = () => (
    <View style={styles.headerRow}>
      <Text style={styles.title}>Pipeline Visualizer</Text>
      <View style={styles.controls}>
        <Text style={styles.stat}>Cycle: {cycle}</Text>
        
        <TouchableOpacity style={styles.btn} onPress={() => setIsPlaying(!isPlaying)}>
          <Text style={styles.btnText}>{isPlaying ? 'Pause' : 'Play'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={performStep} disabled={isPlaying}>
          <Text style={[styles.btnText, isPlaying && { opacity: 0.5 }]}>Step</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.btnReset]} onPress={performReset}>
          <Text style={[styles.btnText, styles.btnResetText]}>Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isTablet) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CustomHeader />
        <View style={styles.rowLayout}>
          <View style={[styles.canvasContainer, { flex: 0.55, marginRight: 16 }]}>
            <VisualizerCanvas activeStages={currentActiveStages} />
          </View>
          <View style={{ flex: 0.45, gap: 16 }}>
             <View style={{ flex: 1 }}><TLBList tlbState={tlbState} /></View>
             <View style={{ flex: 1 }}><MemoryList memory={memory} /></View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Stacked mobile layout eliminating ScrollView to preserve localized Skia Gestures and Flatlist optimizations
  return (
    <SafeAreaView style={styles.safeArea}>
      <CustomHeader />
      <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>
        <View style={[styles.canvasContainer, { flex: 0.45 }]}>
          <VisualizerCanvas activeStages={currentActiveStages} />
        </View>

        <View style={{ flex: 0.275 }}>
          <TLBList tlbState={tlbState} />
        </View>

        <View style={{ flex: 0.275 }}>
          <MemoryList memory={memory} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f1115',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexWrap: 'wrap',
    gap: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  stat: {
    color: '#8b949e',
    fontWeight: '600',
    fontFamily: 'monospace',
    marginRight: 4,
  },
  btn: {
    backgroundColor: 'rgba(47,129,247,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(47,129,247,0.3)',
  },
  btnText: {
    color: '#2f81f7',
    fontWeight: 'bold',
  },
  btnReset: {
    backgroundColor: 'rgba(248,81,73,0.1)',
    borderColor: 'rgba(248,81,73,0.3)',
  },
  btnResetText: {
    color: '#f85149',
  },
  title: {
    color: '#f0f6fc',
    fontSize: 20,
    fontWeight: 'bold',
  },
  rowLayout: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  canvasContainer: {
    backgroundColor: '#161b22',
    borderColor: '#30363d',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
