import { generateObject } from 'ai';
import type { LanguageModel } from 'ai';
import { z } from 'zod';
import { QUIZ_CATEGORIES } from './quiz-categories.js';

const CATEGORY_EVALUATION_PROMPT = `
You are an expert quiz question evaluator specializing in category validation.

Your job is to verify that questions are properly categorized according to a strict taxonomy.

Available categories and their subcategories:
${JSON.stringify(QUIZ_CATEGORIES, null, 2)}

Evaluation rules:
1. **Valid Category**: The major category MUST be one of: ${Object.keys(QUIZ_CATEGORIES).join(', ')}
2. **Valid Subcategory**: The subcategory MUST be from the list under the major category
3. **Appropriate Match**: The question content should actually belong to the assigned category and subcategory
4. **Correct Format**: Category tag should be formatted as [Major Category - Subcategory]

Reply with a score of A, B, C, or D:

A: Perfect - Valid category and subcategory from the taxonomy, and the question content matches the category
B: Good - Valid category and subcategory from the taxonomy, but the question content is a slight mismatch
C: Poor - Category or subcategory is not from the valid taxonomy, OR major mismatch between content and category
D: Failed - Invalid category AND subcategory, OR category format is completely wrong

Provide specific feedback about the categorization.
`;

export interface CategoryEvaluation {
    score: 'A' | 'B' | 'C' | 'D';
    numericScore: number;
    feedback: string;
    detectedCategory?: string;
    detectedSubcategory?: string;
}

export async function evaluateCategory(
    question: string,
    categoryTag: string,
    model: LanguageModel,
): Promise<CategoryEvaluation> {
    const result = await generateObject({
        model,
        system: CATEGORY_EVALUATION_PROMPT,
        prompt: `
                <question>
                ${question}
                </question>

                <category-tag>
                ${categoryTag}
                </category-tag>

                Evaluate if this category tag is valid and appropriate for this question.
        `,
        schema: z.object({
            score: z.enum(['A', 'B', 'C', 'D']),
            feedback: z
                .string()
                .describe(
                    'Detailed feedback about the categorization, including specific issues found.',
                ),
            detectedCategory: z
                .string()
                .optional()
                .describe('What major category the question actually belongs to'),
            detectedSubcategory: z
                .string()
                .optional()
                .describe('What subcategory the question actually belongs to'),
        }),
    });

    // Map letter grades to numeric scores
    const scoreMap = {
        A: 1,
        B: 0.67,
        C: 0.33,
        D: 0,
    };

    return {
        score: result.object.score,
        numericScore: scoreMap[result.object.score],
        feedback: result.object.feedback,
        detectedCategory: result.object.detectedCategory,
        detectedSubcategory: result.object.detectedSubcategory,
    };
}

export async function evaluateCategories(
    questions: Array<{ question: string; categoryTag: string }>,
    model: LanguageModel,
): Promise<{
    evaluations: CategoryEvaluation[];
    averageScore: number;
    passRate: number;
}> {
    const evaluations = await Promise.all(
        questions.map((q) =>
            evaluateCategory(q.question, q.categoryTag, model),
        ),
    );

    const averageScore =
        evaluations.reduce((sum, e) => sum + e.numericScore, 0) /
        evaluations.length;

    // Count questions with A or B grades as passing
    const passCount = evaluations.filter(
        (e) => e.score === 'A' || e.score === 'B',
    ).length;
    const passRate = passCount / evaluations.length;

    return {
        evaluations,
        averageScore,
        passRate,
    };
}
