import { google } from '@ai-sdk/google';
import {
    convertToModelMessages,
    createUIMessageStream,
    createUIMessageStreamResponse,
    streamObject,
    streamText,
    type ModelMessage,
    type UIMessage,
    type UIMessageStreamWriter,
} from 'ai';
import { tavily } from '@tavily/core';
import z from 'zod';

export type MyMessage = UIMessage<
    unknown,
    {
        queries: string[];
        plan: string;
    }
>;

const generateQueriesForTavily = (
    modelMessages: ModelMessage[],
) => {
    // TODO: Use streamObject to generate a plan for the search,
    // AND the queries to search the web for information.
    // The plan should identify the groups of information required
    // to answer the question.
    // The plan should list pieces of information that are required
    // to answer the question, then consider how to break down the
    // information into queries.
    // Generate 3-5 queries that are relevant to the conversation history.
    // Reply as a JSON object with the following properties:
    // - plan: A string describing the plan for the queries.
    // - queries: An array of strings, each representing a query.
    const queriesResult = streamObject({
        model: google('gemini-2.0-flash'),
        messages: modelMessages,
        system: `You are an assistant for a research workflow. Your job is to help the user answer their question by generating a plan for how to search for information, and then generating the queries to search for information.
                The plan should identify the groups of information required to answer the question. The plan should list pieces of information that are required to answer the question, then consider how to break down the information into queries. Generate 3-5 queries that are relevant to the conversation history.
                Reply as a JSON object with the following properties:
                - plan: A string describing the plan for the queries.
                - queries: An array of strings, each representing a query.`,
        schema: z.object({
            plan: z.string(),
            queries: z.array(z.string()),
        }),
    });

    return queriesResult;
};

const displayQueriesInFrontend = async (
    queriesResult: ReturnType<typeof generateQueriesForTavily>,
    writer: UIMessageStreamWriter<MyMessage>,
) => {
    const queriesPartId = crypto.randomUUID();
    const planPartId = crypto.randomUUID();

    for await (const part of queriesResult.partialObjectStream) {
        // TODO: Stream the queries and plan to the frontend
        if (part.queries) {
            writer.write({
                type: 'data-queries',
                data: part.queries.filter(
                    (q): q is string => q !== undefined,
                ),
                id: queriesPartId,
            });
        }

        if (part.plan) {
            writer.write({
                type: 'data-plan',
                data: part.plan,
                id: planPartId,
            });
        }
    }
};

const callTavilyToGetSearchResults = async (
    queries: string[],
) => {
    const tavilyClient = tavily({
        apiKey: process.env.TAVILY_API_KEY,
    });

    const searchResults = await Promise.all(
        queries.map(async (query) => {
            const response = await tavilyClient.search(query, {
                maxResults: 5,
            });

            return {
                query,
                response,
            };
        }),
    );

    return searchResults;
};

const streamFinalSummary = async (
    searchResults: Awaited<
        ReturnType<typeof callTavilyToGetSearchResults>
    >,
    messages: ModelMessage[],
    writer: UIMessageStreamWriter<MyMessage>,
) => {
    // TODO: Use streamText to generate a final response to the user.
    // The response should be a summary of the search results,
    // and the sources of the information.
    const answerResult = streamText({
        model: google('gemini-2.0-flash'),
        messages,
        system:
            'Summarize the following search results... Here are the results: ' +
            JSON.stringify(searchResults),
    });

    writer.merge(
        // NOTE: We send sendStart: false because we've already
        // sent the 'start' message part to the frontend.
        answerResult.toUIMessageStream({ sendStart: false }),
    );
};

export const POST = async (req: Request): Promise<Response> => {
    const body: { messages: MyMessage[] } = await req.json();
    const { messages } = body;

    const modelMessages = convertToModelMessages(messages);

    const stream = createUIMessageStream<MyMessage>({
        execute: async ({ writer }) => {
            const queriesResult =
                generateQueriesForTavily(modelMessages);

            await displayQueriesInFrontend(
                queriesResult,
                writer,
            );

            const scrapedPages =
                await callTavilyToGetSearchResults(
                    (await queriesResult.object).queries,
                );

            await streamFinalSummary(
                scrapedPages,
                modelMessages,
                writer,
            );
        },
    });

    return createUIMessageStreamResponse({
        stream,
    });
};
