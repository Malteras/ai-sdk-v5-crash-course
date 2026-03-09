# AI SDK Reference Guide

A comprehensive reference for every AI SDK concept used in this course, with examples pulled directly from the exercises.

---

## Table of Contents

- [generateText](#generatetext)
- [streamText](#streamtext)
- [generateObject](#generateobject)
- [streamObject](#streamobject)
- [useChat (Client)](#usechat-client)
- [UI Message Stream Protocol](#ui-message-stream-protocol)
- [convertToModelMessages](#converttomessages)
- [Tools](#tools)
- [MCP (Model Context Protocol)](#mcp-model-context-protocol)
- [Message Metadata & Custom Data Parts](#message-metadata--custom-data-parts)
- [Error Handling](#error-handling)
- [Telemetry](#telemetry)
- [Common Patterns & Tips](#common-patterns--tips)

---

## generateText

**What it does:** Makes a **non-streaming** LLM call. Sends the prompt, waits for the full response, then returns it.

**When to use:**
- Summarizing a document before passing the summary to another LLM call
- Extracting key data from user input (e.g., parsing an address, detecting language)
- Pre-processing steps in a pipeline — translate input, then respond in another call
- Generating embeddings prompts, search queries, or tool arguments before executing them
- Evaluation / scoring (e.g., LLM-as-judge grading another model's output)
- Any time you need the **complete result** before taking the next step

**When NOT to use:**
- Chat responses — users expect to see text appear in real-time
- Long responses — the user stares at a blank screen until it's done
- Any user-facing output where perceived speed matters

**Basic usage:**

```typescript
const result = await generateText({
    model: google('gemini-2.0-flash'),
    prompt: 'What is the capital of France?',
});

console.log(result.text);  // "Paris"
console.log(result.usage); // { promptTokens: 12, completionTokens: 3 }
```

**With system prompt and messages:**

```typescript
const result = await generateText({
    model: google('gemini-2.0-flash-lite'),
    system: 'Respond with ONLY "1" (safe) or "0" (unsafe)',
    messages: modelMessages,
});
```

**What it returns:**
- `result.text` — the full generated text
- `result.usage` — token counts (prompt + completion)

**Used in:**
- [Generating text exercise](exercises/01-ai-sdk-basics/01.04-generating-text/solution/main.ts) — basic usage
- [Guardrails](exercises/09-advanced-patterns/09.01-guardrails/solution/api/chat.ts) — safety classification before responding
- [Model router](exercises/09-advanced-patterns/09.02-model-router/solution/api/chat.ts) — classifying query complexity
- [LLM-as-judge eval](exercises/06-evals/06.03-llm-as-a-judge-eval/solution/evals/attribution-eval.ts) — structured evaluation with schema

### Tip: Always `.trim()` the result

LLMs often return extra whitespace or newlines. When comparing to exact strings:

```typescript
// BAD — might fail because result is "\n0\n"
if (result.text === '0') { ... }

// GOOD
if (result.text.trim() === '0') { ... }
```

---

## streamText

**What it does:** Makes a **streaming** LLM call. Tokens are sent to the client as they're generated, so the user sees the response appear word by word.

**When to use:**
- Chat responses — always stream for better UX
- Any user-facing response where perceived latency matters
- Tool-calling agent loops

**When NOT to use:**
- When you need the complete result before proceeding (use `generateText`)
- Classification or routing decisions

**Basic usage (server script):**

```typescript
const result = streamText({
    model: google('gemini-2.0-flash'),
    prompt: 'Explain quantum computing',
});

for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
}
```

`result.textStream` is an **async iterable** — it yields text chunks one at a time as the model generates them. The `for await...of` loop processes each chunk as it arrives. We use `process.stdout.write(chunk)` instead of `console.log(chunk)` because `console.log` adds a newline after each chunk, which would break words apart. With `write`, the chunks flow together naturally: `"Quan"` → `"tum comp"` → `"uting is"` → `"..."`.

**In an API route (most common):**

```typescript
const result = streamText({
    model: google('gemini-2.0-flash'),
    messages: modelMessages,
});

return result.toUIMessageStreamResponse();
```

`toUIMessageStreamResponse()` is a convenience method that does two things in one call:
1. Converts the raw model stream into the **UI message stream protocol** (the `text-start`, `text-delta`, `text-end` events the frontend expects)
2. Wraps it in an HTTP `Response` object you can return from your API route

**With `toUIMessageStreamResponse()` (simple — no custom logic needed):**

```typescript
// ✅ One-liner. Use this when you just need to stream a response and nothing else.
export const POST = async (req: Request): Promise<Response> => {
    const { messages } = await req.json();
    const modelMessages = convertToModelMessages(messages);

    return streamText({
        model: google('gemini-2.0-flash'),
        messages: modelMessages,
    }).toUIMessageStreamResponse();
};
```

**Without `toUIMessageStreamResponse()` (manual — when you need custom logic):**

```typescript
// ✅ Use this when you need to: add guardrails, route models, write custom data, etc.
export const POST = async (req: Request): Promise<Response> => {
    const { messages } = await req.json();
    const modelMessages = convertToModelMessages(messages);

    // Step 1: Create a stream you control
    const stream = createUIMessageStream({
        execute: async ({ writer }) => {
            // You can do stuff BEFORE streaming (guardrails, routing, etc.)
            const guardrail = await generateText({ model: BASIC_MODEL, messages: modelMessages, system: '...' });

            if (guardrail.text.trim() === '0') {
                // Manually write a rejection — no AI model involved
                const id = crypto.randomUUID();
                writer.write({ type: 'text-start', id });
                writer.write({ type: 'text-delta', id, delta: "Can't process this request." });
                writer.write({ type: 'text-end', id });
                return;
            }

            // Merge the actual AI stream
            const result = streamText({ model: ADVANCED_MODEL, messages: modelMessages });
            writer.merge(result.toUIMessageStream());

            // You can do stuff AFTER streaming too
            await result.consumeStream();
            writer.write({ type: 'data-suggestion', data: 'Ask me more!', id: crypto.randomUUID() });
        },
    });

    // Step 2: Wrap the stream in an HTTP Response yourself
    return createUIMessageStreamResponse({ stream });
};
```

**Summary:**

| Approach | Lines of code | Use when |
|---|---|---|
| `toUIMessageStreamResponse()` | ~5 | Simple chat, no pre/post processing |
| `createUIMessageStream()` + `createUIMessageStreamResponse()` | ~20+ | Guardrails, model routing, custom data, multiple streams |

**With tools and agent loop:**

```typescript
const result = streamText({
    model: google('gemini-2.0-flash'),
    messages: modelMessages,
    system: 'You are a file manager assistant.',
    tools: myTools,
    stopWhen: [stepCountIs(5)],
});
```

**What it returns:**
- `result.textStream` — async iterable of text chunks
- `result.text` — promise resolving to the full text (after stream completes)
- `result.toUIMessageStream()` — converts to UI stream format
- `result.toUIMessageStreamResponse()` — converts to HTTP Response directly
- `result.consumeStream()` — ensures the stream is fully consumed

**Key difference from `generateText`:**

| | `generateText` | `streamText` |
|---|---|---|
| Returns | Complete text at once | Tokens as they arrive |
| Blocking | Yes — `await` until done | No — starts immediately |
| Use for | Gates, classification | User-facing responses |

**Used in:**
- [Stream text to UI](exercises/01-ai-sdk-basics/01.07-stream-text-to-ui/solution/api/chat.ts) — basic chat streaming
- [Tool calling](exercises/03-agents/03.01-tool-calling/solution/api/chat.ts) — agentic loop with tools
- [Custom loops](exercises/08-agents-and-workflows/08.03-creating-your-own-loop/solution/api/chat.ts) — manual while-loop with multiple streamText calls
- [Comparing outputs](exercises/09-advanced-patterns/09.03-comparing-multiple-outputs/solution/api/chat.ts) — running multiple models in parallel

---

## generateObject

**What it does:** Generates a **structured object** from the LLM, validated against a Zod schema. Non-streaming — waits for the complete object.

**When to use:**
- When you need structured data (JSON) not free text
- Evaluation scoring, data extraction, classification with structured output

**Usage:**

```typescript
import { z } from 'zod';

const result = await generateObject({
    model: google('gemini-2.0-flash'),
    schema: z.object({
        score: z.number().min(0).max(1),
        reasoning: z.string(),
    }),
    messages: [...],
});

console.log(result.object.score);     // 0.85
console.log(result.object.reasoning); // "The answer is mostly correct..."
```

**Used in:**
- [LLM-as-judge eval](exercises/06-evals/06.03-llm-as-a-judge-eval/solution/evals/attribution-eval.ts) — scoring with structured output

---

## streamObject

**What it does:** Streams a **structured object** progressively. The object is built up piece by piece as the LLM generates tokens.

**When to use:**
- When you want to show partial structured results as they arrive (e.g., a form filling in)
- Research workflows — streaming queries/plans to the frontend
- When the object is large and you don't want to wait for the full thing

**Usage:**

```typescript
const result = streamObject({
    model: google('gemini-2.0-flash'),
    schema: z.object({
        queries: z.array(z.string()),
        plan: z.string(),
    }),
    prompt: 'Generate 3 search queries about quantum computing',
});

// Stream partial results
for await (const partial of result.partialObjectStream) {
    console.log(partial.queries);
}

// Or get the final object
const final = await result.object;
```

`partialObjectStream` is an async iterable that yields the object **as it's being built**. Each iteration gives you the object so far, with more fields filled in:

```
Iteration 1: { queries: undefined, plan: undefined }
Iteration 2: { queries: ["quantum"], plan: undefined }
Iteration 3: { queries: ["quantum", "quantum computing basics"], plan: undefined }
Iteration 4: { queries: ["quantum", "quantum computing basics", "qubit explained"], plan: "First research..." }
Iteration 5: { queries: ["quantum", "quantum computing basics", "qubit explained"], plan: "First research the basics, then..." }
```

This is powerful for UX — you can show a list growing in real-time, or a form filling in field by field. The final `await result.object` gives you the complete, validated object after the stream finishes.

**Used in:**
- [Streaming objects](exercises/01-ai-sdk-basics/01.10-streaming-objects/solution/) — basic usage
- [Breaking loop early](exercises/08-agents-and-workflows/08.04-breaking-the-loop-early/solution/api/chat.ts) — checking if work is "good enough"
- [Research workflow](exercises/09-advanced-patterns/09.04-research-workflow/solution/api/chat.ts) — streaming search queries and plans

---

## useChat (Client)

**What it does:** React hook that manages the entire chat lifecycle on the frontend — sending messages, receiving streams, and maintaining message history.

**Usage:**

```tsx
import { useChat } from '@ai-sdk/react';

function Chat() {
    const { messages, sendMessage } = useChat();

    return (
        <div>
            {messages.map((msg) => (
                <div key={msg.id}>
                    {msg.parts.map((part) => {
                        if (part.type === 'text') return <p>{part.text}</p>;
                    })}
                </div>
            ))}
            <button onClick={() => sendMessage({ text: 'Hello!' })}>
                Send
            </button>
        </div>
    );
}
```

**With custom message types:**

```tsx
const { messages, sendMessage } = useChat<MyMessage>();
```

The generic `<MyMessage>` tells TypeScript what shape your messages have. For example, if your server adds `model` metadata:

```typescript
// Shared type (used by both server and client)
type MyMessage = UIMessage<{ model: 'advanced' | 'basic' }>;

// Client — now message.metadata.model is typed
const { messages, sendMessage } = useChat<MyMessage>();
messages[0].metadata.model; // ✅ TypeScript knows this is 'advanced' | 'basic'
```

**What `useChat` handles automatically:**

1. **Sends POST to `/api/chat`** — When you call `sendMessage({ text: 'Hello' })`, it adds the user message to the array, then sends the full `messages` history to your API
2. **Parses the streaming response** — Reads the UI message stream protocol events (`text-start`, `text-delta`, `text-end`) from the server
3. **Updates `messages` in real-time** — As `text-delta` events arrive, it appends text to the current message's parts, triggering React re-renders so the user sees text appearing
4. **Manages IDs and roles** — Automatically assigns unique IDs to messages and sets `role: 'user'` or `role: 'assistant'`

**Full example with all the pieces:**

```tsx
const { messages, sendMessage } = useChat();

// sendMessage triggers this flow:
// 1. Adds { role: 'user', parts: [{ type: 'text', text: 'Hello' }] } to messages
// 2. POST /api/chat with body: { messages: [...allMessages] }
// 3. Server streams back text-delta events
// 4. useChat creates { role: 'assistant', parts: [{ type: 'text', text: '' }] }
// 5. Each text-delta appends to the text: '' → 'Hi' → 'Hi there' → 'Hi there!'
// 6. React re-renders on each update

// Render messages
messages.map((msg) => (
    <div key={msg.id}>
        <strong>{msg.role}:</strong>
        {msg.parts.map((part, i) => {
            if (part.type === 'text') return <span key={i}>{part.text}</span>;
            if (part.type === 'tool-invocation') return <ToolCard key={i} tool={part} />;
            if (part.type === 'data-suggestion') return <Suggestion key={i} text={part.data} />;
        })}
    </div>
));
```

**Used in:**
- [Stream text to UI (client)](exercises/01-ai-sdk-basics/01.07-stream-text-to-ui/solution/client/root.tsx)
- [Showing tools in frontend](exercises/03-agents/03.03-showing-tools-in-the-frontend/solution/client/root.tsx)

---

## UI Message Stream Protocol

The low-level protocol for sending messages from server to client. You rarely use this directly — `streamText().toUIMessageStream()` handles it. But for custom scenarios (like rejection messages), you write manually.

### createUIMessageStream

Creates a stream you can write to manually.

```typescript
const stream = createUIMessageStream<MyMessage>({
    execute: async ({ writer }) => {
        // Manual writing
        writer.write({ type: 'text-start', id: 'abc' });
        writer.write({ type: 'text-delta', id: 'abc', delta: 'Hello!' });
        writer.write({ type: 'text-end', id: 'abc' });

        // Or merge an AI stream
        const result = streamText({ model, messages });
        writer.merge(result.toUIMessageStream());
    },
});
```

**`writer.merge()`** pipes an entire stream into the writer. Instead of manually writing `text-start`, `text-delta`, `text-end` events yourself, `merge` takes a UI message stream (from `toUIMessageStream()`) and forwards all its events through the writer automatically.

This is essential when you want to **combine** manual writes with AI-generated streams. For example, in the [custom data parts exercise](exercises/07-streaming/07.01-custom-data-parts/solution/api/chat.ts):

```typescript
execute: async ({ writer }) => {
    // 1. Merge the main AI response
    const result = streamText({ model, messages });
    writer.merge(result.toUIMessageStream());

    // 2. Wait for it to finish
    await result.consumeStream();

    // 3. Then write custom data parts manually
    writer.write({
        type: 'data-suggestion',
        data: 'Follow-up question here',
        id: crypto.randomUUID(),
    });
}
```

Without `merge`, you'd have to manually iterate the stream and write each event yourself.

### Text part events

| Event | Purpose |
|---|---|
| `text-start` | Opens a new text part (needs unique `id`) |
| `text-delta` | Sends a chunk of text (`delta` field) |
| `text-end` | Closes the text part |

### createUIMessageStreamResponse

Wraps a stream into an HTTP Response:

```typescript
return createUIMessageStreamResponse({ stream });
```

### toUIMessageStreamResponse (shorthand)

When you don't need manual stream control:

```typescript
return streamText({ model, messages }).toUIMessageStreamResponse();
```

**Used in:**
- [Guardrails](exercises/09-advanced-patterns/09.01-guardrails/solution/api/chat.ts) — manual writing for rejection
- [Custom data parts](exercises/07-streaming/07.01-custom-data-parts/solution/api/chat.ts) — writing custom data alongside AI response
- [Model router](exercises/09-advanced-patterns/09.02-model-router/solution/api/chat.ts) — merging streams with metadata

---

## convertToModelMessages

**What it does:** Converts `UIMessage[]` (frontend format) to `ModelMessage[]` (what the model expects).

The frontend and the model speak different "languages":

```typescript
// UIMessage (what the frontend sends) — rich format with parts, metadata, IDs
{
    id: "msg_abc123",
    role: "user",
    parts: [
        { type: "text", text: "What's the weather?" }
    ],
    metadata: { model: "advanced" }
}

// ModelMessage (what the LLM expects) — simple format with role and content
{
    role: "user",
    content: "What's the weather?"
}
```

`convertToModelMessages` bridges this gap:

```typescript
// Frontend sends UIMessage[]
const messages: UIMessage[] = body.messages;

// Convert to what the model understands
const modelMessages: ModelMessage[] = convertToModelMessages(messages);

// Now you can pass to streamText/generateText
const result = streamText({
    model: google('gemini-2.0-flash'),
    messages: modelMessages, // ✅ ModelMessage[]
});
```

**Always call this before passing messages to `streamText` or `generateText`.** Passing raw `UIMessage[]` directly will fail — the model doesn't know what to do with `parts`, `metadata`, or message IDs.

---

## Tools

Tools let the model call functions. The model decides when to call a tool, what arguments to pass, and uses the result in its response.

### Defining tools

```typescript
import { tool } from 'ai';
import { z } from 'zod';

const tools = {
    getWeather: tool({
        description: 'Get the current weather for a city',
        inputSchema: z.object({
            city: z.string().describe('City name'),
        }),
        execute: async ({ city }) => {
            const weather = await fetchWeather(city);
            return { temperature: weather.temp, condition: weather.condition };
        },
    }),
};
```

**Each property explained:**

| Property | What it does |
|---|---|
| `description` | Tells the model **what this tool does**. The model reads this to decide when to call it. Be specific — "Get current weather for a city" is better than "Weather tool" |
| `inputSchema` | A **Zod schema** defining what arguments the tool accepts. The model generates JSON matching this schema. `.describe()` on fields gives the model hints about what to provide |
| `execute` | The **actual function** that runs when the model calls the tool. Receives the validated, typed arguments. Returns data the model will use in its response |

**The flow when the model calls a tool:**

```
Model sees: "What's the weather in Tokyo?"
  → Model decides to call getWeather
  → Model generates: { city: "Tokyo" }
  → Zod validates the input ✅
  → execute({ city: "Tokyo" }) runs
  → Returns { temperature: 15, condition: "cloudy" }
  → Model receives the result
  → Model generates: "The weather in Tokyo is 15°C and cloudy."
```

The key `getWeather` in the `tools` object is the **tool name** — this is what the model references when it decides to call the tool.

### Using tools with streamText

```typescript
const result = streamText({
    model: google('gemini-2.0-flash'),
    messages: modelMessages,
    tools,
    stopWhen: [stepCountIs(5)], // Prevent infinite loops
});
```

The model will automatically:
1. Decide if it needs to call a tool
2. Generate the arguments
3. Execute the function
4. Use the result to continue generating

### stopWhen / stepCountIs

Limits how many tool-calling iterations the model can do:

```typescript
import { stepCountIs } from 'ai';

stopWhen: [stepCountIs(5)] // Stop after 5 steps max
```

### Type-safe tools on the frontend

```typescript
import { type InferUITools } from 'ai';

type MyMessage = UIMessage<never, never, InferUITools<typeof tools>>;
```

**Used in:**
- [Tool calling](exercises/03-agents/03.01-tool-calling/solution/api/chat.ts)
- [Showing tools in frontend](exercises/03-agents/03.03-showing-tools-in-the-frontend/solution/api/chat.ts)

---

## MCP (Model Context Protocol)

Connects to external tool servers via the MCP protocol.

```typescript
import { experimental_createMCPClient } from '@ai-sdk/mcp';
import { Experimental_StdioMCPTransport } from '@ai-sdk/mcp/mcp-stdio';

const mcpClient = await experimental_createMCPClient({
    transport: new Experimental_StdioMCPTransport({
        command: 'docker',
        args: ['run', '-i', 'ghcr.io/github/github-mcp-server'],
        env: { GITHUB_PERSONAL_ACCESS_TOKEN: '...' },
    }),
});

const result = streamText({
    model: google('gemini-2.0-flash'),
    messages: modelMessages,
    tools: await mcpClient.tools(),
    onFinish: async () => await mcpClient.close(),
});
```

**Important:** Always close the client in `onFinish` to clean up the subprocess.

**Used in:**
- [MCP via stdio](exercises/03-agents/03.04-mcp-via-stdio/solution/api/chat.ts)

---

## Message Metadata & Custom Data Parts

### Message Metadata

Attach extra info to messages (e.g., which model generated it):

```typescript
writer.merge(
    streamTextResult.toUIMessageStream({
        messageMetadata: () => ({
            model: 'advanced',
        }),
    }),
);
```

Access on frontend: `message.metadata.model`

### Custom Data Parts

Send arbitrary structured data alongside the AI response.

**How the naming convention works:**

The type name in `UIMessage` and the stream event type are connected by convention:

```typescript
// Step 1: Define the type — the key name is "suggestion"
type MyMessage = UIMessage<never, { suggestion: string }>;
//                                   ^^^^^^^^^^
//                                   This key name...

// Step 2: Write data — prefix with "data-" to create the event type
writer.write({
    type: 'data-suggestion',  // ...becomes "data-suggestion" here
//         ^^^^^^^^^^^^^^^^
//         "data-" + the key name from your type
    data: 'Try asking about...',
    id: crypto.randomUUID(),
});
```

Yes — the `data-` prefix is **automatically derived** from the key in your type definition. If your type has `{ suggestion: string }`, the stream event type must be `data-suggestion`. If you had `{ sources: Source[] }`, you'd write `data-sources`.

**Access on the frontend:**

```tsx
// The part type matches the stream event type
message.parts.map((part) => {
    if (part.type === 'data-suggestion') {
        return <div>{part.data}</div>; // part.data is typed as string
    }
});
```

**Full real-world example** from [custom data parts exercise](exercises/07-streaming/07.01-custom-data-parts/solution/api/chat.ts):

```typescript
// After the main response finishes, stream a follow-up suggestion
const dataPartId = crypto.randomUUID();
let fullSuggestion = '';

for await (const chunk of followupResult.textStream) {
    fullSuggestion += chunk;
    // Send the growing suggestion to the frontend in real-time
    writer.write({
        id: dataPartId,           // Same ID — updates the same part
        type: 'data-suggestion',
        data: fullSuggestion,     // Each write replaces the previous data
    });
}
```

By using the **same `id`** on each write, the frontend updates the existing part instead of creating new ones — so the suggestion appears to "type" in real-time.

**Used in:**
- [Custom data parts](exercises/07-streaming/07.01-custom-data-parts/solution/api/chat.ts)
- [Message metadata](exercises/07-streaming/07.03-message-metadata/solution/api/chat.ts)
- [Model router](exercises/09-advanced-patterns/09.02-model-router/solution/api/chat.ts)

---

## Error Handling

### RetryError

Custom error for signaling retryable failures:

```typescript
import { RetryError } from 'ai';

const stream = createUIMessageStream({
    execute: async ({ writer }) => { ... },
    onError: (error) => {
        if (RetryError.isInstance(error)) {
            return error.message;
        }
        return 'An unexpected error occurred';
    },
});
```

**Used in:**
- [Error handling](exercises/07-streaming/07.04-error-handling/solution/api/chat.ts)

---

## Telemetry

Integrate with observability tools like Langfuse:

```typescript
const result = streamText({
    model: google('gemini-2.0-flash'),
    messages: modelMessages,
    experimental_telemetry: {
        isEnabled: true,
        functionId: 'chat-response',
        metadata: { traceId: trace.id },
    },
});
```

**Used in:**
- [Langfuse basics](exercises/06-evals/06.07-langfuse-basics/solution/api/chat.ts)

---

## Common Patterns & Tips

### The standard API route pattern

Almost every exercise follows this structure:

```typescript
export const POST = async (req: Request): Promise<Response> => {
    const { messages } = await req.json();
    const modelMessages = convertToModelMessages(messages);

    const result = streamText({
        model: google('gemini-2.0-flash'),
        messages: modelMessages,
    });

    return result.toUIMessageStreamResponse();
};
```

### When to use `createUIMessageStream` vs `toUIMessageStreamResponse`

- **`toUIMessageStreamResponse()`** — Simple cases. One streamText call, straight to response.
- **`createUIMessageStream()`** — When you need control: multiple streams, manual writes, pre-processing (guardrails, routing), custom data parts.

### Model selection

| Model | Use for |
|---|---|
| `gemini-2.0-flash` | Main responses, complex tasks |
| `gemini-2.0-flash-lite` | Classification, routing, guardrails |
| `gemini-2.5-flash` | Latest model, most capable |

### Running multiple models in parallel

```typescript
const [result1, result2] = await Promise.all([
    streamText({ model: model1, messages }),
    streamText({ model: model2, messages }),
]);
```

**Used in:** [Comparing outputs](exercises/09-advanced-patterns/09.03-comparing-multiple-outputs/solution/api/chat.ts)
