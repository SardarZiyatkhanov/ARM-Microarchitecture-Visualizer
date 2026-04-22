import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PipelineState, CpuState } from '@playarm/core';

interface VisualizerCanvasProps {
    pipelineState?: PipelineState;
    cpuState?: CpuState;
}

// ─── Fixed canvas dimensions ───────────────────────────────────────────────────
// 920 × 420 gives a comfortable 2.19:1 ratio for the horizontal pipeline layout.
// All geometry is expressed as fractions of these dimensions so the diagram
// scales proportionally to any container width.
const DW = 920;
const DH = 420;

// ─── Block geometry ────────────────────────────────────────────────────────────
// 5 equal-width blocks (120 px) with 40 px gaps, centred in the 920 px canvas.
// Left margin = (920 − 5×120 − 4×40) / 2 = (920 − 760) / 2 = 80 px
const BLOCK_W = 120;
const GAP_W   = 40;
const LEFT_M  = 80;

function bx(i: number) {
    const l = LEFT_M + i * (BLOCK_W + GAP_W);
    return { l: l / DW, r: (l + BLOCK_W) / DW, cx: (l + BLOCK_W / 2) / DW };
}
const BLOCKS = [0, 1, 2, 3, 4].map(bx);

// ─── Vertical layout (px, then converted to fractions of DH) ──────────────────
// 28 ─ stage chips
// 50 ─ stage labels
// 74 ─ HDU box top         (46 px tall → bottom at 120)
// 138 ─ main blocks top     (108 px tall → bottom at 246)
// 264 ─ wb-feedback rows
// 294 ─ FWD box top         (46 px tall → bottom at 340)
// 358 ─ bottom margin ~62 px
const V = {
    chipCY:   28  / DH,
    chipLbl:  50  / DH,
    hduTop:   74  / DH,
    hduH:     46  / DH,
    blkTop:   138 / DH,
    blkH:     108 / DH,
    wbRow1:   264 / DH,
    wbRow2:   280 / DH,
    fwdTop:   298 / DH,
    fwdH:     46  / DH,
};

// ─── Colour palettes ───────────────────────────────────────────────────────────
// CSS custom properties cannot reach SVG <linearGradient> stops, so colours are
// hard-coded per theme.
type Pal = {
    bg:          string;
    blkFill:     string; blkStroke:    string;
    blkFillA:    string; blkStrokeA:   string;
    blkTxt:      string; blkTxtA:      string;
    blkDetail:   string;
    ctrlFill:    string; ctrlStroke:   string;
    ctrlFillA:   string; ctrlStrokeA:  string;
    ctrlTxt:     string; ctrlTxtA:     string;
    ctrlBadge:   string;
    arrow:       string; arrowA:       string;
    prBar:       string; prLbl:        string;
    chipFill:    string; chipStroke:   string;
    chipFillA:   string; chipFillDone: string;
    chipNum:     string; chipNumDone:  string;
    chipLbl:     string; chipLblA:     string;
    trackBg:     string; trackFg:      string;
    pillBg:      string; pillStroke:   string; pillTxt: string;
    statBg:      string; statStroke:   string; statTxt: string;
    gT: string; gB: string; gTA: string; gBA: string; gCT: string; gCB: string;
};

const DARK: Pal = {
    bg:         '#040a14',
    blkFill:    '#0f1929',    blkStroke:   '#28405e',
    blkFillA:   '#0c2145',    blkStrokeA:  '#3b82f6',
    blkTxt:     '#a0bcd8',    blkTxtA:     '#93c5fd',
    blkDetail:  '#60a5fa',
    ctrlFill:   '#090f1a',    ctrlStroke:  '#1e2f44',
    ctrlFillA:  '#0c2145',    ctrlStrokeA: '#3b82f6',
    ctrlTxt:    '#4b6a8a',    ctrlTxtA:    '#60a5fa',
    ctrlBadge:  '#3b82f6',
    arrow:      'rgba(80,130,200,0.32)',  arrowA: '#3b82f6',
    prBar:      '#2c3f5c',    prLbl:       '#3d5473',
    chipFill:   '#101d30',    chipStroke:  '#2c3f5c',
    chipFillA:  '#2563eb',    chipFillDone:'#1d4ed8',
    chipNum:    '#3d5473',    chipNumDone: '#fff',
    chipLbl:    '#3d5473',    chipLblA:    '#93c5fd',
    trackBg:    'rgba(44,63,92,0.5)',   trackFg: 'rgba(59,130,246,0.4)',
    pillBg:     '#040d1e',    pillStroke:  '#2563eb',   pillTxt:   '#93c5fd',
    statBg:     '#061226',    statStroke:  '#2563eb',   statTxt:   '#93c5fd',
    gT:'#131f30', gB:'#0b1320', gTA:'#102040', gBA:'#08172e', gCT:'#0c1520', gCB:'#07101a',
};

