import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { geminiModel } from '../../../../test-api.ts';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, // ← Just change to this!
});

// const model = anthropic('claude-3-haiku-20240307');
const model = geminiModel;

const prompt = 'What is the capital of France?';

const result = await generateText({
  model,
  prompt,
});

console.log(result.text);
