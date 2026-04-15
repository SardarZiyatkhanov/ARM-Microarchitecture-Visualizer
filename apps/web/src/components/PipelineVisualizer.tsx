import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { User } from 'firebase/auth';
import { parseAssembly } from '@playarm/core';
import { VisualizerCanvas } from './VisualizerCanvas';
import { InstructionInput } from './InstructionInput';
import { INITIAL_REGISTERS, INITIAL_PIPELINE_STATE, INITIAL_FLAGS, CpuState } from '@playarm/core';
import { advancePipeline } from '@playarm/core';
import { isFirebaseInitialized } from '../firebase';
import { saveProgram, listPrograms, Program, deleteProgram, updateProgram } from '../services/firestoreService';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { createEmptyTLB, translateAddress, TLBState, MemoryAccessResult } from '@playarm/core';
import { TLBVisualizer } from './TLBVisualizer';
import { StackPanel } from './StackPanel';
import { BookModePanel } from './BookModePanel';
import ThemeToggle from './ThemeToggle';
import { InstructionRefCard } from './InstructionRefCard';
import { PseudocodePanel } from './PseudocodePanel';
import { ExerciseMode } from './ExerciseMode';
import { CallingConventionViz } from './CallingConventionViz';
import { AIAssistant } from './AIAssistant';

interface TraceEntry {
    cycle: number;
    inst: string;
    regChanges: string[];
    flagChanges: string[];
}

const SPEED_OPTIONS = [
    { label: 'Slow', ms: 1400 },
    { label: 'Normal', ms: 800 },
    { label: 'Fast', ms: 250 },
];

interface PipelineVisualizerProps {
    user?: User | null;
}

const DEFAULT_PROGRAM = 'MOV R0, #10\nMOV R1, #0\nLOOP:\nADD R1, R1, #1\nCMP R1, R0\nBNE LOOP\nSTR R1, [R2]';

function getProgramFromUrl(): string {
    try {
        const param = new URLSearchParams(window.location.search).get('program');
        return param ? decodeURIComponent(param) : DEFAULT_PROGRAM;
    } catch {
        return DEFAULT_PROGRAM;
    }
}

