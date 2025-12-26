import { google } from '@ai-sdk/google';
import {
    convertToModelMessages,
    streamText,
    type UIMessage,
} from 'ai';

// TODO: Add the type of the metadata to the object here
// We probably want it to be { duration: number }
export type MyUIMessage = UIMessage<
    { duration: number },
    never,
    never
>;

export const POST = async (req: Request): Promise<Response> => {
    const body: { messages: MyUIMessage[] } = await req.json();
    const { messages } = body;

    const result = streamText({
        model: google('gemini-2.5-flash'),
        messages: convertToModelMessages(messages),
    });

    // TODO: Calculate the start time of the stream
    const startTime = Date.now();

    return result.toUIMessageStreamResponse<MyUIMessage>({
        // TODO:@Ognjen 'messageMetadata' is a predefined callback property from toUIMessageStreamResponse options.
        // Called by AI SDK for each stream part. Receives { part } object (destructured) where part contains the stream event.
        // Return metadata object on 'finish' type to attach custom data to the final message.
        messageMetadata: ({ part }) => {
            if (part.type === 'finish') {
                const endTime = Date.now();
                return { duration: endTime - startTime };
            }

            return undefined;
        },
    });
};
