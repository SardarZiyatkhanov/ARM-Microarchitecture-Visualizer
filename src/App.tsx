import { useState, useMemo } from 'react'
import { parseAssembly } from './core/assembler'
import { VisualizerCanvas } from './components/VisualizerCanvas'
import { InstructionInput } from './components/InstructionInput'
import { ControlPanel } from './components/ControlPanel'
import './index.css'

function App() {
    const [instruction, setInstruction] = useState('ADD R0, R1, #5')
    const [isPlaying, setIsPlaying] = useState(false)

    const parsedInst = useMemo(() => parseAssembly(instruction), [instruction]);

    const handlePlay = () => setIsPlaying(!isPlaying);
    const handleStep = () => console.log('Step');
    const handleReset = () => setIsPlaying(false);

    return (
        <div className="app-container">
            <header className="header">
                <h1>ARM Microarchitecture Visualizer</h1>
            </header>

            <main className="main-content">
                {/* Left Panel: Instruction Input */}
                <InstructionInput
                    code={instruction}
                    onChange={setInstruction}
                    parsed={parsedInst}
                />

                {/* Right Panel: Visualization */}
                <section className="panel viz-panel">
                    <div className="decode-stage">
                        <div className="stage-label">Instruction: {instruction}</div>
                        <div className="stage-label">Binary: {parsedInst && parsedInst.length > 0 ? parsedInst[0].binary : 'Waiting...'}</div>
                    </div>

                    <div className="microarch-diagram">
                        <VisualizerCanvas />
                    </div>
                </section>
            </main>

            {/* Bottom: Controls */}
            <ControlPanel
                onPlay={handlePlay}
                onStep={handleStep}
                onReset={handleReset}
                isPlaying={isPlaying}
            />
        </div>
    )
}

export default App