export const PipelineVisualizer = ({ user }: PipelineVisualizerProps) => {
    const [programTitle, setProgramTitle] = useState('ARM Simulator Demo');
    const [instruction, setInstruction] = useState(getProgramFromUrl)
    const [isPlaying, setIsPlaying] = useState(false)
    const [showLoadList, setShowLoadList] = useState(false);
    const [savedPrograms, setSavedPrograms] = useState<Program[]>([]);
    const [currentProgramId, setCurrentProgramId] = useState<string | null>(null);
    const [speed, setSpeed] = useState(800);
    const [displayFormat, setDisplayFormat] = useState<'hex' | 'decimal' | 'binary'>('hex');
    const [isDone, setIsDone] = useState(false);

    const [cycle, setCycle] = useState(0);
    const [pc, setPc] = useState(0);
    const [registers, setRegisters] = useState(INITIAL_REGISTERS);
    const [memory, setMemory] = useState<Record<number, number>>({});
    const [flags, setFlags] = useState(INITIAL_FLAGS);
    const [pipeline, setPipeline] = useState(INITIAL_PIPELINE_STATE);
    const [tlbState, setTlbState] = useState<TLBState>(createEmptyTLB());
    const [lastAccess, setLastAccess] = useState<MemoryAccessResult | null>(null);
    const tlbRef = useRef<TLBState>(createEmptyTLB());
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [toastMsg, setToastMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
    const userMenuBtnRef = useRef<HTMLButtonElement>(null);

    const showToast = (text: string, type: 'success' | 'error') => {
        setToastMsg({ text, type });
        setTimeout(() => setToastMsg(null), 3000);
    };

    const [showOfflineWarning, setShowOfflineWarning] = useState(!isFirebaseInitialized);
    const [copyLinkLabel, setCopyLinkLabel] = useState('Share');
    const [history, setHistory] = useState<Array<CpuState & { tlbState: TLBState; isDone: boolean }>>([]);
    const [traceLog, setTraceLog] = useState<TraceEntry[]>([]);
    const [showLearningTools, setShowLearningTools] = useState(false);

    // Keep ?program= URL in sync with editor contents; clear history on program change
    useEffect(() => {
        const url = new URL(window.location.href);
        url.searchParams.set('program', encodeURIComponent(instruction));
        window.history.replaceState(null, '', url.toString());
        setHistory([]);
        setTraceLog([]);
    }, [instruction]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            setCopyLinkLabel('Copied!');
            setTimeout(() => setCopyLinkLabel('Share'), 2000);
        });
    };

    const assemblyResult = useMemo(() => parseAssembly(instruction), [instruction]);
    const parsedInst = assemblyResult.instructions;
    const assemblyErrors = assemblyResult.errors;

    const performStep = () => {
        if (assemblyErrors.length > 0) return;

        const prevRegs = registers;
        const prevFlagsSnap = flags;
        const completingInst = pipeline.WriteBack.instruction;

        const currentCpuState: CpuState = {
            clock: cycle,
            pc,
            registers,
            memory,
            flags,
            pipeline
        };

        // Save snapshot for step-back
        setHistory(prev => [...prev, { ...currentCpuState, tlbState: tlbRef.current, isDone }]);

        const nextState = advancePipeline(currentCpuState, parsedInst);

        // ── TLB: translate address when Memory stage has LDR/STR ──────────────
        const memStage = currentCpuState.pipeline.Memory;
        if (memStage.instruction &&
            (memStage.instruction.opcode === 'LDR' || memStage.instruction.opcode === 'STR') &&
            memStage.memoryAddress !== undefined) {
            const isWrite = memStage.instruction.opcode === 'STR';
            const { newTlbState, result } = translateAddress(
                memStage.memoryAddress,
                isWrite,
                currentCpuState.clock,
                tlbRef.current
            );
            tlbRef.current = newTlbState;
            setTlbState(newTlbState);
            setLastAccess(result);
        }
        // ─────────────────────────────────────────────────────────────────────

        // Completion detection: all stages idle after at least one cycle
        const allIdle = !nextState.pipeline.Fetch.instruction &&
            !nextState.pipeline.Decode.instruction &&
            !nextState.pipeline.Execute.instruction &&
            !nextState.pipeline.Memory.instruction &&
            !nextState.pipeline.WriteBack.instruction;
        if (allIdle && nextState.clock > 0) {
            setIsPlaying(false);
            setIsDone(true);
        }

        // Build trace entry for this cycle
        const regChanges = (Object.entries(nextState.registers) as [string, number][])
            .filter(([k, v]) => v !== prevRegs[k])
            .map(([k, v]) => `${k}: ${prevRegs[k]} → ${v}`);
        const flagChanges = (Object.entries(nextState.flags) as [string, boolean][])
            .filter(([k, v]) => v !== prevFlagsSnap[k as keyof typeof prevFlagsSnap])
            .map(([k, v]) => `${k}=${v ? '1' : '0'}`);
        if (completingInst || regChanges.length > 0 || flagChanges.length > 0) {
            const instStr = completingInst
                ? `${completingInst.opcode} ${completingInst.operands.join(', ')}`
                : '';
            setTraceLog(prev => [...prev, { cycle: cycle + 1, inst: instStr, regChanges, flagChanges }]);
        }

        setCycle(nextState.clock);
        setPc(nextState.pc);
        setRegisters(nextState.registers);
        setMemory(nextState.memory);
        setFlags(nextState.flags);
        setPipeline(nextState.pipeline);
    };

    // Keep a ref to the latest performStep to avoid stale closures in the interval
    const performStepRef = useRef(performStep);
    performStepRef.current = performStep;

    const handlePlay = () => {
        if (isDone) return;
        setIsPlaying(prev => !prev);
    };

    const handleStep = () => {
        if (isDone) return;
        performStep();
    };

    const handleStepBack = () => {
        if (history.length === 0) return;
        const snap = history[history.length - 1];
        setHistory(prev => prev.slice(0, -1));
        setCycle(snap.clock);
        setPc(snap.pc);
        setRegisters(snap.registers);
        setMemory(snap.memory);
        setFlags(snap.flags);
        setPipeline(snap.pipeline);
        tlbRef.current = snap.tlbState;
        setTlbState(snap.tlbState);
        setIsDone(snap.isDone);
        setTraceLog(prev => prev.slice(0, -1));
        setIsPlaying(false);
    };

    const handleReset = () => {
        setCycle(0);
        setPc(0);
        setRegisters(INITIAL_REGISTERS);
        setMemory({});
        setFlags(INITIAL_FLAGS);
        setPipeline(INITIAL_PIPELINE_STATE);
        const freshTlb = createEmptyTLB();
        tlbRef.current = freshTlb;
        setTlbState(freshTlb);
        setLastAccess(null);
        setIsPlaying(false);
        setIsDone(false);
        setHistory([]);
        setTraceLog([]);
    };

    const handleSave = async () => {
        setToastMsg({ text: 'Saving to cloud...', type: 'success' });

        try {
            if (currentProgramId) {
                await updateProgram(currentProgramId, { title: programTitle, assemblyText: instruction });
                showToast('Program updated successfully!', 'success');
            } else {
                const id = await saveProgram({ title: programTitle, assemblyText: instruction });
                setCurrentProgramId(id);
                showToast('Program saved successfully!', 'success');
            }
            const programs = await listPrograms();
            setSavedPrograms(programs);
            setShowLoadList(true);
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            showToast(`Error: ${errMsg}`, 'error');
        }
    };

    const handleDownload = () => {
        const blob = new Blob([instruction], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const safeName = programTitle.replace(/[^a-z0-9_\-]/gi, '_') || 'program';
        a.href = url;
        a.download = `${safeName}.s`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleLoad = () => {
        fileInputRef.current?.click();
    };

    const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result;
            if (typeof text === 'string') {
                const baseName = file.name.replace(/\.[^.]+$/, '');
                setProgramTitle(baseName || file.name);
                setInstruction(text);
                handleReset();
                showToast(`Loaded "${file.name}"`, 'success');
            }
        };
        reader.readAsText(file);
        // Reset input so the same file can be re-selected
        e.target.value = '';
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this program?')) return;
        try {
            await deleteProgram(id);
            const programs = await listPrograms();
            setSavedPrograms(programs);
            if (currentProgramId === id) {
                setCurrentProgramId(null);
            }
            showToast('Program deleted.', 'success');
        } catch (error) {
            console.error('Delete failed:', error);
            showToast('Failed to delete program.', 'error');
        }
    };

    const loadProgram = (p: Program) => {
        setProgramTitle(p.title);
        setInstruction(p.assemblyText);
        setCurrentProgramId(p.id || null);
        setShowLoadList(false);
        handleReset();
    };

    // Auto-step: uses ref so interval always calls the latest performStep
    useEffect(() => {
        if (isPlaying) {
            const interval = setInterval(() => performStepRef.current(), speed);
            return () => clearInterval(interval);
        }
    }, [isPlaying, speed]);

    // Close user menu when clicking outside
    useEffect(() => {
        if (!showUserMenu) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.user-menu-root')) setShowUserMenu(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showUserMenu]);

    // Keyboard shortcuts: Space = play/pause, ArrowRight = step
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            if (e.code === 'Space') {
                e.preventDefault();
                handlePlay();
            } else if (e.code === 'ArrowRight') {
                e.preventDefault();
                performStepRef.current();
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [isDone]);

    const currentSignals = pipeline.Decode.controlSignals;

    // Derived from history — no extra state needed
    const prevRegisters = history.length > 0 ? history[history.length - 1].registers : null;
    const prevFlags     = history.length > 0 ? history[history.length - 1].flags     : null;

    const formatVal = (val: number) => {
        if (displayFormat === 'hex') return '0x' + val.toString(16).toUpperCase().padStart(8, '0');
        if (displayFormat === 'binary') {
            const b = (val >>> 0).toString(2).padStart(32, '0');
            return b.replace(/(.{8})/g, '$1 ').trim();
        }
        return String(val);
    };


    return (
        <div className="app-container">
            <header className="header">
                {/* ── Brand ── */}
                <div className="header-brand">
                    <span className="header-logo">PlayARM</span>
                    <div className="header-stats">
                        <span className="hstat">Cycle <strong>{cycle}</strong></span>
                        <span className="hstat-sep">·</span>
                        <span className="hstat">PC <strong>0x{pc.toString(16).toUpperCase().padStart(4, '0')}</strong></span>
                    </div>
                </div>

                {/* ── Controls ── */}
                <div className="header-controls">
                    {/* Playback */}
                    <div className="hgroup">
                        <button className="hbtn hbtn-reset" onClick={handleReset} title="Reset">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.49"/></svg>
                            Reset
                        </button>
                        <button className="hbtn hbtn-step" onClick={handleStepBack} disabled={isPlaying || history.length === 0} title="Step back">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                            Back
                        </button>
                        <button className="hbtn hbtn-step" onClick={handleStep} disabled={isPlaying || isDone} title="Step forward">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                            Step
                        </button>
                        <button className="hbtn hbtn-play" onClick={handlePlay} disabled={isDone}>
                            {isPlaying
                                ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause</>
                                : <><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Play</>
                            }
                        </button>
                    </div>

                    <div className="hdivider" />

                    {/* Speed pill */}
                    <div className="speed-pill">
                        {SPEED_OPTIONS.map(opt => (
                            <button
                                key={opt.label}
                                className={`speed-opt ${speed === opt.ms ? 'active' : ''}`}
                                onClick={() => setSpeed(opt.ms)}
                            >{opt.label}</button>
                        ))}
                    </div>

                    <div className="hdivider" />

                    {/* Utilities */}
                    <div className="hgroup">
                        <button className="hbtn hbtn-util" onClick={handleCopyLink} title="Copy shareable link">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                            </svg>
                            {copyLinkLabel}
                        </button>
                        <a href="/book.pdf" target="_blank" rel="noopener noreferrer" className="hbtn hbtn-util" title="Open textbook PDF">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                            </svg>
                            Book
                        </a>
                        <ThemeToggle />
                    </div>

                    <div className="hdivider" />

                    {/* User avatar */}
                    <div className="user-menu-root" style={{ position: 'relative' }}>
                        <button
                            ref={userMenuBtnRef}
                            className="hbtn-avatar"
                            onClick={() => {
                                if (userMenuBtnRef.current) {
                                    const r = userMenuBtnRef.current.getBoundingClientRect();
                                    setMenuPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
                                }
                                setShowUserMenu(v => !v);
                            }}
                            title={user?.isAnonymous ? 'Guest' : (user?.displayName ?? user?.email ?? 'User')}
                        >
                            {user?.photoURL ? (
                                <img src={user.photoURL} alt="avatar" style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                                <div className="hbtn-avatar-initials">
                                    {user?.isAnonymous ? '?' : (user?.displayName?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()}
                                </div>
                            )}
                        </button>

                        {showUserMenu && createPortal(
                            <div className="user-menu-root" style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', minWidth: '200px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 9999, overflow: 'hidden' }}>
                                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                    {user?.isAnonymous ? (
                                        <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Signed in as Guest</p>
                                    ) : (
                                        <>
                                            <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>{user?.displayName ?? 'User'}</p>
                                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</p>
                                        </>
                                    )}
                                </div>
                                <button
                                    onClick={() => { setShowUserMenu(false); auth && signOut(auth); }}
                                    style={{ width: '100%', padding: '0.65rem 1rem', background: 'none', border: 'none', color: '#f85149', fontSize: '13px', fontWeight: 600, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                                    </svg>
                                    Sign Out
                                </button>
                            </div>,
                            document.body
                        )}
                    </div>
                </div>
            </header>

            {!isFirebaseInitialized && showOfflineWarning && (
                <div className="offline-warning">
                    <span>⚠️ Offline Mode: Cloud persistence features are disabled.</span>
                    <button onClick={() => setShowOfflineWarning(false)}>×</button>
                </div>
            )}

            {isDone && (
                <div className="completion-banner">
                    <span>✅ Program complete — all instructions retired after {cycle} cycles.</span>
                    <button onClick={handleReset}>↺ Reset</button>
                </div>
            )}

            <main className="main-content">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <InstructionInput
                        code={instruction}
                        onChange={setInstruction}
                        title={programTitle}
                        onTitleChange={setProgramTitle}
                        onSave={handleSave}
                        onLoad={handleLoad}
                        onDownload={handleDownload}
                        parsed={parsedInst}
                        errors={assemblyErrors}
                        currentPc={pc}
                    />

                    <BookModePanel
                        currentCode={instruction}
                        onLoad={(code) => { setInstruction(code); handleReset(); }}
                    />

                    {/* ── Learning Tools collapsible section ── */}
                    <div className="learning-tools-section">
                        <button
                            className="learning-tools-toggle"
                            onClick={() => setShowLearningTools(v => !v)}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                            </svg>
                            Learning Tools
                            <svg
                                width="12" height="12" viewBox="0 0 12 12" fill="currentColor"
                                style={{ marginLeft: 'auto', transition: 'transform 0.2s', transform: showLearningTools ? 'rotate(180deg)' : 'none' }}
                            >
                                <path d="M6 8L1 3h10z"/>
                            </svg>
                        </button>

                        {showLearningTools && (
                            <div className="learning-tools-body">
                                <PseudocodePanel code={instruction} currentPc={pc} parsedCount={parsedInst.length} />
                                <InstructionRefCard />
                                <ExerciseMode
                                    registers={registers}
                                    onLoad={(code) => { setInstruction(code); handleReset(); }}
                                />
                                <CallingConventionViz />
                            </div>
                        )}
                    </div>

                    {toastMsg && (
                        <div style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            background: toastMsg.type === 'success' ? 'var(--success-color)' : 'var(--danger-color)',
                            color: '#fff',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            animation: 'fadeIn 0.2s ease-out'
                        }}>
                            {toastMsg.type === 'success' ? '✅' : '❌'} {toastMsg.text}
                        </div>
                    )}

                    {showLoadList && (
                        <section className="panel" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            <h3>Saved Programs</h3>
                            {savedPrograms.length === 0 ? (
                                <p className="text-muted">No programs saved yet.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {savedPrograms.map(p => (
                                        <div key={p.id} className="mem-item" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onClick={() => loadProgram(p)}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                                <span style={{ fontWeight: 600 }}>{p.title}</span>
                                                <span style={{ fontSize: '0.65rem', opacity: 0.5 }}>
                                                    Last modified: {p.updatedAt && new Date((p.updatedAt as any).seconds * 1000).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    className="btn btn-outline"
                                                    style={{ height: '28px', padding: '0 0.75rem', fontSize: '0.7rem' }}
                                                    onClick={(e) => { e.stopPropagation(); loadProgram(p); }}
                                                >
                                                    ✎ Edit
                                                </button>
                                                <button
                                                    className="btn btn-reset"
                                                    style={{ height: '28px', padding: '0 0.75rem', fontSize: '0.7rem', background: 'rgba(248, 81, 73, 0.1)', borderColor: 'rgba(248, 81, 73, 0.2)' }}
                                                    onClick={(e) => handleDelete(e, p.id!)}
                                                >
                                                    🗑 Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}
                </div>

                <section className="panel viz-panel">
                    <VisualizerCanvas
                        pipelineState={pipeline}
                        cpuState={{
                            pc,
                            registers,
                            memory,
                            flags,
                            pipeline,
                            clock: cycle
                        }}
                    />

                    <div className="control-signals-panel">
                        <h3>Decode Control Signals</h3>
                        <div className="signals-grid">
                            {currentSignals ? Object.entries(currentSignals).map(([sig, val]) => (
                                <div key={sig} className={`signal-tag ${val ? 'active' : ''}`}>
                                    {sig}: {val.toString()}
                                </div>
                            )) : <div className="text-muted">No active instruction in Decode</div>}
                        </div>
                    </div>

                    <div className="pipeline-activity-panel" style={{ marginTop: '1.25rem' }}>
                        <h3>Pipeline Activity</h3>
                        <div className="pipeline-activity">
                            {(['Fetch', 'Decode', 'Execute', 'Memory', 'WriteBack'] as const).map((stageName) => {
                                const stage = pipeline[stageName];
                                const isActive = !!stage.instruction;
                                const stageTooltips: Record<string, string> = {
                                    Fetch:     'Reads the next instruction from program memory at the current PC address',
                                    Decode:    'Decodes the instruction, reads register values, and generates control signals',
                                    Execute:   'Performs the ALU operation or computes an effective memory address',
                                    Memory:    'Reads a value from or writes a value to data memory',
                                    WriteBack: 'Writes the result back to the destination register',
                                };
                                return (
                                    <div key={stageName} className={`stage-card ${isActive ? 'active' : ''}`} title={stageTooltips[stageName]}>
                                        <span className="stage-name">{stageName}</span>
                                        {isActive ? (
                                            <>
                                                <span className="stage-inst">{stage.instruction?.opcode}</span>
                                                <div className="stage-data">
                                                    {stageName === 'Fetch' && <span>PC: 0x{pc.toString(16)}</span>}
                                                    {stageName === 'Execute' && stage.executionResult !== undefined && (
                                                        <span>Res: <strong>{stage.executionResult}</strong></span>
                                                    )}
                                                    {stageName === 'Memory' && stage.memoryAddress !== undefined && (
                                                        <span>Addr: <strong>0x{stage.memoryAddress.toString(16)}</strong></span>
                                                    )}
                                                    {stageName === 'WriteBack' && stage.decoded?.destReg && (
                                                        <span>Reg: <strong>{stage.decoded.destReg}</strong></span>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <span className="text-muted" style={{ fontSize: '0.7rem' }}>Idle</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── TLB & Virtual Memory Panel ── */}
                    <TLBVisualizer tlbState={tlbState} lastAccess={lastAccess} />
                </section>

                <section className="panel status-panel">
                    <div className="status-section">
                        <h3>Flags</h3>
                        <div className="flags-bar">
                            {(Object.entries(flags) as [string, boolean][]).map(([f, val]) => {
                                const changed = prevFlags !== null && prevFlags[f as keyof typeof prevFlags] !== val;
                                return (
                                    <span
                                        key={f}
                                        className={`flag ${val ? 'set' : ''} ${changed ? 'flag-changed' : ''}`}
                                        title={changed ? `${f} just ${val ? 'set' : 'cleared'}` : undefined}
                                    >
                                        {f}
                                        {changed && <sup className="flag-delta">{val ? '↑' : '↓'}</sup>}
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    <div className="status-section">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                            <h3 style={{ margin: 0 }}>Registers</h3>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <button
                                    className={`btn btn-toggle ${displayFormat === 'hex' ? 'active' : ''}`}
                                    onClick={() => setDisplayFormat('hex')}
                                    style={{ height: '26px', fontSize: '0.65rem', padding: '0 0.5rem' }}
                                >HEX</button>
                                <button
                                    className={`btn btn-toggle ${displayFormat === 'decimal' ? 'active' : ''}`}
                                    onClick={() => setDisplayFormat('decimal')}
                                    style={{ height: '26px', fontSize: '0.65rem', padding: '0 0.5rem' }}
                                >DEC</button>
                                <button
                                    className={`btn btn-toggle ${displayFormat === 'binary' ? 'active' : ''}`}
                                    onClick={() => setDisplayFormat('binary')}
                                    style={{ height: '26px', fontSize: '0.65rem', padding: '0 0.5rem' }}
                                >BIN</button>
                            </div>
                        </div>
                        <div className={`registers-grid ${displayFormat === 'binary' ? 'binary-mode' : ''}`}>
                            {(Object.entries(registers) as [string, number][]).map(([reg, val]) => {
                                const changed = prevRegisters !== null && prevRegisters[reg] !== val;
                                return (
                                    <div key={reg} className={`reg-item ${changed ? 'reg-changed' : ''}`}>
                                        <span className="reg-label">{reg}</span>
                                        <span className="reg-val">{formatVal(val)}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="reg-role-legend">
                            <span>R0–R3: args/return</span>
                            <span>R4–R11: callee-saved</span>
                            <span>R12: scratch</span>
                            <span>SP · LR · PC</span>
                        </div>
                    </div>

                    <StackPanel
                        registers={registers}
                        memory={memory}
                        displayFormat={displayFormat}
                    />

                    {traceLog.length > 0 && (
                        <div className="status-section">
                            <h3>Execution Trace</h3>
                            <div className="trace-log">
                                {traceLog.map((entry, i) => (
                                    <div key={i} className="trace-entry">
                                        <span className="trace-cycle">Cycle {entry.cycle}</span>
                                        {entry.inst && <span className="trace-inst">{entry.inst}</span>}
                                        {entry.regChanges.length > 0 && (
                                            <span className="trace-changes">{entry.regChanges.join(' · ')}</span>
                                        )}
                                        {entry.flagChanges.length > 0 && (
                                            <span className="trace-flags">{entry.flagChanges.join(' ')}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>

            </main>

            {/* Hidden file input for local file loading */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".s,.asm,.txt"
                style={{ display: 'none' }}
                onChange={handleFileLoad}
            />

            <AIAssistant
                cpuState={{ pc, registers, memory, flags, pipeline, clock: cycle }}
                assemblySource={instruction}
                instructions={parsedInst}
                traceLog={traceLog}
                isDone={isDone}
            />
        </div>
    );
};

export default PipelineVisualizer;
