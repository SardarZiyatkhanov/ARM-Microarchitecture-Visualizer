import React, { useState } from 'react';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, AuthError } from 'firebase/auth';
import './Auth.css';

export const Auth: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        if (!auth) {
            setError("Firebase Auth is not initialized.");
            setLoading(false);
            return;
        }

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
        } catch (err: any) {
            console.error("Auth error:", err);
            const firebaseError = err as AuthError;
            let errorMessage = "An error occurred. Please try again.";

            if (firebaseError.code === 'auth/invalid-email') {
                errorMessage = "Invalid email address.";
            } else if (firebaseError.code === 'auth/user-disabled') {
                errorMessage = "User account disabled.";
            } else if (firebaseError.code === 'auth/user-not-found') {
                errorMessage = "User not found.";
            } else if (firebaseError.code === 'auth/wrong-password') {
                errorMessage = "Incorrect password.";
            } else if (firebaseError.code === 'auth/email-already-in-use') {
                errorMessage = "Email already in use.";
            } else if (firebaseError.code === 'auth/weak-password') {
                errorMessage = "Password should be at least 6 characters.";
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <h2>{isLogin ? 'Login' : 'Sign Up'}</h2>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="Enter your email"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Enter your password"
                        />
                    </div>

                    <button type="submit" className="auth-button" disabled={loading}>
                        {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Sign Up')}
                    </button>
                </form>

                <div className="auth-switch">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                    <button onClick={() => {
                        setIsLogin(!isLogin);
                        setError(null);
                    }}>
                        {isLogin ? 'Sign Up' : 'Login'}
                    </button>
                </div>
            </div>
        </div>
    );
};
