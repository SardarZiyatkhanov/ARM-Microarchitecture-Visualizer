import React, { useState } from 'react';
import { TLBState, TLB_SIZE, PAGE_SIZE } from '@playarm/core';

interface TLBVisualizerProps {
    tlbState: TLBState;
    lastAccess: import('@playarm/core').MemoryAccessResult | null;
}

const fmt = (n: number, pad = 4) =>
    '0x' + n.toString(16).toUpperCase().padStart(pad, '0');

export const TLBVisualizer: React.FC<TLBVisualizerProps> = ({ tlbState, lastAccess }) => {
    const [open, setOpen] = useState(false);
    const { entries, pageTable, accessLog, hitCount, missCount } = tlbState;
    const total = hitCount + missCount;
    const hitRate = total === 0 ? 0 : Math.round((hitCount / total) * 100);

    return (
        <section className="panel" style={{ marginTop: '1.25rem' }}>
            {/* ── Header / toggle ── */}
            <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => setOpen(v => !v)}
            >
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1rem' }}>🔍</span> TLB &amp; Virtual Memory
                </h3>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    <StatBadge label="Hits" value={hitCount} color="#22c55e" />
                    <StatBadge label="Misses" value={missCount} color="#f97316" />
                    <StatBadge label="Hit Rate" value={`${hitRate}%`} color="#818cf8" />
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style={{ opacity: 0.4, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>
                        <path d="M6 8L1 3h10z"/>
                    </svg>
                </div>
            </div>

            {!open && <div style={{ marginTop: '0.4rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Click to expand</div>}

            {open && <>
            {/* ── Last access highlight ── */}
            {lastAccess && (
                <div style={{
                    borderRadius: '8px',
                    padding: '0.6rem 1rem',
                    marginBottom: '1rem',
                    background: lastAccess.hit
                        ? 'rgba(34,197,94,0.12)'
                        : 'rgba(249,115,22,0.12)',
                    border: `1px solid ${lastAccess.hit ? 'rgba(34,197,94,0.35)' : 'rgba(249,115,22,0.35)'}`,
                    display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                    fontSize: '0.78rem', fontFamily: 'monospace',
                }}>
                    <span style={{
                        fontWeight: 700, fontSize: '0.82rem',
                        color: lastAccess.hit ? '#22c55e' : '#f97316',
                    }}>
                        {lastAccess.hit ? '✅ TLB HIT' : '❌ TLB MISS'}
                    </span>
                    <AddrChip label="Virtual" value={fmt(lastAccess.virtualAddress, 8)} />
                    <span style={{ opacity: 0.5 }}>→</span>
                    <AddrChip label="Physical" value={fmt(lastAccess.physicalAddress, 8)} />
                    <AddrChip label="VPN" value={lastAccess.vpn.toString()} />
                    <AddrChip label="PFN" value={lastAccess.pfn.toString()} />
                    <AddrChip label="Offset" value={fmt(lastAccess.pageOffset)} />
                    {!lastAccess.hit && lastAccess.evictedVpn !== null && (
                        <span style={{ color: '#f97316', opacity: 0.8 }}>
                            evicted VPN {lastAccess.evictedVpn}
                        </span>
                    )}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* ── TLB Entries Table ── */}
                <div>
                    <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        TLB ({TLB_SIZE} entries · 4 KB pages)
                    </h4>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', fontFamily: 'monospace' }}>
                            <thead>
                                <tr style={{ opacity: 0.5 }}>
                                    {['#', 'V', 'VPN', 'PFN', 'D', 'Last Used'].map(h => (
                                        <th key={h} style={{ padding: '0.25rem 0.4rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((entry: any, i: number) => {
                                    const isHighlighted = lastAccess &&
                                        entry.valid && entry.vpn === lastAccess.vpn;
                                    return (
                                        <tr key={i} style={{
                                            background: isHighlighted
                                                ? (lastAccess?.hit ? 'rgba(34,197,94,0.08)' : 'rgba(249,115,22,0.08)')
                                                : 'transparent',
                                            transition: 'background 0.3s',
                                        }}>
                                            <td style={tdStyle}>{i}</td>
                                            <td style={tdStyle}>
                                                <span style={{ color: entry.valid ? '#22c55e' : '#475569', fontWeight: 700 }}>
                                                    {entry.valid ? '1' : '0'}
                                                </span>
                                            </td>
                                            <td style={tdStyle}>{entry.valid ? entry.vpn : '—'}</td>
                                            <td style={tdStyle}>{entry.valid ? entry.pfn : '—'}</td>
                                            <td style={tdStyle}>
                                                {entry.valid
                                                    ? <span style={{ color: entry.dirty ? '#f97316' : '#64748b' }}>{entry.dirty ? '1' : '0'}</span>
                                                    : '—'}
                                            </td>
                                            <td style={tdStyle}>{entry.valid ? entry.lastUsed : '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Right panel: Access Log + Page Table ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {/* Access Log */}
                    <div>
                        <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Access Log (last {accessLog.length})
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', maxHeight: '140px', overflowY: 'auto' }}>
                            {accessLog.length === 0
                                ? <div style={{ fontSize: '0.72rem', opacity: 0.4, fontStyle: 'italic' }}>No memory accesses yet</div>
                                : [...accessLog].reverse().map((log, i) => (
                                    <div key={i} style={{
                                        display: 'flex', gap: '0.5rem', alignItems: 'center',
                                        fontSize: '0.7rem', fontFamily: 'monospace',
                                        padding: '0.15rem 0.3rem',
                                        borderRadius: '4px',
                                        background: i === 0 ? 'rgba(255,255,255,0.04)' : 'transparent',
                                    }}>
                                        <span style={{
                                            color: log.hit ? '#22c55e' : '#f97316',
                                            fontWeight: 700, width: '36px', flexShrink: 0,
                                        }}>
                                            {log.hit ? 'HIT' : 'MISS'}
                                        </span>
                                        <span style={{ opacity: 0.6 }}>{fmt(log.virtualAddress, 6)}</span>
                                        <span style={{ opacity: 0.35 }}>→</span>
                                        <span style={{ opacity: 0.6 }}>{fmt(log.physicalAddress, 6)}</span>
                                    </div>
                                ))
                            }
                        </div>
                    </div>

                    {/* Page Table */}
                    <div>
                        <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Page Table
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', maxHeight: '140px', overflowY: 'auto' }}>
                            {Object.keys(pageTable).length === 0
                                ? <div style={{ fontSize: '0.72rem', opacity: 0.4, fontStyle: 'italic' }}>Empty</div>
                                : Object.values(pageTable).map((pte: any) => (
                                    <div key={pte.vpn} style={{
                                        display: 'flex', gap: '0.5rem', alignItems: 'center',
                                        fontSize: '0.7rem', fontFamily: 'monospace',
                                        padding: '0.15rem 0.3rem',
                                    }}>
                                        <span style={{ opacity: 0.5 }}>VPN</span>
                                        <span style={{ color: '#818cf8' }}>{pte.vpn}</span>
                                        <span style={{ opacity: 0.35 }}>→</span>
                                        <span style={{ opacity: 0.5 }}>PFN</span>
                                        <span style={{ color: '#38bdf8' }}>{pte.pfn}</span>
                                        <span style={{ opacity: 0.4, fontSize: '0.65rem' }}>
                                            (base {fmt(pte.pfn * PAGE_SIZE, 6)})
                                        </span>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Legend ── */}
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', fontSize: '0.68rem', opacity: 0.5, flexWrap: 'wrap' }}>
                <span>V = Valid bit</span>
                <span>D = Dirty bit (written)</span>
                <span>VPN = Virtual Page Number (addr &gt;&gt; 12)</span>
                <span>PFN = Physical Frame Number</span>
                <span>Offset = addr &amp; 0xFFF (within 4 KB page)</span>
                <span>Replacement: LRU</span>
            </div>
            </>}
        </section>
    );
};

// ── Small helpers ─────────────────────────────────────────────────────────────

const tdStyle: React.CSSProperties = {
    padding: '0.25rem 0.4rem',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
};

const StatBadge: React.FC<{ label: string; value: string | number; color: string }> = ({ label, value, color }) => (
    <div style={{
        background: `${color}18`, border: `1px solid ${color}40`,
        borderRadius: '6px', padding: '0.2rem 0.55rem',
        fontSize: '0.72rem', display: 'flex', gap: '0.3rem', alignItems: 'center',
    }}>
        <span style={{ opacity: 0.6 }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{value}</span>
    </div>
);

const AddrChip: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <span>
        <span style={{ opacity: 0.5 }}>{label}: </span>
        <span style={{ color: '#e2e8f0' }}>{value}</span>
    </span>
);
