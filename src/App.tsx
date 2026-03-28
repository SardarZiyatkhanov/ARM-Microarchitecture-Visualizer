import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import Auth from './components/Auth';
import MobileDashboard from './components/MobileDashboard';
import PipelineVisualizer from './components/PipelineVisualizer';

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