import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { PipelineState, CpuState } from '@playarm/core';

interface VisualizerCanvasProps {
    pipelineState?: PipelineState;
    cpuState?: CpuState;
}

export const VisualizerCanvas: React.FC<VisualizerCanvasProps> = ({ pipelineState, cpuState }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricRef = useRef<fabric.Canvas | null>(null);

    // Extract debugging info
    const stages = ['Fetch', 'Decode', 'Execute', 'Memory', 'WriteBack'] as const;
    const currentStage = stages.find(s => pipelineState?.[s]?.instruction);
    const currentInstruction = currentStage ? pipelineState?.[currentStage]?.instruction : null;
    const controlSignals = pipelineState?.Decode?.controlSignals;
    const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

    const [theme, setTheme] = useState(
        document.documentElement.getAttribute("data-theme") || "dark"
    );

    useEffect(() => {
        const el = document.documentElement;

        const updateTheme = () => {
            setTheme(el.getAttribute("data-theme") || "dark");
        };

        updateTheme();

        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.type === "attributes" && m.attributeName === "data-theme") {
                    updateTheme();
                }
            }
        });

        observer.observe(el, { attributes: true });
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!containerRef.current || !canvasRef.current) return;

        const canvas = new fabric.Canvas(canvasRef.current, {
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
            backgroundColor: 'transparent',
            selection: false
        });
        fabricRef.current = canvas;

        const drawDatapath = () => {
            if (!canvas) return;
            canvas.clear();

            const width = canvas.getWidth();
            const height = canvas.getHeight();
            const textSecondary = cssVar('--text-secondary') || '#8b949e';
            const accent = cssVar('--accent-color') || '#2f81f7';
            const vizBlock = cssVar('--viz-block') || '#161b22';
            const vizStageInactive = cssVar('--viz-stage-inactive') || '#0f1115';
            const vizStroke = cssVar('--viz-stroke') || '#30363d';

            // Draw stage indicators
            const stageLabels = ['Fetch', 'Decode', 'Execute', 'Memory', 'WriteBack'];
            const stageWidth = width / 6;

            stageLabels.forEach((stageName, i) => {
                const x = (i + 0.5) * stageWidth;
                const y = 30;

                const isActiveStage = currentStage === stageName;

                const circle = new fabric.Circle({
                    left: x,
                    top: y,
                    radius: 10,
                    fill: isActiveStage ? accent : vizStageInactive,
                    stroke: isActiveStage ? accent : vizStroke,
                    strokeWidth: 2,
                    originX: 'center',
                    originY: 'center',
                    selectable: false,
                    shadow: isActiveStage ? new fabric.Shadow({ color: 'rgba(47, 129, 247, 0.4)', blur: 15 }) : undefined
                });

                const text = new fabric.Text(stageName, {
                    left: x,
                    top: y + 25,
                    fontSize: 10,
                    fill: isActiveStage ? accent : textSecondary,
                    originX: 'center',
                    selectable: false,
                    fontFamily: 'Plus Jakarta Sans',
                    fontWeight: isActiveStage ? '700' : '500'
                });

                canvas.add(circle, text);

                if (i < stageLabels.length - 1) {
                    const line = new fabric.Line([x + 10, y, (i + 1.5) * stageWidth - 10, y], {
                        stroke: isActiveStage ? accent : vizStroke,
                        strokeWidth: 2,
                        selectable: false
                    });
                    canvas.add(line);
                }
            });

            // Draw datapath components
            // compY = 200 (height = 400)
            const compY = height / 2;

            const isInstMemActive = currentStage === 'Fetch';
            const isRegFileActive = currentStage === 'Decode' || currentStage === 'WriteBack';
            const isALUActive = currentStage === 'Execute';
            const isDataMemActive = currentStage === 'Memory' && !!(controlSignals?.memRead || controlSignals?.memWrite);
            // Forwarding Unit is relevant during Execute (forwarded values feed the ALU)
            const isForwardActive = currentStage === 'Execute';

            const getBlockStyle = (isActive: boolean, baseColor: string) => ({
                stroke: isActive ? accent : baseColor,
                strokeWidth: 2,
                shadow: isActive ? new fabric.Shadow({ color: 'rgba(47, 129, 247, 0.4)', blur: 20 }) : undefined
            });

            // --- Instruction Memory ---
            const instMem = new fabric.Rect({
                left: 50,
                top: compY - 30,
                width: 100,
                height: 60,
                fill: vizBlock,
                rx: 4,
                ry: 4,
                selectable: false,
                ...getBlockStyle(isInstMemActive, vizStroke)
            });
            const instMemText = new fabric.Text('INST\nMEM', {
                left: 100,
                top: compY,
                fontSize: 12,
                fill: isInstMemActive ? accent : textSecondary,
                originX: 'center',
                originY: 'center',
                selectable: false,
                textAlign: 'center',
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: isInstMemActive ? '700' : '500'
            });

            // --- Register File ---
            const regFile = new fabric.Rect({
                left: 200,
                top: compY - 50,
                width: 100,
                height: 100,
                fill: vizBlock,
                rx: 4,
                ry: 4,
                selectable: false,
                ...getBlockStyle(isRegFileActive, vizStroke)
            });
            const regFileText = new fabric.Text('REG\nFILE', {
                left: 250,
                top: compY,
                fontSize: 12,
                fill: isRegFileActive ? accent : textSecondary,
                originX: 'center',
                originY: 'center',
                selectable: false,
                textAlign: 'center',
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: isRegFileActive ? '700' : '500'
            });

            // --- ALU ---
            const alu = new fabric.Rect({
                left: 350,
                top: compY - 40,
                width: 80,
                height: 80,
                fill: vizBlock,
                rx: 4,
                ry: 4,
                selectable: false,
                ...getBlockStyle(isALUActive, vizStroke)
            });
            const aluText = new fabric.Text('ALU', {
                left: 390,
                top: compY - 20,
                fontSize: 14,
                fill: isALUActive ? accent : textSecondary,
                originX: 'center',
                originY: 'center',
                selectable: false,
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: '700'
            });

            // ALU Details (Execute Stage)
            if (isALUActive && pipelineState?.Execute.decoded) {
                const exec = pipelineState.Execute;
                const decoded = exec.decoded!;
                const sigs = exec.controlSignals!;
                const regs = cpuState?.registers || {};

                const valA = decoded.src1Reg ? regs[decoded.src1Reg] : 0;
                const valB = sigs.aluSrc === 'imm' ? (decoded.immValue ?? 0) : (decoded.src2Reg ? regs[decoded.src2Reg] : 0);
                const result = exec.executionResult ?? (sigs.aluOp === 'MOV' ? valB : (sigs.aluOp === 'ADD' ? valA + valB : valA - valB));

                const detailsText = new fabric.Text(
                    sigs.aluOp === 'MOV'
                        ? `B: ${valB}\nRes: ${result}`
                        : `A: ${valA}\nB: ${valB}\nRes: ${result}`,
                    {
                        left: 390,
                        top: compY + 15,
                        fontSize: 10,
                        fill: textSecondary,
                        originX: 'center',
                        originY: 'center',
                        selectable: false,
                        textAlign: 'center',
                        fontFamily: 'JetBrains Mono'
                    }
                );
                canvas.add(detailsText);
            }

            // --- Data Memory ---
            const dataMem = new fabric.Rect({
                left: 480,
                top: compY - 40,
                width: 100,
                height: 80,
                fill: vizBlock,
                rx: 4,
                ry: 4,
                selectable: false,
                ...getBlockStyle(isDataMemActive, vizStroke)
            });
            const dataMemText = new fabric.Text('DATA\nMEM', {
                left: 530,
                top: compY,
                fontSize: 12,
                fill: isDataMemActive ? accent : textSecondary,
                originX: 'center',
                originY: 'center',
                selectable: false,
                textAlign: 'center',
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: isDataMemActive ? '700' : '500'
            });

            // ── NEW: Hazard Detection Unit ────────────────────────────────────
            // Positioned above the IF/ID register boundary (between INST MEM and REG FILE).
            // Monitors pipeline registers to detect load-use hazards and issue stalls.
            // Fabric coords: left=130, top=compY-135=65, width=95, height=44
            const hdu = new fabric.Rect({
                left: 130,
                top: compY - 135,
                width: 95,
                height: 44,
                fill: vizBlock,
                rx: 4,
                ry: 4,
                selectable: false,
                stroke: vizStroke,
                strokeWidth: 2,
            });
            const hduText = new fabric.Text('HAZARD\nDETECT', {
                left: 177,
                top: compY - 113,
                fontSize: 10,
                fill: textSecondary,
                originX: 'center',
                originY: 'center',
                selectable: false,
                textAlign: 'center',
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: '600',
            });
            // Small "HDU" badge above the block
            const hduBadge = new fabric.Text('HDU', {
                left: 177,
                top: compY - 148,
                fontSize: 8,
                fill: accent,
                originX: 'center',
                selectable: false,
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: '700',
            });

            // ── NEW: Forwarding Unit ──────────────────────────────────────────
            // Positioned below the ALU/Execute stage. Monitors EX/MEM and MEM/WB
            // pipeline registers and muxes forwarded values into ALU operand inputs.
            // Fabric coords: left=305, top=compY+65=265, width=110, height=44
            const fwd = new fabric.Rect({
                left: 305,
                top: compY + 65,
                width: 110,
                height: 44,
                fill: vizBlock,
                rx: 4,
                ry: 4,
                selectable: false,
                stroke: isForwardActive ? accent : vizStroke,
                strokeWidth: 2,
                shadow: isForwardActive ? new fabric.Shadow({ color: 'rgba(47, 129, 247, 0.3)', blur: 16 }) : undefined,
            });
            const fwdText = new fabric.Text('FORWARD\nUNIT', {
                left: 360,
                top: compY + 87,
                fontSize: 10,
                fill: isForwardActive ? accent : textSecondary,
                originX: 'center',
                originY: 'center',
                selectable: false,
                textAlign: 'center',
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: '600',
            });
            // Small "FWD" badge above the block
            const fwdBadge = new fabric.Text('FWD', {
                left: 360,
                top: compY + 52,
                fontSize: 8,
                fill: accent,
                originX: 'center',
                selectable: false,
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: '700',
            });

            canvas.add(
                instMem, instMemText,
                regFile, regFileText,
                alu, aluText,
                dataMem, dataMemText,
                hdu, hduText, hduBadge,
                fwd, fwdText, fwdBadge,
            );
        };

        drawDatapath();

        return () => {
            canvas.dispose();
        };
    }, [pipelineState, currentStage, controlSignals, theme]);

    // ── Arrow active states ───────────────────────────────────────────────────
    // Main datapath arrows
    const isArrow1Active = currentStage === 'Decode';
    const isArrow2Active = currentStage === 'Execute';
    const isArrow3Active = currentStage === 'Memory' && !!(controlSignals?.memRead || controlSignals?.memWrite);
    const isArrow4Active = currentStage === 'WriteBack' && !!(controlSignals?.regWrite && !controlSignals?.memToReg);
    const isArrow5Active = currentStage === 'WriteBack' && !!controlSignals?.memToReg;
    // HDU arrows
    const isHduInActive  = currentStage === 'Decode';   // REG FILE → HDU: hazard check happens at Decode
    const isHduOutActive = false;                        // PCWrite stall: no explicit signal in current state
    // Forwarding Unit arrows
    const isFwdInAluActive = currentStage === 'Execute';                                      // ALU → FWD (EX/MEM.Rd)
    const isFwdInMemActive = currentStage === 'Memory' || currentStage === 'WriteBack';        // DATA MEM → FWD (MEM/WB.Rd)
    const isFwdOutActive   = currentStage === 'Execute';                                       // FWD → ALU (forwarded operand)

    const arrowClass = (active: boolean) => active ? 'flow-active' : 'flow-inactive';
    const marker     = (active: boolean) => active ? 'url(#arrowhead-active)' : 'url(#arrowhead)';

    return (
        <div ref={containerRef} style={{ width: '100%', height: '400px', position: 'relative', overflow: 'hidden' }}>
            <div className="microarch-container">
                <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 2 }} />

                <svg
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                        zIndex: 1
                    }}
                >
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" className="arrow-inactive-marker" />
                        </marker>
                        <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" className="arrow-active-marker" />
                        </marker>
                    </defs>

                    {/* ── Main datapath arrows ───────────────────────────────── */}

                    {/* 1) INST MEM → REG FILE  |  Instruction word passes to decode */}
                    <line
                        x1="150" y1="200" x2="198" y2="200"
                        className={arrowClass(isArrow1Active)}
                        markerEnd={marker(isArrow1Active)}
                    />
                    <text x="174" y="193" className="arrow-label">Inst [31:0]</text>

                    {/* 2) REG FILE → ALU  |  Two register read values (Rs, Rt) */}
                    <line
                        x1="300" y1="200" x2="348" y2="200"
                        className={arrowClass(isArrow2Active)}
                        markerEnd={marker(isArrow2Active)}
                    />
                    <text x="323" y="193" className="arrow-label">Read Data 1/2</text>

                    {/* 3) ALU → DATA MEM  |  Computed address or store value */}
                    <line
                        x1="430" y1="200" x2="478" y2="200"
                        className={arrowClass(isArrow3Active)}
                        markerEnd={marker(isArrow3Active)}
                    />
                    <text x="453" y="193" className="arrow-label">ALU Result</text>

                    {/* 4) ALU → REG FILE (writeback path, non-load) */}
                    <path
                        d="M 390 240 V 280 H 260 V 252"
                        fill="none"
                        className={arrowClass(isArrow4Active)}
                        markerEnd={marker(isArrow4Active)}
                    />
                    <text x="300" y="276" className="arrow-label">ALU Result</text>

                    {/* 5) DATA MEM → REG FILE (load writeback path) */}
                    <path
                        d="M 530 240 V 310 H 240 V 252"
                        fill="none"
                        className={arrowClass(isArrow5Active)}
                        markerEnd={marker(isArrow5Active)}
                    />
                    <text x="392" y="322" className="arrow-label">Read Data</text>

                    {/* ── Hazard Detection Unit arrows ───────────────────────── */}
                    {/* HDU rect occupies x=130..225, y=65..109 (compY=200, compY-135=65) */}

                    {/* 6) REG FILE → HDU  |  IF/ID register fields Rs & Rt for hazard check */}
                    <line
                        x1="213" y1="150" x2="200" y2="109"
                        className={arrowClass(isHduInActive)}
                        markerEnd={marker(isHduInActive)}
                    />
                    <text x="230" y="128" className="arrow-label">IF/ID.Rs,Rt</text>

                    {/* 7) HDU → INST MEM  |  PCWrite stall signal prevents PC from advancing */}
                    <line
                        x1="150" y1="87" x2="62" y2="172"
                        className={arrowClass(isHduOutActive)}
                        markerEnd={marker(isHduOutActive)}
                    />
                    <text x="84" y="124" className="arrow-label">PCWrite</text>

                    {/* ── Forwarding Unit arrows ────────────────────────────── */}
                    {/* FWD rect occupies x=305..415, y=265..309 (compY+65=265) */}

                    {/* 8) ALU → FWD  |  EX/MEM pipeline register destination (Rd) */}
                    <line
                        x1="385" y1="240" x2="374" y2="265"
                        className={arrowClass(isFwdInAluActive)}
                        markerEnd={marker(isFwdInAluActive)}
                    />
                    <text x="408" y="256" className="arrow-label">EX/MEM.Rd</text>

                    {/* 9) DATA MEM → FWD  |  MEM/WB pipeline register destination (Rd) */}
                    <path
                        d="M 480 240 H 415 V 265"
                        fill="none"
                        className={arrowClass(isFwdInMemActive)}
                        markerEnd={marker(isFwdInMemActive)}
                    />
                    <text x="466" y="252" className="arrow-label">MEM/WB.Rd</text>

                    {/* 10) FWD → ALU  |  Forwarded operand value bypasses register file */}
                    <line
                        x1="335" y1="265" x2="360" y2="242"
                        className={arrowClass(isFwdOutActive)}
                        markerEnd={marker(isFwdOutActive)}
                    />
                    <text x="318" y="256" className="arrow-label">Forward</text>
                </svg>

                {/* COMPACT DEBUG OVERLAY */}
                <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '10px',
                    backgroundColor: theme === 'light' ? 'rgba(255,255,255,0.92)' : 'rgba(15,17,21,0.92)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid var(--accent-color)',
                    borderRadius: '6px',
                    padding: '0.4rem 0.6rem',
                    minWidth: '150px',
                    boxShadow: theme === 'light' ? '0 2px 8px rgba(15,23,42,0.12)' : '0 4px 12px rgba(0,0,0,0.5)',
                    zIndex: 10,
                    pointerEvents: 'none',
                    borderLeft: '4px solid var(--accent-color)'
                }}>
                    <div style={{
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        color: 'var(--accent-color)',
                        fontFamily: 'Plus Jakarta Sans',
                        marginBottom: '0.2rem',
                        display: 'flex',
                        justifyContent: 'space-between'
                    }}>
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
