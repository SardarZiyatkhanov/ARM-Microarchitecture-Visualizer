import React, { useState } from 'react';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

const Auth: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
        } catch (err: any) {
            setError(err.message || 'Authentication error');
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a' }}>
            {/* Я изменил цвет фона на темный (#0f172a), чтобы он лучше сочетался с вашим дизайном! */}
            <div style={{ padding: '2.5rem', background: '#1e293b', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', width: '320px', color: 'white' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontWeight: '600' }}>
                    {isLogin ? 'Welcome Back' : 'Create Account'}
                </h2>

                {error && <p style={{ color: '#ef4444', fontSize: '14px', textAlign: 'center', marginBottom: '1rem' }}>{error}</p>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ padding: '12px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: 'white', outline: 'none' }}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ padding: '12px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: 'white', outline: 'none' }}
                    />
                    <button type="submit" style={{ padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginTop: '0.5rem' }}>
                        {isLogin ? 'Sign In' : 'Sign Up'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '14px', cursor: 'pointer', color: '#94a3b8' }} onClick={() => setIsLogin(!isLogin)}>
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <span style={{ color: '#3b82f6' }}>{isLogin ? 'Sign Up' : 'Sign In'}</span>
                </p>
            </div>
        </div>
    );
};

export default Auth;