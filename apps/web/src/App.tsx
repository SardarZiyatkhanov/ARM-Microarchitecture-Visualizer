import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import Auth from './components/Auth';
import MobileDashboard from './components/MobileDashboard';
import PipelineVisualizer from './components/PipelineVisualizer';
import { applyTheme } from './components/ThemeToggle';

function App() {
    // Responsive: show mobile layout when window < 768px
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    // Auth state (desktop only)
    const [user, setUser] = useState<User | null>(null);
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
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // ── Mobile: no auth gate ─────────────────────────────────────────────────
    if (isMobile) {
        return <MobileDashboard />;
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

    return <PipelineVisualizer user={user} />;
}

export default App;