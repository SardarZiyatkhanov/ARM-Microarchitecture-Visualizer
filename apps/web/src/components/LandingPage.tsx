import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

function useReveal() {
    useEffect(() => {
        const io = new IntersectionObserver(
            entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('lp-visible'); }),
            { threshold: 0.1 }
        );
        document.querySelectorAll('.lp-reveal').forEach(el => io.observe(el));
        return () => io.disconnect();
    }, []);
}

const features = [
    { color: '#2f81f7', symbol: '⟳', title: '5-Stage Pipeline', badge: 'Core',          desc: 'Watch ARM instructions flow through Fetch → Decode → Execute → Memory → Write-Back in real time on a live, draggable Fabric.js canvas with step/play/reset controls.', tags: ['Real-time', 'Draggable', 'Step Control'] },
    { color: '#8b5cf6', symbol: '⊞', title: 'Virtual Memory & TLB', badge: 'Advanced',   desc: 'Every LDR/STR resolves through a 16-entry fully-associative TLB with LRU eviction, hit/miss detection, page table viewer, and live hit-rate statistics.', tags: ['4 KB Pages', 'LRU Policy', 'Hit Rate'] },
    { color: '#10b981', symbol: '◈', title: 'AI ARM Assistant', badge: 'New',            desc: 'Ask the built-in AI tutor anything about ARM assembly, pipeline hazards, or calling conventions. Answers stream instantly via Groq / Llama 3.1 — completely free.', tags: ['Llama 3.1', 'Streaming', 'Free'] },
    { color: '#f59e0b', symbol: '◇', title: 'Hazard Detection', badge: 'Smart',          desc: 'RAW (Read-After-Write) and control hazards are detected automatically before each pipeline advance and surfaced as color-coded badge overlays on the canvas.', tags: ['RAW Hazards', 'Control Hazards', 'Badges'] },
    { color: '#ec4899', symbol: '◉', title: 'Mobile App', badge: 'Cross-Platform',       desc: 'Full ARM pipeline simulator on iOS and Android. Native Expo app with haptic feedback, register sparklines, instruction encoding, and 15 guided exercises.', tags: ['iOS & Android', 'Haptics', 'Dark/Light'] },
    { color: '#06b6d4', symbol: '◎', title: 'Learning Exercises', badge: 'Education',    desc: '15 guided ARM programming challenges from basic loops to GCD, factorial, and calling conventions — with instant feedback and progress persistence.', tags: ['15 Exercises', 'Instant Feedback', 'Progress'] },
];

const stats = [
    { value: '100%', label: 'Free to Use' },
    { value: '5',    label: 'Pipeline Stages' },
    { value: '15+',  label: 'ARM Exercises' },
    { value: 'AI',   label: 'Powered Tutor' },
];

const STAGES      = ['IF', 'ID', 'EX', 'MEM', 'WB'];
const STAGE_FULL  = ['Fetch', 'Decode', 'Execute', 'Memory', 'Write-Back'];
const STAGE_CLR   = ['#2f81f7', '#6366f1', '#8b5cf6', '#ec4899', '#10b981'];

const TOKENS = [
    { label: 'MOV R0, #5',    color: '#2f81f7' },
    { label: 'ADD R1, R0, R2',color: '#6366f1' },
    { label: 'LDR R3, [R4]',  color: '#8b5cf6' },
    { label: 'CMP R5, R6',    color: '#ec4899' },
];

const techStack = ['React', 'TypeScript', 'Vite', 'Firebase', 'Fabric.js', 'Groq / Llama 3.1', 'Expo', 'React Native', 'Vercel', 'AsyncStorage'];

const team = [
    { init: 'SZ', name: 'Sardar Ziyatkhanov', role: 'Team Leader · EEE, ADA University',   color: '#2f81f7' },
    { init: 'JP', name: 'Jamila Pashayeva',   role: 'Team Member · ADA University',         color: '#8b5cf6' },
    { init: 'SA', name: 'Said Ahadov',        role: 'Team Member · ADA University',         color: '#10b981' },
    { init: 'YA', name: 'Yusif Ashrafov',     role: 'Team Member · ADA University',         color: '#f59e0b' },
];

