import React from 'react';

interface ControlPanelProps {
    onPlay: () => void;
    onStep: () => void;
    onReset: () => void;
    isPlaying: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ onPlay, onStep, onReset, isPlaying }) => {
    return (
        <footer className="controls">
            <button className="control-btn" onClick={onReset}>
                Reset
            </button>
            <button className={`control-btn play-btn ${isPlaying ? 'active' : ''}`} onClick={onPlay}>
                {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button className="control-btn" onClick={onStep} disabled={isPlaying}>
                Step
            </button>
        </footer>
    );
};
