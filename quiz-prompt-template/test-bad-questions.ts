import { google } from '@ai-sdk/google';
import { evaluateQuestions } from './question-quality-eval.js';

const evaluatorModel = google('gemini-2.0-flash');

// The problematic questions you mentioned
const badQuestions = [
    {
        question:
            'In 2025, a popular documentary series explored the lasting influence of Roman law. What term, derived from the Latin word for "to bind," describes a fundamental principle of Roman law where laws apply equally to all citizens?',
        answer: 'Obligation/Obligatio',
    },
    {
        question:
            'Sharing its name with a popular Italian dessert, what ancient Roman road, known for its extensive network, was first built in 312 BC and connected Rome to Capua?',
        answer: 'Via Appia',
    },
    {
        question:
            'This famous Roman structure, which was built for gladiatorial contests, is also a modern stadium in the NFL. What is the name of this structure?',
        answer: 'Colosseum',
    },
];

async function main() {
    console.log(
        '🔍 Evaluating Potentially Problematic Questions...\n',
    );
    console.log('='.repeat(80) + '\n');

    const evaluation = await evaluateQuestions(
        badQuestions,
        evaluatorModel,
    );

    console.log('📊 Evaluation Results:\n');
    evaluation.evaluations.forEach((result, index) => {
        console.log(`Question ${index + 1}:`);
        console.log(
            `  Grade: ${result.score} (${result.numericScore.toFixed(2)})`,
        );
        console.log(
            `  Question: ${badQuestions[index].question.substring(0, 100)}...`,
        );
        console.log(`  Answer: ${badQuestions[index].answer}`);
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

main().catch((error) => {
    console.error('❌ Error:');
    console.error(error);
    process.exit(1);
});
