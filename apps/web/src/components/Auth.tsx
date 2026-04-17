import React, { useState } from 'react';
import { auth, db } from '../firebase';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInAnonymously,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    GithubAuthProvider,
    signInWithPopup,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

type View = 'login' | 'signup' | 'forgot';

const Auth: React.FC = () => {
    const [view, setView] = useState<View>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nickname, setNickname] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [loading, setLoading] = useState(false);

    const validateNickname = (name: string) => {
        const regex = /^[a-zA-Z0-9_]{2,20}$/;
        return regex.test(name);
    };

    const reset = (nextView: View) => {
        setError('');
        setInfo('');
        setView(nextView);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (view === 'login') {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                if (!validateNickname(nickname)) {
                    setError('Nickname must be 2–20 characters: letters, numbers, or underscores.');
                    setLoading(false);
                    return;
                }
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                await setDoc(doc(db, 'users', user.uid), {
                    nickname,
                    email: user.email,
                    createdAt: new Date(),
                });
            }
        } catch (err: any) {
            setError(err.message || 'Authentication error');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            setInfo('Reset link sent! Check your inbox.');
        } catch (err: any) {
            setError(err.message || 'Failed to send reset email');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        setError('');
        setLoading(true);
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (err: any) {
            setError(err.message || 'Google sign-in failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGitHub = async () => {
        setError('');
        setLoading(true);
        try {
            await signInWithPopup(auth, githubProvider);
        } catch (err: any) {
            setError(err.message || 'GitHub sign-in failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGuest = async () => {
        setError('');
        setLoading(true);
        try {
            await signInAnonymously(auth);
        } catch (err: any) {
            setError(err.message || 'Guest sign-in failed');
        } finally {
            setLoading(false);
        }
    };

    // ── Shared styles ──────────────────────────────────────────────────────────
    const inputStyle: React.CSSProperties = {
        padding: '11px 12px',
        borderRadius: '6px',
        border: '1px solid #334155',
        background: '#0f172a',
        color: 'white',
        outline: 'none',
        fontSize: '14px',
        width: '100%',
        boxSizing: 'border-box',
    };

    const oauthBtnBase: React.CSSProperties = {
        width: '100%',
        padding: '11px',
        border: 'none',
        borderRadius: '6px',
        cursor: loading ? 'not-allowed' : 'pointer',
        fontWeight: '600',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        opacity: loading ? 0.7 : 1,
        transition: 'opacity 0.2s',
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0f172a', padding: '1rem' }}>
            <div style={{ padding: '2.5rem', background: '#1e293b', borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', width: '100%', maxWidth: '340px', color: 'white' }}>

                {/* ── Branding ── */}
                <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                    <div style={{ fontSize: '2rem', fontWeight: '800', letterSpacing: '-0.03em', background: 'linear-gradient(135deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        PlayARM
                    </div>
                    <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.3rem' }}>
                        ARM Microarchitecture Simulator
                    </p>
                    <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.75rem' }}>
                        {view === 'login' && 'Welcome back'}
                        {view === 'signup' && 'Create your account'}
                        {view === 'forgot' && 'Reset your password'}
                    </p>
                </div>

                {/* ── Feedback messages ── */}
                {error && (
                    <div style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center', marginBottom: '1rem', background: 'rgba(239,68,68,0.1)', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)' }}>
                        {error}
                    </div>
                )}
                {info && (
                    <div style={{ color: '#34d399', fontSize: '13px', textAlign: 'center', marginBottom: '1rem', background: 'rgba(52,211,153,0.1)', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(52,211,153,0.2)' }}>
                        {info}
                    </div>
                )}

                {/* ── Forgot Password view ── */}
                {view === 'forgot' ? (
                    <>
                        <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <input
                                type="email"
                                placeholder="Your email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                style={inputStyle}
                            />
                            <button type="submit" disabled={loading} style={{ padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: loading ? 0.7 : 1 }}>
                                {loading ? 'Sending...' : 'Send Reset Link'}
                            </button>
                        </form>
                        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '14px', color: '#94a3b8', cursor: 'pointer' }} onClick={() => reset('login')}>
                            ← <span style={{ color: '#3b82f6' }}>Back to Sign In</span>
                        </p>
                    </>
                ) : (
                    <>
                        {/* ── OAuth buttons ── */}
                        <button onClick={handleGoogle} disabled={loading} style={{ ...oauthBtnBase, background: '#ffffff', color: '#1e293b', marginBottom: '0.75rem' }}>
                            <svg width="18" height="18" viewBox="0 0 48 48">
                                <path fill="#EA4335" d="M24 9.5c3.14 0 5.95 1.08 8.17 2.84l6.1-6.1C34.46 3.11 29.5 1 24 1 14.82 1 7.07 6.48 3.6 14.24l7.1 5.52C12.46 13.72 17.77 9.5 24 9.5z"/>
                                <path fill="#4285F4" d="M46.52 24.5c0-1.64-.15-3.22-.42-4.75H24v9h12.67c-.55 2.96-2.2 5.47-4.67 7.15l7.18 5.58C43.3 37.42 46.52 31.45 46.52 24.5z"/>
                                <path fill="#FBBC05" d="M10.7 28.24A14.6 14.6 0 0 1 9.5 24c0-1.47.25-2.9.7-4.24l-7.1-5.52A23.94 23.94 0 0 0 0 24c0 3.87.93 7.53 2.6 10.76l7.1-5.52z"/>
                                <path fill="#34A853" d="M24 47c5.5 0 10.12-1.82 13.49-4.93l-7.18-5.58C28.49 37.85 26.35 38.5 24 38.5c-6.23 0-11.54-4.22-13.3-9.96l-7.1 5.52C7.07 41.52 14.82 47 24 47z"/>
                            </svg>
                            Continue with Google
                        </button>

                        <button onClick={handleGitHub} disabled={loading} style={{ ...oauthBtnBase, background: '#24292f', color: '#ffffff', border: '1px solid #444c56', marginBottom: '1.25rem' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .322.216.694.825.576C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z"/>
                            </svg>
                            Continue with GitHub
                        </button>

                        {/* ── Divider ── */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                            <div style={{ flex: 1, height: '1px', background: '#334155' }} />
                            <span style={{ color: '#64748b', fontSize: '12px' }}>or</span>
                            <div style={{ flex: 1, height: '1px', background: '#334155' }} />
                        </div>

                        {/* ── Email / Password form ── */}
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                            {view === 'signup' && (
                                <input
                                    type="text"
                                    placeholder="Nickname (2-20 chars, a-z, 0-9, _)"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    required
                                    style={inputStyle}
                                />
                            )}
                            <input
                                type="email"
                                placeholder="Email Address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                style={inputStyle}
                            />

                            {/* Password with show/hide toggle */}
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    style={{ ...inputStyle, paddingRight: '42px' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '2px', display: 'flex', alignItems: 'center' }}
                                    title={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? (
                                        // Eye-off icon
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                                            <line x1="1" y1="1" x2="23" y2="23"/>
                                        </svg>
                                    ) : (
                                        // Eye icon
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                            <circle cx="12" cy="12" r="3"/>
                                        </svg>
                                    )}
                                </button>
                            </div>

                            {view === 'login' && (
                                <div style={{ textAlign: 'right', marginTop: '-0.4rem' }}>
                                    <span
                                        onClick={() => reset('forgot')}
                                        style={{ fontSize: '12px', color: '#3b82f6', cursor: 'pointer' }}
                                    >
                                        Forgot password?
                                    </span>
                                </div>
                            )}

                            <button type="submit" disabled={loading} style={{ padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s' }}>
                                {loading ? 'Please wait...' : (view === 'login' ? 'Sign In' : 'Sign Up')}
                            </button>
                        </form>

                        {/* ── Toggle login/signup ── */}
                        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '14px', color: '#94a3b8', cursor: 'pointer' }} onClick={() => reset(view === 'login' ? 'signup' : 'login')}>
                            {view === 'login' ? "Don't have an account? " : 'Already have an account? '}
                            <span style={{ color: '#3b82f6' }}>{view === 'login' ? 'Sign Up' : 'Sign In'}</span>
                        </p>

                        {/* ── Guest mode ── */}
                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #1e293b' }}>
                            <button
                                onClick={handleGuest}
                                disabled={loading}
                                style={{ width: '100%', padding: '10px', background: 'transparent', color: '#64748b', border: '1px dashed #334155', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '13px', opacity: loading ? 0.7 : 1, transition: 'all 0.2s' }}
                            >
                                Try without an account →
                            </button>
                            <p style={{ textAlign: 'center', fontSize: '11px', color: '#475569', marginTop: '0.5rem' }}>
                                Progress won't be saved
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Auth;
