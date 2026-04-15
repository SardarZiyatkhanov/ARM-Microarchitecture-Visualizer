import type { AIContext } from '../lib/aiContext';

export interface AIMessage {
    role: 'user' | 'assistant';
    content: string;
}

export async function streamAIResponse(
    messages: AIMessage[],
    context: AIContext,
    onChunk: (text: string) => void,
    onDone: () => void,
    onError: (err: string) => void,
): Promise<void> {
    const url = import.meta.env.VITE_AI_FUNCTION_URL;
    if (!url) {
        onError('AI assistant is not configured. Set VITE_AI_FUNCTION_URL in your .env file.');
        return;
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages, context }),
        });

        if (!response.ok) {
            const text = await response.text();
            onError(`Server error ${response.status}: ${text}`);
            return;
        }

        if (!response.body) {
            onError('No response body received.');
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                if (data === '[DONE]') {
                    onDone();
                    return;
                }
                try {
                    const parsed = JSON.parse(data) as { text?: string };
                    if (parsed.text) onChunk(parsed.text);
                } catch {
                    // ignore malformed SSE lines
                }
            }
        }

        onDone();
    } catch (err) {
        onError(err instanceof Error ? err.message : 'Unknown error');
    }
}
