import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PipelineState, CpuState } from '@playarm/core';

interface VisualizerCanvasProps {
    pipelineState?: PipelineState;
    cpuState?: CpuState;
}

// ── Design constants (in a 700 × 480 design canvas) ───────────────────────────
// All positions are fractions; actual px = fraction × measured container size.
const D = { w: 700, h: 480 } as const;

// Vertical fractions
const V = {
    dotCY:    32  / D.h,   // stage dot centre-y
    dotLblY:  52  / D.h,   // stage dot label
    hduTop:   76  / D.h,   // HDU top
    hduH:     48  / D.h,
    blkTop:   148 / D.h,   // main blocks top
    blkH:     100 / D.h,
    wbRoute1: 268 / D.h,   // first WB elbow (ALU WB)
    wbRoute2: 285 / D.h,   // second WB elbow (MEM WB)
    fwdTop:   318 / D.h,   // FWD top
    fwdH:     46  / D.h,
};

// Horizontal fractions
const H = {
    imLeft:  0.04,  imRight: 0.20,   // INST MEM
    rfLeft:  0.24,  rfRight: 0.41,   // REG FILE
    alLeft:  0.47,  alRight: 0.60,   // ALU
    dmLeft:  0.65,  dmRight: 0.82,   // DATA MEM
    wbDotX:  0.92,                   // WriteBack dot
};

// ── Small helper components ────────────────────────────────────────────────────

const Rect: React.FC<{
    x: number; y: number; w: number; h: number;
    active: boolean; rx?: number;
}> = ({ x, y, w, h, active, rx = 7 }) => (
    <rect
        x={x} y={y} width={w} height={h} rx={rx} ry={rx}
        className={active ? 'dp-block dp-block--active' : 'dp-block'}
    />
);

const BlockLabel: React.FC<{
    cx: number; cy: number; lines: string[]; active: boolean; detail?: string;
}> = ({ cx, cy, lines, active, detail }) => {
    const lineH = 15;
    const totalH = lines.length * lineH;
    const startY = detail ? cy - totalH / 2 - 7 : cy - totalH / 2 + lineH / 2;
    return (
        <>
            {lines.map((l, i) => (
                <text
                    key={i}
                    x={cx} y={startY + i * lineH}
                    className={active ? 'dp-label dp-label--active' : 'dp-label'}
                    textAnchor="middle" dominantBaseline="middle"
                >{l}</text>
            ))}
            {detail && (
                <text x={cx} y={cy + totalH / 2 + 4}
                    className="dp-detail" textAnchor="middle" dominantBaseline="middle"
                >{detail}</text>
            )}
        </>
    );
};

const PipeReg: React.FC<{ x: number; top: number; h: number; label: string }> = ({ x, top, h, label }) => (
    <g>
        <rect x={x}     y={top} width={3} height={h} className="pipe-reg-bar" />
        <rect x={x + 5} y={top} width={3} height={h} className="pipe-reg-bar" />
        <text x={x + 4} y={top + h + 13} className="pipe-reg-label" textAnchor="middle">{label}</text>
    </g>
);

const Flow: React.FC<{ d: string; active: boolean }> = ({ d, active }) => (
    <path
        d={d} fill="none"
        className={active ? 'flow-active' : 'flow-inactive'}
        markerEnd={active ? 'url(#mk-active)' : 'url(#mk)'}
    />
);

const Lbl: React.FC<{
    x: number; y: number; anchor?: 'start' | 'middle' | 'end'; children: string;
}> = ({ x, y, anchor = 'middle', children }) => (
    <text x={x} y={y} className="arrow-label" textAnchor={anchor}>{children}</text>
);

// ── Main component ─────────────────────────────────────────────────────────────

