import { google } from '@ai-sdk/google';
import {
    createUIMessageStream,
    createUIMessageStreamResponse,
    streamText,
    type UIMessage,
} from 'ai';

// TODO: @Ognjen - QUIZOMNIA this is how to show custom parts - useful for my quiz to see first version of questions,
// evaluation, and final version
export type MyMessage = UIMessage<
    unknown,
    {
        'first-draft': {
            data: string;
        };
        evaluation: {
            data: string;
        };
    }
>;

const formatMessageHistory = (messages: MyMessage[]) => {
    return messages
        .map((message) => {
            return `${message.role}: ${message.parts
                .map((part) => {
                    if (part.type === 'text') {
                        return part.text;
                    }

                    return '';
                })
                .join('')}`;
        })
        .join('\n');
};

const WRITE_SLACK_MESSAGE_FIRST_DRAFT_SYSTEM = `You are writing a Slack message for a user based on the conversation history. Only return the Slack message, no other text.`;
const EVALUATE_SLACK_MESSAGE_SYSTEM = `You are evaluating the Slack message produced by the user.

  Evaluation criteria:
  - The Slack message should be written in a way that is easy to understand.
  - It should be appropriate for a professional Slack conversation.
`;
const WRITE_SLACK_MESSAGE_FINAL_SYSTEM = `You are writing a Slack message based on the conversation history, a first draft, and some feedback given about that draft.

  Return only the final Slack message, no other text.
`;

export const POST = async (req: Request): Promise<Response> => {
    const body: { messages: MyMessage[] } = await req.json();
    const { messages } = body;

    const stream = createUIMessageStream<MyMessage>({
        execute: async ({ writer }) => {
            // TODO: @Ognjen - QUIZOMNIA - evaluation read this comment
            // When streaming multiple things (first draft → evaluation → final),
            // each streamText tries to send its own start and finish messages.
            // This causes duplicate messages in the UI.
            // By manually sending start at the beginning, we control the message lifecycle:
            // Manual start → custom parts → merge final (without its start) → auto finish
            writer.write({ type: 'start' });

            // Step 1: Stream first draft and write as custom data part
            //
            // Problem with generateText:
            // - Blocks until the entire response is complete
            // - User sees nothing during this time
            // - Returns { text: string } after completion
            //
            // Solution with streamText:
            // - Returns immediately with a StreamTextResult
            // - Has .textStream property (async iterable of chunks)
            // - We accumulate chunks and write them as custom data parts
            //
            // Key concept - ID reconciliation:
            // We use a stable id so that each write UPDATES the same part instead of creating new ones:
            // Write 1: { type: 'data-first-draft', id: 'abc', data: 'H' }
            // Write 2: { type: 'data-first-draft', id: 'abc', data: 'He' }      ← replaces
            // Write 3: { type: 'data-first-draft', id: 'abc', data: 'Hel' }     ← replaces
            // Write 4: { type: 'data-first-draft', id: 'abc', data: 'Hell' }    ← replaces
            // Write 5: { type: 'data-first-draft', id: 'abc', data: 'Hello' }   ← replaces
            const firstDraftId = crypto.randomUUID();
            let firstDraftText = '';

            const writeSlackStream = streamText({
                model: google('gemini-2.0-flash-001'),
                system: WRITE_SLACK_MESSAGE_FIRST_DRAFT_SYSTEM,
                prompt: `
                        Conversation history:
                        ${formatMessageHistory(messages)}
                    `,
            });

            for await (const chunk of writeSlackStream.textStream) {
                firstDraftText += chunk;
                writer.write({
                    type: 'data-first-draft',
                    id: firstDraftId,
                    data: { data: firstDraftText },
                });
            }
            // After loop: firstDraftText contains the complete draft

            // Step 2: Stream evaluation and write as custom data part
            const evaluationId = crypto.randomUUID();
            let evaluationText = '';

            const evaluateSlackStream = streamText({
                model: google('gemini-2.0-flash-001'),
                system: EVALUATE_SLACK_MESSAGE_SYSTEM,
                prompt: `
          Conversation history:
          ${formatMessageHistory(messages)}

          Slack message:
          ${firstDraftText}
        `,
            });

            for await (const chunk of evaluateSlackStream.textStream) {
                evaluationText += chunk;
                writer.write({
                    type: 'data-evaluation',
                    id: evaluationId,
                    data: { data: evaluationText },
                });
            }
            // After loop: evaluationText contains the complete evaluation

            const finalSlackAttempt = streamText({
                model: google('gemini-2.0-flash-001'),
                system: WRITE_SLACK_MESSAGE_FINAL_SYSTEM,
                prompt: `
          Conversation history:
          ${formatMessageHistory(messages)}

          First draft:
          ${firstDraftText}

          Previous feedback:
          ${evaluationText}
        `,
            });

            // Step 3: Merge final message stream (sends as regular text parts)
            //
            // How it works:
            // - Convert streamText result to UIMessageStream using .toUIMessageStream()
            // - Merge it into our writer
            // - Pass sendStart: false because we already sent start manually at the beginning
            //
            // Why sendStart: false?
            // - We already wrote { type: 'start' } at the beginning
            // - If we let this stream send another start, we'd get duplicate messages in the UI
            // - The final stream CAN send finish (default) because it's the last thing
            writer.merge(
                finalSlackAttempt.toUIMessageStream({
                    sendStart: false,
                }),
            );
        },
    });

    return createUIMessageStreamResponse({
        stream,
    });
};
