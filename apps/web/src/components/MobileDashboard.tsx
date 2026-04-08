import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  parseAssembly, advancePipeline,
  INITIAL_REGISTERS, INITIAL_PIPELINE_STATE, INITIAL_FLAGS,
  type CpuState,
} from '@playarm/core';
import { type User } from 'firebase/auth';
import {
  signInWithPopup, signOut,
  GoogleAuthProvider, GithubAuthProvider,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../firebase';
import ThemeToggle from './ThemeToggle';
import './MobileDashboard.css';

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

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

// ── Auth sheet ────────────────────────────────────────────────────────────────

function MobileAuthSheet({ onClose }: { onClose: () => void }) {
  const [view,     setView]     = useState<'main' | 'email'>('main');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [busy,     setBusy]     = useState(false);

  async function run(fn: () => Promise<unknown>) {
    setError('');
    setBusy(true);
    try { await fn(); onClose(); }
    catch (e: any) { setError(e.message ?? 'Error'); }
    finally { setBusy(false); }
  }

  return (
    <div className="mdb-overlay" onClick={onClose}>
      <div className="mdb-sheet" onClick={e => e.stopPropagation()}>
        <div className="mdb-sheet-handle" />
        <div className="mdb-sheet-title">
          {view === 'main' ? 'Sign in to PlayARM' : (isSignUp ? 'Create account' : 'Sign in with email')}
        </div>

        {error && <div className="mdb-sheet-error">{error}</div>}

        {view === 'main' ? (
          <>
            <button className="mdb-oauth-btn mdb-oauth-google" disabled={busy}
              onClick={() => run(() => signInWithPopup(auth, googleProvider))}>
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.14 0 5.95 1.08 8.17 2.84l6.1-6.1C34.46 3.11 29.5 1 24 1 14.82 1 7.07 6.48 3.6 14.24l7.1 5.52C12.46 13.72 17.77 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.52 24.5c0-1.64-.15-3.22-.42-4.75H24v9h12.67c-.55 2.96-2.2 5.47-4.67 7.15l7.18 5.58C43.3 37.42 46.52 31.45 46.52 24.5z"/>
                <path fill="#FBBC05" d="M10.7 28.24A14.6 14.6 0 0 1 9.5 24c0-1.47.25-2.9.7-4.24l-7.1-5.52A23.94 23.94 0 0 0 0 24c0 3.87.93 7.53 2.6 10.76l7.1-5.52z"/>
                <path fill="#34A853" d="M24 47c5.5 0 10.12-1.82 13.49-4.93l-7.18-5.58C28.49 37.85 26.35 38.5 24 38.5c-6.23 0-11.54-4.22-13.3-9.96l-7.1 5.52C7.07 41.52 14.82 47 24 47z"/>
              </svg>
              Continue with Google
            </button>

            <button className="mdb-oauth-btn mdb-oauth-github" disabled={busy}
              onClick={() => run(() => signInWithPopup(auth, githubProvider))}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .322.216.694.825.576C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              Continue with GitHub
            </button>

            <div className="mdb-sheet-divider"><span>or</span></div>

            <button className="mdb-email-btn" onClick={() => { setIsSignUp(false); setView('email'); }}>
              Sign in with Email
            </button>
            <button className="mdb-email-btn mdb-email-alt" onClick={() => { setIsSignUp(true); setView('email'); }}>
              Create account
            </button>
          </>
        ) : (
          <form onSubmit={e => { e.preventDefault(); run(() => isSignUp
            ? createUserWithEmailAndPassword(auth, email, password)
            : signInWithEmailAndPassword(auth, email, password)); }}>
            <input className="mdb-sheet-input" type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            <input className="mdb-sheet-input" type="password" placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)} required autoComplete={isSignUp ? 'new-password' : 'current-password'} />
            <button className="mdb-oauth-btn mdb-oauth-primary" type="submit" disabled={busy}>
              {busy ? 'Please wait…' : (isSignUp ? 'Create account' : 'Sign in')}
            </button>
            <button type="button" className="mdb-email-btn mdb-email-alt"
              onClick={() => { setView('main'); setError(''); }}>
              ← Back
            </button>
          </form>
        )}

        <p className="mdb-sheet-note">
          Sign in to save your programs and sync across devices.
        </p>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MobileDashboard({ user }: { user: User | null }) {
  const [tab,       setTab]       = useState<Tab>('code');
  const [code,      setCode]      = useState(DEFAULT_CODE);
  const [cpu,       setCpu]       = useState<CpuState>(initCpu);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDone,    setIsDone]    = useState(false);
  const [showAuth,  setShowAuth]  = useState(false);

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
            {user ? (
              <div className="mdb-avatar" title={user.email ?? 'Signed in'}>
                {(user.displayName ?? user.email ?? '?')[0].toUpperCase()}
              </div>
            ) : (
              <button className="mdb-signin-btn" onClick={() => setShowAuth(true)} title="Sign in">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </button>
            )}
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

            <div className="mdb-section-title" style={{ marginTop: 24 }}>Account</div>
            {user ? (
              <div className="mdb-account-card">
                <div className="mdb-account-info">
                  <div className="mdb-account-avatar">
                    {(user.displayName ?? user.email ?? '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="mdb-account-name">{user.displayName ?? 'Signed in'}</div>
                    <div className="mdb-account-email">{user.email ?? 'Anonymous'}</div>
                  </div>
                </div>
                <button className="mdb-signout-btn" onClick={() => signOut(auth)}>Sign out</button>
              </div>
            ) : (
              <button className="mdb-prog mdb-signin-cta" onClick={() => setShowAuth(true)}>
                <span className="mdb-prog-label">Sign in / Create account</span>
                <span className="mdb-prog-arrow">→</span>
              </button>
            )}

            <div className="mdb-section-title" style={{ marginTop: 24 }}>Theme</div>
            <div className="mdb-theme-row"><ThemeToggle /></div>

            <p className="mdb-tip">
              For the full simulator — pipeline canvas, cloud save, exercises, and reference — open PlayARM on a desktop browser.
            </p>
          </div>
        )}
      </main>

      {/* Auth bottom sheet */}
      {showAuth && <MobileAuthSheet onClose={() => setShowAuth(false)} />}

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
