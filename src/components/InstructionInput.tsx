import React from 'react';
import { Instruction, ParseError } from '../core/types';

interface InstructionInputProps {
    code: string;
    onChange: (code: string) => void;
    title: string;
    onTitleChange: (title: string) => void;
    onSave?: () => void;
    onLoad?: () => void;
    parsed: Instruction[];
    errors: ParseError[];
}

export const InstructionInput: React.FC<InstructionInputProps> = ({
    code, onChange, title, onTitleChange, onSave, onLoad, errors
}) => {
    return (
        <section className="panel instruction-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>Assembly Input</h3>
                <div className="control-group">
                    {onLoad && <button className="btn btn-outline" onClick={onLoad}>📁 Load</button>}
                    {onSave && <button className="btn btn-primary" onClick={onSave}>💾 Save</button>}
                </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    placeholder="Program Title"
                    className="title-input"
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'inherit' }}
                />
            </div>

            <div className="editor-wrapper">
                <textarea
                    value={code}
                    onChange={(e) => onChange(e.target.value)}
                    className={`code-editor ${errors.length > 0 ? 'has-errors' : ''}`}
                    placeholder="Enter ARM assembly here..."
                    rows={15}
                    /* MOBILE FIXES */
                    spellCheck={false}
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="off"
                />
            </div>

            {errors.length > 0 && (
                <div className="error-log">
                    <h3 style={{ color: 'var(--danger-color)' }}>Syntax Errors</h3>
                    {errors.map((error, idx) => (
                        <div key={idx} className="error-item">
                            <strong>Line {error.line}:</strong> {error.message}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
};