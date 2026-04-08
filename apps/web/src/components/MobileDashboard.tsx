import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  parseAssembly, advancePipeline,
  INITIAL_REGISTERS, INITIAL_PIPELINE_STATE, INITIAL_FLAGS,
  type CpuState,
} from '@playarm/core';
import ThemeToggle from './ThemeToggle';
import './MobileDashboard.css';

// ── Types & constants ─────────────────────────────────────────────────────────

type Tab = 'code' | 'pipeline' | 'regs' | 'learn';

const DEFAULT_CODE =
  'MOV R0, #10\nMOV R1, #0\nLOOP:\nADD R1, R1, #1\nCMP R1, R0\nBNE LOOP';

const STAGES = [
  { key: 'Fetch',     label: 'Fetch',      color: '#2f81f7' },
  { key: 'Decode',    label: 'Decode',     color: '#a371f7' },
  { key: 'Execute',   label: 'Execute',    color: '#f97316' },
  { key: 'Memory',    label: 'Memory',     color: '#22c55e' },
  { key: 'WriteBack', label: 'Write Back', color: '#f85149' },
] as const;

const FLAGS = ['N', 'Z', 'C', 'V'] as const;
const REGS  = ['R0','R1','R2','R3','R4','R5','R6','R7','PC','LR','SP'];

const QUICK_PROGRAMS = [
  { label: 'Count to 10',  code: 'MOV R0, #0\nMOV R1, #10\nLOOP:\nADD R0, R0, #1\nCMP R0, R1\nBNE LOOP' },
  { label: 'Factorial 5',  code: 'MOV R0, #5\nMOV R1, #1\nFACT:\nMUL R1, R1, R0\nSUBS R0, R0, #1\nBNE FACT' },
  { label: 'ADD & SUB',    code: 'MOV R0, #25\nMOV R1, #10\nADD R2, R0, R1\nSUB R3, R0, R1' },
  { label: 'Bitwise ops',  code: 'MOV R0, #0xFF\nMOV R1, #0x0F\nAND R2, R0, R1\nORR R3, R0, R1\nEOR R4, R0, R1' },
  { label: 'Stack',        code: 'MOV R0, #42\nMOV R1, #99\nPUSH {R0}\nPUSH {R1}\nPOP {R2}\nPOP {R3}' },
  { label: 'Shifts',       code: 'MOV R0, #3\nLSL R1, R0, #3\nLSR R2, R1, #1' },
];

const NAV_TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'code',     icon: '⌨',  label: 'Code'     },
  { id: 'pipeline', icon: '◈',  label: 'Pipeline' },
  { id: 'regs',     icon: '▤',  label: 'Registers'},
  { id: 'learn',    icon: '◉',  label: 'Learn'    },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function initCpu(): CpuState {
  return {
    pc: 0,
    registers: { ...INITIAL_REGISTERS },
    memory: {},
    flags: { ...INITIAL_FLAGS },
    pipeline: JSON.parse(JSON.stringify(INITIAL_PIPELINE_STATE)),
    clock: 0,
  };
}

function allEmpty(cpu: CpuState): boolean {
  return Object.values(cpu.pipeline).every(s => s.instruction === null);
}

