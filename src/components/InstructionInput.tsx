import React, { useState } from 'react';
import { Instruction, ParseError } from '../core/types';

interface InstructionInputProps {
    code: string;
    onChange: (code: string) => void;
    title: string;
    onTitleChange: (title: string) => void;
    onSave?: () => void;
    onLoad?: () => void;
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
                        const isFetch = addr === currentPc;
                        const isDecode = addr === currentPc - 4;
                        const isExecute = addr === currentPc - 8;

                        let rowClass = '';
                        let stageLabel = '';
                        let stageCls = '';
                        if (isFetch) { rowClass = 'mc-row-fetch'; stageLabel = '⬇ Fetch'; stageCls = 'stage-badge fetch'; }
                        if (isDecode) { rowClass = 'mc-row-decode'; stageLabel = '🔍 Decode'; stageCls = 'stage-badge decode'; }
                        if (isExecute) { rowClass = 'mc-row-execute'; stageLabel = '⚙ Execute'; stageCls = 'stage-badge exec'; }

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
    code, onChange, title, onTitleChange, onSave, onLoad, parsed, errors, currentPc = 0
}) => {
    const [viewMode, setViewMode] = useState<'hex' | 'binary'>('hex');

    return (
        <section className="panel instruction-panel">
            {/* ── Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>Assembly Input</h3>
                <div className="control-group">
                    {onLoad && <button className="btn btn-outline" onClick={onLoad}>📁 Load</button>}
                    {onSave && <button className="btn btn-primary" onClick={onSave}>💾 Save</button>}
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

            {/* ── Code editor ── */}
            <div className="editor-wrapper">
                <textarea
                    value={code}
                    onChange={(e) => onChange(e.target.value)}
                    className={`code-editor ${errors.length > 0 ? 'has-errors' : ''}`}
                    placeholder="Enter ARM assembly here..."
                    rows={15}
                    /* MOBILE FIXES */
                    spellCheck={false}
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="off"
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