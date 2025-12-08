import 'dotenv/config';
import {
  createGoogleGenerativeAI,
  google,
} from '@ai-sdk/google';
import { generateText } from 'ai';

// export const anthropic = createAnthropic({
//   apiKey: process.env.ANTHROPIC_API_KEY,
// });

// export const anthropicModel = anthropic(
//   'claude-3-haiku-20240307',
// );

// export const google = createGoogleGenerativeAI({
//   apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY, // ← Use env variable!
// });

export const geminiModel = google('gemini-2.5-flash'); // ← Fixed model name

async function testAPI() {
  try {
    const result = await generateText({
      model: geminiModel, // ← Use this exact string
      prompt: 'Say hello in one sentence!',
    });

    console.log('✅ API key works!');
    console.log('Response:', result.text);
  } catch (error) {
    console.error('❌ API key test failed:', error);
  }
}

testAPI();
