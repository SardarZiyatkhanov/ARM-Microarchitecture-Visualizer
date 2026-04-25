import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const features = [
    {
        icon: '🔁',
        title: '5-Stage Pipeline',
        desc: 'Watch instructions flow through Fetch → Decode → Execute → Memory → Write-Back on a live, draggable canvas.',
    },
    {
        icon: '💾',
        title: 'Virtual Memory & TLB',
        desc: 'Every LDR/STR translates through a 16-entry fully-associative TLB with LRU eviction and real-time hit-rate tracking.',
    },
    {
        icon: '🤖',
        title: 'AI ARM Assistant',
        desc: 'Ask the built-in AI tutor about ARM instructions, pipeline hazards, or calling conventions — streamed answers, free.',
    },
    {
        icon: '📱',
        title: 'Mobile App',
        desc: 'Full pipeline simulator on iOS and Android with haptics, syntax highlighting, and 15 guided exercises.',
    },
    {
        icon: '⚡',
        title: 'Hazard Detection',
        desc: 'RAW and control hazards are detected automatically and surfaced as color-coded badges on the pipeline canvas.',
    },
    {
        icon: '📖',
        title: 'Learning Exercises',
        desc: '15 guided ARM programming exercises with instant feedback — from basic loops to GCD, factorial, and calling conventions.',
    },
];

const teamMembers = ['Jamila Pashayeva', 'Said Ahadov', 'Yusif Ashrafov'];

export default function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="lp-root">
            {/* ── Navigation ── */}
            <nav className="lp-nav">
                <span className="lp-logo">Play<span>ARM</span></span>
                <div className="lp-nav-links">
                    <a href="#features" className="lp-nav-link">Features</a>
                    <a href="#about" className="lp-nav-link">About</a>
                    <button className="lp-btn-primary" onClick={() => navigate('/app')}>
                        Launch Simulator →
                    </button>
                </div>
            </nav>

            {/* ── Hero ── */}
            <section className="lp-hero">
                <div className="lp-hero-glow" />
                <div className="lp-hero-content">
                    <div className="lp-badge">Senior Design Project · ADA University</div>
                    <h1 className="lp-title">
                        Visualize ARM Architecture<br />
                        <span className="lp-title-accent">Instruction by Instruction</span>
                    </h1>
                    <p className="lp-subtitle">
                        An interactive educational platform that simulates a 5-stage ARM pipeline,
                        virtual memory with TLB, and AI-powered assembly tutoring — all in the browser.
                    </p>
                    <div className="lp-hero-ctas">
                        <button className="lp-btn-primary lp-btn-lg" onClick={() => navigate('/app')}>
                            Launch Simulator →
                        </button>
                        <a
                            className="lp-btn-ghost lp-btn-lg"
                            href="https://github.com/SardarZiyatkhanov/ARM-Microarchitecture-Visualizer"
                            target="_blank"
                            rel="noreferrer"
                        >
                            View on GitHub
                        </a>
                    </div>

                    <div className="lp-code-preview">
                        <div className="lp-code-header">
                            <span className="lp-code-dot" />
                            <span className="lp-code-dot" />
                            <span className="lp-code-dot" />
                            <span className="lp-code-filename">loop.s</span>
                        </div>
                        <div className="lp-code-body">
                            <span className="lp-code-line"><span className="kw">MOV</span> <span className="reg">R0</span>, <span className="imm">#10</span>   <span className="cm">@ counter</span></span>
                            <span className="lp-code-line"><span className="kw">MOV</span> <span className="reg">R1</span>, <span className="imm">#0</span>    <span className="cm">@ accumulator</span></span>
                            <span className="lp-code-line lp-code-active"><span className="kw">ADD</span> <span className="reg">R1</span>, <span className="reg">R1</span>, <span className="imm">#1</span></span>
                            <span className="lp-code-line"><span className="kw">CMP</span> <span className="reg">R1</span>, <span className="reg">R0</span></span>
                            <span className="lp-code-line"><span className="kw">BNE</span> <span className="imm">#8</span>      <span className="cm">@ loop back</span></span>
                            <span className="lp-code-line"><span className="kw">STR</span> <span className="reg">R1</span>, [<span className="reg">R2</span>]</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Features ── */}
            <section className="lp-features" id="features">
                <h2 className="lp-section-title">Everything you need to understand ARM</h2>
                <div className="lp-features-grid">
                    {features.map(f => (
                        <div key={f.title} className="lp-feature-card">
                            <div className="lp-feature-icon">{f.icon}</div>
                            <h3>{f.title}</h3>
                            <p>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── How it works ── */}
            <section className="lp-how">
                <h2 className="lp-section-title">How it works</h2>
                <div className="lp-steps">
                    <div className="lp-step">
                        <div className="lp-step-num">1</div>
                        <h3>Write ARM Assembly</h3>
                        <p>Type instructions in the editor with real-time syntax highlighting and snippet insertion.</p>
                    </div>
                    <div className="lp-step-arrow">→</div>
                    <div className="lp-step">
                        <div className="lp-step-num">2</div>
                        <h3>Step the Pipeline</h3>
                        <p>Advance one clock cycle at a time or let it play automatically at your chosen speed.</p>
                    </div>
                    <div className="lp-step-arrow">→</div>
                    <div className="lp-step">
                        <div className="lp-step-num">3</div>
                        <h3>Observe Everything</h3>
                        <p>Watch registers, memory, flags, TLB, control signals, and hazards update live.</p>
                    </div>
                </div>

                <div className="lp-how-cta">
                    <button className="lp-btn-primary lp-btn-lg" onClick={() => navigate('/app')}>
                        Try it now — it's free →
                    </button>
                </div>
            </section>

            {/* ── About ── */}
            <section className="lp-about" id="about">
                <div className="lp-about-inner">
                    <h2 className="lp-section-title">About PlayARM</h2>
                    <p className="lp-about-text">
                        PlayARM is a Senior Design Project built at <strong>ADA University</strong> (School of IT and Engineering).
                        It bridges the gap between textbook theory and hands-on intuition for ARM32 computer architecture —
                        covering pipelining, virtual memory, hazard detection, instruction encoding, and calling conventions.
                        Designed to complement university coursework with an interactive, visual learning experience.
                    </p>

                    <div className="lp-team">
                        <div className="lp-team-lead">
                            <div className="lp-avatar">SZ</div>
                            <div>
                                <div className="lp-member-name">Sardar Ziyatkhanov</div>
                                <div className="lp-member-role">Team Leader · Electrical & Electronics Engineering, ADA University</div>
                            </div>
                        </div>
                        <div className="lp-team-members">
                            {teamMembers.map(name => (
                                <div key={name} className="lp-member-chip">{name}</div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="lp-footer">
                <span className="lp-logo-sm">Play<span>ARM</span></span>
                <div className="lp-footer-links">
                    <button onClick={() => navigate('/app')}>Simulator</button>
                    <a href="https://github.com/SardarZiyatkhanov/ARM-Microarchitecture-Visualizer" target="_blank" rel="noreferrer">GitHub</a>
                    <a href="/privacy">Privacy Policy</a>
                </div>
                <span className="lp-footer-copy">© 2026 ADA University · Senior Design Project</span>
            </footer>
        </div>
    );
}
