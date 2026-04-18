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
    dotCY: 32 / D.h,   // stage dot centre-y
    dotLblY: 52 / D.h,   // stage dot label
    hduTop: 76 / D.h,   // HDU top
    hduH: 48 / D.h,
    blkTop: 148 / D.h,   // main blocks top
    blkH: 100 / D.h,
    wbRoute1: 268 / D.h,   // first WB elbow (ALU WB)
    wbRoute2: 285 / D.h,   // second WB elbow (MEM WB)
    fwdTop: 318 / D.h,   // FWD top
    fwdH: 46 / D.h,
};

// Horizontal fractions
const H = {
    imLeft: 0.04, imRight: 0.20,   // INST MEM
    rfLeft: 0.24, rfRight: 0.41,   // REG FILE
    alLeft: 0.47, alRight: 0.60,   // ALU
    dmLeft: 0.65, dmRight: 0.82,   // DATA MEM
    wbDotX: 0.92,                   // WriteBack dot
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
        <rect x={x} y={top} width={3} height={h} className="pipe-reg-bar" />
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
    const ch = (cw / D.w) * D.h;                 // height scales with width → no letterboxing

    // ── Raw Canvas State for Dragging ──
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const blocksDataRef = useRef<Record<string, { x: number, y: number, w: number, h: number }>>({});
    const dragStateRef = useRef<{ activeId: string | null; offsetX: number; offsetY: number }>({ activeId: null, offsetX: 0, offsetY: 0 });
    const [renderTick, setRenderTick] = useState(0);
    const redrawCanvas = () => setRenderTick(t => t + 1);

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
    const imL = x(H.imLeft), imR = x(H.imRight);
    const rfL = x(H.rfLeft), rfR = x(H.rfRight);
    const alL = x(H.alLeft), alR = x(H.alRight);
    const dmL = x(H.dmLeft), dmR = x(H.dmRight);

    const blkTop = y(V.blkTop);
    const blkH = y(V.blkH);
    const blkBot = blkTop + blkH;
    const blkMidY = blkTop + blkH / 2;

    const imCX = (imL + imR) / 2;
    const rfCX = (rfL + rfR) / 2;
    const alCX = (alL + alR) / 2;
    const dmCX = (dmL + dmR) / 2;

    // HDU
    const hduW = rfR - rfL + 20;
    const hduL = rfL - 10;
    const hduT = y(V.hduTop);
    const hduH2 = y(V.hduH);
    const hduCX = hduL + hduW / 2;
    const hduCY = hduT + hduH2 / 2;

    // FWD
    const fwdW = alR - alL + 40;
    const fwdL = alL - 20;
    const fwdT = y(V.fwdTop);
    const fwdH2 = y(V.fwdH);
    const fwdCX = fwdL + fwdW / 2;
    const fwdCY = fwdT + fwdH2 / 2;

    // Pipeline reg x positions (midpoint between blocks)
    const ifidX = (imR + rfL) / 2 - 4;
    const idexX = (rfR + alL) / 2 - 4;
    const exmemX = (alR + dmL) / 2 - 4;
    const memwbX = dmR + 20;

    const pipeTop = blkTop - 10;
    const pipeH = blkH + 20;

    // Stage dots
    const dotY = y(V.dotCY);
    const lblY = y(V.dotLblY);
    const stageDots = [
        { name: 'Fetch', cx: imCX },
        { name: 'Decode', cx: rfCX },
        { name: 'Execute', cx: alCX },
        { name: 'Memory', cx: dmCX },
        { name: 'WriteBack', cx: x(H.wbDotX) },
    ];

    // ── Active states ──────────────────────────────────────────────────────────
    const stages = ['Fetch', 'Decode', 'Execute', 'Memory', 'WriteBack'] as const;
    const currentStage = stages.find(s => pipelineState?.[s]?.instruction);
    const currentInstruction = currentStage ? pipelineState?.[currentStage]?.instruction : null;
    const controlSignals = pipelineState?.Decode?.controlSignals;

    const fetchOn = currentStage === 'Fetch';
    const regOn = currentStage === 'Decode' || currentStage === 'WriteBack';
    const aluOn = currentStage === 'Execute';
    const memOn = currentStage === 'Memory' && !!(controlSignals?.memRead || controlSignals?.memWrite);
    const wbOn = currentStage === 'WriteBack';
    const fwdOn = currentStage === 'Execute';

    const a1 = currentStage === 'Decode';
    const a2 = currentStage === 'Execute';
    const a3 = currentStage === 'Memory' && !!(controlSignals?.memRead || controlSignals?.memWrite);
    const a4 = currentStage === 'WriteBack' && !!(controlSignals?.regWrite && !controlSignals?.memToReg);
    const a5 = currentStage === 'WriteBack' && !!controlSignals?.memToReg;
    const hduIn = currentStage === 'Decode';
    const fwdEx = currentStage === 'Execute';
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


    // ── Canvas Rendering Layer ──────────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, cw, ch);

        // Precalculated layout defaults
        const defaults = {
            'Fetch': { x: imL, y: blkTop, w: imR - imL, h: blkH },
            'Decode': { x: rfL, y: blkTop - 10, w: rfR - rfL, h: blkH + 20 },
            'Execute': { x: alL, y: blkTop - 5, w: alR - alL, h: blkH + 10 },
            'Memory': { x: dmL, y: blkTop - 5, w: dmR - dmL, h: blkH + 10 },
            'WriteBack': { x: cw * 0.86, y: blkTop - 5, w: cw * 0.12, h: blkH + 10 } // New block for WB!
        };

        const currentBlocks = blocksDataRef.current;

        // Populate defaults once per session unless missing, but update layout width/height on resize
        if (Object.keys(currentBlocks).length === 0) {
            Object.assign(currentBlocks, defaults);
        } else {
            for (const id in defaults) {
                if (currentBlocks[id]) {
                    currentBlocks[id].w = (defaults as any)[id].w;
                    currentBlocks[id].h = (defaults as any)[id].h;
                } else {
                    currentBlocks[id] = { ...(defaults as any)[id] };
                }
            }
        }

        const getProps = (id: string) => {
            switch (id) {
                case 'Fetch': return { title: 'Fetch: INST MEM', active: fetchOn, inst: pipelineState?.Fetch?.instruction?.raw };
                case 'Decode': return { title: 'Decode: REG FILE', active: regOn, inst: pipelineState?.Decode?.instruction?.raw, detail: undefined };
                case 'Execute': return { title: 'Execute: ALU', active: aluOn, inst: pipelineState?.Execute?.instruction?.raw, detail: aluDetail };
                case 'Memory': return { title: 'Memory: DATA MEM', active: memOn, inst: pipelineState?.Memory?.instruction?.raw };
                case 'WriteBack': return { title: 'WriteBack: REG', active: wbOn, inst: pipelineState?.WriteBack?.instruction?.raw };
            }
            return { title: id, active: false, inst: undefined };
        };

        for (const [id, rect] of Object.entries(currentBlocks)) {
            const props = getProps(id);

            ctx.fillStyle = props.active
                ? (theme === 'light' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(56, 189, 248, 0.1)')
                : (theme === 'light' ? '#f8fafc' : '#1e293b');

            ctx.strokeStyle = props.active
                ? '#38bdf8'
                : (theme === 'light' ? '#cbd5e1' : '#334155');

            ctx.lineWidth = props.active ? 2 : 1;

            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 7);
            } else {
                ctx.rect(rect.x, rect.y, rect.w, rect.h);
            }
            ctx.fill();
            ctx.stroke();

            // Label
            ctx.fillStyle = theme === 'light' ? '#334155' : '#cbd5e1';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const titleY = props.detail ? rect.y + 20 : rect.y + 26;
            ctx.fillText(props.title, rect.x + rect.w / 2, titleY);

            // Detail
            if (props.detail) {
                ctx.fillStyle = theme === 'light' ? '#64748b' : '#94a3b8';
                ctx.font = '10px sans-serif';
                ctx.fillText(props.detail, rect.x + rect.w / 2, titleY + 16);
            }

            // Instruction raw string explicitly printed inside the node
            ctx.fillStyle = props.active ? '#38bdf8' : (theme === 'light' ? '#94a3b8' : '#475569');
            ctx.font = '11px monospace';
            const txt = props.inst || 'Idle';
            ctx.fillText(txt, rect.x + rect.w / 2, rect.y + rect.h / 2 + 10);
        }

    }, [cw, ch, pipelineState, theme, renderTick, fetchOn, regOn, aluOn, memOn, wbOn, aluDetail]);


    // ── Custom Drag Events ──────────────────────────────────────────────────────
    const getPointerPos = (e: React.MouseEvent | React.TouchEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
        const { x, y } = getPointerPos(e);
        const blocks = blocksDataRef.current;

        // Reverse array tests top-most objects first (if overlapping)
        const keys = Object.keys(blocks).reverse();
        for (const id of keys) {
            const rect = blocks[id];
            if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
                dragStateRef.current = { activeId: id, offsetX: x - rect.x, offsetY: y - rect.y };
                return;
            }
        }
    };

    const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
        const state = dragStateRef.current;
        if (!state.activeId) return;

        const { x, y } = getPointerPos(e);
        const block = blocksDataRef.current[state.activeId];

        // Offset guarantees that the block's corner stays relative to where the user clicked it
        block.x = x - state.offsetX;
        block.y = y - state.offsetY;

        redrawCanvas();
    };

    const handlePointerUp = () => {
        dragStateRef.current.activeId = null;
    };


    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div
            ref={containerRef}
            className="microarch-container"
            style={{ width: '100%', height: `${ch}px`, position: 'relative', minHeight: 380 }}
        >
            {/* Background Datapath wiring and Logic components */}
            <svg width={cw} height={ch} style={{ position: 'absolute', inset: 0, display: 'block', overflow: 'visible' }}>
                <defs>
                    <marker id="mk" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
                        <polygon points="0 0,7 2.5,0 5" className="arrow-inactive-marker" />
                    </marker>
                    <marker id="mk-active" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
                        <polygon points="0 0,7 2.5,0 5" className="arrow-active-marker" />
                    </marker>
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
                <PipeReg x={ifidX} top={pipeTop} h={pipeH} label="IF/ID" />
                <PipeReg x={idexX} top={pipeTop} h={pipeH} label="ID/EX" />
                <PipeReg x={exmemX} top={pipeTop} h={pipeH} label="EX/MEM" />
                <PipeReg x={memwbX} top={pipeTop} h={pipeH} label="MEM/WB" />

                {/* ══ Forwarding Unit ════════════════════════════════════════════ */}
                <Rect x={fwdL} y={fwdT} w={fwdW} h={fwdH2} active={fwdOn} />
                <BlockLabel cx={fwdCX} cy={fwdCY} lines={['FORWARD UNIT']} active={fwdOn} />
                <text x={fwdCX} y={fwdT - 7} className="block-badge" textAnchor="middle">FWD</text>

                {/* ══ Arrows ════════════════════════════════════════════════════ */}
                <Flow d={`M ${imR} ${blkMidY} H ${rfL - 1}`} active={a1} />
                <Lbl x={(imR + rfL) / 2} y={blkMidY - 9}>Inst [31:0]</Lbl>

                <Flow d={`M ${rfR} ${blkMidY} H ${alL - 1}`} active={a2} />
                <Lbl x={(rfR + alL) / 2} y={blkMidY - 9}>Read Data 1/2</Lbl>

                <Flow d={`M ${alR} ${blkMidY} H ${dmL - 1}`} active={a3} />
                <Lbl x={(alR + dmL) / 2} y={blkMidY - 9}>ALU Result</Lbl>

                <Flow d={`M ${alL + 8} ${blkBot - 5} V ${wb1} H ${rfCX} V ${blkBot + 10}`} active={a4} />
                <Lbl x={(alL + rfCX) / 2} y={wb1 + 12}>ALU Result</Lbl>

                <Flow d={`M ${dmL + 8} ${blkBot - 5} V ${wb2} H ${rfCX - 6} V ${blkBot + 10}`} active={a5} />
                <Lbl x={(dmL + rfCX) / 2 + 10} y={wb2 + 12}>Read Data</Lbl>

                <Flow d={`M ${rfCX - 16} ${blkTop - 10} V ${hduT + hduH2}`} active={hduIn} />
                <Lbl x={rfCX + 22} y={(hduT + hduH2 + blkTop - 10) / 2} anchor="start">IF/ID.Rs,Rt</Lbl>

                <Flow d={`M ${hduL} ${hduCY} H ${imL - 12} V ${blkMidY} H ${imL - 1}`} active={false} />
                <Lbl x={(hduL + imL - 12) / 2} y={hduCY - 9}>PCWrite</Lbl>

                <Flow d={`M ${alCX + 8} ${blkBot + 5} V ${fwdT - 1}`} active={fwdEx} />
                <Lbl x={alCX + 22} y={(blkBot + fwdT) / 2} anchor="start">EX/MEM.Rd</Lbl>

                <Flow d={`M ${dmL + 8} ${blkBot + 5} H ${fwdL + fwdW + 8} V ${fwdT - 1}`} active={fwdMem} />
                <Lbl x={(dmL + fwdL + fwdW) / 2} y={blkBot + 18}>MEM/WB.Rd</Lbl>

                <Flow d={`M ${fwdL + 12} ${fwdT} V ${blkBot + 5} H ${alCX - 8} V ${blkBot - 1}`} active={fwdOut} />
                <Lbl x={fwdL - 4} y={(fwdT + blkBot) / 2} anchor="end">Fwd A/B</Lbl>
            </svg>

            {/* Interactive Overlay Layer for Stage Blocks */}
            <canvas
                ref={canvasRef}
                width={cw}
                height={ch}
                style={{ position: 'absolute', inset: 0, zIndex: 5, touchAction: 'none' }}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
                onTouchCancel={handlePointerUp}
            />

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
