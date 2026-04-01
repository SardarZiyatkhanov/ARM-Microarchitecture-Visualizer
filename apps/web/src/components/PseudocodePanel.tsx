import { useState } from 'react';

interface PseudocodePanelProps {
    code: string;
    currentPc: number;
    parsedCount: number;
}

function toPseudocode(line: string): string {
    const t = line.trim();

    // MOV
    let m = t.match(/^MOV\s+(\w+),\s*#(-?\w+)$/i);
    if (m) return `${m[1]} = ${m[2]}`;

    m = t.match(/^MOV\s+(\w+),\s*(\w+)$/i);
    if (m) return `${m[1]} = ${m[2]}`;

    // SUBS (must come before SUB)
    m = t.match(/^SUBS\s+(\w+),\s*(\w+),\s*#(-?\w+)$/i);
    if (m) return `${m[1]} = ${m[2]} \u2212 ${m[3]}  // flags updated`;

    // ADD
    m = t.match(/^ADD\s+(\w+),\s*(\w+),\s*(\w+)$/i);
    if (m) return `${m[1]} = ${m[2]} + ${m[3]}`;

    m = t.match(/^ADD\s+(\w+),\s*(\w+),\s*#(-?\w+)$/i);
    if (m) return `${m[1]} = ${m[2]} + ${m[3]}`;

    // SUB
    m = t.match(/^SUB\s+(\w+),\s*(\w+),\s*(\w+)$/i);
    if (m) return `${m[1]} = ${m[2]} \u2212 ${m[3]}`;

    m = t.match(/^SUB\s+(\w+),\s*(\w+),\s*#(-?\w+)$/i);
    if (m) return `${m[1]} = ${m[2]} \u2212 ${m[3]}`;

    // MUL
    m = t.match(/^MUL\s+(\w+),\s*(\w+),\s*(\w+)$/i);
    if (m) return `${m[1]} = ${m[2]} \u00d7 ${m[3]}`;

    // AND / ORR / EOR
    m = t.match(/^AND\s+(\w+),\s*(\w+),\s*(\w+)$/i);
    if (m) return `${m[1]} = ${m[2]} & ${m[3]}`;

    m = t.match(/^ORR\s+(\w+),\s*(\w+),\s*(\w+)$/i);
    if (m) return `${m[1]} = ${m[2]} | ${m[3]}`;

    m = t.match(/^EOR\s+(\w+),\s*(\w+),\s*(\w+)$/i);
    if (m) return `${m[1]} = ${m[2]} ^ ${m[3]}`;

    // LSL / LSR
    m = t.match(/^LSL\s+(\w+),\s*(\w+),\s*#(-?\w+)$/i);
    if (m) return `${m[1]} = ${m[2]} << ${m[3]}`;

    m = t.match(/^LSR\s+(\w+),\s*(\w+),\s*#(-?\w+)$/i);
    if (m) return `${m[1]} = ${m[2]} >> ${m[3]}`;

    // CMP
    m = t.match(/^CMP\s+(\w+),\s*(\w+)$/i);
    if (m) return `flags = ${m[1]} \u2212 ${m[2]}`;

    m = t.match(/^CMP\s+(\w+),\s*#(-?\w+)$/i);
    if (m) return `flags = ${m[1]} \u2212 ${m[2]}`;

    // BX LR (before generic branch patterns)
    if (/^BX\s+LR$/i.test(t)) return 'return';

    // BL (before B)
    m = t.match(/^BL\s+(\S+)$/i);
    if (m) return `call ${m[1]}`;

    // Conditional branches (before plain B)
    m = t.match(/^BEQ\s+(\S+)$/i);
    if (m) return `if (Z) goto ${m[1]}`;

    m = t.match(/^BNE\s+(\S+)$/i);
    if (m) return `if (!Z) goto ${m[1]}`;

    m = t.match(/^BGT\s+(\S+)$/i);
    if (m) return `if (>) goto ${m[1]}`;

    m = t.match(/^BLT\s+(\S+)$/i);
    if (m) return `if (<) goto ${m[1]}`;

    m = t.match(/^BGE\s+(\S+)$/i);
    if (m) return `if (>=) goto ${m[1]}`;

    m = t.match(/^BLE\s+(\S+)$/i);
    if (m) return `if (<=) goto ${m[1]}`;

    // Plain B
    m = t.match(/^B\s+(\S+)$/i);
    if (m) return `goto ${m[1]}`;

    // LDR — order: pre-index writeback, post-index, offset, base
    m = t.match(/^LDR\s+(\w+),\s*\[(\w+),\s*#(-?\w+)\]!$/i);
    if (m) return `${m[2]} += ${m[3]}; ${m[1]} = mem[${m[2]}]`;

    m = t.match(/^LDR\s+(\w+),\s*\[(\w+)\],\s*#(-?\w+)$/i);
    if (m) return `${m[1]} = mem[${m[2]}]; ${m[2]} += ${m[3]}`;

    m = t.match(/^LDR\s+(\w+),\s*\[(\w+),\s*#(-?\w+)\]$/i);
    if (m) return `${m[1]} = mem[${m[2]} + ${m[3]}]`;

    m = t.match(/^LDR\s+(\w+),\s*\[(\w+)\]$/i);
    if (m) return `${m[1]} = mem[${m[2]}]`;

    // STR — same ordering
    m = t.match(/^STR\s+(\w+),\s*\[(\w+),\s*#(-?\w+)\]!$/i);
    if (m) return `${m[2]} += ${m[3]}; mem[${m[2]}] = ${m[1]}`;

    m = t.match(/^STR\s+(\w+),\s*\[(\w+)\],\s*#(-?\w+)$/i);
    if (m) return `mem[${m[2]}] = ${m[1]}; ${m[2]} += ${m[3]}`;

    m = t.match(/^STR\s+(\w+),\s*\[(\w+),\s*#(-?\w+)\]$/i);
    if (m) return `mem[${m[2]} + ${m[3]}] = ${m[1]}`;

    m = t.match(/^STR\s+(\w+),\s*\[(\w+)\]$/i);
    if (m) return `mem[${m[2]}] = ${m[1]}`;

    // PUSH / POP
    m = t.match(/^PUSH\s+\{([^}]+)\}$/i);
    if (m) return `stack.push(${m[1].trim()})`;

    m = t.match(/^POP\s+\{([^}]+)\}$/i);
    if (m) return `${m[1].trim()} = stack.pop()`;

    return '';
}

export function PseudocodePanel({ code, currentPc, parsedCount: _parsedCount }: PseudocodePanelProps) {
    const [open, setOpen] = useState(false);

    const currentInstrIndex = Math.floor(currentPc / 4);

    const lines = code.split('\n');

    // Build rows, tracking instruction index separately from line index
    let instrIndex = 0;
    const rows = lines.map((rawLine) => {
        const trimmed = rawLine.trim();

        // Blank line
        if (trimmed === '') {
            return { kind: 'blank' as const, raw: rawLine, instrIndex: -1 };
        }

        // Label-only line: entire trimmed content matches "something:"
        // (does NOT match "loop: MOV R0, #1" because there's content after the colon)
        if (/^\w+:$/.test(trimmed)) {
            return { kind: 'label' as const, raw: rawLine, label: trimmed, instrIndex: -1 };
        }

        // Strip inline label prefix if present (e.g. "loop: MOV R0, #1")
        const withoutLabel = trimmed.replace(/^\w+:\s*/, '');

        const pseudo = toPseudocode(withoutLabel);
        const idx = instrIndex;
        instrIndex++;
        return { kind: 'instr' as const, raw: rawLine, asm: withoutLabel, pseudo, instrIndex: idx };
    });

    return (
        <div className="pseudocode-panel">
            <button
                className="pseudocode-toggle"
                onClick={() => setOpen((prev) => !prev)}
                aria-expanded={open}
            >
                {open ? '\u25bc' : '\u25b6'} Pseudocode
            </button>

            {open && (
                <div className="pseudocode-body">
                    {rows.map((row, i) => {
                        if (row.kind === 'blank') {
                            return <div key={i} className="pseudo-row" aria-hidden="true" />;
                        }

                        if (row.kind === 'label') {
                            return (
                                <div key={i} className="pseudo-row pseudo-label">
                                    <span className="pseudo-asm">{row.label}</span>
                                </div>
                            );
                        }

                        // instruction row
                        const isActive = row.instrIndex === currentInstrIndex;
                        return (
                            <div key={i} className={`pseudo-row${isActive ? ' active' : ''}`}>
                                <span className="pseudo-asm">{row.asm}</span>
                                {row.pseudo !== '' && (
                                    <>
                                        <span className="pseudo-arrow">&rarr;</span>
                                        <span className="pseudo-code">{row.pseudo}</span>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
