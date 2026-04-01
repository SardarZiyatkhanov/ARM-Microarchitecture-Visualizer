import { useState } from 'react';

interface ExerciseModeProps {
    registers: Record<string, number>;
    onLoad: (code: string) => void;
}

interface Exercise {
    id: string;
    chapter: number;
    title: string;
    description: string;
    hint: string;
    starterCode: string;
    check: (regs: Record<string, number>) => boolean;
    successMsg: string;
}

const CHAPTER_COLORS: Record<number, string> = {
    3: '#3fb950',
    4: '#d29922',
    5: '#a371f7',
    7: '#2f81f7',
};

const EXERCISES: Exercise[] = [
    {
        id: 'ex-add',
        chapter: 3,
        title: 'Sum two numbers',
        description: 'Write ARM assembly to compute 15 + 27 and store the result in R0.',
        hint: 'Use MOV to load values into two registers, then ADD to compute the sum.',
        starterCode: `MOV R1, #15\nMOV R2, #27\n; your ADD instruction here`,
        check: (regs) => regs['R0'] === 42,
        successMsg: 'R0 = 42 — correct!',
    },
    {
        id: 'ex-loop',
        chapter: 4,
        title: 'Count to 5',
        description: 'Use a loop to count from 0 to 5. When done, R0 should equal 5.',
        hint: 'Use a label, ADD R0, R0, #1, CMP R0, #5, then BNE back to the label.',
        starterCode: `MOV R0, #0\nLOOP:\n; increment and compare`,
        check: (regs) => regs['R0'] === 5,
        successMsg: 'R0 = 5 — loop finished correctly!',
    },
    {
        id: 'ex-bit',
        chapter: 5,
        title: 'Isolate lower nibble',
        description: 'Extract the lower 4 bits of 0xAB into R0. R0 should equal 0xB (11).',
        hint: 'Use MOV to load 0xAB, then AND with 0x0F to mask the upper nibble.',
        starterCode: `MOV R1, #0xAB\n; AND instruction here`,
        check: (regs) => regs['R0'] === 0x0b,
        successMsg: 'R0 = 0xB — lower nibble isolated!',
    },
    {
        id: 'ex-shift',
        chapter: 5,
        title: 'Multiply by 8 with a shift',
        description: 'Use a left shift to compute 3 × 8 without MUL. Store the result in R0.',
        hint: 'LSL by 3 is the same as multiplying by 2³ = 8.',
        starterCode: `MOV R1, #3\n; LSL instruction here`,
        check: (regs) => regs['R0'] === 24,
        successMsg: 'R0 = 24 — shift-as-multiply works!',
    },
    {
        id: 'ex-stack',
        chapter: 7,
        title: 'Stack round-trip',
        description: 'Push R1 = 99 onto the stack, then pop it back into R0. R0 should equal 99.',
        hint: 'MOV R1, #99 → PUSH {R1} → POP {R0}',
        starterCode: `MOV R1, #99\n; PUSH and POP here`,
        check: (regs) => regs['R0'] === 99,
        successMsg: 'R0 = 99 — stack round-trip complete!',
    },
];

export function ExerciseMode({ registers, onLoad }: ExerciseModeProps) {
    const [panelOpen, setPanelOpen] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [hintsShown, setHintsShown] = useState<Set<string>>(new Set());
    const [results, setResults] = useState<Record<string, 'pass' | 'fail' | null>>({});

    function togglePanel() {
        setPanelOpen((prev) => !prev);
    }

    function toggleCard(id: string) {
        setExpandedId((prev) => (prev === id ? null : id));
    }

    function showHint(id: string) {
        setHintsShown((prev) => new Set(prev).add(id));
    }

    function handleCheck(exercise: Exercise) {
        const passed = exercise.check(registers);
        setResults((prev) => ({ ...prev, [exercise.id]: passed ? 'pass' : 'fail' }));
    }

    return (
        <div className="exercise-panel">
            <button className="exercise-toggle" onClick={togglePanel}>
                Exercises
            </button>

            {panelOpen && (
                <div className="exercise-body">
                    {EXERCISES.map((ex) => {
                        const isExpanded = expandedId === ex.id;
                        const hintVisible = hintsShown.has(ex.id);
                        const result = results[ex.id] ?? null;
                        const chapterColor = CHAPTER_COLORS[ex.chapter] ?? '#888';

                        return (
                            <div
                                key={ex.id}
                                className={`exercise-card${isExpanded ? ' expanded' : ''}`}
                            >
                                <div
                                    className="exercise-card-header"
                                    onClick={() => toggleCard(ex.id)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <span
                                        className="exercise-ch"
                                        style={{ color: chapterColor, borderColor: chapterColor }}
                                    >
                                        Ch{ex.chapter}
                                    </span>
                                    <span className="exercise-title">{ex.title}</span>
                                </div>

                                {isExpanded && (
                                    <div className="exercise-card-body">
                                        <p className="exercise-desc">{ex.description}</p>

                                        {hintVisible ? (
                                            <p className="exercise-hint">{ex.hint}</p>
                                        ) : (
                                            <button
                                                className="btn btn-toggle exercise-hint-btn"
                                                onClick={() => showHint(ex.id)}
                                            >
                                                Show Hint
                                            </button>
                                        )}

                                        <div className="exercise-actions">
                                            <button className="btn btn-step" onClick={() => onLoad(ex.starterCode)}>
                                                Open
                                            </button>
                                            <button className="btn btn-play" onClick={() => handleCheck(ex)}>
                                                Check Answer
                                            </button>
                                        </div>

                                        {result !== null && (
                                            <div
                                                className={`exercise-result ${result === 'pass' ? 'pass' : 'fail'}`}
                                            >
                                                {result === 'pass'
                                                    ? ex.successMsg
                                                    : 'Not quite — check the register values and try again.'}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
