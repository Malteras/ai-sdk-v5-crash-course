# Quiz Question Generator with Quality Evaluation

This folder contains a complete quiz question generation and evaluation system using LLM-as-a-judge methodology.

## Files

- **`quiz-categories.ts`** - Comprehensive category structure covering 8 major domains (Culture, Entertainment, History, Lifestyle, Media, Sciences, Sport & Games, World)

- **`question-maker-prompt.ts`** - Prompt template for generating high-quality trivia questions with:
  - Task context and style guide
  - 10 comprehensive rules for question quality
  - Exemplar questions from competitive quiz circuits
  - Support for both topic-specific and general questions

- **`generate-questions.ts`** - Function to generate questions using any AI model
  - Accepts dynamic `LanguageModel` parameter
  - Configurable number of questions and optional topic
  - Can be run directly: `npx tsx quiz-prompt-template/generate-questions.ts`

- **`question-quality-eval.ts`** - LLM-as-a-judge evaluation system that checks:
  - Factual accuracy
  - No answer revealed in question
  - Context relevance (no false connections)
  - Clear, unambiguous answers
  - Avoidance of obscurity
  - No fictional facts or misleading information

- **`test-with-eval.ts`** - Complete pipeline: generate + evaluate questions
  - Run with: `npx tsx quiz-prompt-template/test-with-eval.ts`

- **`test-bad-questions.ts`** - Test the evaluator with known problematic questions

## Usage

### Generate Questions

\`\`\`typescript
import { generateQuestions } from './quiz-prompt-template/generate-questions.js';
import { anthropic } from '@ai-sdk/anthropic';

const questions = await generateQuestions({
    model: anthropic('claude-sonnet-4-5'),
    numberOfQuestions: 5,
    topic: 'Ancient Rome' // Optional
});
\`\`\`

### Evaluate Questions

\`\`\`typescript
import { evaluateQuestions } from './quiz-prompt-template/question-quality-eval.js';
import { google } from '@ai-sdk/google';

const evaluation = await evaluateQuestions(
    [
        { question: '...', answer: '...' },
        // more questions...
    ],
    google('gemini-2.0-flash')
);

console.log(`Average Score: ${evaluation.averageScore}`);
console.log(`Pass Rate: ${evaluation.passRate * 100}%`);
\`\`\`

## Grading Scale

- **A (1.0)**: Excellent - Factually accurate, no answer revealed, relevant context, clear answer
- **B (0.67)**: Good - Minor issues with context or slight ambiguity, but factually accurate
- **C (0.33)**: Poor - Contains factual errors, false connections, or reveals the answer
- **D (0.0)**: Failed - Multiple serious issues

## Running Tests

\`\`\`bash
# Generate and evaluate questions
npx tsx quiz-prompt-template/test-with-eval.ts

# Test with known bad questions
npx tsx quiz-prompt-template/test-bad-questions.ts

# Just generate questions
npx tsx quiz-prompt-template/generate-questions.ts
\`\`\`

## Example Evaluation Results

From testing problematic questions:
- Question with fictional "2025 documentary" reference: **Grade D** - Correctly identified as having false information
- Question claiming Colosseum is an NFL stadium: **Grade C** - Correctly identified factual error
- Well-formed question with accurate context: **Grade A** - Passed all checks
