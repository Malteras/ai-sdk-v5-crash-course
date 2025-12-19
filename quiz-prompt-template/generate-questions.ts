import { generateText } from 'ai';
import type { LanguageModel } from 'ai';
import { questionMakerPromptTemplate } from './question-maker-prompt.js';
import { google } from '@ai-sdk/google';

const model = google('gemini-2.0-flash-lite');

export interface GenerateQuestionsOptions {
    model: LanguageModel;
    numberOfQuestions: number;
    topic?: string;
}

export async function generateQuestions(
    options: GenerateQuestionsOptions,
) {
    const { model, numberOfQuestions, topic } = options;

    const prompt = questionMakerPromptTemplate({
        numberOfQuestions,
        topic,
    });

    const response = await generateText({
        model,
        prompt,
    });

    return response.text;
}

// Run if this file is executed directly
if (import.meta.filename === process.argv[1]) {
    console.log('🎯 Generating Quiz Questions...\n');
    console.log('=' .repeat(80) + '\n');

    generateQuestions({
        model,
        numberOfQuestions: 5,
        topic: 'Ancient Rome',
    })
        .then((result) => {
            console.log('📝 Generated Questions:\n');
            console.log(result);
            console.log('\n' + '='.repeat(80));
        })
        .catch((error) => {
            console.error('❌ Error generating questions:');
            console.error(error);
            process.exit(1);
        });
}
