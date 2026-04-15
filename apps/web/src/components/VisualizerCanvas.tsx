import React, { useState, useEffect } from 'react';
import { PipelineState, CpuState } from '@playarm/core';

interface VisualizerCanvasProps {
    pipelineState?: PipelineState;
    cpuState?: CpuState;
}

// ── Internal SVG helper components ────────────────────────────────────────────

/** Rounded rectangle + centred multi-line label, glows when active */
const Block: React.FC<{
    x: number; y: number; w: number; h: number;
    label: string; active: boolean; detail?: string;
}> = ({ x, y, w, h, label, active, detail }) => {
    const lines = label.split('\n');
    const lineH = 15;
    const totalH = lines.length * lineH;
    const baseY = detail
        ? y + h / 2 - totalH / 2 - 8
        : y + h / 2 - totalH / 2 + lineH / 2;
    return (
        <g>
            <rect
                x={x} y={y} width={w} height={h} rx={6} ry={6}
                className={active ? 'dp-block dp-block--active' : 'dp-block'}
            />
            {lines.map((line, i) => (
                <text
                    key={i}
                    x={x + w / 2} y={baseY + i * lineH}
                    className={active ? 'dp-label dp-label--active' : 'dp-label'}
                    textAnchor="middle" dominantBaseline="middle"
                >
                    {line}
                </text>
            ))}
            {detail && (
                <text
                    x={x + w / 2} y={y + h - 13}
                    className="dp-detail"
                    textAnchor="middle" dominantBaseline="middle"
                >
                    {detail}
                </text>
            )}
        </g>
    );
};

/** Double-bar pipeline register separator with name label below */
const PipeReg: React.FC<{ x: number; y: number; h: number; label: string }> = ({ x, y, h, label }) => (
    <g>
        <rect x={x}     y={y} width={3} height={h} className="pipe-reg-bar" />
        <rect x={x + 5} y={y} width={3} height={h} className="pipe-reg-bar" />
        <text x={x + 4} y={y + h + 13} className="pipe-reg-label" textAnchor="middle">{label}</text>
    </g>
);

/** Directed arrow path — glows accent when active */
const Arrow: React.FC<{ d: string; active: boolean }> = ({ d, active }) => (
    <path
        d={d} fill="none"
        className={active ? 'flow-active' : 'flow-inactive'}
        markerEnd={active ? 'url(#dp-arrow-active)' : 'url(#dp-arrow)'}
    />
);

/** Text label with background halo so it stays legible over crossing lines */
const Lbl: React.FC<{
    x: number; y: number;
    anchor?: 'start' | 'middle' | 'end';
    children: string;
}> = ({ x, y, anchor = 'middle', children }) => (
    <text x={x} y={y} className="arrow-label" textAnchor={anchor}>{children}</text>
);

// ─────────────────────────────────────────────────────────────────────────────

