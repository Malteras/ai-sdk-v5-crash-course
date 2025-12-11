import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

const INPUT = `Do some research on induction hobs and how I can replace a 100cm wide AGA cooker with an induction range cooker. Which is the cheapest, which is the best?`;

// NOTE: A good output would be: "Induction hobs vs AGA cookers"

const result = await streamText({
    model: google('gemini-2.0-flash-lite'),
    // TODO: Rewrite this prompt using the Anthropic template from
    // the previous exercise.
    // You will NOT need all of the sections from the template.
    prompt: `
    <task-context>
        You will be acting like an experienced blogger with a lot of SEO knowledge.
        Your goal is to make a catchy title that will bring potential users to our site. Basically, we are doing here content marketing.
    </task-context>
    <tone-context>
        Be creative, be funny, make a rhyme or make a pun. Just don't be rude.
    </tone-context>
    <examples>
        You can find some ideas on this [This is an external link to databox.com](link https://databox.com/blog-title-examples).
    </examples>
    <the-ask>
        Here is user input:
        <question>
            ${INPUT}
        </question>
        Your goal is to generate A SINGLE TITLE FOR TOPIC - ${INPUT}.
    </the-ask>
    <rules>
        Do not write anything else except the title.
    </rules>
    <output-formatting>
       **Title**
    </output-formatting
  `,
});

for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
}
