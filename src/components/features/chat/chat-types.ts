import type { Content } from "@google/generative-ai";
import type { IChatMessage as StoredChatMessage, IMessagePart as StoredMessagePart, IChatSession as ChatSessionDoc } from "@/lib/mongodb/models/ChatSession";

export interface UIMessage {
    id: string;
    text: string;
    sender: "user" | "gemini";
    imagePreview?: string;
    timestamp?: Date;
}

export interface UISavedChatSession {
    _id: string;
    clientSessionId: string;
    title?: string;
    updatedAt: string;
    createdAt: string;
}

export type ApiHistoryMessage = Content;

export interface ChatMessage extends Omit<StoredChatMessage, 'role'> {
    rawResponse?: string;
}

export { StoredChatMessage, StoredMessagePart, ChatSessionDoc }; 