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

const ADVANCED_MODEL = google('gemini-2.0-flash');
const BASIC_MODEL = google('gemini-2.0-flash-lite');
const MODEL_ROUTER_SYSTEM_PROMPT = `You are a query classifier. Analyze the user's message and determine which model should handle it.

Respond with ONLY one word, nothing else: "advanced" or "basic"

Use "advanced" for:
- Complex reasoning or multi-step problems
- Code generation or debugging
- Creative writing with specific requirements
- Technical or scientific explanations
- Scientific or mathematical calculations

Use "basic" for:
- Simple questions with straightforward answers
- Casual conversation
- Basic factual lookups
- Short, simple tasks

If unsure, respond with "basic".`;

export type MyMessage = UIMessage<{
    model: 'advanced' | 'basic';
}>;

export const POST = async (req: Request): Promise<Response> => {
    const body = await req.json();

    const messages: MyMessage[] = body.messages;

    const modelMessages: ModelMessage[] =
        convertToModelMessages(messages);

    const stream = createUIMessageStream<MyMessage>({
        execute: async ({ writer }) => {
            console.time('Model Calculation Time');
            // TODO: Use generateText to call a model, passing in the modelMessages
            // and writing your own system prompt.
            // Get only the last user message for classification
            const lastUserMessage = modelMessages
                .filter((m) => m.role === 'user')
                .at(-1);

            const modelRouterResult = await generateText({
                model: ADVANCED_MODEL,
                messages: lastUserMessage ? [lastUserMessage] : modelMessages,
                system: MODEL_ROUTER_SYSTEM_PROMPT,
            });

            console.timeEnd('Model Calculation Time');
            console.log(
                'modelRouterResult',
                modelRouterResult.text.trim(),
            );

            // Use the modelRouterResult to determine which model to use.
            // If we can't determine which model to use, use the basic model.
            const modelSelected: 'advanced' | 'basic' =
                modelRouterResult.text
                    .toLowerCase()
                    .includes('advanced')
                    ? 'advanced'
                    : 'basic';

            const streamTextResult = streamText({
                model:
                    modelSelected === 'advanced'
                        ? ADVANCED_MODEL
                        : BASIC_MODEL,
                messages: modelMessages,
            });

            writer.merge(
                streamTextResult.toUIMessageStream({
                    // TODO: Add the model to the message metadata, so that
                    // the frontend can display it.
                    messageMetadata: () => ({
                        model: modelSelected,
                    }),
                }),
            );
        },
    });

    return createUIMessageStreamResponse({
        stream,
    });
};
