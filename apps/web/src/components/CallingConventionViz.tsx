import { useState } from 'react';

const REGISTER_ROWS = [
    { reg: 'R0',       role: 'Argument 1 / Return value',          preserved: 'No (caller-saved)' },
    { reg: 'R1',       role: 'Argument 2',                         preserved: 'No (caller-saved)' },
    { reg: 'R2',       role: 'Argument 3',                         preserved: 'No (caller-saved)' },
    { reg: 'R3',       role: 'Argument 4',                         preserved: 'No (caller-saved)' },
    { reg: 'R4–R11',   role: 'General purpose (callee-saved)',     preserved: 'Yes (callee must save)' },
    { reg: 'R12 (IP)', role: 'Intra-procedure scratch',            preserved: 'No' },
    { reg: 'SP (R13)', role: 'Stack pointer',                      preserved: 'Yes (must be restored)' },
    { reg: 'LR (R14)', role: 'Link register (return address)',     preserved: 'Yes (save before BL)' },
    { reg: 'PC (R15)', role: 'Program counter',                    preserved: '—' },
];

const CALL_STEPS = [
    'Caller places args in R0–R3',
    'Caller executes BL label → PC = label, LR = next instruction address',
    'Callee prologue: PUSH {LR} saves LR (and callee-saved regs if needed)',
    'Callee runs, puts return value in R0',
    'Callee epilogue: POP {LR} restores LR',
    'Callee executes BX LR → PC = LR (returns to caller)',
    'Caller reads return value from R0',
];

function preservedClass(preserved: string): string {
    if (preserved.startsWith('Yes')) return 'conv-preserved-yes';
    if (preserved.startsWith('No')) return 'conv-preserved-no';
    return '';
}

export function CallingConventionViz() {
    const [open, setOpen] = useState(false);

    return (
        <div className="calling-conv-panel">
            <button
                className="calling-conv-toggle"
                onClick={() => setOpen(prev => !prev)}
                aria-expanded={open}
            >
                ARM Calling Convention
            </button>

            {open && (
                <div className="calling-conv-body">
                    {/* Section 1: Register Roles */}
                    <div className="conv-section-title">Register Roles</div>
                    <table className="conv-table">
                        <thead>
                            <tr>
                                <th>Register</th>
                                <th>Role</th>
                                <th>Preserved?</th>
                            </tr>
                        </thead>
                        <tbody>
                            {REGISTER_ROWS.map(({ reg, role, preserved }) => (
                                <tr key={reg}>
                                    <td className="conv-reg">{reg}</td>
                                    <td>{role}</td>
                                    <td>
                                        <span className={preservedClass(preserved)}>
                                            {preserved}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Section 2: Call Sequence */}
                    <div className="conv-section-title">Call Sequence</div>
                    <ol className="conv-timeline">
                        {CALL_STEPS.map((text, index) => (
                            <li key={index} className="conv-step">
                                <span className="conv-step-num">{index + 1}</span>
                                <span className="conv-step-text">{text}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            )}
        </div>
    );
}
