import { z } from 'zod';
import { QUIZ_CATEGORIES } from './quiz-categories.js';

// Extract valid category and subcategory values from QUIZ_CATEGORIES
const validCategories = Object.keys(QUIZ_CATEGORIES) as [string, ...string[]];
const allSubcategories = Object.values(QUIZ_CATEGORIES).flat() as [
    string,
    ...string[],
];

export const QuizQuestionSchema = z
    .object({
        id: z
            .string()
            .describe('Unique identifier for the question (timestamp or UUID)'),
        question: z
            .string()
            .min(200)
            .describe(
                'The quiz question text, must be at least 200 characters long, clear and specific with only one possible answer',
            ),
        answer: z.string().describe('The correct answer to the question'),
        category: z
            .enum(validCategories)
            .describe(
                'WQC Category - must be one of: Culture, Entertainment, History, Lifestyle, Media, Sciences, Sport & Games, World',
            ),
        subcategory: z
            .enum(allSubcategories)
            .describe(
                'WQC Subcategory within the category (e.g., Mythology, Physical Geography, Fine Art)',
            ),
        difficulty: z
            .number()
            .min(1)
            .max(5)
            .describe('Difficulty level from 1 (easiest) to 5 (hardest)'),
        tags: z
            .array(z.string())
            .describe(
                'Array of lowercase tags relevant to the question content, multi-word tags use underscores, must not give away the answer',
            ),
        author: z
            .object({
                name: z.string().describe('Name of the question author'),
            })
            .describe('Author information object'),
        image: z
            .string()
            .url()
            .describe('URL to a relevant image for the question'),
        imageAlt: z.string().describe('Alt text description for the image'),
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
            .describe('ISO 8601 datetime when the question was created'),
        createdBy: z
            .string()
            .regex(
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
                'Must be a valid UUID',
            )
            .describe('UUID of the user who created the question'),
        createdByEmail: z
            .string()
            .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Must be a valid email address')
            .describe('Email address of the user who created the question'),
    })
    .refine(
        (data) => {
            // Validate that subcategory belongs to the selected category
            const validSubcategories =
                QUIZ_CATEGORIES[data.category as keyof typeof QUIZ_CATEGORIES];
            return validSubcategories?.includes(data.subcategory);
        },
        {
            message:
                'Subcategory must be a valid option under the selected category',
            path: ['subcategory'],
        },
    );

export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

export const QuizQuestionsArraySchema = z.object({
    questions: z.array(QuizQuestionSchema),
});

export type QuizQuestionsArray = z.infer<typeof QuizQuestionsArraySchema>;
