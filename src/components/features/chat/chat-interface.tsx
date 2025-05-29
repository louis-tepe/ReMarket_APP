"use client";

import React, { useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Toaster } from "sonner";

import { useChatLogic, useChatHistory } from './chat-hooks';
import { ChatHistoryPanel } from './ChatHistoryPanel';
import { ChatMessageList } from './ChatMessageList';
import { ChatInputForm } from './ChatInputForm';

const ChatInterface: React.FC = () => {
    const { status: authStatus } = useSession();
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const {
        chatSessions,
        isLoadingHistory,
        setChatSessions
    } = useChatHistory();

    const {
        messages,
        input,
        isLoading,
        imagePreview,
        selectedImage,
        currentChatTitle,
        useThinkingMode,
        fileInputRef,
        clientSessionId,
        activeDatabaseSessionId,
        initializeNewSession,
        setInput,
        handleImageChange,
        removeSelectedImage,
        handleSubmit,
        loadChatSessionFromHistory,
        handleDeleteSession,
        setUseThinkingMode,
    } = useChatLogic({ scrollAreaRef });

    useEffect(() => {
        if (authStatus !== "loading" && !activeDatabaseSessionId && !isLoadingHistory) {
            const isUserAuthenticated = authStatus === "authenticated";
            if ((isUserAuthenticated && (!chatSessions || chatSessions.length === 0)) || !isUserAuthenticated) {
                initializeNewSession();
            }
        }
    }, [authStatus, activeDatabaseSessionId, chatSessions, isLoadingHistory, initializeNewSession]);

    const handleEffectiveDeleteSession = async (dbSessionIdToDelete: string) => {
        await handleDeleteSession(dbSessionIdToDelete, setChatSessions);
    };

    return (
        <>
            <Toaster position="top-center" richColors />
            <div className="flex h-full w-full">
                {authStatus === "authenticated" && (
                    <ChatHistoryPanel
                        chatSessions={chatSessions}
                        isLoadingHistory={isLoadingHistory}
                        activeDatabaseSessionId={activeDatabaseSessionId}
                        clientSessionId={clientSessionId}
                        onLoadSession={loadChatSessionFromHistory}
                        onDeleteSession={handleEffectiveDeleteSession}
                        onNewSession={initializeNewSession}
                        authStatus={authStatus}
                    />
                )}

                <div className={`flex flex-col w-full h-full ${authStatus === "authenticated" ? "pl-0 sm:pl-4" : "pl-0"}`}>
                    <div className="flex flex-col h-[calc(100vh_-_180px)] min-h-[500px] w-full">
                        <div className="flex items-center justify-between p-2 border-b mb-2">
                            <h3 className="text-lg font-semibold truncate">
                                {currentChatTitle || "Nouveau Chat"}
                            </h3>
                            <div className="flex items-center space-x-2">
                                <Label htmlFor="thinking-mode" className="text-sm text-muted-foreground">
                                    Réflexion Avancée
                                </Label>
                                <Switch
                                    id="thinking-mode"
                                    checked={useThinkingMode}
                                    onCheckedChange={setUseThinkingMode}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <ChatMessageList
                            messages={messages}
                            isLoading={isLoading}
                            scrollAreaRef={scrollAreaRef}
                        />

                        <ChatInputForm
                            input={input}
                            onInputChange={setInput}
                            selectedImage={selectedImage}
                            imagePreview={imagePreview}
                            onImageChange={handleImageChange}
                            onRemoveImage={removeSelectedImage}
                            onSubmit={handleSubmit}
                            isLoading={isLoading}
                            fileInputRef={fileInputRef}
                        />
                    </div>
                </div>
            </div>
        </>
    );
};

export default ChatInterface; 