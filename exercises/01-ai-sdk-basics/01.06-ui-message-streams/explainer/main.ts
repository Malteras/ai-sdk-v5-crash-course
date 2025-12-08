import { streamText } from 'ai';
import { anthropicModel } from '../../../../test-api.ts';

const stream = streamText({
  model: anthropicModel,
  prompt:
    'Give me a haiku about serbian vampire Petar Blagojevic.',
});

for await (const chunk of stream.toUIMessageStream()) {
  console.log(chunk);
}
