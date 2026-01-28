import { google } from '@ai-sdk/google';
import { generateText, streamText, type UIMessage } from 'ai';
import { model } from '../../../../../test-api.ts';

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
// TODO:@Ognjen - check this workflow example it's great pattern for quizzes
export const POST = async (req: Request): Promise<Response> => {
    const body: { messages: UIMessage[] } = await req.json();
    // messages = chat history from UI, e.g. [{role: "user", parts: [{type: "text", text: "..."}]}]
    const { messages } = body;

    // Generator-Evaluator Workflow (3-step LLM pipeline):
    // 1. Generate first draft from conversation history
    // 2. Evaluate the draft for clarity and professionalism
    // 3. Produce final polished message using original context + draft + feedback
    // User only sees step 3 streamed to the UI

    // Step 1: Generate initial Slack message draft
    const writeSlackResult = await generateText({
        model: google('gemini-2.0-flash'),
        system: WRITE_SLACK_MESSAGE_FIRST_DRAFT_SYSTEM,
        prompt: formatMessageHistory(messages),
    });

    // Step 2: Evaluate the draft for quality and professionalism
    const evaluateSlackResult = await generateText({
        model: google('gemini-2.0-flash'),
        system: EVALUATE_SLACK_MESSAGE_SYSTEM,
        prompt: writeSlackResult.text,
    });

    // Step 3: Generate final message with all context (streamed to user)
    const finalSlackAttempt = streamText({
        model: google('gemini-2.0-flash'),
        system: WRITE_SLACK_MESSAGE_FINAL_SYSTEM,
        prompt: `Conversation history:\n${formatMessageHistory(messages)}\n\nFirst draft:\n${writeSlackResult.text}\n\nFeedback:\n${evaluateSlackResult.text}`,
    });

    return finalSlackAttempt.toUIMessageStreamResponse();
};
