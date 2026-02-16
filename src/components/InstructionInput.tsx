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
    code, onChange, title, onTitleChange, onSave, onLoad, parsed, errors
}) => {
    return (
        <section className="panel instruction-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>Assembly Input</h3>
                <div className="control-group">
                    {onLoad && (
                        <button className="btn btn-outline" onClick={onLoad} style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>
                            📁 Load
                        </button>
                    )}
                    {onSave && (
                        <button className="btn btn-primary" onClick={onSave} style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>
                            💾 Save
                        </button>
                    )}
                </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    placeholder="Program Title"
                    style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        fontFamily: 'var(--font-sans)'
                    }}
                />
            </div>

            <div className="editor-wrapper">
                <textarea
                    value={code}
                    onChange={(e) => onChange(e.target.value)}
                    className={`code-editor ${errors.length > 0 ? 'has-errors' : ''}`}
                    placeholder="Enter ARM assembly here..."
                    spellCheck={false}
                    rows={15}
                />
            </div>

            {errors.length > 0 && (
                <div style={{
                    marginTop: '1.25rem',
                    padding: '1rem',
                    backgroundColor: 'rgba(248, 81, 73, 0.05)',
                    border: '1px solid rgba(248, 81, 73, 0.2)',
                    borderRadius: '8px'
                }}>
                    <h3 style={{ margin: '0 0 0.75rem 0', color: 'var(--danger-color)', fontSize: '0.8rem', borderBottom: 'none' }}>
                        Syntax Errors
                    </h3>
                    <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                        {errors.map((error, idx) => (
                            <div key={idx} style={{ fontSize: '0.8rem', marginBottom: '0.6rem', color: 'var(--text-primary)' }}>
                                <strong style={{ color: 'var(--danger-color)' }}>Line {error.line}:</strong> {error.message}
                                <div style={{ opacity: 0.5, fontStyle: 'italic', fontSize: '0.75rem', marginTop: '0.1rem' }}>{error.content}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="json-output">
                <h3>Intermediate Representation</h3>
                <div className="json-viewer">
                    <pre>{JSON.stringify(parsed, null, 2)}</pre>
                </div>
            </div>
        </section>
    );
};
