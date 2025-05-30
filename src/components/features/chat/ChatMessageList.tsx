import React from 'react';
import Image from 'next/image';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { User, Sparkles, Loader2, MessageSquareText } from "lucide-react";
import type { UIMessage } from './chat-types';

interface ChatMessageListProps {
    messages: UIMessage[];
    isLoading: boolean;
    scrollAreaRef: React.RefObject<HTMLDivElement | null>;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({ messages, isLoading, scrollAreaRef }) => {
    const MessageContent = ({ msg }: { msg: UIMessage }) => (
        <Card
            className={`max-w-[75%] p-3 rounded-xl shadow ${msg.sender === "user"
                ? "bg-primary text-primary-foreground rounded-br-none"
                : "bg-background text-foreground rounded-bl-none"
                }`}
        >
            {msg.imagePreview && (
                <Image
                    src={msg.imagePreview}
                    alt="Aperçu utilisateur"
                    width={300}
                    height={192}
                    className="max-w-xs max-h-48 rounded-md mb-2 object-contain"
                />
            )}
            <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
            {msg.timestamp && (
                <p className="text-xs text-muted-foreground/70 mt-1 text-right">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            )}
        </Card>
    );

    const UserAvatar = () => (
        <Avatar className="h-8 w-8 bg-secondary text-secondary-foreground">
            <AvatarFallback><User size={18} /></AvatarFallback>
        </Avatar>
    );

    const GeminiAvatar = ({ isSpinning = false }: { isSpinning?: boolean }) => (
        <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
            <AvatarFallback>
                {isSpinning ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            </AvatarFallback>
        </Avatar>
    );

    const EmptyState = () => (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquareText size={48} className="mb-4" />
            <p>Commencez une nouvelle conversation.</p>
            <p className="text-sm">Posez une question ou joignez une image.</p>
        </div>
    );

    const LoadingSessionState = () => (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Loader2 size={48} className="mb-4 animate-spin" />
            <p>Chargement de la session...</p>
        </div>
    );

    const GeminiThinkingState = () => (
        <div className="flex items-center gap-2 justify-start mt-4">
            <GeminiAvatar isSpinning />
            <Card className="max-w-[75%] p-3 rounded-xl shadow bg-background text-foreground rounded-bl-none">
                <p className="text-sm italic">Gemini réfléchit...</p>
            </Card>
        </div>
    );

    return (
        <ScrollArea className="flex-grow min-h-0 p-4 border rounded-md mb-4 bg-muted/30" ref={scrollAreaRef}>
            <div className="space-y-4">
                {messages.length === 0 && !isLoading && <EmptyState />}
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex items-end gap-2 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                        {msg.sender === "gemini" && <GeminiAvatar />}
                        <MessageContent msg={msg} />
                        {msg.sender === "user" && <UserAvatar />}
                    </div>
                ))}
                {isLoading && messages.length === 0 && <LoadingSessionState />}
                {isLoading && messages.length > 0 && <GeminiThinkingState />}
            </div>
        </ScrollArea>
    );
}; 