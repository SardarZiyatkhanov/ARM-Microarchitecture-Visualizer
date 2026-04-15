import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import Anthropic from '@anthropic-ai/sdk';

const anthropicKey = defineSecret('ANTHROPIC_API_KEY');

const SYSTEM_PROMPT = `You are an embedded teaching assistant inside PlayARM, an interactive ARM32 pipeline simulator used alongside a computer architecture textbook.

You receive the LIVE simulator state on every message as a JSON block under "--- SIMULATOR STATE ---". Use these exact values when answering — never guess or approximate register values, flag states, or pipeline contents when the state is provided.

Your role:
- Help students understand WHY things happen in the pipeline, not just WHAT happened
- When asked about a stall or bubble, explain the hazard condition: data dependency (RAW/WAW/WAR), control hazard (branch), or structural hazard
- When asked about flags, explain which instruction set them and what condition they represent
- Reference the actual instruction names from the pipeline state (not generic examples)
- Guide students toward understanding — ask probing questions, don't just give answers
- Keep responses concise; this runs inside a small embedded panel

Do not write ARM assembly code for the student unless they explicitly ask. Never hallucinate register values — if the state shows R0=0x0000000C, say 12 (decimal).`;

function buildSystemWithContext(context: Record<string, unknown>): string {
    return `${SYSTEM_PROMPT}\n\n--- SIMULATOR STATE ---\n${JSON.stringify(context, null, 2)}\n--- END STATE ---`;
}

export const aiAssistant = onRequest(
    {
        cors: ['https://playarm.app', 'https://playarm.web.app', 'http://localhost:5173'],
        secrets: [anthropicKey],
        timeoutSeconds: 60,
        memory: '256MiB',
    },
    async (req, res) => {
        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }

        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }

        const { messages, context } = req.body as {
            messages: Array<{ role: 'user' | 'assistant'; content: string }>;
            context: Record<string, unknown>;
        };

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            res.status(400).send('Missing messages');
            return;
        }

        const client = new Anthropic({ apiKey: anthropicKey.value() });

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        try {
            const stream = client.messages.stream({
                model: 'claude-sonnet-4-6',
                max_tokens: 1024,
                system: buildSystemWithContext(context ?? {}),
                messages,
            });

            for await (const chunk of stream) {
                if (
                    chunk.type === 'content_block_delta' &&
                    chunk.delta.type === 'text_delta'
                ) {
                    res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
                }
            }

            res.write('data: [DONE]\n\n');
            res.end();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
            res.end();
        }
    },
);