function hex(n: number): string {
  return '0x' + (n >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MobileDashboard() {
  const [tab,       setTab]       = useState<Tab>('code');
  const [code,      setCode]      = useState(DEFAULT_CODE);
  const [cpu,       setCpu]       = useState<CpuState>(initCpu);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDone,    setIsDone]    = useState(false);

  // Refs prevent stale closures in interval callbacks
  const cpuRef    = useRef(cpu);
  const doneRef   = useRef(isDone);
  const parsedRef = useRef(parseAssembly(code));
  cpuRef.current  = cpu;
  doneRef.current = isDone;

  const parsed = useMemo(() => parseAssembly(code), [code]);
  parsedRef.current = parsed;

  // ── Step ───────────────────────────────────────────────────────────────────

  const step = useCallback(() => {
    if (doneRef.current) return;
    const next = advancePipeline(cpuRef.current, parsedRef.current.instructions);
    setCpu(next);
    if (next.clock > 0 && allEmpty(next)) {
      setIsPlaying(false);
      setIsDone(true);
    }
  }, []);

  // ── Auto-play interval ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(step, 800);
    return () => clearInterval(id);
  }, [isPlaying, step]);

  // ── Reset ──────────────────────────────────────────────────────────────────

  function reset() {
    setIsPlaying(false);
    setIsDone(false);
    setCpu(initCpu());
  }

  function loadProgram(c: string) {
    setCode(c);
    setIsPlaying(false);
    setIsDone(false);
    setCpu(initCpu());
    setTab('code');
  }

  const exLine   = cpu.pipeline.Execute.instruction?.line ?? -1;
  const hasErrors = parsed.errors.length > 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mdb-root">

      {/* Header */}
      <header className="mdb-header">
        <div className="mdb-header-top">
          <span className="mdb-logo">PlayARM</span>
          <div className="mdb-header-meta">
            <span className="mdb-cycle">
              {cpu.clock > 0 ? `Cycle ${cpu.clock}` : 'Ready'}
            </span>
            <ThemeToggle />
          </div>
        </div>

        <div className="mdb-controls">
          <button className="mdb-btn mdb-reset" onClick={reset} title="Reset">
            ↺ Reset
          </button>
          <button
            className="mdb-btn mdb-step"
            onClick={() => { step(); setTab('pipeline'); }}
            disabled={isDone || hasErrors}
          >
            ⏭ Step
          </button>
          <button
            className={`mdb-btn mdb-play${isPlaying ? ' active' : ''}`}
            onClick={() => {
              if (!isPlaying) setTab('pipeline');
              setIsPlaying(p => !p);
            }}
            disabled={isDone || hasErrors}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
        </div>

        {isDone && (
          <div className="mdb-done">
            ✓ Complete — {cpu.clock} cycle{cpu.clock !== 1 ? 's' : ''}
          </div>
        )}
      </header>

      {/* Content */}
      <main className="mdb-content">

        {/* ── Code tab ── */}
        {tab === 'code' && (
          <div className="mdb-code">
            <div className="mdb-editor">
              <div className="mdb-gutters" aria-hidden>
                {code.split('\n').map((_, i) => (
                  <div key={i} className={`mdb-gutter${i + 1 === exLine ? ' active' : ''}`}>
                    {i + 1}
                  </div>
                ))}
              </div>
              <textarea
                className="mdb-textarea"
                value={code}
                onChange={e => { setCode(e.target.value); reset(); }}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                autoComplete="off"
                data-gramm="false"
              />
            </div>
            {hasErrors && (
              <div className="mdb-errors">
                {parsed.errors.map((e, i) => (
                  <div key={i} className="mdb-error">
                    <span className="mdb-error-ln">Line {e.line}</span>
                    <span className="mdb-error-msg">{e.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Pipeline tab ── */}
        {tab === 'pipeline' && (
          <div className="mdb-pipeline">
            {STAGES.map(stage => {
              const content = cpu.pipeline[stage.key as keyof typeof cpu.pipeline];
              const instr   = content.instruction;
              return (
                <div
                  key={stage.key}
                  className={`mdb-stage${instr ? ' active' : ''}`}
                  style={{ '--c': stage.color } as React.CSSProperties}
                >
                  <div className="mdb-stage-bar" />
                  <div className="mdb-stage-name" style={{ color: stage.color }}>
                    {stage.label}
                  </div>
                  <div className="mdb-stage-body">
                    {instr ? (
                      <>
                        <span className="mdb-stage-raw">{instr.raw}</span>
                        <span className="mdb-stage-line">line {instr.line}</span>
                      </>
                    ) : (
                      <span className="mdb-stage-idle">idle</span>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="mdb-flags">
              {FLAGS.map(f => (
                <div key={f} className={`mdb-flag${cpu.flags[f] ? ' set' : ''}`}>
                  <span className="mdb-flag-name">{f}</span>
                  <span className="mdb-flag-val">{cpu.flags[f] ? '1' : '0'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Registers tab ── */}
        {tab === 'regs' && (
          <div className="mdb-regs">
            <div className="mdb-reg-grid">
              {REGS.map(r => (
                <div key={r} className="mdb-reg">
                  <span className="mdb-reg-name">{r}</span>
                  <span className="mdb-reg-val">{hex(cpu.registers[r] ?? 0)}</span>
                </div>
              ))}
            </div>

            {Object.keys(cpu.memory).length > 0 && (
              <>
                <div className="mdb-section-title">Memory</div>
                <div className="mdb-mem-list">
                  {Object.entries(cpu.memory).slice(0, 20).map(([addr, val]) => (
                    <div key={addr} className="mdb-mem-row">
                      <span className="mdb-mem-addr">{hex(Number(addr))}</span>
                      <span className="mdb-mem-val">{hex(val as number)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Learn tab ── */}
        {tab === 'learn' && (
          <div className="mdb-learn">
            <div className="mdb-section-title">Quick Programs</div>
            {QUICK_PROGRAMS.map(p => (
              <button
                key={p.label}
                className="mdb-prog"
                onClick={() => loadProgram(p.code)}
              >
                <span className="mdb-prog-label">{p.label}</span>
                <span className="mdb-prog-arrow">→</span>
              </button>
            ))}

            <div className="mdb-section-title" style={{ marginTop: 24 }}>Theme</div>
            <div className="mdb-theme-row"><ThemeToggle /></div>

            <p className="mdb-tip">
              For the full simulator — pipeline canvas, cloud save, exercises, and reference — open PlayARM on a desktop browser.
            </p>
          </div>
        )}
      </main>

      {/* Bottom nav */}
      <nav className="mdb-nav">
        {NAV_TABS.map(t => (
          <button
            key={t.id}
            className={`mdb-nav-btn${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="mdb-nav-icon">{t.icon}</span>
            <span className="mdb-nav-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