export const VisualizerCanvas: React.FC<VisualizerCanvasProps> = ({ pipelineState, cpuState }) => {
    const stages = ['Fetch', 'Decode', 'Execute', 'Memory', 'WriteBack'] as const;
    const currentStage      = stages.find(s => pipelineState?.[s]?.instruction);
    const currentInstruction = currentStage ? pipelineState?.[currentStage]?.instruction : null;
    const controlSignals    = pipelineState?.Decode?.controlSignals;

    const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') || 'dark');

    useEffect(() => {
        const el = document.documentElement;
        const update = () => setTheme(el.getAttribute('data-theme') || 'dark');
        update();
        const obs = new MutationObserver(ms => {
            for (const m of ms) if (m.attributeName === 'data-theme') update();
        });
        obs.observe(el, { attributes: true });
        return () => obs.disconnect();
    }, []);

    // ── Block active states ────────────────────────────────────────────────
    const fetchActive = currentStage === 'Fetch';
    const regActive   = currentStage === 'Decode' || currentStage === 'WriteBack';
    const aluActive   = currentStage === 'Execute';
    const memActive   = currentStage === 'Memory' && !!(controlSignals?.memRead || controlSignals?.memWrite);
    const fwdActive   = currentStage === 'Execute';

    // ── Arrow active states ────────────────────────────────────────────────
    const a1    = currentStage === 'Decode';
    const a2    = currentStage === 'Execute';
    const a3    = currentStage === 'Memory' && !!(controlSignals?.memRead || controlSignals?.memWrite);
    const a4    = currentStage === 'WriteBack' && !!(controlSignals?.regWrite && !controlSignals?.memToReg);
    const a5    = currentStage === 'WriteBack' && !!controlSignals?.memToReg;
    const hduIn = currentStage === 'Decode';
    const hduOut = false;                   // no explicit stall signal exposed
    const fwdEx  = currentStage === 'Execute';
    const fwdMem = currentStage === 'Memory' || currentStage === 'WriteBack';
    const fwdOut = currentStage === 'Execute';

    // ── ALU detail text ────────────────────────────────────────────────────
    let aluDetail = '';
    if (aluActive && pipelineState?.Execute.decoded) {
        const { decoded, controlSignals: sigs, executionResult } = pipelineState.Execute;
        const regs = cpuState?.registers || {};
        const valA = decoded!.src1Reg ? regs[decoded!.src1Reg] : 0;
        const valB = sigs!.aluSrc === 'imm'
            ? (decoded!.immValue ?? 0)
            : (decoded!.src2Reg ? regs[decoded!.src2Reg] : 0);
        const res = executionResult ??
            (sigs!.aluOp === 'MOV' ? valB : sigs!.aluOp === 'ADD' ? valA + valB : valA - valB);
        aluDetail = sigs!.aluOp === 'MOV' ? `→ ${res}` : `${valA} · ${valB} = ${res}`;
    }

    // Stage dot data — x aligned above each corresponding block centre
    const stageDots = [
        { name: 'Fetch',     cx: 91 },
        { name: 'Decode',    cx: 259 },
        { name: 'Execute',   cx: 420 },
        { name: 'Memory',    cx: 575 },
        { name: 'WriteBack', cx: 700 },
    ] as const;

    /* ─── LAYOUT (all numbers in SVG units, viewBox 0 0 780 520) ─────────────
       Zone 1  y=  0–65   Stage progress dots
       Zone 2  y= 70–122  Hazard Detection Unit
       Zone 3  y=148–252  Main datapath  (blocks + pipeline-reg markers)
       Zone 4  y=298–350  Forwarding Unit
       Zone 5  y=255–340  Writeback arrow routing space
    ─────────────────────────────────────────────────────────────────────────── */

    return (
        <div
            className="microarch-container"
            style={{ width: '100%', height: '560px', position: 'relative' }}
        >
            <svg
                width="100%" height="100%"
                viewBox="0 0 780 520"
                preserveAspectRatio="xMidYMid meet"
                style={{ display: 'block' }}
            >
                <defs>
                    <marker id="dp-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                        <polygon points="0 0,8 3,0 6" className="arrow-inactive-marker" />
                    </marker>
                    <marker id="dp-arrow-active" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                        <polygon points="0 0,8 3,0 6" className="arrow-active-marker" />
                    </marker>
                    {/* Subtle accent glow applied to active blocks via CSS filter */}
                    <filter id="block-glow" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* ══ Zone 1 — Stage progress indicator ═══════════════════════════ */}
                {stageDots.map((dot, i) => {
                    const active = currentStage === dot.name;
                    return (
                        <g key={dot.name}>
                            {/* Connector line to next dot */}
                            {i < stageDots.length - 1 && (
                                <line
                                    x1={dot.cx + 11} y1={32}
                                    x2={stageDots[i + 1].cx - 11} y2={32}
                                    className={active ? 'flow-active' : 'flow-inactive'}
                                />
                            )}
                            <circle
                                cx={dot.cx} cy={32} r={11}
                                className={active ? 'stage-dot stage-dot--active' : 'stage-dot'}
                            />
                            <text
                                x={dot.cx} y={52}
                                className={active ? 'stage-dot-label stage-dot-label--active' : 'stage-dot-label'}
                                textAnchor="middle"
                            >
                                {dot.name}
                            </text>
                        </g>
                    );
                })}

                {/* ══ Zone 2 — Hazard Detection Unit ══════════════════════════════
                    Rect: x=173..295  y=70..120   centre=(234, 95)               */}
                <Block x={173} y={70} w={122} h={50} label={"HAZARD\nDETECT"} active={false} />
                <text x={234} y={63} className="block-badge" textAnchor="middle">HDU</text>

                {/* ══ Zone 3 — Pipeline register markers ══════════════════════════
                    Each marker is a double vertical bar (3 px wide, 5 px gap).
                    Heights span from y=148 to y=252 (full block band).          */}
                {/*  IF/ID  — between INST MEM right (x=147) and REG FILE left (x=200) */}
                <PipeReg x={160} y={148} h={104} label="IF/ID"  />
                {/*  ID/EX  — between REG FILE right (x=318) and ALU left (x=372) */}
                <PipeReg x={330} y={148} h={104} label="ID/EX"  />
                {/*  EX/MEM — between ALU right (x=468) and DATA MEM left (x=516) */}
                <PipeReg x={480} y={148} h={104} label="EX/MEM" />
                {/*  MEM/WB — after DATA MEM right (x=634) */}
                <PipeReg x={646} y={148} h={104} label="MEM/WB" />

                {/* ══ Zone 3 — Main datapath blocks ═══════════════════════════════

                    INST MEM  x=35..147   y=158..240   centre=(91,  199)
                    REG FILE  x=200..318  y=148..250   centre=(259, 199)
                    ALU       x=372..468  y=153..249   centre=(420, 201)
                    DATA MEM  x=516..634  y=153..249   centre=(575, 201)         */}

                <Block x={35}  y={158} w={112} h={82}  label={"INST\nMEM"}  active={fetchActive} />
                <Block x={200} y={148} w={118} h={102} label={"REG\nFILE"}  active={regActive}   />
                <Block x={372} y={153} w={96}  h={96}  label="ALU"          active={aluActive}   detail={aluDetail} />
                <Block x={516} y={153} w={118} h={96}  label={"DATA\nMEM"}  active={memActive}   />

                {/* ══ Zone 4 — Forwarding Unit ═════════════════════════════════════
                    Rect: x=348..490  y=298..348   centre=(419, 323)             */}
                <Block x={348} y={298} w={142} h={50} label="FORWARD UNIT" active={fwdActive} />
                <text x={419} y={291} className="block-badge" textAnchor="middle">FWD</text>

                {/* ══ Arrows ═══════════════════════════════════════════════════════
                    All orthogonal. Labels sit BESIDE or ABOVE/BELOW — never ON.  */}

                {/* 1  INST MEM → REG FILE  |  fetched instruction word */}
                <Arrow d="M 147 199 H 198" active={a1} />
                <Lbl x={172} y={190}>Inst [31:0]</Lbl>

                {/* 2  REG FILE → ALU  |  two register operand values */}
                <Arrow d="M 318 199 H 370" active={a2} />
                <Lbl x={344} y={190}>Read Data 1/2</Lbl>

                {/* 3  ALU → DATA MEM  |  computed address or store value */}
                <Arrow d="M 468 199 H 514" active={a3} />
                <Lbl x={491} y={190}>ALU Result</Lbl>

                {/* 4  ALU → REG FILE  |  write-back (non-load)
                    down from ALU bottom → left → up into REG FILE bottom         */}
                <Arrow d="M 420 249 V 272 H 259 V 252" active={a4} />
                <Lbl x={333} y={280}>ALU Result</Lbl>

                {/* 5  DATA MEM → REG FILE  |  load write-back
                    down → further left → up into REG FILE bottom                 */}
                <Arrow d="M 575 249 V 290 H 257 V 252" active={a5} />
                <Lbl x={418} y={300}>Read Data</Lbl>

                {/* 6  REG FILE → HDU  |  IF/ID register fields Rs & Rt
                    straight up from near REG FILE top-left                       */}
                <Arrow d="M 245 148 V 120" active={hduIn} />
                <Lbl x={270} y={134} anchor="start">IF/ID.Rs,Rt</Lbl>

                {/* 7  HDU → PC  |  PCWrite stall signal
                    left rail down → into INST MEM left edge                      */}
                <Arrow d="M 173 95 H 16 V 199 H 33" active={hduOut} />
                <Lbl x={96} y={86}>PCWrite</Lbl>

                {/* 8  ALU → FWD  |  EX/MEM pipeline register destination (Rd)
                    straight down from ALU bottom centre                          */}
                <Arrow d="M 426 249 V 296" active={fwdEx} />
                <Lbl x={452} y={275} anchor="start">EX/MEM.Rd</Lbl>

                {/* 9  DATA MEM → FWD  |  MEM/WB pipeline register destination
                    across left then down into FWD right edge                     */}
                <Arrow d="M 516 249 H 492 V 296" active={fwdMem} />
                <Lbl x={498} y={269} anchor="start">MEM/WB.Rd</Lbl>

                {/* 10  FWD → ALU  |  forwarded operand bypasses register file
                    up then right into ALU lower body                             */}
                <Arrow d="M 378 298 V 260 H 402" active={fwdOut} />
                <Lbl x={354} y={277} anchor="end">Fwd A/B</Lbl>
            </svg>

            {/* ── DEBUG overlay (HTML so it always stays crisp) ──────────────── */}
            <div style={{
                position: 'absolute', bottom: 14, right: 14, zIndex: 10, pointerEvents: 'none',
                backgroundColor: theme === 'light' ? 'rgba(255,255,255,0.93)' : 'rgba(13,15,20,0.93)',
                backdropFilter: 'blur(6px)',
                border: '1px solid var(--accent-color)',
                borderLeft: '3px solid var(--accent-color)',
                borderRadius: 8, padding: '0.45rem 0.7rem', minWidth: 156,
                boxShadow: theme === 'light'
                    ? '0 2px 12px rgba(15,23,42,0.14)'
                    : '0 4px 20px rgba(0,0,0,0.6)',
            }}>
                <div style={{ fontSize: '0.58rem', fontWeight: 700, color: 'var(--accent-color)', fontFamily: 'var(--font-sans)', marginBottom: '0.25rem', display: 'flex', justifyContent: 'space-between', letterSpacing: '0.08em' }}>
                    <span>DEBUG</span>
                    <span style={{ color: 'var(--success-color)', fontSize: '0.5rem', letterSpacing: 0 }}>● LIVE</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.18rem', fontSize: '0.62rem', fontFamily: 'var(--font-mono)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Stage:</span>
                        <span style={{ color: 'var(--text-primary)' }}>{currentStage || '--'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Op:</span>
                        <span style={{ color: 'var(--success-color)', fontWeight: 600 }}>{currentInstruction?.opcode || '--'}</span>
                    </div>
                    {currentStage === 'Execute' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', borderTop: '1px solid var(--border-color)', marginTop: '0.15rem', paddingTop: '0.15rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>ALU:</span>
                            <span style={{ color: 'var(--text-primary)' }}>{controlSignals?.aluOp}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VisualizerCanvas;
