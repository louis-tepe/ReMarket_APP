import type { Content, Part } from "@google/generative-ai";
import type { ChatMessage as StoredChatMessage, MessagePart as StoredMessagePart, ChatSessionDoc } from "@/models/ChatSession";

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

export { StoredChatMessage, StoredMessagePart, ChatSessionDoc }; 