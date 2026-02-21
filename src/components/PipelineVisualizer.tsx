import { useState, useMemo, useEffect } from 'react'
import { parseAssembly } from '../core/assembler'
import { VisualizerCanvas } from './VisualizerCanvas'
import { InstructionInput } from './InstructionInput'
import { ControlPanel } from './ControlPanel'
import { INITIAL_REGISTERS, INITIAL_PIPELINE_STATE, INITIAL_FLAGS, CpuState } from '../core/types';
import { advancePipeline } from '../core/pipeline';
import { isFirebaseInitialized } from '../firebase';
import { saveProgram, listPrograms, Program, deleteProgram, updateProgram } from '../services/firestoreService';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

export const PipelineVisualizer = () => {
    const [programTitle, setProgramTitle] = useState('ARM Simulator Demo');
    const [instruction, setInstruction] = useState('MOV R0, #10\nMOV R1, #0\nLOOP:\nADD R1, R1, #1\nCMP R1, R0\nBNE LOOP\nSTR R1, [R2]')
    const [isPlaying, setIsPlaying] = useState(false)
    const [showLoadList, setShowLoadList] = useState(false);
    const [savedPrograms, setSavedPrograms] = useState<Program[]>([]);
    const [currentProgramId, setCurrentProgramId] = useState<string | null>(null);

    const [cycle, setCycle] = useState(0);
    const [pc, setPc] = useState(0);
    const [registers, setRegisters] = useState(INITIAL_REGISTERS);
    const [memory, setMemory] = useState<Record<number, number>>({});
    const [flags, setFlags] = useState(INITIAL_FLAGS);
    const [pipeline, setPipeline] = useState(INITIAL_PIPELINE_STATE);

    const [showOfflineWarning, setShowOfflineWarning] = useState(!isFirebaseInitialized);

    const assemblyResult = useMemo(() => parseAssembly(instruction), [instruction]);
    const parsedInst = assemblyResult.instructions;
    const assemblyErrors = assemblyResult.errors;

    const performStep = () => {
        if (assemblyErrors.length > 0) return; // Don't run if there are errors

        const currentCpuState: CpuState = {
            clock: cycle,
            pc,
            registers,
            memory,
            flags,
            pipeline
        };

        const nextState = advancePipeline(currentCpuState, parsedInst);

        setCycle(nextState.clock);
        setPc(nextState.pc);
        setRegisters(nextState.registers);
        setMemory(nextState.memory);
        setFlags(nextState.flags);
        setPipeline(nextState.pipeline);
    };

    const handlePlay = () => {
        setIsPlaying(!isPlaying);
    };

    const handleStep = () => {
        performStep();
    };

    const handleReset = () => {
        setCycle(0);
        setPc(0);
        setRegisters(INITIAL_REGISTERS);
        setMemory({});
        setFlags(INITIAL_FLAGS);
        setPipeline(INITIAL_PIPELINE_STATE);
        setIsPlaying(false);
    };

    const handleSave = async () => {
        try {
            if (currentProgramId) {
                await updateProgram(currentProgramId, { title: programTitle, assemblyText: instruction });
                alert('Program updated successfully!');
            } else {
                const id = await saveProgram({ title: programTitle, assemblyText: instruction });
                setCurrentProgramId(id);
                alert('Program saved successfully!');
            }
            // Refresh the list automatically
            const programs = await listPrograms();
            setSavedPrograms(programs);
            setShowLoadList(true);
        } catch (error) {
            alert('Failed to save program.');
        }
    };

    const handleLoad = async () => {
        try {
            const programs = await listPrograms();
            setSavedPrograms(programs);
            setShowLoadList(!showLoadList);
        } catch (error) {
            alert('Failed to load programs.');
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
        } catch (error) {
            alert('Failed to delete program.');
        }
    };

    const loadProgram = (p: Program) => {
        setProgramTitle(p.title);
        setInstruction(p.assemblyText);
        setCurrentProgramId(p.id || null);
        setShowLoadList(false);
        handleReset();
    };

    // Auto-step when playing
    useEffect(() => {
        if (isPlaying) {
            const interval = setInterval(() => {
                performStep();
            }, 800);
            return () => clearInterval(interval);
        }
    }, [isPlaying]);

    const currentSignals = pipeline.Decode.controlSignals;

    return (
        <div className="app-container">
            <header className="header">
                <h1>PlayARM</h1>
                <div className="stat-group">
                    <button
                        className="btn btn-outline"
                        onClick={() => auth && signOut(auth)}
                        style={{ marginRight: '1rem', fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                    >
                        Sign Out
                    </button>
                    <div className="stat">Cycle: <strong>{cycle}</strong></div>
                    <div className="stat">PC: <strong>0x{pc.toString(16).toUpperCase().padStart(4, '0')}</strong></div>
                </div>
            </header>

            {!isFirebaseInitialized && showOfflineWarning && (
                <div className="offline-warning">
                    <span>⚠️ Offline Mode: Cloud persistence features are disabled.</span>
                    <button onClick={() => setShowOfflineWarning(false)}>×</button>
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
                    />

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
                        <h3>Registers</h3>
                        <div className="registers-grid">
                            {Object.entries(registers).map(([reg, val]) => (
                                <div key={reg} className="reg-item">
                                    <span className="reg-label">{reg}</span>
                                    <span className="reg-val">{val}</span>
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
                                        <span className="mem-val">{val}</span>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </section>
                <ControlPanel
                    onPlay={handlePlay}
                    onStep={handleStep}
                    onReset={handleReset}
                    isPlaying={isPlaying}
                />
            </main>
        </div>
    );
};

export default PipelineVisualizer;
