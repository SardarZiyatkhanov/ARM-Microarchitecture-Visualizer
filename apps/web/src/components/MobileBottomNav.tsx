import React from 'react';
import './MobileBottomNav.css';

interface NavProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export const MobileBottomNav: React.FC<NavProps> = ({ activeTab, setActiveTab }) => {
    const tabs = [
        { id: 'code', label: 'Code', icon: '📝' },
        { id: 'pipeline', label: 'Pipeline', icon: '⚙️' },
        { id: 'memory', label: 'Memory', icon: '💾' },
        { id: 'settings', label: 'Settings', icon: '🎨' },
    ];

    return (
        <nav className="mobile-bottom-nav">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    className={`nav-button ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                    aria-label={tab.label}
                >
                    <span className="nav-icon">{tab.icon}</span>
                    <span className="nav-label">{tab.label}</span>
                </button>
            ))}
        </nav>
    );
};