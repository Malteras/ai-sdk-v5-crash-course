import { generateText } from 'ai';
import { anthropicModel } from '../../../../test-api.ts';

const model = anthropicModel;

const prompt = 'What is the capital of France?';

const result = await generateText({
  model,
  prompt,
});

console.log(result.text);
