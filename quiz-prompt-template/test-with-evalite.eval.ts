import { google } from '@ai-sdk/google';
import { evalite } from 'evalite';
import { generateQuestions } from './generate-questions.js';
import { evaluateQuestion } from './question-quality-eval.js';

const generatorModel = google('gemini-2.5-pro');
const evaluatorModel = google('gemini-2.5-pro');

// Generate questions beforehand
console.log('🎯 Generating questions...\n');
const rawQuestions = await generateQuestions({
    model: generatorModel,
    numberOfQuestions: 3,
    topic: 'Ancient Rome',
});
console.log('✅ Questions generated\n');

evalite('Quiz Question Generation', {
    data: () => [
        {
            input: {
                rawQuestions,
                topic: 'Ancient Rome',
            },
        },
    ],
    task: async (input) => {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`📝 Evaluating questions on topic: "${input.topic}"\n`);
        console.log(input.rawQuestions);
        console.log(`\n${'='.repeat(80)}\n`);

        // Parse questions
        const questions = parseQuestions(input.rawQuestions);

        console.log(`✅ Parsed ${questions.length} questions\n`);

        return {
            rawOutput: input.rawQuestions,
            questions,
        };
    },
    scorers: [
        {
            name: 'Question Quality',
            scorer: async ({ output }) => {
                if (
                    !output.questions ||
                    output.questions.length === 0
                ) {
                    return {
                        score: 0,
                        message: 'No questions were parsed',
                    };
                }

                console.log(
                    `🔍 Evaluating ${output.questions.length} questions for quality...\n`,
                );

                // Evaluate all questions for quality
                const evaluations = await Promise.all(
                    output.questions.map((q) =>
                        evaluateQuestion(
                            q.question,
                            q.answer,
                            evaluatorModel,
                        ),
                    ),
                );

                const averageScore =
                    evaluations.reduce(
                        (sum, e) => sum + e.numericScore,
                        0,
                    ) / evaluations.length;

                const passCount = evaluations.filter(
                    (e) => e.score === 'A' || e.score === 'B',
                ).length;
                const passRate = passCount / evaluations.length;

                // Display detailed results
                console.log(
                    '📊 Question Quality Evaluation Results:\n',
                );
                evaluations.forEach((result, index) => {
                    const question = output.questions[index];
                    if (!question) return;

                    console.log(`Question ${index + 1}:`);
                    console.log(
                        `  Grade: ${result.score} (${result.numericScore.toFixed(2)})`,
                    );
                    console.log(
                        `  Question: ${question.question.substring(0, 100)}...`,
                    );
                    console.log(`  Answer: ${question.answer}`);
                    console.log(
                        `  Feedback: ${result.feedback}`,
                    );
                    if (result.suggestedQuestion) {
                        console.log(
                            `  💡 Suggested Fix: ${result.suggestedQuestion}`,
                        );
                    }
                    console.log('');
                });

                console.log(`${'='.repeat(80)}`);
                console.log(
                    `\n📈 Overall Quality Score: ${averageScore.toFixed(2)}`,
                );
                console.log(
                    `✅ Pass Rate (A or B): ${(passRate * 100).toFixed(1)}%`,
                );
                console.log(`${'='.repeat(80)}\n`);

                // Collect feedback for failing questions
                const failingFeedback = evaluations
                    .map((e, i) => {
                        if (e.score === 'C' || e.score === 'D') {
                            return `Q${i + 1} [${e.score}]: ${e.feedback}`;
                        }
                        return null;
                    })
                    .filter(Boolean)
                    .join('\n');

                return {
                    score: averageScore,
                    message: `Pass Rate: ${(passRate * 100).toFixed(1)}% (${passCount}/${evaluations.length})\n${failingFeedback || 'All questions passed!'}`,
                };
            },
        },
        {
            name: 'Parsing Success',
            scorer: ({ output }) => {
                const actualCount = output.questions?.length || 0;
                const expectedCount = 3; // We generated 3 questions

                return {
                    score: actualCount === expectedCount ? 1 : 0,
                    message: `Expected ${expectedCount} questions, parsed ${actualCount}`,
                };
            },
        },
    ],
});

function parseQuestions(
    text: string,
): Array<{
    question: string;
    answer: string;
    categoryTag?: string;
}> {
    const questions: Array<{
        question: string;
        answer: string;
        categoryTag?: string;
    }> = [];

    // Split by question numbers - handles "- Question 1", "**1.**", "1.", etc.
    const blocks = text.split(
        /(?:- Question \d+|\*\*\d+\.|\n\d+\.)/,
    );

    for (const block of blocks) {
        if (!block.trim()) continue;

        const lines = block
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean);

        let answerLine: string | undefined;
        let categoryTag: string | undefined;
        const questionLines: string[] = [];

        let foundAnswerLabel = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line) continue;

            // Check if this line contains [Answer]
            if (line.match(/^\[Answer\]/i)) {
                foundAnswerLabel = true;
                // Extract the answer from this line
                const match = line.match(/^\[Answer\]\s*(.+)$/i);
                if (match && match[1]) {
                    answerLine = match[1];
                } else if (i + 1 < lines.length) {
                    // If no answer on this line, it might be on the next line
                    answerLine = lines[i + 1];
                }
                continue;
            }

            // Category line: - [History - Ancient Rome] or [Category - Subcategory]
            const categoryMatch = line.match(
                /^[\-\*]*\s*\[(.+?\s*-\s*.+?)\]\s*[\*]*$/,
            );
            if (categoryMatch && categoryMatch[1]) {
                categoryTag = categoryMatch[1];
                continue;
            }

            // Question text
            if (line.startsWith('- ')) {
                questionLines.push(line.substring(2));
            } else if (
                !line.match(/^\[/) &&
                !line.match(/^\*\*/)
            ) {
                // Don't add if it's already been marked as answer
                if (!foundAnswerLabel || line !== answerLine) {
                    questionLines.push(line);
                }
            }
        }

        if (answerLine) {
            const answer = answerLine.trim();
            const question = questionLines.join(' ').trim();

            if (question && answer) {
                questions.push({
                    question,
                    answer,
                    categoryTag,
                });
            }
        }
    }

    return questions;
}
