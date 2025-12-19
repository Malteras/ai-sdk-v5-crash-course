import { generateObject } from 'ai';
import type { LanguageModel } from 'ai';
import { z } from 'zod';

const QUESTION_QUALITY_PROMPT = `
You are an expert quiz question evaluator. Your job is to assess the quality and accuracy of trivia questions.

Evaluate each question based on these critical rules:

1. **Factual Accuracy**: Each question must be factually accurate and verifiable - never create fictional facts or misleading information

2. **No Answer in Question**: The SPECIFIC answer must NOT be revealed in the question itself. However, providing context about:
   - Etymology of terms (e.g., explaining "triumvirate" when asking for "First Triumvirate")
   - General categories (e.g., explaining "amphitheater" when asking for "Colosseum")
   - Related concepts or word roots
   ...is ACCEPTABLE as long as the specific answer (the proper name, specific term, or unique identifier being asked for) is not given away.

   Examples of ACCEPTABLE:
   - "From the Latin for 'of three men', the term denotes a regime of three leaders. Which specific alliance of 60 BCE involved Caesar, Pompey, and Crassus?" Answer: First Triumvirate
   - "From the Greek word meaning 'rule by the people', what system of government originated in ancient Athens?" Answer: Democracy

   Examples of VIOLATION:
   - "From the Latin 'salarium' meaning salt money, what word means a fixed payment?" Answer: Salary (too similar to the Latin term)
   - "Named Vesta, which Roman goddess..." Answer: Vesta (exact match - the answer is literally stated in the question)

3. **Context Relevance**: Any contextual lead-ins (historical, etymological, pop-culture) must be accurate and genuinely relevant to the answer

4. **Clear Answer**: Each question should have one clear, unambiguous correct answer

5. **Avoid Obscurity**: Questions should not be impossibly obscure - aim for facts that are learnable and verifiable through reputable sources

6. **No False Connections**: Do not make fake connections (e.g., claiming something shares a name with a dessert when it doesn't)

Reply with a score of A, B, C, or D:

A: Excellent - Factually accurate, specific answer not revealed (though general context is fine), relevant context, clear answer
B: Good - Minor issues with context relevance or slight ambiguity, but factually accurate
C: Poor - Contains factual errors, false connections, or reveals the SPECIFIC answer in the question
D: Failed - Multiple serious issues: factual errors AND answer revealed AND/or false information

Provide specific feedback about what's wrong or what's done well.
`;

export interface QuestionEvaluation {
    score: 'A' | 'B' | 'C' | 'D';
    numericScore: number;
    feedback: string;
}

export async function evaluateQuestion(
    question: string,
    answer: string,
    model: LanguageModel,
): Promise<QuestionEvaluation> {
    const result = await generateObject({
        model,
        system: QUESTION_QUALITY_PROMPT,
        prompt: `
                <question>
                ${question}
                </question>

                <answer>
                ${answer}
                </answer>

                Evaluate this question based on the rules above.
        `,
        schema: z.object({
            score: z.enum(['A', 'B', 'C', 'D']),
            feedback: z
                .string()
                .describe(
                    'Detailed feedback about the question quality, including specific issues found.',
                ),
        }),
    });

    // Map letter grades to numeric scores
    const scoreMap = {
        A: 1,
        B: 0.5,
        C: 0,
        D: 0,
    };

    return {
        score: result.object.score,
        numericScore: scoreMap[result.object.score],
        feedback: result.object.feedback,
    };
}

export async function evaluateQuestions(
    questions: Array<{ question: string; answer: string }>,
    model: LanguageModel,
): Promise<{
    evaluations: QuestionEvaluation[];
    averageScore: number;
    passRate: number;
}> {
    const evaluations = await Promise.all(
        questions.map((q) =>
            evaluateQuestion(q.question, q.answer, model),
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
