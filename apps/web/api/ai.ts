export const config = { runtime: 'edge' };

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';

interface AIMessage { role: 'user' | 'assistant'; content: string }
interface AIContext {
    cycle: number; pc: string;
    registers: Record<string, number>;
    flags: { N: boolean; Z: boolean; C: boolean; V: boolean };
    pipeline: { Fetch: string | null; Decode: string | null; Execute: string | null; Memory: string | null; WriteBack: string | null };
    assemblySource: string;
    recentTrace: Array<{ cycle: number; inst: string; regChanges: string[]; flagChanges: string[] }>;
    isDone: boolean;
}

function buildSystemPrompt(ctx: AIContext): string {
    const regs = Object.entries(ctx.registers)
        .map(([r, v]) => `${r}=0x${v.toString(16).toUpperCase().padStart(8, '0')}`)
        .join('  ');

    const flags = `N=${+ctx.flags.N} Z=${+ctx.flags.Z} C=${+ctx.flags.C} V=${+ctx.flags.V}`;

    const pipe = Object.entries(ctx.pipeline)
        .map(([stage, inst]) => `  ${stage.padEnd(10)}: ${inst ?? '—'}`)
        .join('\n');

    const trace = ctx.recentTrace.length
        ? ctx.recentTrace.map(t =>
            `  Cycle ${t.cycle}: ${t.inst}${t.regChanges.length ? ' → ' + t.regChanges.join(', ') : ''}${t.flagChanges.length ? ' [' + t.flagChanges.join(',') + ']' : ''}`
        ).join('\n')
        : '  (no trace yet)';

    return `You are an expert ARM32 pipeline simulator tutor embedded in PlayARM, an interactive ARM microarchitecture visualizer.

Your role: help students understand ARM assembly, the 5-stage pipeline (Fetch → Decode → Execute → Memory → WriteBack), hazards, forwarding, and register behavior. Be concise and educational.

## Current Simulator State
Cycle: ${ctx.cycle}  |  PC: ${ctx.pc}  |  ${ctx.isDone ? 'DONE' : 'Running'}
Registers: ${regs}
Flags: ${flags}

## Pipeline
${pipe}

## Assembly Program
\`\`\`arm
${ctx.assemblySource || '(empty)'}
\`\`\`

## Recent Execution Trace
${trace}

Answer the student's question based on the current simulator state above. Be specific — reference actual register values, instruction names, and cycle numbers from the state. Keep responses under 200 words unless the question requires more detail.`;
}

export default async function handler(req: Request): Promise<Response> {
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    }

    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return new Response(
            JSON.stringify({ error: 'GROQ_API_KEY not configured' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }

    let body: { messages: AIMessage[]; context: AIContext };
    try {
        body = await req.json();
    } catch {
        return new Response('Bad Request', { status: 400 });
    }

    const { messages, context } = body;
    const systemPrompt = buildSystemPrompt(context);

    const groqRes = await fetch(GROQ_API, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            max_tokens: 1024,
            stream: true,
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages.map(m => ({ role: m.role, content: m.content })),
            ],
        }),
    });

    if (!groqRes.ok) {
        const err = await groqRes.text();
        return new Response(err, { status: groqRes.status });
    }

    // Transform Groq/OpenAI SSE → our SSE format
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const reader = groqRes.body!.getReader();
            const decoder = new TextDecoder();
            let buf = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buf += decoder.decode(value, { stream: true });
                    const lines = buf.split('\n');
                    buf = lines.pop() ?? '';

                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        const data = line.slice(6).trim();
                        if (data === '[DONE]') {
                            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                            return;
                        }
                        try {
                            const evt = JSON.parse(data);
                            const text = evt?.choices?.[0]?.delta?.content;
                            if (text) {
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                            }
                        } catch {
                            // ignore malformed lines
                        }
                    }
                }
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
        },
    });
}
