import { google } from '@ai-sdk/google';
import { evaluateQuestion } from './question-quality-eval.js';

const evaluatorModel = google('gemini-2.5-pro');

async function main() {
    console.log('🔍 Testing Triumvirate Question Evaluation...\n');
    console.log('='.repeat(80) + '\n');

    const question = `From the Latin for 'of three men', the term denotes a regime dominated by three powerful individuals. Which informal alliance of 60 BCE saw Julius Caesar join forces with Pompey the Great and Marcus Licinius Crassus, arguably the wealthiest man in Roman history?`;

    const answer = 'First Triumvirate';

    const result = await evaluateQuestion(question, answer, evaluatorModel);

    console.log('Question:', question);
    console.log('\nAnswer:', answer);
    console.log('\n' + '='.repeat(80));
    console.log(`\nGrade: ${result.score} (${result.numericScore.toFixed(2)})`);
    console.log(`\nFeedback: ${result.feedback}`);
    console.log('\n' + '='.repeat(80));
}

main().catch((error) => {
    console.error('❌ Error:');
    console.error(error);
    process.exit(1);
});