const LIGHT: Pal = {
    bg:         '#cbd6ea',
    blkFill:    '#ffffff',    blkStroke:   '#7ba0c8',
    blkFillA:   '#dbeafe',    blkStrokeA:  '#4f46e5',
    blkTxt:     '#1e3a5f',    blkTxtA:     '#312e81',   // dark for contrast
    blkDetail:  '#4f46e5',
    ctrlFill:   '#eff4fd',    ctrlStroke:  '#94aed4',
    ctrlFillA:  '#dbeafe',    ctrlStrokeA: '#4f46e5',
    ctrlTxt:    '#4b6b9a',    ctrlTxtA:    '#312e81',
    ctrlBadge:  '#4f46e5',
    arrow:      'rgba(55,95,155,0.40)',   arrowA: '#4f46e5',
    prBar:      '#6b90be',    prLbl:       '#5a7a9e',
    chipFill:   '#dce8f8',    chipStroke:  '#94aed4',
    chipFillA:  '#4f46e5',    chipFillDone:'#6366f1',
    chipNum:    '#6b90be',    chipNumDone: '#fff',
    chipLbl:    '#6b90be',    chipLblA:    '#312e81',
    trackBg:    'rgba(100,140,190,0.3)',  trackFg: 'rgba(79,70,229,0.45)',
    pillBg:     '#eef3ff',    pillStroke:  '#4f46e5',   pillTxt:   '#312e81',
    statBg:     '#e8effc',    statStroke:  '#4f46e5',   statTxt:   '#312e81',
    gT:'#ffffff', gB:'#f5f8ff', gTA:'#e2eeff', gBA:'#cfe0ff', gCT:'#f5f9ff', gCB:'#eaf1ff',
};

