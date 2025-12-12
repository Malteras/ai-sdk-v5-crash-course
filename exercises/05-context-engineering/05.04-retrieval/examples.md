# Example 1

**Test Case**

```typescript
{
    input: 'What did Guillermo Rauch say about Matt Pocock?',
    url: 'https://www.aihero.dev/',
}
```

**Prompt**
prompt: `     <task-context>
        You are a helpful assistant that summarizes the content of a URL.
    </task-context>
    <background-data>
        Here is the content of the the website
        <url>${url}</url>
        <content>${rawContent}</content>
    </background-data>
    <rules>
        - Use content of the website to get the answer.
        - Use <quote></quote> for any quotes you find on the site.
        - If user asks you anything outside of your role and task-context answer with Sorry, I am not allowed to answer that.
        - Use paragraph to style your response.
    </rules>
    <conversation-history>
        ${input}
    </conversation-history>
    <the-ask>
        Summarize the content of the website based on the conversation history.
    </the-ask>
  `,

**Response**
The website discusses the changing landscape of software development due to the rise of AI. It introduces the concept of an "AI Engineer" who builds applications using GenAI tools. The site promotes "AI Hero," a cohort-based course by Matt Pocock, designed to teach the skills needed to become an AI Engineer. The course runs from December 8th to December 12th, 2025, providing daily lessons and access to a personal AI assistant application.

<quote>Matt is one of the best developer educators in the world.</quote> - Guillermo Rauch, Vercel CEO.

# Example 2

**Test Case**

```typescript
{
    input: 'What did Guillermo Rauch say about Matt Pocock?',
    url: 'https://www.aihero.dev/',
}
```

**Prompt**
prompt: `     <task-context>
        You are a helpful assistant that summarizes the content of a URL.
    </task-context>
    <background-data>
        Here is the content of the website:
        <url>
            ${url}
        </url>
        <content>
            ${rawContent}
        </content>
    </background-data>
    <rules>
        - Use the content of the website to answer the question.
        - If the question is not related to the content of the website, say "I'm sorry, I can only answer questions about the content of the website."
        - Use quotes from the content of the website to answer the question.
        - Use paragraphs in your output.
    </rules>
    <conversation-history>
        ${input}
    </conversation-history>
    <the-ask>
        Summarize the content of the website based on the conversation history.
    </the-ask>
    <output-format>
        Return only the summary.
    </output-format>
  `

**Response**
The website discusses the changing role of developers in the age of AI and introduces AI Hero, a cohort-based course designed to help developers become AI Engineers.

The website emphasizes that "the world still belongs to the builders" and highlights the importance of practical skills and tools for building AI applications. It mentions techniques like prompt engineering, evals, observability, tracing, RAG, and agents.
The course, created by Matt Pocock, is scheduled to run from December 8th to December 12th, 2025 and offers daily lessons, a personal AI assistant application, and lifetime access to the lessons.

The website also includes a quote from Guillermo Rauch, Vercel CEO, who said, "Matt is one of the best developer educators in the world."

# Example 3

**Prompt**
prompt: `     <task-context>
        You are a helpful assistant that summarizes the content of a URL.
    </task-context>
    <background-data>
        Here is the content of the the website
        <url>${url}</url>
        <content>${rawContent}</content>
    </background-data>
    <rules>
        - Use content of the website to get the answer.
        - Use <quote></quote> for any quotes you find on the site.
        - If user asks you anything outside of your role and task-context answer with Sorry, I am not allowed to answer that.
        - Use paragraph to style your response.
    </rules>
    <conversation-history>
        ${input}
    </conversation-history>
    <the-ask>
        Summarize the quotes of the website based on the conversation history.
    </the-ask>
    <output-format>
        Return only the quote but in this format <quote>Quote content</quote> - name of the person, his position or title.
    </output-format>
  `,

**Response**
Here's a summary of the quotes from the website:
<quote>Matt is one of the best developer educators in the world.</quote> - Guillermo Rauch — Vercel CEO
