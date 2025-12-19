import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import z from 'zod';

export const model = google('gemini-2.0-flash-lite'); // ← Fixed model name

// async function testAPI() {
//   try {
//     const result = await generateText({
//       model: geminiModel, // ← Use this exact string
//       prompt: 'Say hello in one sentence!',
//       maxOutputTokens: 100,
//     });

//     console.log('✅ API key works!');
//     console.log('Response:', result.text);
//   } catch (error) {
//     console.error('❌ API key test failed:', error);
//   }
// }

// testAPI();

const QuizQuestionSchema = z.object({
    id: z
        .string()
        .describe(
            'Unique identifier for the question (timestamp or UUID)',
        ),
    question: z
        .string()
        .min(200)
        .describe(
            'The quiz question text, must be at least 200 characters long, clear and specific with only one possible answer',
        ),
    answer: z
        .string()
        .describe('The correct answer to the question'),
    category: z
        .string()
        .describe(
            'WQC Category (e.g., Culture, Entertainment, History, Lifestyle, Media, Sciences, Sport & Games, World)',
        ),
    subcategory: z
        .string()
        .describe(
            'WQC Subcategory within the category (e.g., Mythology, Physical Geography, Fine Art)',
        ),
    difficulty: z
        .number()
        .min(1)
        .max(5)
        .describe(
            'Difficulty level from 1 (easiest) to 5 (hardest)',
        ),
    tags: z
        .array(z.string())
        .describe(
            'Array of lowercase tags relevant to the question content, multi-word tags use underscores, must not give away the answer',
        ),
    author: z
        .object({
            name: z
                .string()
                .describe('Name of the question author'),
        })
        .describe('Author information object'),
    image: z
        .string()
        .url()
        .describe('URL to a relevant image for the question'),
    imageAlt: z
        .string()
        .describe('Alt text description for the image'),
    additionalInfo: z
        .string()
        .describe(
            'Markdown-formatted text with fun facts, context, and learning resources about the answer',
        ),
    isPublic: z
        .boolean()
        .describe('Whether the question is publicly visible'),
    createdAt: z
        .string()
        .regex(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/,
            'Must be a valid ISO 8601 datetime',
        )
        .describe(
            'ISO 8601 datetime when the question was created',
        ),
    createdBy: z
        .string()
        .regex(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
            'Must be a valid UUID',
        )
        .describe('UUID of the user who created the question'),
    createdByEmail: z
        .string()
        .regex(
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            'Must be a valid email address',
        )
        .describe(
            'Email address of the user who created the question',
        ),
});
const QuizQuestionsArraySchema = z.array(QuizQuestionSchema);

// Read the prompt from the md file
const promptTemplate = readFileSync(
    path.join(import.meta.dirname, 'QuestionGenerator.md'), // Adjust path to your .md file
    'utf-8',
);

// Function to generate quiz questions
async function generateQuizQuestions(word: string) {
    const fullPrompt = `${promptTemplate}

---

Generate 5 quiz questions for the word: **${word}**

Remember to output valid JSON array matching the schema.`;

    console.log(`🎯 Generating quiz questions for: "${word}"\n`);

    const response = await generateText({
        model,
        prompt: fullPrompt,
        maxOutputTokens: 4000,
    });

    const generatedText = response.text;

    console.log('📝 Raw Response:\n');
    console.log(generatedText);
    console.log('\n' + '='.repeat(80) + '\n');

    // Try to extract JSON from the response
    try {
        // Remove markdown code blocks if present
        let jsonText = generatedText;
        const jsonMatch = generatedText.match(
            /```json\n([\s\S]*?)\n```/,
        );
        if (jsonMatch && jsonMatch[1]) {
            jsonText = jsonMatch[1];
        }

        const parsedQuestions = JSON.parse(jsonText);

        // Validate against schema
        const validatedQuestions =
            QuizQuestionsArraySchema.parse(parsedQuestions);

        console.log(
            '✅ Successfully generated and validated questions!\n',
        );
        console.log('📊 Questions Summary:\n');

        validatedQuestions.forEach((q, index) => {
            console.log(`Question ${index + 1}:`);
            console.log(`  Difficulty: ${q.difficulty}/5`);
            console.log(
                `  Category: ${q.category} > ${q.subcategory}`,
            );
            console.log(`  Tags: ${q.tags.join(', ')}`);
            console.log(
                `  Question: ${q.question.substring(0, 100)}...`,
            );
            console.log(`  Answer: ${q.answer}`);
            console.log('');
        });

        return validatedQuestions;
    } catch (error) {
        console.error('❌ Error parsing or validating JSON:');
        console.error(error);
        return null;
    }
}

const word = 'Paris'; // Change this to any word you want
generateQuizQuestions(word)
    .then((questions) => {
        if (questions) {
            console.log('\n📋 Full JSON Output:\n');
            console.log(JSON.stringify(questions, null, 2));
        }
    })
    .catch((error) => {
        console.error('Fatal error:', error);
    });
