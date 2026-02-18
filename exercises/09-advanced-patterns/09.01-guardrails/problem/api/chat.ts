import { google } from '@ai-sdk/google';
import {
    convertToModelMessages,
    createUIMessageStream,
    createUIMessageStreamResponse,
    generateText,
    streamText,
    type ModelMessage,
    type UIMessage,
} from 'ai';
import { GUARDRAIL_SYSTEM } from './guardrail-prompt.ts';

export const POST = async (req: Request): Promise<Response> => {
    const body = await req.json();

    const messages: UIMessage[] = body.messages;

    const modelMessages: ModelMessage[] =
        convertToModelMessages(messages);

    const stream = createUIMessageStream<UIMessage>({
        execute: async ({ writer }) => {
            console.time('Guardrail Time');
            // TODO: Use generateText to call a model, passing in the modelMessages
            // and the GUARDRAIL_SYSTEM prompt.
            //

            let guardrailResult = await generateText({
                model: google('gemini-2.0-flash'),
                messages: [
                    {
                        role: 'system',
                        content: GUARDRAIL_SYSTEM,
                    },
                    ...modelMessages,
                ],
            });

            console.timeEnd('Guardrail Time');

            console.log(
                'guardrailResult',
                guardrailResult.text.trim(),
            );

            // TODO: If the guardrailResult is '0', write a standard reply
            // to the frontend using text-start, text-delta, and text-end
            // parts. Then, do an early return to prevent the rest of the
            // stream from running.
            // (make sure you trim the guardrailResult.text before checking it)
            if (guardrailResult.text.trim() === '0') {
                writer.write({
                    type: 'text-start',
                    id: '1',
                });
                writer.write({
                    type: 'text-delta',
                    id: '1',
                    delta: "I'm sorry, but I can't help with that.",
                });
                writer.write({
                    type: 'text-end',
                    id: '1',
                });
                return;
            }

            const streamTextResult = streamText({
                model: google('gemini-2.0-flash'),
                messages: modelMessages,
            });

            writer.merge(streamTextResult.toUIMessageStream());
        },
    });

    return createUIMessageStreamResponse({
        stream,
    });
};
