import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import Auth from './components/Auth';
import MobileDashboard from './components/MobileDashboard';
import PipelineVisualizer from './components/PipelineVisualizer';
import { applyTheme } from './components/ThemeToggle';

function App() {
    // Responsive: show mobile layout when window < 768px
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    // Auth state (desktop only)
    const [user, setUser] = useState<User | null>(null);
    const [nickname, setNickname] = useState<string | null>(null);
    const [needsNickname, setNeedsNickname] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Follow system color-scheme; only override if user has manually toggled
    useEffect(() => {
        if (!isMobile) return;
        const STORAGE_KEY = 'playarm_theme_v2';
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        // Apply immediately on mount when no manual preference is stored
        if (!localStorage.getItem(STORAGE_KEY)) {
            applyTheme(mq.matches ? 'dark' : 'light');
        }
        const handler = (e: MediaQueryListEvent) => {
            if (!localStorage.getItem(STORAGE_KEY)) {
                applyTheme(e.matches ? 'dark' : 'light');
            }
        };
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [isMobile]);

    useEffect(() => {
        if (!auth) {
            setLoading(false);
            return;
        }
        
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);

            // Fetch nickname in the background — don't block the initial render
            if (currentUser) {
                getDoc(doc(db, 'users', currentUser.uid)).then(docSnap => {
                    if (docSnap.exists()) {
                        setNickname(docSnap.data().nickname ?? null);
                        setNeedsNickname(false);
                    } else {
                        setNickname(null);
                        setNeedsNickname(true);
                    }
                });
            } else {
                setNickname(null);
                setNeedsNickname(false);
            }
        });
        return () => unsubscribe();
    }, []);

    // ── Temporary localhost-only test route ─────────────────────────────────
    if (window.location.pathname === '/pipeline-test') {
        const dummyUser = { uid: 'test-uid', email: 'test@localhost' } as User;
        return <PipelineVisualizer user={dummyUser} nickname="TestUser" needsNickname={false} />;
    }

    // ── Mobile: no auth gate — user prop enables optional sign-in ───────────
    if (isMobile) {
        return <MobileDashboard user={user} />;
    }

    // ── Desktop: auth-gated full simulator ──────────────────────────────────
    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a', color: 'white' }}>
                Loading PlayARM...
            </div>
        );
    }

    if (!user) {
        return <Auth />;
    }

    return <PipelineVisualizer user={user} nickname={nickname} needsNickname={needsNickname} />;
}

export default App;