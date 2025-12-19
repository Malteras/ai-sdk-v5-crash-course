import { generateText, generateObject } from 'ai';
import type { LanguageModel } from 'ai';
import { questionMakerPromptTemplate } from './prompts/question-maker-prompt.js';
import { QuizQuestionsArraySchema, type QuizQuestion } from './schemas/quiz-question-schema.js';
import { google } from '@ai-sdk/google';

const model = google('gemini-2.0-flash-lite');

export interface GenerateQuestionsOptions {
    model: LanguageModel;
    numberOfQuestions: number;
    topic?: string;
    structured?: boolean;
    author?: {
        name: string;
        id: string;
        email: string;
    };
}

// Original text-based generation
export async function generateQuestions(
    options: GenerateQuestionsOptions,
): Promise<string> {
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

// Structured generation with schema
export async function generateQuestionsStructured(
    options: GenerateQuestionsOptions,
): Promise<QuizQuestion[]> {
    const { model, numberOfQuestions, topic, author } = options;

    const prompt = questionMakerPromptTemplate({
        numberOfQuestions,
        topic,
    });

    const defaultAuthor = author || {
        name: 'AI Question Generator',
        id: '00000000-0000-0000-0000-000000000000',
        email: 'ai@quizgenerator.com',
    };

    const now = new Date().toISOString();
    const baseTimestamp = Date.now();

    const result = await generateObject({
        model,
        prompt: `${prompt}

<additional-instructions>
For each question, you MUST provide all required fields.
IMPORTANT: category and subcategory values must EXACTLY match the QUIZ_CATEGORIES taxonomy.
Tags should be lowercase with underscores for multi-word terms (e.g., "ancient_rome", "military_history").
</additional-instructions>`,
        schema: QuizQuestionsArraySchema,
    });

    // Override metadata with correct values
    return result.object.questions.map((q, index) => ({
        ...q,
        id: `q_${baseTimestamp + index}_${index + 1}`,
        createdAt: now,
        createdBy: defaultAuthor.id,
        createdByEmail: defaultAuthor.email,
        author: {
            name: defaultAuthor.name,
        },
    }));
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
