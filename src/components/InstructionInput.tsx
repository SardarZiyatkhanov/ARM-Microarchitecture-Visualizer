import React from 'react';
import { Instruction } from '../core/types';

interface InstructionInputProps {
    code: string;
    onChange: (code: string) => void;
    parsed: Instruction[];
}

export const InstructionInput: React.FC<InstructionInputProps> = ({ code, onChange, parsed }) => {
    return (
        <section className="panel instruction-panel">
            <h2>Assembly Input</h2>
            <div className="editor-container">
                <textarea
                    value={code}
                    onChange={(e) => onChange(e.target.value)}
                    className="code-editor"
                    rows={10}
                    placeholder="Enter ARM assembly here..."
                    spellCheck={false}
                />
            </div>
            <div className="json-output">
                <h3>Intermediate Representation</h3>
                <div className="json-viewer">
                    <pre>{JSON.stringify(parsed, null, 2)}</pre>
                </div>
            </div>
        </section>
    );
};
