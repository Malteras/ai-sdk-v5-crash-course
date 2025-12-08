import { google } from '@ai-sdk/google';
import { streamObject, streamText } from 'ai';
import z from 'zod';

const model = google('gemini-2.0-flash');

const stream = streamText({
  model,
  prompt:
    'Give me the first paragraph of a story about an imaginary planet.',
});

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}

const finalText = await stream.text;

// TODO: Replace this with a call to streamObject, passing:
// - The model, same as above
// - The prompt, asking for facts about the imaginary planet,
//   passing in the finalText as the story
// - The schema, which should be an object with a facts property
//   that is an array of strings
const factsResult = await streamObject({
  model,
  prompt: `Provide five interesting facts about the following imaginary planet:\n\n${finalText}`,
  schema: z.object({
    facts: z
      .array(
        z
          .string()
          .describe(
            'An interesting fact about the imaginary planet. Write as scientist.',
          ),
      )
      .describe(
        'An array of interesting facts about the imaginary planet',
      ),
  }),
});

for await (const chunk of factsResult.partialObjectStream) {
  console.log(chunk);
}
