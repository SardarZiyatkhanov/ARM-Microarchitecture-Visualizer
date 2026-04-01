import { INITIAL_REGISTERS } from '@playarm/core';

const INITIAL_SP = INITIAL_REGISTERS['SP']; // 1024

interface StackPanelProps {
    registers: Record<string, number>;
    memory: Record<number, number>;
    displayFormat: 'hex' | 'decimal' | 'binary';
}

export function StackPanel({ registers, memory, displayFormat }: StackPanelProps) {
    const sp = registers['SP'] ?? INITIAL_SP;

    const fmt = (v: number) => {
        if (displayFormat === 'hex') return '0x' + v.toString(16).toUpperCase().padStart(8, '0');
        if (displayFormat === 'binary') return (v >>> 0).toString(2).padStart(32, '0').replace(/(.{8})/g, '$1 ').trim();
        return v.toString(10);
    };

    const fmtAddr = (a: number) =>
        '0x' + a.toString(16).toUpperCase().padStart(4, '0');

    // Stack entries: addresses that fall in the stack region (sp <= addr < INITIAL_SP)
    // and have been written to memory. Sorted descending (highest address at top).
    const stackEntries = Object.entries(memory)
        .map(([addr, val]) => ({ addr: parseInt(addr), val }))
        .filter(({ addr }) => addr >= sp && addr < INITIAL_SP)
        .sort((a, b) => b.addr - a.addr);

    // Non-stack memory (addresses outside the stack region)
    const dataEntries = Object.entries(memory)
        .map(([addr, val]) => ({ addr: parseInt(addr), val }))
        .filter(({ addr }) => addr < sp || addr >= INITIAL_SP)
        .sort((a, b) => a.addr - b.addr);

    const isEmpty = stackEntries.length === 0;

    return (
        <>
            <div className="status-section">
                <h3>Stack</h3>

                <div className="stack-viewer">
                    {/* Top boundary — initial SP */}
                    <div className="stack-boundary">
                        <span className="stack-addr">{fmtAddr(INITIAL_SP)}</span>
                        <span className="stack-boundary-label">← initial SP</span>
                    </div>

                    {isEmpty ? (
                        <div className="stack-empty">Stack empty</div>
                    ) : (
                        stackEntries.map(({ addr, val }) => (
                            <div key={addr} className={`stack-row${addr === sp ? ' stack-sp-row' : ''}`}>
                                <span className="stack-addr">{fmtAddr(addr)}</span>
                                <span className="stack-val">{fmt(val)}</span>
                                {addr === sp && (
                                    <span className="stack-sp-arrow">← SP</span>
                                )}
                            </div>
                        ))
                    )}

                    {/* SP marker when stack is empty or SP row not yet written */}
                    {(isEmpty || !stackEntries.some(e => e.addr === sp)) && sp < INITIAL_SP && (
                        <div className="stack-row stack-sp-row">
                            <span className="stack-addr">{fmtAddr(sp)}</span>
                            <span className="stack-val stack-val-empty">—</span>
                            <span className="stack-sp-arrow">← SP</span>
                        </div>
                    )}
                </div>
            </div>

            {dataEntries.length > 0 && (
                <div className="status-section">
                    <h3>Data Memory</h3>
                    <div className="memory-list">
                        {dataEntries.map(({ addr, val }) => (
                            <div key={addr} className="mem-item">
                                <span className="mem-addr">{fmtAddr(addr)}</span>
                                <span className="mem-val">{fmt(val)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
