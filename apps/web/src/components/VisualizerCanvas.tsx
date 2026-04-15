import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { PipelineState, CpuState } from '@playarm/core';

interface VisualizerCanvasProps {
    pipelineState?: PipelineState;
    cpuState?: CpuState;
}

// Thin SVG label with a background halo so it's readable over lines
const ArrowLabel = ({ x, y, anchor = 'middle', children }: {
    x: number; y: number; anchor?: 'start' | 'middle' | 'end'; children: string;
}) => (
    <text x={x} y={y} className="arrow-label" textAnchor={anchor}>{children}</text>
);

export const VisualizerCanvas: React.FC<VisualizerCanvasProps> = ({ pipelineState, cpuState }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef   = useRef<HTMLCanvasElement>(null);
    const fabricRef   = useRef<fabric.Canvas | null>(null);

    const stages = ['Fetch', 'Decode', 'Execute', 'Memory', 'WriteBack'] as const;
    const currentStage      = stages.find(s => pipelineState?.[s]?.instruction);
    const currentInstruction = currentStage ? pipelineState?.[currentStage]?.instruction : null;
    const controlSignals    = pipelineState?.Decode?.controlSignals;
    const cssVar = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

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

    // ── Canvas height: 460 px so HDU (top) and FWD (bottom) have clear breathing room
    const CANVAS_H = 460;
    // compY is the vertical midpoint where the main datapath blocks sit
    const COMP_Y   = 235;

    useEffect(() => {
        if (!containerRef.current || !canvasRef.current) return;

        const canvas = new fabric.Canvas(canvasRef.current, {
            width: containerRef.current.clientWidth,
            height: CANVAS_H,
            backgroundColor: 'transparent',
            selection: false,
        });
        fabricRef.current = canvas;

        const draw = () => {
            canvas.clear();
            const W = canvas.getWidth();
            const ts   = cssVar('--text-secondary') || '#8b949e';
            const acc  = cssVar('--accent-color')   || '#2f81f7';
            const blk  = cssVar('--viz-block')      || '#161b22';
            const si   = cssVar('--viz-stage-inactive') || '#0f1115';
            const vs   = cssVar('--viz-stroke')     || '#30363d';

            // ── Stage indicator dots ────────────────────────────────────────
            const stageLabels = ['Fetch', 'Decode', 'Execute', 'Memory', 'WriteBack'];
            const sw = W / 6;
            stageLabels.forEach((name, i) => {
                const x = (i + 0.5) * sw;
                const active = currentStage === name;
                canvas.add(new fabric.Circle({
                    left: x, top: 28, radius: 10,
                    fill: active ? acc : si, stroke: active ? acc : vs, strokeWidth: 2,
                    originX: 'center', originY: 'center', selectable: false,
                    shadow: active ? new fabric.Shadow({ color: 'rgba(47,129,247,0.4)', blur: 15 }) : undefined,
                }));
                canvas.add(new fabric.Text(name, {
                    left: x, top: 53, fontSize: 10,
                    fill: active ? acc : ts, originX: 'center', selectable: false,
                    fontFamily: 'Plus Jakarta Sans', fontWeight: active ? '700' : '500',
                }));
                if (i < stageLabels.length - 1) {
                    canvas.add(new fabric.Line([x + 10, 28, (i + 1.5) * sw - 10, 28], {
                        stroke: active ? acc : vs, strokeWidth: 2, selectable: false,
                    }));
                }
            });

            // ── Block active states ─────────────────────────────────────────
            const fetchActive   = currentStage === 'Fetch';
            const regActive     = currentStage === 'Decode' || currentStage === 'WriteBack';
            const aluActive     = currentStage === 'Execute';
            const memActive     = currentStage === 'Memory' && !!(controlSignals?.memRead || controlSignals?.memWrite);
            const fwdActive     = currentStage === 'Execute';

            const bStyle = (on: boolean) => ({
                stroke: on ? acc : vs, strokeWidth: 2,
                shadow: on ? new fabric.Shadow({ color: 'rgba(47,129,247,0.4)', blur: 20 }) : undefined,
            });

            const addBlock = (
                left: number, top: number, w: number, h: number,
                label: string, cx: number, cy: number, fs: number,
                on: boolean,
            ) => {
                canvas.add(new fabric.Rect({ left, top, width: w, height: h, fill: blk, rx: 4, ry: 4, selectable: false, ...bStyle(on) }));
                canvas.add(new fabric.Text(label, {
                    left: cx, top: cy, fontSize: fs, fill: on ? acc : ts,
                    originX: 'center', originY: 'center', selectable: false,
                    textAlign: 'center', fontFamily: 'Plus Jakarta Sans', fontWeight: on ? '700' : '500',
                }));
            };

            // ── Main datapath blocks (compY = COMP_Y = 235) ────────────────
            // INST MEM   x: 50‒150   y: 205‒265
            addBlock(50,  COMP_Y - 30, 100, 60,  'INST\nMEM',  100, COMP_Y, 12, fetchActive);
            // REG FILE   x: 200‒300  y: 185‒285
            addBlock(200, COMP_Y - 50, 100, 100, 'REG\nFILE',  250, COMP_Y, 12, regActive);
            // ALU        x: 355‒435  y: 195‒275
            addBlock(355, COMP_Y - 40,  80, 80,  'ALU',        395, COMP_Y - 16, 14, aluActive);

            // ALU detail overlay during Execute
            if (aluActive && pipelineState?.Execute.decoded) {
                const { decoded, controlSignals: sigs, executionResult } = pipelineState.Execute;
                const regs = cpuState?.registers || {};
                const valA = decoded!.src1Reg ? regs[decoded!.src1Reg] : 0;
                const valB = sigs!.aluSrc === 'imm' ? (decoded!.immValue ?? 0) : (decoded!.src2Reg ? regs[decoded!.src2Reg] : 0);
                const res  = executionResult ?? (sigs!.aluOp === 'MOV' ? valB : sigs!.aluOp === 'ADD' ? valA + valB : valA - valB);
                canvas.add(new fabric.Text(
                    sigs!.aluOp === 'MOV' ? `B: ${valB}\nRes: ${res}` : `A: ${valA}\nB: ${valB}\nRes: ${res}`,
                    { left: 395, top: COMP_Y + 14, fontSize: 10, fill: ts, originX: 'center', originY: 'center', selectable: false, textAlign: 'center', fontFamily: 'JetBrains Mono' }
                ));
            }

            // DATA MEM   x: 485‒585  y: 195‒275
            addBlock(485, COMP_Y - 40, 100, 80,  'DATA\nMEM',  535, COMP_Y, 12, memActive);

            // ── Hazard Detection Unit ───────────────────────────────────────
            // Positioned above the main datapath, centred over the IF/ID boundary.
            // Fabric: x=130‒225  y=80‒124   center=(177, 102)
            canvas.add(new fabric.Rect({
                left: 130, top: 80, width: 95, height: 44,
                fill: blk, rx: 4, ry: 4, selectable: false, stroke: vs, strokeWidth: 2,
            }));
            canvas.add(new fabric.Text('HAZARD\nDETECT', {
                left: 177, top: 102, fontSize: 9, fill: ts,
                originX: 'center', originY: 'center', selectable: false,
                textAlign: 'center', fontFamily: 'Plus Jakarta Sans', fontWeight: '600',
            }));
            // Chip badge above block
            canvas.add(new fabric.Text('HDU', {
                left: 177, top: 73, fontSize: 8, fill: acc,
                originX: 'center', selectable: false,
                fontFamily: 'Plus Jakarta Sans', fontWeight: '700',
            }));

            // ── Forwarding Unit ─────────────────────────────────────────────
            // Positioned below the ALU, between Execute and Memory areas.
            // Fabric: x=310‒420  y=300‒344   center=(365, 322)
            canvas.add(new fabric.Rect({
                left: 310, top: 300, width: 110, height: 44,
                fill: blk, rx: 4, ry: 4, selectable: false,
                stroke: fwdActive ? acc : vs, strokeWidth: 2,
                shadow: fwdActive ? new fabric.Shadow({ color: 'rgba(47,129,247,0.3)', blur: 16 }) : undefined,
            }));
            canvas.add(new fabric.Text('FORWARD\nUNIT', {
                left: 365, top: 322, fontSize: 9, fill: fwdActive ? acc : ts,
                originX: 'center', originY: 'center', selectable: false,
                textAlign: 'center', fontFamily: 'Plus Jakarta Sans', fontWeight: '600',
            }));
            canvas.add(new fabric.Text('FWD', {
                left: 365, top: 293, fontSize: 8, fill: acc,
                originX: 'center', selectable: false,
                fontFamily: 'Plus Jakarta Sans', fontWeight: '700',
            }));
        };

        draw();
        return () => { canvas.dispose(); };
    }, [pipelineState, currentStage, controlSignals, theme]);

    // ── Arrow active states ────────────────────────────────────────────────
    const a1 = currentStage === 'Decode';
    const a2 = currentStage === 'Execute';
    const a3 = currentStage === 'Memory' && !!(controlSignals?.memRead || controlSignals?.memWrite);
    const a4 = currentStage === 'WriteBack' && !!(controlSignals?.regWrite && !controlSignals?.memToReg);
    const a5 = currentStage === 'WriteBack' && !!controlSignals?.memToReg;

    const hduIn  = currentStage === 'Decode';    // REG FILE → HDU
    const hduOut = false;                         // HDU → PC stall (no explicit signal)
    const fwdEx  = currentStage === 'Execute';    // ALU → FWD (EX/MEM.Rd)
    const fwdMem = currentStage === 'Memory' || currentStage === 'WriteBack'; // DATA MEM → FWD
    const fwdOut = currentStage === 'Execute';    // FWD → ALU

    const cls = (on: boolean) => on ? 'flow-active' : 'flow-inactive';
    const mkr = (on: boolean) => on ? 'url(#arrowhead-active)' : 'url(#arrowhead)';

    // Shorthand for labelled arrows — keeps JSX readable
    const Line = ({ x1, y1, x2, y2, on }: { x1:number; y1:number; x2:number; y2:number; on:boolean }) => (
        <line x1={x1} y1={y1} x2={x2} y2={y2} className={cls(on)} markerEnd={mkr(on)} />
    );
    const Path = ({ d, on }: { d: string; on: boolean }) => (
        <path d={d} fill="none" className={cls(on)} markerEnd={mkr(on)} />
    );

    return (
        <div
            ref={containerRef}
            style={{ width: '100%', height: `${CANVAS_H}px`, position: 'relative', overflow: 'hidden' }}
        >
            <div className="microarch-container">
                <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 2 }} />

                {/* ── SVG arrow overlay ──────────────────────────────────── */}
                <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
                    <defs>
                        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                            <polygon points="0 0,8 3,0 6" className="arrow-inactive-marker" />
                        </marker>
                        <marker id="arrowhead-active" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                            <polygon points="0 0,8 3,0 6" className="arrow-active-marker" />
                        </marker>
                    </defs>

                    {/* ══ Main datapath ══════════════════════════════════════
                        Blocks (compY = 235):
                          INST MEM  x 50‒150   centre y 235
                          REG FILE  x 200‒300  centre y 235
                          ALU       x 355‒435  centre y 235
                          DATA MEM  x 485‒585  centre y 235               */}

                    {/* 1  INST MEM → REG FILE  — instruction word */}
                    <Line x1={150} y1={235} x2={198} y2={235} on={a1} />
                    <ArrowLabel x={174} y={226}>Inst [31:0]</ArrowLabel>

                    {/* 2  REG FILE → ALU  — two register read values */}
                    <Line x1={300} y1={235} x2={353} y2={235} on={a2} />
                    <ArrowLabel x={325} y={226}>Read Data 1/2</ArrowLabel>

                    {/* 3  ALU → DATA MEM  — computed address or store data */}
                    <Line x1={435} y1={235} x2={483} y2={235} on={a3} />
                    <ArrowLabel x={459} y={226}>ALU Result</ArrowLabel>

                    {/* 4  ALU → REG FILE  — writeback (non-load) */}
                    <Path d="M 395 275 V 318 H 258 V 287" on={a4} />
                    <ArrowLabel x={320} y={314}>ALU Result</ArrowLabel>

                    {/* 5  DATA MEM → REG FILE  — load writeback */}
                    <Path d="M 535 275 V 352 H 238 V 287" on={a5} />
                    <ArrowLabel x={385} y={362}>Read Data</ArrowLabel>

                    {/* ══ Hazard Detection Unit ══════════════════════════════
                        HDU Fabric rect: x 130‒225  y 80‒124  centre (177, 102)

                        Arrow 6: REG FILE → HDU
                          Route: straight up from x=215 (left-of-centre of REG FILE)
                          from REG FILE top (y=185) to HDU bottom (y=124)             */}
                    <Line x1={215} y1={185} x2={215} y2={124} on={hduIn} />
                    <ArrowLabel x={240} y={157} anchor="start">IF/ID.Rs,Rt</ArrowLabel>

                    {/* Arrow 7: HDU → PC / pipeline registers  (PCWrite stall)
                          Route: L-path around the left edge
                          HDU left (x=130, y=102) → left rail (x=34) → INST MEM left (x=50, y=235) */}
                    <Path d="M 130 102 H 34 V 235 H 50" on={hduOut} />
                    <ArrowLabel x={24} y={172} anchor="start">PCWrite</ArrowLabel>

                    {/* ══ Forwarding Unit ════════════════════════════════════
                        FWD Fabric rect: x 310‒420  y 300‒344  centre (365, 322)

                        Arrow 8: ALU → FWD  (EX/MEM pipeline register value)
                          Straight down from ALU bottom-centre to FWD top            */}
                    <Line x1={390} y1={275} x2={378} y2={298} on={fwdEx} />
                    <ArrowLabel x={418} y={289} anchor="start">EX/MEM.Rd</ArrowLabel>

                    {/* Arrow 9: DATA MEM → FWD  (MEM/WB pipeline register value)
                          L-path: across from DATA MEM then down to FWD right edge   */}
                    <Path d="M 485 275 H 420 V 300" on={fwdMem} />
                    <ArrowLabel x={454} y={290} anchor="middle">MEM/WB.Rd</ArrowLabel>

                    {/* Arrow 10: FWD → ALU  (forwarded operand bypasses reg file)
                          L-path: up from FWD top-left then right to ALU bottom      */}
                    <Path d="M 328 300 V 268 H 362" on={fwdOut} />
                    <ArrowLabel x={308} y={282} anchor="end">Fwd A/B</ArrowLabel>
                </svg>

                {/* ── DEBUG overlay ─────────────────────────────────────────── */}
                <div style={{
                    position: 'absolute', bottom: 10, right: 10, zIndex: 10, pointerEvents: 'none',
                    backgroundColor: theme === 'light' ? 'rgba(255,255,255,0.92)' : 'rgba(15,17,21,0.92)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid var(--accent-color)', borderLeft: '4px solid var(--accent-color)',
                    borderRadius: 6, padding: '0.4rem 0.6rem', minWidth: 150,
                    boxShadow: theme === 'light' ? '0 2px 8px rgba(15,23,42,0.12)' : '0 4px 12px rgba(0,0,0,0.5)',
                }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--accent-color)', fontFamily: 'Plus Jakarta Sans', marginBottom: '0.2rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>DEBUG</span>
                        <span style={{ color: 'var(--success-color)', fontSize: '0.5rem' }}>● LIVE</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.6rem', fontFamily: 'JetBrains Mono' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Stage:</span>
                            <span style={{ color: 'var(--text-primary)' }}>{currentStage || '--'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Op:</span>
                            <span style={{ color: 'var(--success-color)', fontWeight: 600 }}>{currentInstruction?.opcode || '--'}</span>
                        </div>
                        {currentStage === 'Execute' && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', marginTop: '0.15rem', paddingTop: '0.15rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>ALU:</span>
                                <span>{controlSignals?.aluOp}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
export default VisualizerCanvas;
