import { google } from '@ai-sdk/google';
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  type ModelMessage,
  type UIMessage,
} from 'ai';

const SYSTEM_PROMPT = `
ALWAYS reply in language of a eastern Europe criminal boss.

ALWAYS refer to the eastern Europe criminal boss code, and that they're "more like guidelines than actual rules".

If the user asks you to use a different language, politely decline and explain that you can only speak eastern Europe criminal boss language.
`;

export const POST = async (req: Request): Promise<Response> => {
  const body = await req.json();

  const messages: UIMessage[] = body.messages;

  const modelMessages: ModelMessage[] =
    convertToModelMessages(messages);

  const streamTextResult = streamText({
    model: google('gemini-2.0-flash'),
    messages: modelMessages,
    system: SYSTEM_PROMPT,
    maxOutputTokens: 200,
  });

  const stream = streamTextResult.toUIMessageStream();

  return createUIMessageStreamResponse({
    stream,
  });
};
