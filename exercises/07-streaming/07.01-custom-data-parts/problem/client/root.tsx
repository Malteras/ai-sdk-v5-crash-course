import { useChat } from '@ai-sdk/react';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatInput, Message, Wrapper } from './components.tsx';
import './tailwind.css';
import type { MyMessage } from '../api/chat.ts';

const App = () => {
    const { messages, sendMessage } = useChat<MyMessage>({});

    const [input, setInput] = useState(``);

    // TODO: Get the data-suggestion part from the last message
    const latestSuggestion: string | undefined = messages
        .at(-1)
        ?.parts.find(
            (part) => part.type === 'data-suggestion',
        )?.data;

    return (
        <Wrapper>
            {messages.map((message) => (
                <Message
                    key={message.id}
                    role={message.role}
                    parts={message.parts}
                />
            ))}
            <ChatInput
                // NOTE: We are passing the suggestion to the ChatInput component
                // where we will display it as a button
                suggestion={
                    messages.length === 0
                        ? 'What is the capital of Czech Republic?'
                        : latestSuggestion
                }
                input={input}
                onChange={(text) => setInput(text)}
                onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage({
                        text: input,
                    });
                    setInput('');
                }}
            />
        </Wrapper>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