export const VisualizerCanvas: React.FC<VisualizerCanvasProps> = ({ pipelineState, cpuState }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [cw, setCw] = useState<number>(D.w);   // measured container width
    const ch = (cw / D.w) * D.h;        // height scales with width → no letterboxing

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(([e]) => setCw(Math.max(e.contentRect.width, 320)));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') || 'dark');
    useEffect(() => {
        const el = document.documentElement;
        const upd = () => setTheme(el.getAttribute('data-theme') || 'dark');
        upd();
        const obs = new MutationObserver(ms => { for (const m of ms) if (m.attributeName === 'data-theme') upd(); });
        obs.observe(el, { attributes: true });
        return () => obs.disconnect();
    }, []);

    // ── Convenience: convert design fractions → actual px ─────────────────────
    const x = useCallback((f: number) => f * cw, [cw]);
    const y = useCallback((f: number) => f * ch, [ch]);

    // ── Block extents ──────────────────────────────────────────────────────────
    const imL = x(H.imLeft),  imR = x(H.imRight);
    const rfL = x(H.rfLeft),  rfR = x(H.rfRight);
    const alL = x(H.alLeft),  alR = x(H.alRight);
    const dmL = x(H.dmLeft),  dmR = x(H.dmRight);

    const blkTop  = y(V.blkTop);
    const blkH    = y(V.blkH);
    const blkBot  = blkTop + blkH;
    const blkMidY = blkTop + blkH / 2;

    const imCX = (imL + imR) / 2;
    const rfCX = (rfL + rfR) / 2;
    const alCX = (alL + alR) / 2;
    const dmCX = (dmL + dmR) / 2;

    // HDU
    const hduW  = rfR - rfL + 20;
    const hduL  = rfL - 10;
    const hduT  = y(V.hduTop);
    const hduH2 = y(V.hduH);
    const hduCX = hduL + hduW / 2;
    const hduCY = hduT + hduH2 / 2;

    // FWD
    const fwdW  = alR - alL + 40;
    const fwdL  = alL - 20;
    const fwdT  = y(V.fwdTop);
    const fwdH2 = y(V.fwdH);
    const fwdCX = fwdL + fwdW / 2;
    const fwdCY = fwdT + fwdH2 / 2;

    // Pipeline reg x positions (midpoint between blocks)
    const ifidX  = (imR + rfL) / 2 - 4;
    const idexX  = (rfR + alL) / 2 - 4;
    const exmemX = (alR + dmL) / 2 - 4;
    const memwbX = dmR + 20;

    const pipeTop = blkTop - 10;
    const pipeH   = blkH + 20;

    // Stage dots
    const dotY   = y(V.dotCY);
    const lblY   = y(V.dotLblY);
    const stageDots = [
        { name: 'Fetch',     cx: imCX },
        { name: 'Decode',    cx: rfCX },
        { name: 'Execute',   cx: alCX },
        { name: 'Memory',    cx: dmCX },
        { name: 'WriteBack', cx: x(H.wbDotX) },
    ];

    // ── Active states ──────────────────────────────────────────────────────────
    const stages = ['Fetch', 'Decode', 'Execute', 'Memory', 'WriteBack'] as const;
    const currentStage      = stages.find(s => pipelineState?.[s]?.instruction);
    const currentInstruction = currentStage ? pipelineState?.[currentStage]?.instruction : null;
    const controlSignals    = pipelineState?.Decode?.controlSignals;

    const fetchOn = currentStage === 'Fetch';
    const regOn   = currentStage === 'Decode' || currentStage === 'WriteBack';
    const aluOn   = currentStage === 'Execute';
    const memOn   = currentStage === 'Memory' && !!(controlSignals?.memRead || controlSignals?.memWrite);
    const fwdOn   = currentStage === 'Execute';

    const a1 = currentStage === 'Decode';
    const a2 = currentStage === 'Execute';
    const a3 = currentStage === 'Memory' && !!(controlSignals?.memRead || controlSignals?.memWrite);
    const a4 = currentStage === 'WriteBack' && !!(controlSignals?.regWrite && !controlSignals?.memToReg);
    const a5 = currentStage === 'WriteBack' && !!controlSignals?.memToReg;
    const hduIn  = currentStage === 'Decode';
    const fwdEx  = currentStage === 'Execute';
    const fwdMem = currentStage === 'Memory' || currentStage === 'WriteBack';
    const fwdOut = currentStage === 'Execute';

    // ALU detail
    let aluDetail = '';
    if (aluOn && pipelineState?.Execute.decoded) {
        const { decoded, controlSignals: sigs, executionResult } = pipelineState.Execute;
        const regs = cpuState?.registers || {};
        const valA = decoded!.src1Reg ? regs[decoded!.src1Reg] : 0;
        const valB = sigs!.aluSrc === 'imm'
            ? (decoded!.immValue ?? 0)
            : (decoded!.src2Reg ? regs[decoded!.src2Reg] : 0);
        const res = executionResult ?? (sigs!.aluOp === 'MOV' ? valB : sigs!.aluOp === 'ADD' ? valA + valB : valA - valB);
        aluDetail = `${sigs!.aluOp === 'MOV' ? '' : `${valA} · `}${valB} = ${res}`;
    }

    // WB routing rows
    const wb1 = y(V.wbRoute1);
    const wb2 = y(V.wbRoute2);

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div
            ref={containerRef}
            className="microarch-container"
            style={{ width: '100%', height: `${ch}px`, position: 'relative', minHeight: 380 }}
        >
            <svg width={cw} height={ch} style={{ display: 'block', overflow: 'visible' }}>
                <defs>
                    <marker id="mk" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
                        <polygon points="0 0,7 2.5,0 5" className="arrow-inactive-marker" />
                    </marker>
                    <marker id="mk-active" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
                        <polygon points="0 0,7 2.5,0 5" className="arrow-active-marker" />
                    </marker>
                    <filter id="blk-glow" x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="b" />
                        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>

                {/* ══ Stage progress dots ════════════════════════════════════════ */}
                {stageDots.map((dot, i) => {
                    const active = currentStage === dot.name;
                    return (
                        <g key={dot.name}>
                            {i < stageDots.length - 1 && (
                                <line
                                    x1={dot.cx + 11} y1={dotY}
                                    x2={stageDots[i + 1].cx - 11} y2={dotY}
                                    className={active ? 'flow-active' : 'flow-inactive'}
                                />
                            )}
                            <circle cx={dot.cx} cy={dotY} r={11}
                                className={active ? 'stage-dot stage-dot--active' : 'stage-dot'} />
                            <text x={dot.cx} y={lblY}
                                className={active ? 'stage-dot-label stage-dot-label--active' : 'stage-dot-label'}
                                textAnchor="middle"
                            >{dot.name}</text>
                        </g>
                    );
                })}

                {/* ══ Hazard Detection Unit ══════════════════════════════════════ */}
                <Rect x={hduL} y={hduT} w={hduW} h={hduH2} active={false} />
                <BlockLabel cx={hduCX} cy={hduCY} lines={['HAZARD', 'DETECT']} active={false} />
                <text x={hduCX} y={hduT - 7} className="block-badge" textAnchor="middle">HDU</text>

                {/* ══ Pipeline register double-bar markers ══════════════════════ */}
                <PipeReg x={ifidX}  top={pipeTop} h={pipeH} label="IF/ID"  />
                <PipeReg x={idexX}  top={pipeTop} h={pipeH} label="ID/EX"  />
                <PipeReg x={exmemX} top={pipeTop} h={pipeH} label="EX/MEM" />
                <PipeReg x={memwbX} top={pipeTop} h={pipeH} label="MEM/WB" />

                {/* ══ Main datapath blocks ═══════════════════════════════════════ */}
                <Rect x={imL} y={blkTop} w={imR - imL} h={blkH} active={fetchOn} />
                <BlockLabel cx={imCX} cy={blkMidY} lines={['INST', 'MEM']} active={fetchOn} />

                <Rect x={rfL} y={blkTop - 10} w={rfR - rfL} h={blkH + 20} active={regOn} />
                <BlockLabel cx={rfCX} cy={blkMidY} lines={['REG', 'FILE']} active={regOn} />

                <Rect x={alL} y={blkTop - 5} w={alR - alL} h={blkH + 10} active={aluOn} />
                <BlockLabel cx={alCX} cy={blkMidY} lines={['ALU']} active={aluOn} detail={aluDetail} />

                <Rect x={dmL} y={blkTop - 5} w={dmR - dmL} h={blkH + 10} active={memOn} />
                <BlockLabel cx={dmCX} cy={blkMidY} lines={['DATA', 'MEM']} active={memOn} />

                {/* ══ Forwarding Unit ════════════════════════════════════════════ */}
                <Rect x={fwdL} y={fwdT} w={fwdW} h={fwdH2} active={fwdOn} />
                <BlockLabel cx={fwdCX} cy={fwdCY} lines={['FORWARD UNIT']} active={fwdOn} />
                <text x={fwdCX} y={fwdT - 7} className="block-badge" textAnchor="middle">FWD</text>

                {/* ══ Arrows ════════════════════════════════════════════════════
                    All orthogonal. Labels sit above/beside — never on top of line. */}

                {/* 1  INST MEM → REG FILE */}
                <Flow d={`M ${imR} ${blkMidY} H ${rfL - 1}`} active={a1} />
                <Lbl x={(imR + rfL) / 2} y={blkMidY - 9}>Inst [31:0]</Lbl>

                {/* 2  REG FILE → ALU */}
                <Flow d={`M ${rfR} ${blkMidY} H ${alL - 1}`} active={a2} />
                <Lbl x={(rfR + alL) / 2} y={blkMidY - 9}>Read Data 1/2</Lbl>

                {/* 3  ALU → DATA MEM */}
                <Flow d={`M ${alR} ${blkMidY} H ${dmL - 1}`} active={a3} />
                <Lbl x={(alR + dmL) / 2} y={blkMidY - 9}>ALU Result</Lbl>

                {/* 4  ALU → REG FILE  (write-back, non-load)
                    Route: down the left side of ALU zone → left → up to REG FILE bottom  */}
                <Flow d={`M ${alL + 8} ${blkBot - 5} V ${wb1} H ${rfCX} V ${blkBot + 10}`} active={a4} />
                <Lbl x={(alL + rfCX) / 2} y={wb1 + 12}>ALU Result</Lbl>

                {/* 5  DATA MEM → REG FILE  (load write-back)
                    Route: down the left side of DM zone → left → up to REG FILE bottom  */}
                <Flow d={`M ${dmL + 8} ${blkBot - 5} V ${wb2} H ${rfCX - 6} V ${blkBot + 10}`} active={a5} />
                <Lbl x={(dmL + rfCX) / 2 + 10} y={wb2 + 12}>Read Data</Lbl>

                {/* 6  REG FILE → HDU  (IF/ID.Rs,Rt — hazard check)
                    Straight up from near REG FILE top-left  */}
                <Flow d={`M ${rfCX - 16} ${blkTop - 10} V ${hduT + hduH2}`} active={hduIn} />
                <Lbl x={rfCX + 22} y={(hduT + hduH2 + blkTop - 10) / 2} anchor="start">IF/ID.Rs,Rt</Lbl>

                {/* 7  HDU → PC  (PCWrite stall — dim, no explicit signal)
                    Route: left rail → down to INST MEM left edge  */}
                <Flow d={`M ${hduL} ${hduCY} H ${imL - 12} V ${blkMidY} H ${imL - 1}`} active={false} />
                <Lbl x={(hduL + imL - 12) / 2} y={hduCY - 9}>PCWrite</Lbl>

                {/* 8  ALU → FWD  (EX/MEM.Rd)   */}
                <Flow d={`M ${alCX + 8} ${blkBot + 5} V ${fwdT - 1}`} active={fwdEx} />
                <Lbl x={alCX + 22} y={(blkBot + fwdT) / 2} anchor="start">EX/MEM.Rd</Lbl>

                {/* 9  DATA MEM → FWD  (MEM/WB.Rd)
                    Route: across left then down  */}
                <Flow d={`M ${dmL + 8} ${blkBot + 5} H ${fwdL + fwdW + 8} V ${fwdT - 1}`} active={fwdMem} />
                <Lbl x={(dmL + fwdL + fwdW) / 2} y={blkBot + 18}>MEM/WB.Rd</Lbl>

                {/* 10  FWD → ALU  (forwarded operand)
                    Route: up from FWD left zone → right to ALU lower body  */}
                <Flow d={`M ${fwdL + 12} ${fwdT} V ${blkBot + 5} H ${alCX - 8} V ${blkBot - 1}`} active={fwdOut} />
                <Lbl x={fwdL - 4} y={(fwdT + blkBot) / 2} anchor="end">Fwd A/B</Lbl>
            </svg>

            {/* ── DEBUG card ──────────────────────────────────────────────────── */}
            <div style={{
                position: 'absolute', bottom: 12, right: 12, zIndex: 10, pointerEvents: 'none',
                background: theme === 'light' ? 'rgba(255,255,255,0.94)' : 'rgba(13,15,20,0.94)',
                backdropFilter: 'blur(8px)',
                border: '1px solid var(--accent-color)',
                borderLeft: '3px solid var(--accent-color)',
                borderRadius: 8, padding: '0.45rem 0.75rem', minWidth: 160,
                boxShadow: theme === 'light'
                    ? '0 2px 16px rgba(15,23,42,0.13)'
                    : '0 4px 24px rgba(0,0,0,0.65)',
            }}>
                <div style={{ fontSize: '0.58rem', fontWeight: 700, color: 'var(--accent-color)', fontFamily: 'var(--font-sans)', marginBottom: '0.3rem', display: 'flex', justifyContent: 'space-between', letterSpacing: '0.09em' }}>
                    <span>DEBUG</span>
                    <span style={{ color: 'var(--success-color)', fontSize: '0.5rem' }}>● LIVE</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.63rem', fontFamily: 'var(--font-mono)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.2rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Stage:</span>
                        <span style={{ color: 'var(--text-primary)' }}>{currentStage || '--'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.2rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Op:</span>
                        <span style={{ color: 'var(--success-color)', fontWeight: 600 }}>{currentInstruction?.opcode || '--'}</span>
                    </div>
                    {currentStage === 'Execute' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.2rem', borderTop: '1px solid var(--border-color)', marginTop: '0.15rem', paddingTop: '0.15rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>ALU:</span>
                            <span>{controlSignals?.aluOp}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VisualizerCanvas;
