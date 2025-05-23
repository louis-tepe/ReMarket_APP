import { v4 as uuidv4 } from 'uuid';
import type { UIMessage } from '@/components/features/chat/chat-types';

export const MAX_TITLE_LENGTH = 50;

export const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

export const createNewUIMessage = (text: string, sender: 'user' | 'gemini', imagePreview?: string): UIMessage => ({
    id: uuidv4(),
    text,
    sender,
    imagePreview,
    timestamp: new Date(),
});

export const generateChatTitle = (messages: { role: string, parts: { text?: string }[] }[]): string | undefined => {
    const firstUserMessage = messages.find(m => m.role === 'user' && m.parts[0]?.text);
    const firstUserMessageText = firstUserMessage?.parts[0]?.text;

    if (!firstUserMessageText) return undefined;

    return firstUserMessageText.length > MAX_TITLE_LENGTH
        ? `${firstUserMessageText.substring(0, MAX_TITLE_LENGTH)}...`
        : firstUserMessageText;
}; 