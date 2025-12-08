import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { anthropicModel } from '../../../../test-api.ts';

const model = anthropicModel;
const prompt =
  'Give me the first paragraph of a story about an imaginary planet.';

const stream = await streamText({ model, prompt });

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
