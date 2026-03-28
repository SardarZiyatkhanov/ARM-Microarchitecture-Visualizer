import { useState, useMemo } from 'react';
import { MobileBottomNav } from './MobileBottomNav';
import { InstructionInput } from './InstructionInput';
import { PipelineVisualizer } from './PipelineVisualizer';
import { TLBVisualizer } from './TLBVisualizer';
import ThemeToggle from './ThemeToggle';
import { createEmptyTLB } from '@playarm/core';
import { parseAssembly } from '@playarm/core';

export default function MobileDashboard() {
    const [activeTab, setActiveTab] = useState('code');

    // State for InstructionInput
    const [code, setCode] = useState('MOV R0, #10\nADD R1, R0, #5');
    const [title, setTitle] = useState('Untitled Program');

    const assemblyResult = useMemo(() => parseAssembly(code), [code]);

    return (
        <div className="flex flex-col h-screen overflow-hidden" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

            {/* Dynamic Content Area */}
            <div className="content-area" style={{ flexGrow: 1, overflowY: 'auto', paddingBottom: '80px' }}>
                {activeTab === 'code' && (
                    <InstructionInput
                        code={code}
                        onChange={setCode}
                        title={title}
                        onTitleChange={setTitle}
                        parsed={assemblyResult.instructions}
                        errors={assemblyResult.errors}
                    />
                )}

                {activeTab === 'pipeline' && <PipelineVisualizer />}

                {activeTab === 'memory' && (
                    <TLBVisualizer
                        tlbState={createEmptyTLB()}
                        lastAccess={null}
                    />
                )}

                {activeTab === 'settings' && (
                    <div style={{ padding: '2rem', textAlign: 'center' }}>
                        <h2>Settings</h2>
                        <ThemeToggle />
                    </div>
                )}
            </div>

            {/* Bottom Navigation */}
            <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
    );
}