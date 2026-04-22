import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Instruction, ParseError } from '@playarm/core';

// ─── ARM syntax highlighter ───────────────────────────────────────────────────
const OPCODES = new Set([
    'MOV','MOVS','ADD','ADDS','SUB','SUBS','MUL','AND','ORR','EOR',
    'LSL','LSR','ASR','CMP','CMN','TST','LDR','STR','LDRB','STRB',
    'PUSH','POP','B','BEQ','BNE','BGT','BLT','BGE','BLE','BL','BX','BLX',
]);

const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Token regex: order matters — most specific first
const TOKEN_RE = /;.*|(#-?(?:0x[\da-fA-F]+|\d+))|(\[|\]|\{|\})|(\bR[0-7]\b|\bPC\b|\bLR\b|\bSP\b)|(\b[A-Z][A-Z0-9]+\b(?=\s*:))|(\b[A-Z][A-Z0-9]*\b)|(,)/gi;

function highlightArm(code: string, dark: boolean): string {
    const C = dark ? {
        opcode:  '#60a5fa', reg: '#fb923c', imm: '#4ade80',
        label:   '#fbbf24', comment: '#6b7280', bracket: '#94a3b8', comma: '#64748b',
    } : {
        opcode:  '#1d4ed8', reg: '#c2410c', imm: '#15803d',
        label:   '#b45309', comment: '#6b7280', bracket: '#64748b', comma: '#94a3b8',
    };

    return code.split('\n').map(line => {
        TOKEN_RE.lastIndex = 0;
        let out = '';
        let last = 0;
        let m: RegExpExecArray | null;

        while ((m = TOKEN_RE.exec(line)) !== null) {
            out += esc(line.slice(last, m.index));
            last = m.index + m[0].length;

            const [full,, imm, bracket, reg, labelDef, word, comma] = m;

            if (full[0] === ';') {                              // comment
                out += `<span style="color:${C.comment};font-style:italic">${esc(full)}</span>`;
                last = line.length; break;
            } else if (imm !== undefined) {                     // immediate
                out += `<span style="color:${C.imm}">${esc(full)}</span>`;
            } else if (bracket) {                               // [ ] { }
                out += `<span style="color:${C.bracket}">${esc(full)}</span>`;
            } else if (reg) {                                   // register
                out += `<span style="color:${C.reg};font-weight:600">${esc(full)}</span>`;
            } else if (labelDef) {                              // LABEL:
                out += `<span style="color:${C.label};font-weight:600">${esc(full)}</span>`;
            } else if (word && OPCODES.has(word.toUpperCase())) { // opcode
                out += `<span style="color:${C.opcode};font-weight:700">${esc(word.toUpperCase())}</span>`;
            } else if (comma) {                                 // comma
                out += `<span style="color:${C.comma}">,</span>`;
            } else {
                out += esc(full);
            }
        }
        out += esc(line.slice(last));
        return out;
    }).join('\n');
}

interface InstructionInputProps {
    code: string;
    onChange: (code: string) => void;
    title: string;
    onTitleChange: (title: string) => void;
    onSave?: () => void;
    onLoad?: () => void;
    onDownload?: () => void;
    parsed: Instruction[];
    errors: ParseError[];
    /** Current Program Counter — used to highlight the instruction being Fetched */
    currentPc?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// MachineCodeTable
//
// Each ARM32 instruction is 32 bits wide.  We split those 32 bits into
// named fields and color-code them so students can see:
//
//   Bits 31-28  →  Condition code  (red)
//   Bits 27-20  →  Op / opcode     (orange / amber)
//   Bits 19-12  →  Register fields (sky blue)
//   Bits 11-0   →  Immediate / offset (green)
//
// The split is an approximation that works well visually for the instruction
// set supported by this simulator.
// ─────────────────────────────────────────────────────────────────────────────



const MachineCodeTable: React.FC<{ parsed: Instruction[]; currentPc: number; viewMode: 'hex' | 'binary' }> = ({
    parsed, currentPc, viewMode
}) => {
    if (parsed.length === 0) {
        return <div className="text-muted" style={{ padding: '0.75rem 0', fontSize: '0.8rem' }}>No valid instructions yet.</div>;
    }

    return (
        <div style={{ overflowX: 'auto' }}>
            <table className="machine-code-table">
                <thead>
                    <tr>
                        <th>Address</th>
                        <th>Hex</th>
                        {viewMode === 'binary' && (
                            <>
                                <th className="bit-cond-th">Cond<br /><span>[31:28]</span></th>
                                <th className="bit-op-th">Op<br /><span>[27:20]</span></th>
                                <th className="bit-reg-th">Regs<br /><span>[19:12]</span></th>
                                <th className="bit-imm-th">Imm/Off<br /><span>[11:0]</span></th>
                            </>
                        )}
                        <th>Assembly</th>
                        <th>Stage</th>
                    </tr>
                </thead>
                <tbody>
                    {parsed.map((inst) => {
                        const addr = inst.address ?? 0;
                        const isFetch     = addr === currentPc;
                        const isDecode    = addr === currentPc - 4;
                        const isExecute   = addr === currentPc - 8;
                        const isMemory    = addr === currentPc - 12;
                        const isWriteBack = addr === currentPc - 16;

                        let rowClass = '';
                        let stageLabel = '';
                        let stageCls = '';
                        if (isFetch)     { rowClass = 'mc-row-fetch';      stageLabel = '⬇ Fetch';     stageCls = 'stage-badge fetch'; }
                        if (isDecode)    { rowClass = 'mc-row-decode';     stageLabel = '🔍 Decode';    stageCls = 'stage-badge decode'; }
                        if (isExecute)   { rowClass = 'mc-row-execute';    stageLabel = '⚙ Execute';   stageCls = 'stage-badge exec'; }
                        if (isMemory)    { rowClass = 'mc-row-memory';     stageLabel = '💾 Memory';    stageCls = 'stage-badge memory'; }
                        if (isWriteBack) { rowClass = 'mc-row-writeback';  stageLabel = '✎ WriteBack'; stageCls = 'stage-badge writeback'; }

                        const binary = inst.binary ?? '0'.repeat(32);
                        const hex = inst.machineCode ?? '????????';

                        return (
                            <tr key={inst.id} className={rowClass}>
                                <td className="mc-addr">0x{addr.toString(16).toUpperCase().padStart(4, '0')}</td>
                                <td className="mc-hex">{hex}</td>
                                {viewMode === 'binary' && (
                                    <>
                                        <td className="bit-cond mc-bits">{binary.slice(0, 4)}</td>
                                        <td className="bit-op mc-bits">{binary.slice(4, 12)}</td>
                                        <td className="bit-reg mc-bits">{binary.slice(12, 20)}</td>
                                        <td className="bit-imm mc-bits">{binary.slice(20, 32)}</td>
                                    </>
                                )}
                                <td className="mc-asm">{inst.raw}</td>
                                <td>{stageLabel ? <span className={stageCls}>{stageLabel}</span> : null}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const InstructionInput: React.FC<InstructionInputProps> = ({
    code, onChange, title, onTitleChange, onSave, onLoad, onDownload, parsed, errors, currentPc = 0
}) => {
    const [viewMode, setViewMode] = useState<'hex' | 'binary'>('hex');

    // ── Syntax highlight state ─────────────────────────────────────────────
    const [dark, setDark] = useState(
        document.documentElement.getAttribute('data-theme') !== 'light'
    );
    useEffect(() => {
        const root = document.documentElement;
        const sync = () => setDark(root.getAttribute('data-theme') !== 'light');
        const obs = new MutationObserver(() => sync());
        obs.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
        return () => obs.disconnect();
    }, []);

    const highlighted = useCallback(
        () => highlightArm(code, dark),
        [code, dark]
    );

    const taRef  = useRef<HTMLTextAreaElement>(null);
    const preRef = useRef<HTMLPreElement>(null);

    const syncScroll = () => {
        if (taRef.current && preRef.current) {
            preRef.current.scrollTop  = taRef.current.scrollTop;
            preRef.current.scrollLeft = taRef.current.scrollLeft;
        }
    };

    return (
        <section className="panel instruction-panel">
            {/* ── Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Assembly Input</h3>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {onDownload && (
                        <button className="btn btn-outline" onClick={onDownload} title="Download as .s file"
                            style={{ height: '30px', fontSize: '0.72rem', padding: '0 0.65rem' }}>
                            ⬇ Download
                        </button>
                    )}
                    {onLoad && (
                        <button className="btn btn-outline" onClick={onLoad}
                            style={{ height: '30px', fontSize: '0.72rem', padding: '0 0.65rem' }}>
                            📁 Load
                        </button>
                    )}
                    {onSave && (
                        <button className="btn btn-primary" onClick={onSave}
                            style={{ height: '30px', fontSize: '0.72rem', padding: '0 0.65rem' }}>
                            💾 Save
                        </button>
                    )}
                </div>
            </div>

            {/* ── Program title input ── */}
            <div style={{ marginBottom: '1.25rem' }}>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    placeholder="Program Title"
                    className="title-input"
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'inherit' }}
                />
            </div>

            {/* ── Code editor with syntax highlighting ── */}
            <div className="editor-wrapper" style={{ position: 'relative' }}>
                {/* Highlighted layer (behind) */}
                <pre
                    ref={preRef}
                    aria-hidden
                    className={`code-editor ${errors.length > 0 ? 'has-errors' : ''}`}
                    style={{
                        position: 'absolute', inset: 0, margin: 0,
                        pointerEvents: 'none', overflow: 'hidden',
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        padding: '1rem',
                        border: '1px solid transparent',
                    }}
                    dangerouslySetInnerHTML={{ __html: highlighted() + '\n' }}
                />
                {/* Input layer (on top, transparent text so highlight shows) */}
                <textarea
                    ref={taRef}
                    value={code}
                    onChange={(e) => onChange(e.target.value)}
                    onScroll={syncScroll}
                    className={`code-editor ${errors.length > 0 ? 'has-errors' : ''}`}
                    placeholder="Enter ARM assembly here..."
                    rows={15}
                    spellCheck={false}
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="off"
                    style={{
                        position: 'relative', background: 'transparent',
                        color: 'transparent', caretColor: dark ? '#e2e8f0' : '#1e293b',
                        WebkitTextFillColor: 'transparent',
                        resize: 'vertical',
                    }}
                />
            </div>

            {/* ── Syntax errors ── */}
            {errors.length > 0 && (
                <div className="error-log">
                    <h3 style={{ color: 'var(--danger-color)' }}>Syntax Errors</h3>
                    {errors.map((error, idx) => (
                        <div key={idx} className="error-item">
                            <strong>Line {error.line}:</strong> {error.message}
                        </div>
                    ))}
                </div>
            )}

            {/* ── Machine Code View ── */}
            <div className="mc-panel">
                <div className="mc-panel-header">
                    <div>
                        <h3 style={{ marginBottom: '0.15rem' }}>Machine Code View</h3>
                        <p className="mc-subtitle">
                            How the CPU sees your instructions at the hardware level (Fetch → Decode)
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                            className={`btn btn-toggle ${viewMode === 'hex' ? 'active' : ''}`}
                            onClick={() => setViewMode('hex')}
                        >
                            HEX
                        </button>
                        <button
                            className={`btn btn-toggle ${viewMode === 'binary' ? 'active' : ''}`}
                            onClick={() => setViewMode('binary')}
                        >
                            BINARY
                        </button>
                    </div>
                </div>

                {/* Bit-field color legend (only shown in binary mode) */}
                {viewMode === 'binary' && (
                    <div className="mc-legend">
                        <span className="legend-item bit-cond">Cond [31:28]</span>
                        <span className="legend-item bit-op">Op/Func [27:20]</span>
                        <span className="legend-item bit-reg">Registers [19:12]</span>
                        <span className="legend-item bit-imm">Immediate/Offset [11:0]</span>
                    </div>
                )}

                <MachineCodeTable parsed={parsed} currentPc={currentPc} viewMode={viewMode} />
            </div>

        </section>
    );
};