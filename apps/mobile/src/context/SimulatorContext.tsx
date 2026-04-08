import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Flags } from '@playarm/core';

const STORAGE_KEY = 'playarm_program';

const DEFAULT_PROGRAM =
  'MOV R0, #10\n' +
  'MOV R1, #0\n' +
  'LOOP:\n' +
  'ADD R1, R1, R0\n' +
  'SUBS R0, R0, #1\n' +
  'BGT LOOP\n' +
  'MOV R2, #0\n' +
  'STR R1, [R2]';

interface SimulatorContextValue {
  program: string;
  setProgram: (code: string) => void;
  registers: Record<string, number>;
  setRegisters: (regs: Record<string, number>) => void;
  flags: Flags;
  setFlags: (f: Flags) => void;
  programLoaded: boolean;
}

const SimulatorContext = createContext<SimulatorContextValue>({
  program: DEFAULT_PROGRAM,
  setProgram: () => {},
  registers: {},
  setRegisters: () => {},
  flags: { N: false, Z: false, C: false, V: false },
  setFlags: () => {},
  programLoaded: false,
});

export function SimulatorProvider({ children }: { children: React.ReactNode }) {
  const [program, setProgramState] = useState(DEFAULT_PROGRAM);
  const [registers, setRegisters] = useState<Record<string, number>>({});
  const [flags, setFlags] = useState<Flags>({ N: false, Z: false, C: false, V: false });
  const [programLoaded, setProgramLoaded] = useState(false);

  // Load persisted program on startup
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(saved => {
        if (saved && saved.trim().length > 0) {
          setProgramState(saved);
        }
      })
      .catch(() => {})
      .finally(() => setProgramLoaded(true));
  }, []);

  const setProgram = (code: string) => {
    setProgramState(code);
    AsyncStorage.setItem(STORAGE_KEY, code).catch(() => {});
  };

  return (
    <SimulatorContext.Provider value={{ program, setProgram, registers, setRegisters, flags, setFlags, programLoaded }}>
      {children}
    </SimulatorContext.Provider>
  );
}

export function useSimulator() {
  return useContext(SimulatorContext);
}