// ─── Component ─────────────────────────────────────────────────────────────────
export const VisualizerCanvas: React.FC<VisualizerCanvasProps> = ({ pipelineState, cpuState }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [cw, setCw] = useState<number>(DW);
    const ch = (cw / DW) * DH;

    // ── Drag state ────────────────────────────────────────────────────────────
    const [blockOffsets, setBlockOffsets] = useState<{ dx: number; dy: number }[]>(
        () => Array.from({ length: 5 }, () => ({ dx: 0, dy: 0 }))
    );
    const dragRef = useRef<{ id: number | null; startX: number; startY: number; origDx: number; origDy: number }>(
        { id: null, startX: 0, startY: 0, origDx: 0, origDy: 0 }
    );
    const [dragging, setDragging] = useState(false);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(([e]) => setCw(Math.max(e.contentRect.width, 400)));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const [theme, setTheme] = useState(
        document.documentElement.getAttribute('data-theme') || 'dark'
    );
    useEffect(() => {
        const root = document.documentElement;
        const sync = () => setTheme(root.getAttribute('data-theme') || 'dark');
        sync();
        const obs = new MutationObserver(ms => {
            for (const m of ms) if (m.attributeName === 'data-theme') sync();
        });
        obs.observe(root, { attributes: true });
        return () => obs.disconnect();
    }, []);

    const p = theme === 'light' ? LIGHT : DARK;

    // Convert fractions → actual px
    const fx = useCallback((f: number) => f * cw, [cw]);
    const fy = useCallback((f: number) => f * ch, [ch]);

    // ── Resolved pixel values ──────────────────────────────────────────────────
    const bW  = fx(BLOCK_W / DW);   // block width in px
    const bH  = fy(V.blkH);          // block height in px
    const bT  = fy(V.blkTop);        // block top
    const bB  = bT + bH;             // block bottom
    const bMY = bT + bH / 2;         // block mid-y

    // Per-block left/right/cx positions
    const B = BLOCKS.map(f => ({ l: fx(f.l), r: fx(f.r), cx: fx(f.cx) }));

    // HDU — sits above B[1] (REG FILE), same width as a block, centred on it
    const hduT  = fy(V.hduTop);
    const hduH  = fy(V.hduH);

    // FWD — sits below B[2] (ALU), same width as a block, centred on it
    const fwdT  = fy(V.fwdTop);
    const fwdH  = fy(V.fwdH);

    // Pipeline register bar x positions (centre of each gap, offset for double-bar)
    const prBars = [0, 1, 2, 3].map(i => ({
        x:   (B[i].r + B[i + 1].l) / 2 - 5,   // leftmost bar start
        lbl: ['IF/ID', 'ID/EX', 'EX/MEM', 'MEM/WB'][i],
    }));

    // WB feedback routing rows
    const wbR1 = fy(V.wbRow1);
    const wbR2 = fy(V.wbRow2);

    // Stage chips
    const STAGES    = ['Fetch', 'Decode', 'Execute', 'Memory', 'WriteBack'] as const;
    const chipDefs  = STAGES.map((name, i) => ({ name, cx: B[i].cx + blockOffsets[i].dx, n: `${i + 1}` }));
    const chipCY    = fy(V.chipCY);
    const chipLblY  = fy(V.chipLbl);

    // ── Active stage logic ─────────────────────────────────────────────────────
    const currentStage = STAGES.find(s => pipelineState?.[s]?.instruction);
    const curInst      = currentStage ? pipelineState?.[currentStage]?.instruction : null;
    const cs           = pipelineState?.Decode?.controlSignals;
    const currentIdx   = currentStage ? STAGES.indexOf(currentStage) : -1;

    const isActive = (s: typeof STAGES[number]) => currentStage === s;

    const fetchOn = isActive('Fetch');
    const regOn   = isActive('Decode')    || isActive('WriteBack');
    const aluOn   = isActive('Execute');
    const memOn   = isActive('Memory')    && !!(cs?.memRead || cs?.memWrite);
    const wbOn    = isActive('WriteBack');
    const fwdOn   = isActive('Execute');

    const a1     = isActive('Decode');
    const a2     = isActive('Execute');
    const a3     = isActive('Memory')    && !!(cs?.memRead || cs?.memWrite);
    const a4     = isActive('WriteBack') && !!(cs?.regWrite && !cs?.memToReg);
    const a5     = isActive('WriteBack') && !!cs?.memToReg;
    const hduIn  = isActive('Decode');
    const fwdEx  = isActive('Execute');
    const fwdMem = isActive('Memory')    || isActive('WriteBack');
    const fwdOut = isActive('Execute');

    // ALU computation detail
    let aluDetail = '';
    if (aluOn && pipelineState?.Execute.decoded) {
        const { decoded, controlSignals: sigs, executionResult } = pipelineState.Execute;
        const regs = cpuState?.registers ?? {};
        const valA = decoded!.src1Reg ? regs[decoded!.src1Reg] : 0;
        const valB = sigs!.aluSrc === 'imm'
            ? (decoded!.immValue ?? 0)
            : (decoded!.src2Reg ? regs[decoded!.src2Reg] : 0);
        const res  = executionResult ?? (sigs!.aluOp === 'MOV' ? valB
            : sigs!.aluOp === 'ADD' ? valA + valB : valA - valB);
        aluDetail = sigs!.aluOp === 'MOV' ? `→ ${res}` : `${valA} ${sigs!.aluOp} ${valB} = ${res}`;
    }

    // ── Drawing primitives ─────────────────────────────────────────────────────

    // ── SVG text helper ──────────────────────────────────────────────────────────
    // dominantBaseline="middle" is unreliable in WebKit/Safari.
    // Safe cross-browser centering: y = visualCenterY + fontSize * 0.35
    // (shifts baseline down from cap-height midpoint).
    const mid = (cy: number, fs: number) => cy + fs * 0.35;

    // Main data block — uniform height, text guaranteed inside at any scale
    function DataBlock({ i, lines, active, detail }: {
        i: number; lines: string[]; active: boolean; detail?: string;
    }) {
        const off = blockOffsets[i];
        const lx  = B[i].l + off.dx;
        const ty  = bT + off.dy;
        const cx2 = lx + bW / 2;
        const fs  = 13;
        const lh  = fs * 1.7;
        const totalH = lines.length * lh;
        const firstCY = detail
            ? ty + bH / 2 - totalH / 2 - 5
            : ty + bH / 2 - totalH / 2 + lh / 2;
        const isDraggingThis = dragging && dragRef.current.id === i;
        return (
            <g style={{ cursor: isDraggingThis ? 'grabbing' : 'grab' }}
               onMouseDown={e => startDrag(e, i)}
               onDoubleClick={() => resetBlock(i)}
               onTouchStart={e => startDragTouch(e, i)}>
                <rect x={lx} y={ty} width={bW} height={bH} rx={10}
                    fill={`url(#${active ? 'gA' : 'gI'})`}
                    stroke={active ? p.blkStrokeA : p.blkStroke}
                    strokeWidth={active ? 2.5 : 1.5}
                    style={{ filter: active ? 'url(#glow)' : undefined, transition: 'stroke 0.2s' }}
                />
                {lines.map((l, idx) => (
                    <text key={idx}
                        x={cx2} y={mid(firstCY + idx * lh, fs)}
                        fill={active ? p.blkTxtA : p.blkTxt}
                        fontSize={fs} fontWeight={700} fontFamily="var(--font-sans)"
                        textAnchor="middle"
                        style={{ pointerEvents: 'none', letterSpacing: '0.04em', transition: 'fill 0.2s' }}
                    >{l}</text>
                ))}
                {detail && (
                    <text x={cx2} y={mid(ty + bH / 2 + totalH / 2 + 2, 10)}
                        fill={p.blkDetail} fontSize={10} fontFamily="var(--font-mono)"
                        textAnchor="middle"
                        style={{ pointerEvents: 'none' }}
                    >{detail}</text>
                )}
            </g>
        );
    }

    // Control block (HDU / FWD):
    //   • Only the SHORT badge ("HDU" / "FWD") lives inside the box — guaranteed to fit.
    //   • The full name appears as a small label BELOW the box (never overflows).
    function CtrlBlock({ lx, ty, w, h, name, badge, active }: {
        lx: number; ty: number; w: number; h: number;
        name: string; badge: string; active: boolean;
    }) {
        const cx2  = lx + w / 2;
        const bdgFs = 12;
        return (
            <g>
                <rect x={lx} y={ty} width={w} height={h} rx={8}
                    fill={`url(#${active ? 'gA' : 'gC'})`}
                    stroke={active ? p.ctrlStrokeA : p.ctrlStroke}
                    strokeWidth={active ? 2 : 1.5}
                    style={{ filter: active ? 'url(#glow)' : undefined, transition: 'stroke 0.2s' }}
                />
                {/* Badge — single short string, centred in box, safe at any scale */}
                <text x={cx2} y={mid(ty + h / 2, bdgFs)}
                    fill={p.ctrlBadge}
                    fontSize={bdgFs} fontWeight={800} fontFamily="var(--font-sans)"
                    textAnchor="middle"
                    style={{ pointerEvents: 'none', letterSpacing: '0.10em' }}
                >{badge}</text>
                {/* Full name — BELOW the box, never inside */}
                <text x={cx2} y={mid(ty + h + fy(11 / DH), 9)}
                    fill={active ? p.ctrlTxtA : p.ctrlTxt}
                    fontSize={9} fontWeight={600} fontFamily="var(--font-sans)"
                    textAnchor="middle"
                    style={{ pointerEvents: 'none', letterSpacing: '0.05em' }}
                >{name}</text>
            </g>
        );
    }

    // Directional arrow
    function Arrow({ d, active }: { d: string; active: boolean }) {
        return (
            <path d={d} fill="none"
                stroke={active ? p.arrowA : p.arrow}
                strokeWidth={active ? 2.5 : 1.5}
                opacity={active ? 1 : 0.65}
                markerEnd={active ? 'url(#mkA)' : 'url(#mkI)'}
                style={{ transition: 'stroke 0.2s, opacity 0.2s' }}
            />
        );
    }

    // Pill label — only rendered when arrow is active
    function Pill({ x: lx, y: ly, text, anchor = 'middle' }: {
        x: number; y: number; text: string; anchor?: 'start' | 'middle' | 'end';
    }) {
        const tw = text.length * 6.2 + 18;
        const ox = anchor === 'start' ? 0 : anchor === 'end' ? -tw : -tw / 2;
        return (
            <g>
                <rect x={lx + ox} y={ly - 9} width={tw} height={18} rx={5}
                    fill={p.pillBg} stroke={p.pillStroke} strokeWidth={1} opacity={0.97}
                />
                <text x={lx} y={ly}
                    fill={p.pillTxt} fontSize={9.5} fontWeight={600}
                    fontFamily="var(--font-sans)"
                    textAnchor={anchor} dominantBaseline="middle"
                    style={{ pointerEvents: 'none' }}
                >{text}</text>
            </g>
        );
    }

    // Pipeline register double-bar: spans exactly block height (bT → bB),
    // label appears BELOW the block row with a small gap.
    function PipeReg({ x: lx, label }: { x: number; label: string }) {
        return (
            <g>
                <rect x={lx}      y={bT} width={4} height={bH} fill={p.prBar} opacity={0.75} rx={1} />
                <rect x={lx + 7}  y={bT} width={4} height={bH} fill={p.prBar} opacity={0.75} rx={1} />
                <text x={lx + 5.5} y={bB + fy(14 / DH)}
                    fill={p.prLbl} fontSize={9} fontFamily="var(--font-mono)"
                    textAnchor="middle" style={{ pointerEvents: 'none' }}
                >{label}</text>
            </g>
        );
    }

    // ── Drag handlers ─────────────────────────────────────────────────────────
    const getSvgPos = (clientX: number, clientY: number) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const clampOffset = (id: number, dx: number, dy: number) => {
        const lx = B[id].l + dx;
        const ty = bT + dy;
        const clampedDx = dx - Math.max(0, lx + bW - cw + 4) + Math.min(0, lx - 4);
        const clampedDy = dy - Math.max(0, ty + bH - ch + 4) + Math.min(0, ty - 4);
        return { dx: clampedDx, dy: clampedDy };
    };

    const startDrag = (e: React.MouseEvent, id: number) => {
        e.preventDefault();
        const { x, y } = getSvgPos(e.clientX, e.clientY);
        dragRef.current = { id, startX: x, startY: y, origDx: blockOffsets[id].dx, origDy: blockOffsets[id].dy };
        setDragging(true);
    };

    const startDragTouch = (e: React.TouchEvent, id: number) => {
        const t = e.touches[0];
        const { x, y } = getSvgPos(t.clientX, t.clientY);
        dragRef.current = { id, startX: x, startY: y, origDx: blockOffsets[id].dx, origDy: blockOffsets[id].dy };
        setDragging(true);
    };

    const onMove = (clientX: number, clientY: number) => {
        const { id, startX, startY, origDx, origDy } = dragRef.current;
        if (id === null) return;
        const { x, y } = getSvgPos(clientX, clientY);
        const raw = { dx: origDx + (x - startX), dy: origDy + (y - startY) };
        const clamped = clampOffset(id, raw.dx, raw.dy);
        setBlockOffsets(prev => {
            const next = [...prev];
            next[id] = clamped;
            return next;
        });
    };

    const endDrag = () => {
        dragRef.current.id = null;
        setDragging(false);
    };

    const resetBlock = (id: number) => {
        setBlockOffsets(prev => {
            const next = [...prev];
            next[id] = { dx: 0, dy: 0 };
            return next;
        });
    };

    const resetAll = () => setBlockOffsets(Array.from({ length: 5 }, () => ({ dx: 0, dy: 0 })));

    const anyMoved = blockOffsets.some(o => o.dx !== 0 || o.dy !== 0);

    // ── SVG render ─────────────────────────────────────────────────────────────
    return (
        <div
            ref={containerRef}
            style={{ width: '100%', height: `${ch}px`, background: p.bg, minHeight: 300, position: 'relative' }}
        >
            {/* Drag hint */}
            <div style={{
                position: 'absolute', top: 6, left: 8, fontSize: 10,
                color: theme === 'dark' ? 'rgba(100,140,200,0.5)' : 'rgba(80,100,140,0.5)',
                pointerEvents: 'none', fontFamily: 'var(--font-sans)',
            }}>drag blocks · double-click to reset</div>

            {/* Reset all button — only visible when something has moved */}
            {anyMoved && (
                <button onClick={resetAll} style={{
                    position: 'absolute', top: 4, right: 8,
                    fontSize: 10, padding: '3px 10px', borderRadius: 5,
                    background: theme === 'dark' ? 'rgba(30,50,80,0.85)' : 'rgba(220,230,245,0.9)',
                    color: theme === 'dark' ? '#93c5fd' : '#3b5bdb',
                    border: `1px solid ${theme === 'dark' ? '#2c4a7c' : '#7ba0c8'}`,
                    cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}>Reset layout</button>
            )}
            <svg width={cw} height={ch} style={{ display: 'block', userSelect: 'none' }}
                onMouseMove={e => onMove(e.clientX, e.clientY)}
                onMouseUp={endDrag}
                onMouseLeave={endDrag}
                onTouchMove={e => { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY); }}
                onTouchEnd={endDrag}
            >
                <defs>
                    {/* Arrowheads */}
                    <marker id="mkI" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                        <polygon points="0 0,8 3,0 6" fill={p.arrow} />
                    </marker>
                    <marker id="mkA" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                        <polygon points="0 0,8 3,0 6" fill={p.arrowA} />
                    </marker>

                    {/* Block gradients */}
                    <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={p.gT} />
                        <stop offset="100%" stopColor={p.gB} />
                    </linearGradient>
                    <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={p.gTA} />
                        <stop offset="100%" stopColor={p.gBA} />
                    </linearGradient>
                    <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={p.gCT} />
                        <stop offset="100%" stopColor={p.gCB} />
                    </linearGradient>

                    {/* Glow filter */}
                    <filter id="glow" x="-25%" y="-25%" width="150%" height="150%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" />
                        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="chipGlow" x="-70%" y="-70%" width="240%" height="240%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b" />
                        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>

                {/* ── Stage progress bar ────────────────────────────────────── */}
                {/* background track */}
                <line x1={chipDefs[0].cx} y1={chipCY} x2={chipDefs[4].cx} y2={chipCY}
                    stroke={p.trackBg} strokeWidth={2} />
                {/* progress fill up to active stage */}
                {currentIdx > 0 && (
                    <line x1={chipDefs[0].cx} y1={chipCY} x2={chipDefs[currentIdx].cx} y2={chipCY}
                        stroke={p.trackFg} strokeWidth={2.5} />
                )}
                {/* stage chips */}
                {chipDefs.map((s, i) => {
                    const active = currentStage === s.name;
                    const done   = currentIdx > i;
                    return (
                        <g key={s.name}>
                            <circle cx={s.cx} cy={chipCY} r={15}
                                fill={active ? p.chipFillA : done ? p.chipFillDone : p.chipFill}
                                stroke={active || done ? 'none' : p.chipStroke}
                                strokeWidth={1.5}
                                opacity={done ? 0.8 : 1}
                                style={{
                                    filter:     active ? 'url(#chipGlow)' : undefined,
                                    transition: 'fill 0.25s',
                                }}
                            />
                            <text x={s.cx} y={chipCY}
                                fill={active || done ? '#fff' : p.chipNum}
                                fontSize={10} fontWeight={700} fontFamily="var(--font-sans)"
                                textAnchor="middle" dominantBaseline="middle"
                                style={{ pointerEvents: 'none' }}
                            >{s.n}</text>
                            <text x={s.cx} y={chipLblY}
                                fill={active ? p.chipLblA : p.chipLbl}
                                fontSize={11} fontWeight={active ? 700 : 500}
                                fontFamily="var(--font-sans)"
                                textAnchor="middle"
                                style={{ pointerEvents: 'none', transition: 'fill 0.2s' }}
                            >{s.name}</text>
                        </g>
                    );
                })}

                {/* ── Pipeline register bars ────────────────────────────────── */}
                {prBars.map(({ x: bx2, lbl }) => <PipeReg key={lbl} x={bx2} label={lbl} />)}

                {/* ── HDU — above REG FILE (B[1]) ───────────────────────────── */}
                <CtrlBlock
                    lx={B[1].l} ty={hduT} w={bW} h={hduH}
                    name="HAZARD DETECT" badge="HDU" active={false}
                />
                {/* HDU ↔ Decode connector */}
                <Arrow d={`M ${B[1].cx - 12} ${bT} V ${hduT + hduH}`} active={hduIn} />
                {hduIn && (
                    <Pill x={B[1].cx + 22} y={(hduT + hduH + bT) / 2}
                        text="IF/ID.Rs,Rt" anchor="start" />
                )}

                {/* ── Main data blocks ──────────────────────────────────────── */}
                <DataBlock i={0} lines={['INST', 'MEM']}  active={fetchOn} />
                <DataBlock i={1} lines={['REG', 'FILE']}  active={regOn} />
                <DataBlock i={2} lines={['ALU']}           active={aluOn}  detail={aluDetail} />
                <DataBlock i={3} lines={['DATA', 'MEM']}  active={memOn} />
                <DataBlock i={4} lines={['WB']}            active={wbOn} />

                {/* ── FWD — below ALU (B[2]) ───────────────────────────────── */}
                <CtrlBlock
                    lx={B[2].l} ty={fwdT} w={bW} h={fwdH}
                    name="FORWARDING UNIT" badge="FWD" active={fwdOn}
                />

                {/* ── Forward datapath arrows ───────────────────────────────── */}
                {/* INST MEM → REG FILE */}
                <Arrow d={`M ${B[0].r} ${bMY} H ${B[1].l - 1}`} active={a1} />
                {a1 && <Pill x={(B[0].r + B[1].l) / 2} y={bMY - 18} text="Inst [31:0]" />}

                {/* REG FILE → ALU */}
                <Arrow d={`M ${B[1].r} ${bMY} H ${B[2].l - 1}`} active={a2} />
                {a2 && <Pill x={(B[1].r + B[2].l) / 2} y={bMY - 18} text="Read Data 1/2" />}

                {/* ALU → DATA MEM */}
                <Arrow d={`M ${B[2].r} ${bMY} H ${B[3].l - 1}`} active={a3} />
                {a3 && <Pill x={(B[2].r + B[3].l) / 2} y={bMY - 18} text="ALU Result" />}

                {/* DATA MEM → WB */}
                <Arrow d={`M ${B[3].r} ${bMY} H ${B[4].l - 1}`} active={a5} />
                {a5 && <Pill x={(B[3].r + B[4].l) / 2} y={bMY - 18} text="Mem Data" />}

                {/* ── Write-back feedback paths ─────────────────────────────── */}
                {/* ALU result → REG FILE (non-load WB) */}
                <Arrow
                    d={`M ${B[2].cx} ${bB + 4} V ${wbR1} H ${B[1].cx} V ${bB - 1}`}
                    active={a4}
                />
                {a4 && (
                    <Pill x={(B[2].cx + B[1].cx) / 2} y={wbR1 + 14} text="ALU Result (WB)" />
                )}

                {/* Load data → REG FILE (load WB) */}
                <Arrow
                    d={`M ${B[4].cx} ${bB + 4} V ${wbR2} H ${B[1].cx - 8} V ${bB - 1}`}
                    active={a5}
                />
                {a5 && (
                    <Pill x={(B[4].cx + B[1].cx) / 2} y={wbR2 + 14} text="Read Data (WB)" />
                )}

                {/* ── Forwarding arrows ─────────────────────────────────────── */}
                {/* ALU → FWD */}
                <Arrow d={`M ${B[2].cx + 10} ${bB + 4} V ${fwdT - 1}`} active={fwdEx} />
                {fwdEx && (
                    <Pill x={B[2].cx + 26} y={(bB + fwdT) / 2}
                        text="EX/MEM.Rd" anchor="start" />
                )}

                {/* DATA MEM → FWD */}
                <Arrow
                    d={`M ${B[3].cx - 8} ${bB + 4} H ${B[2].r + 22} V ${fwdT - 1}`}
                    active={fwdMem}
                />
                {fwdMem && (
                    <Pill x={(B[3].cx + B[2].r) / 2} y={bB + 18} text="MEM/WB.Rd" />
                )}

                {/* FWD → ALU inputs */}
                <Arrow
                    d={`M ${B[2].l + 8} ${fwdT} V ${bB + 4} H ${B[2].cx - 14} V ${bB - 1}`}
                    active={fwdOut}
                />
                {fwdOut && (
                    <Pill x={B[2].l - 4} y={(fwdT + bB) / 2} text="Fwd A/B" anchor="end" />
                )}

                {/* ── Active instruction status chip ────────────────────────── */}
                {currentStage && curInst && (() => {
                    const label = `${curInst.opcode}  ·  ${currentStage}`;
                    const w2    = label.length * 6.5 + 22;
                    const rx2   = cw - 12;
                    return (
                        <g>
                            <rect x={rx2 - w2} y={10} width={w2} height={24} rx={7}
                                fill={p.statBg} stroke={p.statStroke} strokeWidth={1.5}
                            />
                            <text x={rx2 - w2 / 2} y={22}
                                fill={p.statTxt} fontSize={10.5} fontWeight={700}
                                fontFamily="var(--font-mono)"
                                textAnchor="middle" dominantBaseline="middle"
                                style={{ pointerEvents: 'none' }}
                            >{label}</text>
                        </g>
                    );
                })()}
            </svg>
        </div>
    );
};

export default VisualizerCanvas;