const steps = [
    { n: '01', title: 'Write ARM Assembly',   color: '#2f81f7', desc: 'Use the built-in editor with real-time syntax highlighting. Insert pre-built programs (factorial, fibonacci, array sum) in one click.' },
    { n: '02', title: 'Assemble & Load',      color: '#8b5cf6', desc: 'The in-browser ARM assembler parses your instructions, generates 32-bit machine code, and loads the program into the simulated pipeline.' },
    { n: '03', title: 'Step the Clock',       color: '#10b981', desc: 'Hit Step (→) to advance one clock cycle. Every register, flag, memory cell, TLB entry, and control signal updates live.' },
    { n: '04', title: 'Ask the AI',           color: '#f59e0b', desc: 'Not sure why a hazard occurred? Ask the built-in AI assistant. It understands your current program and explains it in plain English.' },
];

export default function LandingPage() {
    const navigate = useNavigate();
    useReveal();

    return (
        <div className="lp-root">

            {/* ── Nav ──────────────────────────────────────────── */}
            <nav className="lp-nav">
                <span className="lp-logo">Play<span>ARM</span></span>
                <div className="lp-nav-links">
                    <a href="#features" className="lp-nav-link">Features</a>
                    <a href="#pipeline" className="lp-nav-link">Pipeline</a>
                    <a href="#about"    className="lp-nav-link">About</a>
                    <a href="https://github.com/SardarZiyatkhanov/ARM-Microarchitecture-Visualizer"
                       className="lp-nav-link" target="_blank" rel="noreferrer">GitHub</a>
                    <button className="lp-btn-primary" onClick={() => navigate('/app')}>Launch Simulator →</button>
                </div>
                <button className="lp-nav-mobile-btn lp-btn-primary" onClick={() => navigate('/app')}>Launch →</button>
            </nav>

            {/* ── Hero ─────────────────────────────────────────── */}
            <section className="lp-hero">
                <div className="lp-hero-grid" />
                <div className="lp-glow lp-glow-l" />
                <div className="lp-glow lp-glow-r" />

                <div className="lp-hero-inner">
                    <div className="lp-hero-text">
                        <div className="lp-badge">
                            <span className="lp-badge-dot" />
                            Senior Design Project · ADA University
                        </div>
                        <h1 className="lp-title">
                            The ARM Processor<br />
                            <span className="lp-title-grad">You Can See Inside</span>
                        </h1>
                        <p className="lp-subtitle">
                            PlayARM visualizes every clock cycle of a 5-stage ARM pipeline —
                            registers, flags, TLB, hazards, and control signals — live in your browser.
                        </p>
                        <div className="lp-hero-ctas">
                            <button className="lp-btn-primary lp-btn-lg" onClick={() => navigate('/app')}>
                                Launch Simulator →
                            </button>
                            <a className="lp-btn-ghost lp-btn-lg"
                               href="https://github.com/SardarZiyatkhanov/ARM-Microarchitecture-Visualizer"
                               target="_blank" rel="noreferrer">
                                <GithubIcon /> GitHub
                            </a>
                        </div>
                    </div>

                    <div className="lp-hero-visual">
                        <div className="lp-code-window">
                            <div className="lp-win-bar">
                                <span className="lp-dot red"/><span className="lp-dot yellow"/><span className="lp-dot green"/>
                                <span className="lp-win-name">factorial.s</span>
                            </div>
                            <div className="lp-code-body">
                                {[
                                    [1,'MOV','R0','#5','@ n = 5', false],
                                    [2,'MOV','R1','#1','@ result', false],
                                    [3,'MUL','R1, R1','R0','', true],
                                    [4,'SUB','R0','R0, #1','', false],
                                    [5,'CMP','R0','#0','', false],
                                    [6,'BNE','#-8','','@ loop', false],
                                    [7,'STR','R1','[R2]','', false],
                                ].map(([n, kw, a, b, cm, active]) => (
                                    <div key={n as number} className={`lp-cl${active ? ' lp-cl-exec' : ''}`}>
                                        <span className="lp-ln">{n}</span>
                                        <span className="kw">{kw as string}</span>
                                        {' '}<span className="reg">{a as string}</span>
                                        {b ? <>{', '}<span className={String(b).startsWith('#') || String(b).startsWith('[') ? 'imm' : 'reg'}>{b as string}</span></> : null}
                                        {cm ? <span className="cm">&nbsp;&nbsp;{cm as string}</span> : null}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="lp-reg-row">
                            {['R0 = 5','R1 = 120','PC = 0x0C','Z = 0'].map((r, i) => (
                                <div key={i} className={`lp-reg-chip${i === 1 ? ' active' : ''}`}>{r}</div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Stats strip ──────────────────────────────────── */}
            <div className="lp-stats">
                {stats.map(s => (
                    <div key={s.label} className="lp-stat">
                        <span className="lp-stat-val">{s.value}</span>
                        <span className="lp-stat-lbl">{s.label}</span>
                    </div>
                ))}
            </div>

            {/* ── Features ─────────────────────────────────────── */}
            <section className="lp-features lp-reveal" id="features">
                <div className="lp-section-head">
                    <div className="lp-tag">Features</div>
                    <h2 className="lp-section-title">Everything you need<br />to understand ARM</h2>
                    <p className="lp-section-sub">Six integrated tools that take you from writing ARM assembly to understanding every bit of silicon behavior.</p>
                </div>
                <div className="lp-feat-grid">
                    {features.map((f, i) => (
                        <div key={f.title} className="lp-feat-card lp-reveal" style={{ animationDelay: `${i * 60}ms` }}>
                            <div className="lp-feat-icon-wrap" style={{ background: `${f.color}1a`, borderColor: `${f.color}33` }}>
                                <span className="lp-feat-icon" style={{ color: f.color }}>{f.symbol}</span>
                            </div>
                            <span className="lp-feat-badge" style={{ color: f.color, background: `${f.color}18`, borderColor: `${f.color}30` }}>{f.badge}</span>
                            <h3 className="lp-feat-title">{f.title}</h3>
                            <p className="lp-feat-desc">{f.desc}</p>
                            <div className="lp-feat-tags">
                                {f.tags.map(t => <span key={t} className="lp-feat-tag">{t}</span>)}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Pipeline Demo ─────────────────────────────────── */}
            <section className="lp-pipeline-sec lp-reveal" id="pipeline">
                <div className="lp-section-head">
                    <div className="lp-tag">Live Demo</div>
                    <h2 className="lp-section-title">Watch the Pipeline in Motion</h2>
                    <p className="lp-section-sub">This is exactly what the simulator shows — instructions flowing concurrently through all 5 stages every clock cycle.</p>
                </div>
                <div className="lp-pipeline-box">
                    <div className="lp-pipeline-header">
                        {STAGES.map((s, i) => (
                            <div key={s} className="lp-stage-col" style={{ '--sc': STAGE_CLR[i] } as React.CSSProperties}>
                                <div className="lp-stage-abbr">{s}</div>
                                <div className="lp-stage-full">{STAGE_FULL[i]}</div>
                            </div>
                        ))}
                    </div>
                    <div className="lp-pipeline-track">
                        {TOKENS.map((t, i) => (
                            <div key={i} className="lp-token"
                                style={{ '--tc': t.color, animationDelay: `${-i * 1.25}s` } as React.CSSProperties}>
                                {t.label}
                            </div>
                        ))}
                    </div>
                    <div className="lp-pipeline-hint">
                        <span className="lp-pulse-dot" />
                        Each colored token is one ARM instruction. All flow concurrently — that's pipelining.
                    </div>
                </div>
            </section>

            {/* ── Platform ─────────────────────────────────────── */}
            <section className="lp-platform lp-reveal">
                <div className="lp-section-head">
                    <div className="lp-tag">Platform</div>
                    <h2 className="lp-section-title">Web & Mobile</h2>
                    <p className="lp-section-sub">Use PlayARM in the browser on your laptop, or take it on the go with the native iOS and Android app.</p>
                </div>
                <div className="lp-platform-grid">
                    {[
                        {
                            icon: '🖥', title: 'Web App', cta: 'Open Web App →', ctaFn: () => navigate('/app'), ghost: false,
                            desc: 'Full-featured simulator at playarm.app. Sign in with Google or GitHub to save programs to the cloud.',
                            items: ['Draggable Fabric.js pipeline canvas','TLB & virtual memory visualizer','Machine code bit-field breakdown','AI ARM assistant (Groq)','Dark & light themes'],
                        },
                        {
                            icon: '📱', title: 'Mobile App', cta: 'View on GitHub →', ctaFn: null, ghost: true,
                            href: 'https://github.com/SardarZiyatkhanov/ARM-Microarchitecture-Visualizer',
                            desc: 'Native Expo app for iOS & Android. System-adaptive dark/light theme. Haptic feedback on every step.',
                            items: ['Syntax-highlighted assembly editor','Register sparkline history','Instruction encoding panel','15 guided ARM exercises','CPI/IPC stats + instruction heatmap'],
                        },
                    ].map(p => (
                        <div key={p.title} className="lp-plat-card">
                            <div className="lp-plat-icon">{p.icon}</div>
                            <h3>{p.title}</h3>
                            <p>{p.desc}</p>
                            <ul className="lp-plat-list">
                                {p.items.map(it => <li key={it}>{it}</li>)}
                            </ul>
                            {p.ghost
                                ? <a className="lp-btn-ghost" href={p.href} target="_blank" rel="noreferrer">{p.cta}</a>
                                : <button className="lp-btn-primary" onClick={p.ctaFn!}>{p.cta}</button>
                            }
                        </div>
                    ))}
                </div>
            </section>

            {/* ── How it works ─────────────────────────────────── */}
            <section className="lp-how lp-reveal">
                <div className="lp-section-head">
                    <div className="lp-tag">Workflow</div>
                    <h2 className="lp-section-title">How it works</h2>
                </div>
                <div className="lp-timeline">
                    {steps.map(s => (
                        <div key={s.n} className="lp-tl-item" style={{ '--sc': s.color } as React.CSSProperties}>
                            <div className="lp-tl-num">{s.n}</div>
                            <div className="lp-tl-line" />
                            <div className="lp-tl-body">
                                <h3>{s.title}</h3>
                                <p>{s.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Tech stack ───────────────────────────────────── */}
            <section className="lp-tech lp-reveal">
                <div className="lp-tag" style={{ textAlign: 'center', marginBottom: 28 }}>Built With</div>
                <div className="lp-tech-wrap">
                    {techStack.map(t => <div key={t} className="lp-tech-chip">{t}</div>)}
                </div>
            </section>

            {/* ── About / Team ─────────────────────────────────── */}
            <section className="lp-about lp-reveal" id="about">
                <div className="lp-section-head">
                    <div className="lp-tag">Team</div>
                    <h2 className="lp-section-title">About PlayARM</h2>
                    <p className="lp-section-sub">
                        A Senior Design Project from <strong>ADA University</strong> (School of IT and Engineering),
                        PlayARM bridges the gap between textbook ARM theory and hands-on processor intuition.
                        Free, open-source, and designed to complement university coursework on computer architecture.
                    </p>
                </div>
                <div className="lp-team-grid">
                    {team.map((m, i) => (
                        <div key={m.name} className="lp-team-card lp-reveal" style={{ animationDelay: `${i * 70}ms` }}>
                            <div className="lp-team-avatar" style={{ background: `linear-gradient(135deg, ${m.color}, ${m.color}88)` }}>{m.init}</div>
                            <div className="lp-team-name">{m.name}</div>
                            <div className="lp-team-role">{m.role}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Final CTA ────────────────────────────────────── */}
            <section className="lp-cta lp-reveal">
                <div className="lp-cta-glow" />
                <h2 className="lp-cta-title">Ready to see ARM from the inside?</h2>
                <p className="lp-cta-sub">Free forever. No install. Works on any browser.</p>
                <button className="lp-btn-primary lp-btn-lg lp-cta-btn" onClick={() => navigate('/app')}>
                    Launch PlayARM Simulator →
                </button>
            </section>

            {/* ── Footer ───────────────────────────────────────── */}
            <footer className="lp-footer">
                <div className="lp-footer-top">
                    <div className="lp-footer-brand">
                        <span className="lp-logo">Play<span>ARM</span></span>
                        <span className="lp-footer-tagline">ARM Microarchitecture Visualizer</span>
                    </div>
                    <div className="lp-footer-cols">
                        <div className="lp-footer-col">
                            <div className="lp-footer-col-title">Product</div>
                            <button onClick={() => navigate('/app')}>Simulator</button>
                            <a href="#features">Features</a>
                            <a href="#pipeline">Pipeline Demo</a>
                        </div>
                        <div className="lp-footer-col">
                            <div className="lp-footer-col-title">Resources</div>
                            <a href="https://github.com/SardarZiyatkhanov/ARM-Microarchitecture-Visualizer" target="_blank" rel="noreferrer">GitHub</a>
                            <a href="/privacy">Privacy Policy</a>
                        </div>
                        <div className="lp-footer-col">
                            <div className="lp-footer-col-title">Project</div>
                            <a href="#about">About</a>
                            <a href="#about">Team</a>
                            <span>ADA University · SDP 2026</span>
                        </div>
                    </div>
                </div>
                <div className="lp-footer-bottom">© 2026 ADA University Senior Design Project. Open Source.</div>
            </footer>
        </div>
    );
}

function GithubIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 8 }}>
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
        </svg>
    );
}
