import { useState } from 'react';
import { BOOK_PROGRAMS, BookProgram, matchBookProgram } from '../data/bookPrograms';

interface BookModePanelProps {
    currentCode: string;
    onLoad: (code: string) => void;
}

const CHAPTER_COLORS: Record<number, string> = {
    3: '#3fb950',  // green  — arithmetic
    4: '#d29922',  // amber  — loops
    5: '#a371f7',  // purple — bitwise
    7: '#2f81f7',  // blue   — functions/stack
};

function chapterColor(ch: number): string {
    return CHAPTER_COLORS[ch] ?? 'var(--accent-color)';
}

export function BookModePanel({ currentCode, onLoad }: BookModePanelProps) {
    const [expanded, setExpanded] = useState(false);
    const [activeChapter, setActiveChapter] = useState<number | null>(null);

    const matched = matchBookProgram(currentCode);

    const chapters = [...new Set(BOOK_PROGRAMS.map(p => p.chapter))].sort((a, b) => a - b);
    const filtered = activeChapter === null
        ? BOOK_PROGRAMS
        : BOOK_PROGRAMS.filter(p => p.chapter === activeChapter);

    return (
        <div className="book-mode-panel">
            {/* ── Active program badge ── */}
            {matched && (
                <div className="book-badge" style={{ borderColor: chapterColor(matched.chapter) }}>
                    <div className="book-badge-header" style={{ color: chapterColor(matched.chapter) }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                        </svg>
                        Chapter {matched.chapter} — {matched.chapterTitle}
                    </div>
                    <div className="book-badge-title">{matched.title}</div>
                    <div className="book-badge-concept">{matched.concept}</div>
                </div>
            )}

            {/* ── Browser toggle ── */}
            <button
                className="book-browse-toggle"
                onClick={() => setExpanded(v => !v)}
            >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
                Book Programs
                <svg
                    width="12" height="12" viewBox="0 0 12 12" fill="currentColor"
                    style={{ marginLeft: 'auto', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}
                >
                    <path d="M6 8L1 3h10z"/>
                </svg>
            </button>

            {expanded && (
                <div className="book-browser">
                    {/* Chapter filter tabs */}
                    <div className="book-chapter-tabs">
                        <button
                            className={`book-ch-tab ${activeChapter === null ? 'active' : ''}`}
                            onClick={() => setActiveChapter(null)}
                        >All</button>
                        {chapters.map(ch => (
                            <button
                                key={ch}
                                className={`book-ch-tab ${activeChapter === ch ? 'active' : ''}`}
                                style={activeChapter === ch ? { borderColor: chapterColor(ch), color: chapterColor(ch) } : {}}
                                onClick={() => setActiveChapter(ch === activeChapter ? null : ch)}
                            >Ch {ch}</button>
                        ))}
                    </div>

                    {/* Program list */}
                    <div className="book-program-list">
                        {filtered.map(prog => (
                            <BookProgramCard
                                key={prog.id}
                                prog={prog}
                                isActive={matched?.id === prog.id}
                                onLoad={onLoad}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function BookProgramCard({ prog, isActive, onLoad }: { prog: BookProgram; isActive: boolean; onLoad: (code: string) => void }) {
    const color = chapterColor(prog.chapter);
    return (
        <div
            className={`book-program-card ${isActive ? 'active' : ''}`}
            style={isActive ? { borderColor: color, background: `${color}12` } : {}}
            onClick={() => onLoad(prog.code)}
        >
            <div className="book-card-header">
                <span className="book-card-ch" style={{ color }}>Ch {prog.chapter}</span>
                <span className="book-card-title">{prog.title}</span>
            </div>
            <div className="book-card-concept">{prog.concept}</div>
        </div>
    );
}
