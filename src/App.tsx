import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';

import Auth from './components/Auth';
import PipelineVisualizer from './components/PipelineVisualizer';

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        // Перевели на английский и добавили темный фон
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a', color: 'white' }}>Loading PlayARM...</div>;
    }

    if (!user) {
        return <Auth />;
    }

    return (
        <div className="app-container" style={{ background: '#0f172a', minHeight: '100vh' }}>
            <main>
                {/* Шапку из App.tsx мы удалили, чтобы не дублировать ту, что уже есть в самом симуляторе */}
                <PipelineVisualizer />
            </main>
        </div>
    );
};

export default App;