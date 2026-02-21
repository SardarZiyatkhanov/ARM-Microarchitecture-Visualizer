import React from 'react';
import ThemeToggle from "./ThemeToggle";

interface ControlPanelProps {
    onPlay: () => void;
    onStep: () => void;
    onReset: () => void;
    onSaveProgram?: () => void;
    onLoadPrograms?: () => void;
    onSaveRun?: () => void;

    // Replay Mode Props
    isReplayMode?: boolean;
    onReplayRun?: () => void;
    onExitReplay?: () => void;
    replayIndex?: number;
    maxReplayIndex?: number;
    onReplayIndexChange?: (index: number) => void;

    isPlaying: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
    onPlay, onStep, onReset, onSaveProgram, onLoadPrograms, onSaveRun,
    isPlaying,
    isReplayMode, onReplayRun, onExitReplay, replayIndex, maxReplayIndex, onReplayIndexChange
}) => {
    return (
        <div className="controls-container">
            <footer className="footer controls footer-controls">
                {isReplayMode ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button className="btn btn-secondary" onClick={onExitReplay}>
                            Exit Replay
                        </button>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>Step: {replayIndex} / {maxReplayIndex}</span>
                            <input
                                type="range"
                                min="0"
                                max={maxReplayIndex || 0}
                                value={replayIndex || 0}
                                onChange={(e) => onReplayIndexChange && onReplayIndexChange(parseInt(e.target.value))}
                                style={{ flex: 1 }}
                            />
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="controls-center">
                            <button className="btn btn-reset" onClick={onReset}>
                                ↺ Reset
                            </button>
                            <button className="btn btn-step" onClick={onStep} disabled={isPlaying}>
                                ↷ Step
                            </button>
                            <button className="btn btn-play" onClick={onPlay}>
                                {isPlaying ? '⏸ Pause' : '▶ Play'}
                            </button>

                            <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 0.75rem' }} />

                            {onSaveProgram && (
                                <button className="btn btn-outline" onClick={onSaveProgram}>
                                    💾 Save
                                </button>
                            )}
                            {onLoadPrograms && (
                                <button className="btn btn-outline" onClick={onLoadPrograms}>
                                    📁 Load
                                </button>
                            )}
                            {onSaveRun && isPlaying && (
                                <button className="btn btn-outline" onClick={onSaveRun}>
                                    ⏺ Record
                                </button>
                            )}
                            {onReplayRun && !isPlaying && (
                                <button className="btn btn-outline" onClick={onReplayRun}>
                                    ⟲ Replay
                                </button>
                            )}
                        </div>

                        <div className="controls-center">
                            <ThemeToggle />
                        </div>
                    </>
                )}
            </footer>
        </div>
    );
};

export default ControlPanel;
