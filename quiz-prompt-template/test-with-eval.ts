import { google } from '@ai-sdk/google';
import { generateQuestions } from './generate-questions.js';
import { evaluateQuestions } from './question-quality-eval.js';

const generatorModel = google('gemini-2.5-pro');
const evaluatorModel = google('gemini-2.5-pro');

async function main() {
    console.log('🎯 Generating Quiz Questions...\n');
    console.log('='.repeat(80) + '\n');

    // Generate questions
    const rawQuestions = await generateQuestions({
        model: generatorModel,
        numberOfQuestions: 5,
        topic: 'Ancient Rome',
    });

    console.log('📝 Generated Questions:\n');
    console.log(rawQuestions);
    console.log('\n' + '='.repeat(80) + '\n');

    // Parse questions (simple parser - assumes format from prompt)
    const questions = parseQuestions(rawQuestions);

    console.log(
        `\n🔍 Evaluating ${questions.length} questions...\n`,
    );
    console.log('='.repeat(80) + '\n');

    // Evaluate questions
    const evaluation = await evaluateQuestions(
        questions,
        evaluatorModel,
    );

    // Display results
    console.log('📊 Evaluation Results:\n');
    evaluation.evaluations.forEach((result, index) => {
        const question = questions[index];
        if (!question) return;

        console.log(`Question ${index + 1}:`);
        console.log(
            `  Grade: ${result.score} (${result.numericScore.toFixed(2)})`,
        );
        console.log(
            `  Question: ${question.question.substring(0, 100)}...`,
        );
        console.log(`  Answer: ${question.answer}`);
        console.log(`  Feedback: ${result.feedback}`);
        console.log('');
    });

    console.log('='.repeat(80));
    console.log(
        `\n📈 Overall Average Score: ${evaluation.averageScore.toFixed(2)}`,
    );
    console.log(
        `✅ Pass Rate (A or B): ${(evaluation.passRate * 100).toFixed(1)}%`,
    );
    console.log('='.repeat(80));
}

function parseQuestions(
    text: string,
): Array<{ question: string; answer: string }> {
    const questions: Array<{
        question: string;
        answer: string;
    }> = [];

    // Split by question numbers - handles "- Question 1", "**1.**", "1.", etc.
    const blocks = text.split(/(?:- Question \d+|\*\*\d+\.|\n\d+\.)/);

    for (const block of blocks) {
        if (!block.trim()) continue;

        const lines = block
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean);

        let answerLine: string | undefined;
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

            // Category line (skip): - [History - Ancient Rome] or [Category - Subcategory]
            if (line.match(/^[\-\*]*\s*\[.+?\s*-\s*.+?\]\s*[\*]*$/)) {
                continue;
            }

            // Question text
            if (line.startsWith('- ')) {
                questionLines.push(line.substring(2));
            } else if (!line.match(/^\[/) && !line.match(/^\*\*/)) {
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
                questions.push({ question, answer });
            }
        }
    }

    return questions;
}

main().catch((error) => {
    console.error('❌ Error:');
    console.error(error);
    process.exit(1);
});
