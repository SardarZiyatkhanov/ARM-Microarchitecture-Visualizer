import React, { useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import { PipelineState, CpuState } from '../core/types';

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

    // Console logging
    useEffect(() => {
        console.log('=== PIPELINE STATE DEBUG ===');
        console.log('Current Stage:', currentStage || 'None');
        console.log('Current Instruction:', currentInstruction ? `${currentInstruction.opcode} (${currentInstruction.raw})` : 'None');
        console.log('Control Signals:', controlSignals || 'None');
        console.log('===========================');
    }, [pipelineState]);

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
                    fill: isActiveStage ? '#2f81f7' : '#0f1115',
                    stroke: isActiveStage ? '#2f81f7' : '#30363d',
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
                    fill: isActiveStage ? '#2f81f7' : '#8b949e',
                    originX: 'center',
                    selectable: false,
                    fontFamily: 'Plus Jakarta Sans',
                    fontWeight: isActiveStage ? '700' : '500'
                });

                canvas.add(circle, text);

                if (i < stageLabels.length - 1) {
                    const line = new fabric.Line([x + 10, y, (i + 1.5) * stageWidth - 10, y], {
                        stroke: isActiveStage ? '#2f81f7' : '#30363d',
                        strokeWidth: 2,
                        selectable: false
                    });
                    canvas.add(line);
                }
            });

            // Draw datapath components
            const compY = height / 2;

            // Define which blocks are active
            const isInstMemActive = currentStage === 'Fetch';
            const isRegFileActive = currentStage === 'Decode' || currentStage === 'WriteBack';
            const isALUActive = currentStage === 'Execute';
            const isDataMemActive = currentStage === 'Memory' && !!(controlSignals?.memRead || controlSignals?.memWrite);

            // Helper to get active style
            const getBlockStyle = (isActive: boolean, baseColor: string) => ({
                stroke: isActive ? '#2f81f7' : baseColor,
                strokeWidth: 2,
                shadow: isActive ? new fabric.Shadow({ color: 'rgba(47, 129, 247, 0.4)', blur: 20 }) : undefined
            });

            // Instruction Memory
            const instMem = new fabric.Rect({
                left: 50,
                top: compY - 30,
                width: 100,
                height: 60,
                fill: '#161b22',
                rx: 4,
                ry: 4,
                selectable: false,
                ...getBlockStyle(isInstMemActive, '#58a6ff')
            });
            const instMemText = new fabric.Text('INST\nMEM', {
                left: 100,
                top: compY,
                fontSize: 12,
                fill: isInstMemActive ? '#2f81f7' : '#8b949e',
                originX: 'center',
                originY: 'center',
                selectable: false,
                textAlign: 'center',
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: isInstMemActive ? '700' : '500'
            });

            // Register File
            const regFile = new fabric.Rect({
                left: 200,
                top: compY - 50,
                width: 100,
                height: 100,
                fill: '#161b22',
                rx: 4,
                ry: 4,
                selectable: false,
                ...getBlockStyle(isRegFileActive, '#3fb950')
            });
            const regFileText = new fabric.Text('REG\nFILE', {
                left: 250,
                top: compY,
                fontSize: 12,
                fill: isRegFileActive ? '#2f81f7' : '#8b949e',
                originX: 'center',
                originY: 'center',
                selectable: false,
                textAlign: 'center',
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: isRegFileActive ? '700' : '500'
            });

            // ALU
            const alu = new fabric.Rect({
                left: 350,
                top: compY - 40,
                width: 80,
                height: 80,
                fill: '#161b22',
                rx: 4,
                ry: 4,
                selectable: false,
                ...getBlockStyle(isALUActive, '#d29922')
            });
            const aluText = new fabric.Text('ALU', {
                left: 390,
                top: compY - 20,
                fontSize: 14,
                fill: isALUActive ? '#2f81f7' : '#8b949e',
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

                let valA = decoded.src1Reg ? regs[decoded.src1Reg] : 0;
                let valB = sigs.aluSrc === 'imm' ? (decoded.immValue ?? 0) : (decoded.src2Reg ? regs[decoded.src2Reg] : 0);

                // For MOV, A is not really used, often Result = B
                const result = exec.executionResult ?? (sigs.aluOp === 'MOV' ? valB : (sigs.aluOp === 'ADD' ? valA + valB : valA - valB));

                const detailsText = new fabric.Text(
                    sigs.aluOp === 'MOV'
                        ? `B: ${valB}\nRes: ${result}`
                        : `A: ${valA}\nB: ${valB}\nRes: ${result}`,
                    {
                        left: 390,
                        top: compY + 15,
                        fontSize: 10,
                        fill: '#8b949e',
                        originX: 'center',
                        originY: 'center',
                        selectable: false,
                        textAlign: 'center',
                        fontFamily: 'JetBrains Mono'
                    }
                );
                canvas.add(detailsText);
            }

            // Data Memory
            const dataMem = new fabric.Rect({
                left: 480,
                top: compY - 40,
                width: 100,
                height: 80,
                fill: '#161b22',
                rx: 4,
                ry: 4,
                selectable: false,
                ...getBlockStyle(isDataMemActive, '#a371f7')
            });
            const dataMemText = new fabric.Text('DATA\nMEM', {
                left: 530,
                top: compY,
                fontSize: 12,
                fill: isDataMemActive ? '#2f81f7' : '#8b949e',
                originX: 'center',
                originY: 'center',
                selectable: false,
                textAlign: 'center',
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: isDataMemActive ? '700' : '500'
            });

            canvas.add(instMem, instMemText, regFile, regFileText, alu, aluText, dataMem, dataMemText);
        };

        drawDatapath();

        return () => {
            canvas.dispose();
        };
    }, [pipelineState, currentStage, controlSignals]);

    // Calculate active arrows
    const isArrow1Active = currentStage === 'Decode';
    const isArrow2Active = currentStage === 'Execute';
    const isArrow3Active = currentStage === 'Memory' && !!(controlSignals?.memRead || controlSignals?.memWrite);
    const isArrow4Active = currentStage === 'WriteBack' && !!(controlSignals?.regWrite && !controlSignals?.memToReg);
    const isArrow5Active = currentStage === 'WriteBack' && !!controlSignals?.memToReg;

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
                        <marker
                            id="arrowhead"
                            markerWidth="10"
                            markerHeight="7"
                            refX="9"
                            refY="3.5"
                            orient="auto"
                        >
                            <polygon points="0 0, 10 3.5, 0 7" className="arrow-inactive-marker" />
                        </marker>
                        <marker
                            id="arrowhead-active"
                            markerWidth="10"
                            markerHeight="7"
                            refX="9"
                            refY="3.5"
                            orient="auto"
                        >
                            <polygon points="0 0, 10 3.5, 0 7" className="arrow-active-marker" />
                        </marker>
                    </defs>

                    {/* 1) INST MEM -> REG FILE */}
                    <line
                        x1="150" y1="200" x2="198" y2="200"
                        className={isArrow1Active ? 'flow-active' : 'flow-inactive'}
                        markerEnd={isArrow1Active ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                    />

                    {/* 2) REG FILE -> ALU */}
                    <line
                        x1="300" y1="200" x2="348" y2="200"
                        className={isArrow2Active ? 'flow-active' : 'flow-inactive'}
                        markerEnd={isArrow2Active ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                    />

                    {/* 3) ALU -> DATA MEM */}
                    <line
                        x1="430" y1="200" x2="478" y2="200"
                        className={isArrow3Active ? 'flow-active' : 'flow-inactive'}
                        markerEnd={isArrow3Active ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                    />

                    {/* 4) ALU -> REG FILE (writeback path) */}
                    <path
                        d="M 390 240 V 280 H 260 V 252"
                        fill="none"
                        className={isArrow4Active ? 'flow-active' : 'flow-inactive'}
                        markerEnd={isArrow4Active ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                    />

                    {/* 5) DATA MEM -> REG FILE (load writeback path) */}
                    <path
                        d="M 530 240 V 310 H 240 V 252"
                        fill="none"
                        className={isArrow5Active ? 'flow-active' : 'flow-inactive'}
                        markerEnd={isArrow5Active ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                    />
                </svg>

                {/* COMPACT DEBUG OVERLAY */}
                <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '10px',
                    backgroundColor: 'rgba(10, 12, 16, 0.95)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid var(--accent-color)',
                    borderRadius: '6px',
                    padding: '0.4rem 0.6rem',
                    minWidth: '150px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
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
