# Guardrails Pattern

A guardrail is a safety check that runs **before** the main AI response. It uses a fast, cheap LLM call to classify whether a user's message is safe to process. If it's not, the request is rejected without ever reaching the main model.

## File: `exercises/09-advanced-patterns/09.01-guardrails/solution/api/chat.ts`

---

## Step 1: Classify the User's Message with `generateText`

```typescript
const guardrailResult = await generateText({
    model: google('gemini-2.0-flash-lite'),
    system: GUARDRAIL_SYSTEM,
    messages: modelMessages,
});
```

`generateText` makes a **non-streaming** LLM call — it waits for the full response before continuing. This is perfect here because we need the complete classification result ("1" or "0") before deciding what to do next.

- **Uses the cheapest/fastest model** (`gemini-2.0-flash-lite`) — classification is a simple task, no need for a powerful model
- **Passes the full conversation** (`modelMessages`) — the guardrail analyzes the entire chat history, not just the last message, to catch multi-turn attacks (e.g., a user slowly escalating toward harmful content)
- **System prompt** returns just "1" (safe) or "0" (unsafe)

---

## Step 2: Block Unsafe Requests with Manual Stream Writing

```typescript
if (guardrailResult.text.trim() === '0') {
    const textPartId = crypto.randomUUID();

    writer.write({
        type: 'text-start',
        id: textPartId,
    });

    writer.write({
        type: 'text-delta',
        id: textPartId,
        delta: `We're sorry, but we can't process your request.`,
    });

    writer.write({
        type: 'text-end',
        id: textPartId,
    });

    return;
}
```

**Why `.text.trim()` ?** — LLMs often return extra whitespace or newlines around their output (e.g., `"\n0\n"` instead of `"0"`). Without `.trim()`, the comparison `=== '0'` would fail because `"\n0\n" !== "0"`. Always trim when comparing LLM output to exact strings.

When the guardrail blocks a request, we manually write a message to the stream using the **UI message stream protocol**:

1. **`text-start`** — Opens a new text part with a unique ID
2. **`text-delta`** — Sends the actual rejection text
3. **`text-end`** — Closes the text part

This is the low-level way to write to the stream. We use it here instead of `streamText` because we're writing a static message — there's no LLM involved in the rejection response.

The `return` exits early, so the main model is **never called** for unsafe requests.

---

## Step 3: Stream the Actual Response with `streamText`

```typescript
const streamTextResult = streamText({
    model: google('gemini-2.0-flash'),
    messages: modelMessages,
});

writer.merge(streamTextResult.toUIMessageStream());
```

If the guardrail passes (returns "1"), we proceed to generate the real response.

- **`streamText`** makes a **streaming** LLM call — tokens are sent to the client as they're generated, so the user sees the response appear word by word
- **Uses the more capable model** (`gemini-2.0-flash`) for the actual response
- **`toUIMessageStream()`** converts the raw model stream into the UI message stream format the frontend expects
- **`writer.merge()`** pipes that stream into the response — all the `text-start`, `text-delta`, `text-end` events are handled automatically

### `generateText` vs `streamText`

| | `generateText` | `streamText` |
|---|---|---|
| **Returns** | Complete text at once | Tokens as they're generated |
| **Use when** | You need the full result before continuing (classification, routing) | You want the user to see the response in real-time |
| **In this file** | Guardrail classification | Main chat response |

---

## The Guardrail System Prompt

The system prompt (`guardrail-prompt.ts`) is a detailed content safety classifier that:

- Returns **"1"** for safe queries, **"0"** for unsafe ones
- Checks for: illegal activities, harmful content, privacy violations, dangerous information, exploitation
- Analyzes **conversation context** — catches multi-turn attacks where earlier messages seem innocent but escalate
- Errs on the side of caution for edge cases

---

## Visual Flow

```
User sends message
       |
       v
generateText (flash-lite)
Classify: safe or unsafe?
       |
       +--- "0" (unsafe) --> Manually write rejection message --> Done
       |
       +--- "1" (safe) ---> streamText (flash)
                             Stream real response to user
```

---

## Key Learnings

1. **Use `generateText` for gates/checks** — When you need a yes/no answer before proceeding, use the non-streaming `generateText` so you can inspect the result immediately

2. **Use cheap models for classification** — The guardrail uses `flash-lite` because classifying "safe vs unsafe" is a simple task

3. **Manual stream writing** — You can write directly to the stream with `writer.write()` for static messages, bypassing `streamText` entirely

4. **Early return pattern** — Block unsafe requests before the main model is ever called, saving cost and latency

5. **Full conversation context matters** — Passing all messages to the guardrail catches multi-turn manipulation attempts
