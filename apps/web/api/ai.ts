export const config = { runtime: 'edge' };

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

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

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        return new Response(
            JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
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

    const anthropicRes = await fetch(ANTHROPIC_API, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            stream: true,
            system: systemPrompt,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
        }),
    });

    if (!anthropicRes.ok) {
        const err = await anthropicRes.text();
        return new Response(err, { status: anthropicRes.status });
    }

    // Transform Anthropic SSE → our SSE format
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const reader = anthropicRes.body!.getReader();
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
                        if (data === '[DONE]') continue;

                        try {
                            const evt = JSON.parse(data);
                            if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
                                const chunk = `data: ${JSON.stringify({ text: evt.delta.text })}\n\n`;
                                controller.enqueue(encoder.encode(chunk));
                            } else if (evt.type === 'message_stop') {
                                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                            }
                        } catch {
                            // ignore malformed lines
                        }
                    }
                }
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
