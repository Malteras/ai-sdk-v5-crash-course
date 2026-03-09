# Model Router Pattern

A model router dynamically selects which AI model to use based on the complexity of the user's query. This saves costs by using cheaper models for simple tasks while reserving powerful models for complex ones.

## File: `exercises/09-advanced-patterns/09.02-model-router/problem/api/chat.ts`

---

## Step-by-Step Breakdown

### 1. Imports (lines 1-10)

```typescript
import { google } from '@ai-sdk/google';
import {
    convertToModelMessages,
    createUIMessageStream,
    createUIMessageStreamResponse,
    generateText,
    streamText,
    type ModelMessage,
    type UIMessage,
} from 'ai';
```

- **`google`** - Provider to create Google Gemini model instances
- **`convertToModelMessages`** - Converts UI messages to model-compatible format
- **`createUIMessageStream`** - Creates a stream for sending messages to the frontend
- **`generateText`** - Non-streaming LLM call (used for routing)
- **`streamText`** - Streaming LLM call (used for the actual response)

---

### 2. Model Configuration (lines 12-31)

```typescript
const ADVANCED_MODEL = google('gemini-2.0-flash');
const BASIC_MODEL = google('gemini-2.0-flash-lite');
const MODEL_ROUTER_SYSTEM_PROMPT = `You are a query classifier...`;
```

- **Two models**: A more capable one (`gemini-2.0-flash`) and a faster/cheaper one (`gemini-2.0-flash-lite`)
- **System prompt**: Instructions for the classifier to output only "advanced" or "basic"

#### System Prompt Details

The prompt tells the classifier:
- Respond with ONLY one word: "advanced" or "basic"
- Use "advanced" for: complex reasoning, code generation, technical explanations
- Use "basic" for: simple questions, casual conversation, factual lookups

---

### 3. Custom Message Type (lines 33-35)

```typescript
export type MyMessage = UIMessage<{
    model: 'advanced' | 'basic';
}>;
```

Extends `UIMessage` with custom metadata so each message knows which model generated it. The frontend can use this to display a badge like "Model: advanced".

---

### 4. API Handler (lines 37-99)

#### 4a. Parse Request (lines 38-43)

```typescript
const body = await req.json();
const messages: MyMessage[] = body.messages;
const modelMessages = convertToModelMessages(messages);
```

Gets chat history from the request and converts it to model format.

#### 4b. Create Stream (lines 45-94)

```typescript
const stream = createUIMessageStream<MyMessage>({
    execute: async ({ writer }) => { ... }
});
```

Creates a stream with an `execute` function that runs the AI logic.

#### 4c. Route the Query (lines 50-65)

```typescript
// Get only the last user message for classification
const lastUserMessage = modelMessages
    .filter((m) => m.role === 'user')
    .at(-1);

const modelRouterResult = await generateText({
    model: ADVANCED_MODEL,
    messages: lastUserMessage ? [lastUserMessage] : modelMessages,
    system: MODEL_ROUTER_SYSTEM_PROMPT,
});
```

**Key insight**: We only classify the **last user message**, not the full conversation. This prevents the router from being confused by earlier simple messages in the chat history.

#### 4d. Parse Router Result (lines 69-74)

```typescript
const modelSelected: 'advanced' | 'basic' =
    modelRouterResult.text
        .toLowerCase()
        .includes('advanced')
        ? 'advanced'
        : 'basic';
```

- Uses `.toLowerCase()` for case-insensitive matching
- Defaults to "basic" if "advanced" is not found

#### 4e. Generate Response (lines 76-82)

```typescript
const streamTextResult = streamText({
    model:
        modelSelected === 'advanced'
            ? ADVANCED_MODEL
            : BASIC_MODEL,
    messages: modelMessages,
});
```

Uses the selected model to generate the actual streamed response. Note that it passes the **full conversation** (`modelMessages`) for context, even though routing only used the last message.

#### 4f. Send to Frontend (lines 84-92)

```typescript
writer.merge(
    streamTextResult.toUIMessageStream({
        messageMetadata: () => ({
            model: modelSelected,
        }),
    }),
);
```

- Streams the response to the client
- Attaches metadata indicating which model was used
- Frontend can read `message.metadata.model` to display the model

#### 4g. Return Response (lines 96-98)

```typescript
return createUIMessageStreamResponse({ stream });
```

Wraps the stream in an HTTP response.

---

## Visual Flow

```
User sends message
       |
       v
Parse & convert to model messages
       |
       v
Extract last user message
       |
       v
Call LLM to classify --> "advanced" or "basic"
       |
       v
Select appropriate model
       |
       v
Stream response with that model
       |
       v
Attach metadata (which model was used)
       |
       v
Frontend displays response + model badge
```

---

## Key Learnings

1. **Use a cheap/fast model for routing** - The classification task is simple, so you can use the basic model (though we used advanced for better accuracy)

2. **Classify only the last message** - Using the full conversation can confuse the classifier

3. **Be explicit in your system prompt** - Tell the model to respond with "ONLY one word" to get clean output

4. **Add metadata for the frontend** - Use `messageMetadata` to pass information about which model was used

5. **Default to the cheaper option** - When in doubt, fall back to the basic model to save costs
