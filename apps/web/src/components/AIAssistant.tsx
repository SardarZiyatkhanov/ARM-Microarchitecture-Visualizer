import { useState, useRef, useEffect } from 'react';
import type { CpuState, Instruction } from '@playarm/core';
import { buildAIContext, type TraceEntry } from '../lib/aiContext';
import { streamAIResponse, type AIMessage } from '../services/aiService';
import './AIAssistant.css';

interface AIAssistantProps {
    cpuState: CpuState;
    assemblySource: string;
    instructions: Instruction[];
    traceLog: TraceEntry[];
    isDone: boolean;
}

export function AIAssistant({
    cpuState,
    assemblySource,
    instructions,
    traceLog,
    isDone,
}: AIAssistantProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<AIMessage[]>([]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingText, setStreamingText] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamingText]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const handleSend = () => {
        const text = input.trim();
        if (!text || isStreaming) return;

        const userMsg: AIMessage = { role: 'user', content: text };
        const nextMessages = [...messages, userMsg];
        setMessages(nextMessages);
        setInput('');
        setIsStreaming(true);
        setStreamingText('');

        const context = buildAIContext(cpuState, assemblySource, instructions, traceLog, isDone);

        streamAIResponse(
            nextMessages,
            context,
            (chunk) => {
                streamingTextRef.current += chunk;
                setStreamingText(prev => prev + chunk);
            },
            () => {
                const finalText = streamingTextRef.current;
                streamingTextRef.current = '';
                setIsStreaming(false);
                setMessages(prev => [...prev, { role: 'assistant', content: finalText }]);
                setStreamingText('');
            },
            (err) => {
                streamingTextRef.current = '';
                setIsStreaming(false);
                setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err}` }]);
                setStreamingText('');
            },
        );
    };

    const streamingTextRef = useRef('');

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const SUGGESTIONS = [
        "What's in the pipeline right now?",
        "Why did the flags change?",
        "Explain what just happened",
        "Is there a data hazard here?",
    ];

    return (
        <div className={`ai-assistant ${isOpen ? 'ai-assistant--open' : ''}`}>
            {/* Toggle button */}
            <button
                className="ai-toggle"
                onClick={() => setIsOpen(v => !v)}
                title={isOpen ? 'Close AI assistant' : 'Open AI assistant'}
                aria-label="AI assistant"
            >
                {isOpen ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l4.93-1.37A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.66 0-3.22-.46-4.56-1.25l-.32-.19-3.35.93.93-3.35-.19-.32A7.96 7.96 0 0 1 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z"/>
                        <circle cx="8.5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="15.5" cy="12" r="1"/>
                    </svg>
                )}
                {!isOpen && <span className="ai-toggle-label">Ask AI</span>}
            </button>

            {/* Panel */}
            {isOpen && (
                <div className="ai-panel">
                    <div className="ai-panel-header">
                        <div className="ai-panel-title">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent-color)">
                                <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l4.93-1.37A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
                            </svg>
                            ARM Assistant
                        </div>
                        <span className="ai-panel-badge">Cycle {cpuState.clock}</span>
                    </div>

                    <div className="ai-messages">
                        {messages.length === 0 && !isStreaming && (
                            <div className="ai-welcome">
                                <p>Ask me anything about what's happening in the pipeline.</p>
                                <div className="ai-suggestions">
                                    {SUGGESTIONS.map(s => (
                                        <button
                                            key={s}
                                            className="ai-suggestion"
                                            onClick={() => { setInput(s); inputRef.current?.focus(); }}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <div key={i} className={`ai-bubble ai-bubble--${msg.role}`}>
                                <div className="ai-bubble-content">{msg.content}</div>
                            </div>
                        ))}

                        {isStreaming && (
                            <div className="ai-bubble ai-bubble--assistant">
                                <div className="ai-bubble-content">
                                    {streamingText || <span className="ai-thinking"><span /><span /><span /></span>}
                                </div>
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    <div className="ai-input-row">
                        <textarea
                            ref={inputRef}
                            className="ai-input"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about the pipeline… (Enter to send)"
                            rows={2}
                            disabled={isStreaming}
                        />
                        <button
                            className="ai-send"
                            onClick={handleSend}
                            disabled={!input.trim() || isStreaming}
                            title="Send"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
