import { google } from '@ai-sdk/google';
import {
    createUIMessageStream,
    createUIMessageStreamResponse,
    streamText,
    type UIMessage,
} from 'ai';

export type MyMessage = UIMessage<
    unknown,
    {
        'slack-message': string;
        'slack-message-feedback': string;
    }
>;

// TODO: @Ognjen Normalize the UI message history into a plain text transcript
// TODO: @Ognjen so the model gets a clear, compact conversation context.
const formatMessageHistory = (messages: UIMessage[]) => {
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

// TODO: @Ognjen Handle the chat POST request by streaming draft, feedback,
// TODO: @Ognjen and final Slack message parts back to the client.
export const POST = async (req: Request): Promise<Response> => {
    const body: { messages: MyMessage[] } = await req.json();
    const { messages } = body;

    const stream = createUIMessageStream<MyMessage>({
        execute: async ({ writer }) => {
            writer.write({
                type: 'start',
            });

            let step = 0; // TODO: keep track of the step we're on
            let mostRecentDraft = ''; // TODO: keep track of the most recent draft
            let mostRecentFeedback = ''; // TODO: keep track of the most recent feedback

            while (step < 2) {
                // Ask the model for a draft Slack message using conversation
                // history plus the previous draft/feedback for iteration.
                let writeSlackResult = streamText({
                    model: google('gemini-2.0-flash-001'),
                    system: WRITE_SLACK_MESSAGE_FIRST_DRAFT_SYSTEM,
                    prompt: `
                            Conversation history:
                            ${formatMessageHistory(messages)}

                            Previous draft (if any):
                            ${mostRecentDraft}

                            Previous feedback (if any):
                            ${mostRecentFeedback}
                        `,
                });
                // Use a stable id so the UI updates the same draft part.
                const draftId = crypto.randomUUID();
                let draft = '';
                // Stream draft chunks as they arrive and keep the UI updated.
                for await (const part of writeSlackResult.textStream) {
                    draft += part;

                    writer.write({
                        type: 'data-slack-message',
                        data: draft,
                        id: draftId,
                    });
                }
                // Persist the latest draft for evaluation and next iteration.
                mostRecentDraft = draft;

                // Ask the model to evaluate the draft and provide feedback.
                const evaluateSlackResult = streamText({
                    model: google('gemini-2.0-flash-001'),
                    system: EVALUATE_SLACK_MESSAGE_SYSTEM,
                    prompt: `
                        Conversation history:
                        ${formatMessageHistory(messages)}

                        Most recent draft:
                        ${mostRecentDraft}

                        Previous feedback (if any):
                        ${mostRecentFeedback}
                    `,
                });
                // Use a stable id so the UI updates the same feedback part.
                const feedbackId = crypto.randomUUID();
                let feedback = '';
                // Stream model feedback chunks as they arrive, append to the
                // accumulated feedback, and emit an updated data part so the UI
                // can render live feedback tied to the same id.
                for await (const part of evaluateSlackResult.textStream) {
                    feedback += part;

                    writer.write({
                        type: 'data-slack-message-feedback',
                        data: feedback,
                        id: feedbackId,
                    });
                }

                // Persist feedback and move to the next loop iteration.
                mostRecentFeedback = feedback;
                step++;
            }

            // final message
            const textPartId = crypto.randomUUID();
            writer.write({ type: 'text-start', id: textPartId });
            writer.write({
                type: 'text-delta',
                delta: mostRecentDraft,
                id: textPartId,
            });
            writer.write({ type: 'text-end', id: textPartId });

            const writeSlackResult = streamText({
                model: google('gemini-2.0-flash-001'),
                system: WRITE_SLACK_MESSAGE_FIRST_DRAFT_SYSTEM,
                prompt: `
                    Conversation history:
                    ${formatMessageHistory(messages)}
                `,
            });

            const firstDraftId = crypto.randomUUID();

            let firstDraft = '';

            for await (const part of writeSlackResult.textStream) {
                firstDraft += part;

                writer.write({
                    type: 'data-slack-message',
                    data: firstDraft,
                    id: firstDraftId,
                });
            }

            // Evaluate Slack message
            const evaluateSlackResult = streamText({
                model: google('gemini-2.0-flash-001'),
                system: EVALUATE_SLACK_MESSAGE_SYSTEM,
                prompt: `
                    Conversation history:
                    ${formatMessageHistory(messages)}

                    Slack message:
                    ${firstDraft}
                `,
            });

            const feedbackId = crypto.randomUUID();

            let feedback = '';

            for await (const part of evaluateSlackResult.textStream) {
                feedback += part;

                writer.write({
                    type: 'data-slack-message-feedback',
                    data: feedback,
                    id: feedbackId,
                });
            }

            // Write final Slack message
            const finalSlackAttempt = streamText({
                model: google('gemini-2.0-flash-001'),
                system: WRITE_SLACK_MESSAGE_FINAL_SYSTEM,
                prompt: `
                    Conversation history:
                    ${formatMessageHistory(messages)}

                    First draft:
                    ${firstDraft}

                    Previous feedback:
                    ${feedback}
                `,
            });

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
