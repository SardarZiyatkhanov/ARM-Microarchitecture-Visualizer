import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { User } from 'firebase/auth';
import { parseAssembly } from '../core/assembler'
import { VisualizerCanvas } from './VisualizerCanvas'
import { InstructionInput } from './InstructionInput'
import { INITIAL_REGISTERS, INITIAL_PIPELINE_STATE, INITIAL_FLAGS, CpuState } from '../core/types';
import { advancePipeline } from '../core/pipeline';
import { isFirebaseInitialized } from '../firebase';
import { saveProgram, listPrograms, Program, deleteProgram, updateProgram } from '../services/firestoreService';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { createEmptyTLB, translateAddress, TLBState, MemoryAccessResult } from '../core/memory';
import { TLBVisualizer } from './TLBVisualizer';
import ThemeToggle from './ThemeToggle';

const SPEED_OPTIONS = [
    { label: 'Slow', ms: 1400 },
    { label: 'Normal', ms: 800 },
    { label: 'Fast', ms: 250 },
];

interface PipelineVisualizerProps {
    user?: User | null;
}

export const PipelineVisualizer = ({ user }: PipelineVisualizerProps) => {
    const [programTitle, setProgramTitle] = useState('ARM Simulator Demo');
    const [instruction, setInstruction] = useState('MOV R0, #10\nMOV R1, #0\nLOOP:\nADD R1, R1, #1\nCMP R1, R0\nBNE LOOP\nSTR R1, [R2]')
    const [isPlaying, setIsPlaying] = useState(false)
    const [showLoadList, setShowLoadList] = useState(false);
    const [savedPrograms, setSavedPrograms] = useState<Program[]>([]);
    const [currentProgramId, setCurrentProgramId] = useState<string | null>(null);
    const [speed, setSpeed] = useState(800);
    const [displayFormat, setDisplayFormat] = useState<'hex' | 'decimal'>('hex');
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

    const [toastMsg, setToastMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
    const userMenuBtnRef = useRef<HTMLButtonElement>(null);

    const showToast = (text: string, type: 'success' | 'error') => {
        setToastMsg({ text, type });
        setTimeout(() => setToastMsg(null), 3000);
    };

    const [showOfflineWarning, setShowOfflineWarning] = useState(!isFirebaseInitialized);

    const assemblyResult = useMemo(() => parseAssembly(instruction), [instruction]);
    const parsedInst = assemblyResult.instructions;
    const assemblyErrors = assemblyResult.errors;

    const performStep = () => {
        if (assemblyErrors.length > 0) return;

        const currentCpuState: CpuState = {
            clock: cycle,
            pc,
            registers,
            memory,
            flags,
            pipeline
        };

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

    const handleLoad = async () => {
        try {
            const programs = await listPrograms();
            setSavedPrograms(programs);
            setShowLoadList(!showLoadList);
        } catch (error) {
            console.error('Load failed:', error);
            showToast('Failed to load programs.', 'error');
        }
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

    const formatVal = (val: number) =>
        displayFormat === 'hex'
            ? '0x' + val.toString(16).toUpperCase().padStart(8, '0')
            : String(val);

    const formatMemVal = (val: number) =>
        displayFormat === 'hex'
            ? '0x' + val.toString(16).toUpperCase().padStart(4, '0')
            : String(val);

    return (
        <div className="app-container">
            <header className="header">
                <h1>PlayARM</h1>
                <div className="stat-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div className="stat">Cycle: <strong>{cycle}</strong></div>
                    <div className="stat">PC: <strong>0x{pc.toString(16).toUpperCase().padStart(4, '0')}</strong></div>

                    <div style={{ width: '1px', height: '22px', background: 'var(--border-color)', margin: '0 0.25rem' }} />

                    <button className="btn btn-reset" onClick={handleReset}>↺ Reset</button>
                    <button className="btn btn-step" onClick={handleStep} disabled={isPlaying || isDone}>↷ Step</button>
                    <button className="btn btn-play" onClick={handlePlay} disabled={isDone}>
                        {isPlaying ? '⏸ Pause' : '▶ Play'}
                    </button>

                    <div style={{ width: '1px', height: '22px', background: 'var(--border-color)', margin: '0 0.25rem' }} />

                    {/* Speed control */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {SPEED_OPTIONS.map(opt => (
                            <button
                                key={opt.label}
                                className={`btn btn-toggle ${speed === opt.ms ? 'active' : ''}`}
                                onClick={() => setSpeed(opt.ms)}
                                style={{ height: '32px', fontSize: '0.7rem', padding: '0 0.6rem' }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    <div style={{ width: '1px', height: '22px', background: 'var(--border-color)', margin: '0 0.25rem' }} />

                    <ThemeToggle />

                    <div style={{ width: '1px', height: '22px', background: 'var(--border-color)', margin: '0 0.25rem' }} />

                    {/* ── User avatar + dropdown ── */}
                    <div className="user-menu-root" style={{ position: 'relative' }}>
                        <button
                            ref={userMenuBtnRef}
                            onClick={() => {
                                if (userMenuBtnRef.current) {
                                    const r = userMenuBtnRef.current.getBoundingClientRect();
                                    setMenuPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
                                }
                                setShowUserMenu(v => !v);
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0.3rem 0.6rem', cursor: 'pointer', color: '#f0f6fc' }}
                        >
                            {user?.photoURL ? (
                                <img src={user.photoURL} alt="avatar" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#fff' }}>
                                    {user?.isAnonymous ? '?' : (user?.displayName?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()}
                                </div>
                            )}
                            <span style={{ fontSize: '0.8rem', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {user?.isAnonymous ? 'Guest' : (user?.displayName ?? user?.email ?? 'User')}
                            </span>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style={{ opacity: 0.6 }}>
                                <path d="M6 8L1 3h10z"/>
                            </svg>
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
                        parsed={parsedInst}
                        errors={assemblyErrors}
                        currentPc={pc}
                    />

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
                                return (
                                    <div key={stageName} className={`stage-card ${isActive ? 'active' : ''}`}>
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
                            {Object.entries(flags).map(([f, val]) => (
                                <span key={f} className={`flag ${val ? 'set' : ''}`}>{f}</span>
                            ))}
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
                            </div>
                        </div>
                        <div className="registers-grid">
                            {Object.entries(registers).map(([reg, val]) => (
                                <div key={reg} className="reg-item">
                                    <span className="reg-label">{reg}</span>
                                    <span className="reg-val">{formatVal(val)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="status-section">
                        <h3>Memory Viewer</h3>
                        <div className="memory-list">
                            {Object.keys(memory).length === 0 ? <div className="text-muted">Empty</div> :
                                Object.entries(memory).map(([addr, val]) => (
                                    <div key={addr} className="mem-item">
                                        <span className="mem-addr">0x{parseInt(addr).toString(16).toUpperCase().padStart(4, '0')}</span>
                                        <span className="mem-val">{formatMemVal(val)}</span>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </section>

            </main>
        </div>
    );
};

export default PipelineVisualizer;
