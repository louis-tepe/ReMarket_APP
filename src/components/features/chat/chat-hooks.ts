// src/components/features/chat/chat-hooks.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import type { UIMessage, UISavedChatSession, StoredChatMessage, ChatSessionDoc, ApiHistoryMessage, StoredMessagePart } from './chat-types';
import { convertFileToBase64, createNewUIMessage as createUIMessageFromUtil, generateChatTitle } from '@/lib/chat-utils';

// --- Helper Functions ---
// const createNewUIMessage = (text: string, sender: 'user' | 'gemini', imagePreview?: string): UIMessage => ({
//     id: uuidv4(),
//     text,
//     sender,
//     imagePreview,
//     timestamp: new Date(),
// });

// --- useChatHistory Hook ---
export const useChatHistory = () => {
    const { status: authStatus } = useSession();
    const [chatSessions, setChatSessions] = useState<UISavedChatSession[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [activeDatabaseSessionId, setActiveDatabaseSessionId] = useState<string | null>(null);
    const [currentChatTitle, setCurrentChatTitle] = useState<string | undefined>(undefined);
    const [useThinkingMode, setUseThinkingMode] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchChatSessions = useCallback(async () => {
        if (authStatus !== "authenticated") return;
        setIsLoadingHistory(true);
        try {
            const response = await fetch("/api/chat/sessions");
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Erreur fetch sessions");
            }
            const data = await response.json();
            if (data.success) {
                setChatSessions(data.data as UISavedChatSession[]);
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Impossible de charger l'historique.");
            console.error("Fetch chat sessions error:", error);
        } finally {
            setIsLoadingHistory(false);
        }
    }, [authStatus]);

    useEffect(() => {
        fetchChatSessions();
    }, [fetchChatSessions]);

    const initializeNewSession = useCallback(() => {
        setChatSessions([]);
        setActiveDatabaseSessionId(null);
        setCurrentChatTitle(undefined);
        setUseThinkingMode(false);
        return uuidv4();
    }, []);

    return { chatSessions, isLoadingHistory, fetchChatSessions, setChatSessions, activeDatabaseSessionId, currentChatTitle, useThinkingMode, fileInputRef, initializeNewSession };
};


// --- useChatLogic Hook ---
interface UseChatLogicProps {
    initialMessages?: UIMessage[];
    onMessagesChange?: (messages: UIMessage[]) => void;
    scrollAreaRef: React.RefObject<HTMLDivElement | null>;
}

export const useChatLogic = ({ initialMessages = [], onMessagesChange, scrollAreaRef }: UseChatLogicProps) => {
    const { status: authStatus } = useSession();
    const [messages, setMessages] = useState<UIMessage[]>(initialMessages);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [clientSessionId, setClientSessionId] = useState<string>(uuidv4());
    const [activeDatabaseSessionId, setActiveDatabaseSessionId] = useState<string | null>(null);
    const [currentChatTitle, setCurrentChatTitle] = useState<string | undefined>(undefined);
    const [useThinkingMode, setUseThinkingMode] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const initializeNewSession = useCallback(() => {
        setMessages([]);
        setInput("");
        setSelectedImage(null);
        setImagePreview(null);
        const newClientSessionId = uuidv4();
        setClientSessionId(newClientSessionId);
        setActiveDatabaseSessionId(null);
        setCurrentChatTitle(undefined);
        setUseThinkingMode(false);
        return newClientSessionId;
    }, []);
    
    useEffect(() => {
        onMessagesChange?.(messages);
    }, [messages, onMessagesChange]);


    const scrollToBottom = useCallback(() => {
        if (scrollAreaRef.current) {
            const scrollViewport = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]");
            if (scrollViewport) {
                scrollViewport.scrollTop = scrollViewport.scrollHeight;
            }
        }
    }, [scrollAreaRef]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);


    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
            setInput(""); // Clear input when image is selected
        }
    };

    const removeSelectedImage = () => {
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const saveChatHistoryInternal = useCallback(async (currentMessagesToSave: UIMessage[], currentCSId: string, currentDbId: string | null, currentTitle?: string) => {
        if (authStatus !== "authenticated" || currentMessagesToSave.length === 0) {
            return { updatedDbId: currentDbId, updatedTitle: currentTitle };
        }
    
        const storedMessages: StoredChatMessage[] = currentMessagesToSave.map(msg => ({
            role: msg.sender === "user" ? "user" : "model",
            parts: msg.text ? [{ text: msg.text }] : [],
            timestamp: msg.timestamp || new Date(),
        }));
    
        const titleToSave = currentTitle || generateChatTitle(storedMessages);
            
        try {
            const response = await fetch("/api/chat/sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clientSessionId: currentCSId,
                    messages: storedMessages,
                    title: titleToSave,
                    ...(currentDbId && { existingSessionId: currentDbId }),
                }),
            });
            const savedData = await response.json();
            if (!response.ok) {
                throw new Error(savedData.message || "Erreur sauvegarde chat");
            }
            return { updatedDbId: savedData.data?._id || currentDbId, updatedTitle: titleToSave || currentTitle };
        } catch (error) {
            console.error("Erreur réseau/sauvegarde chat:", error);
            toast.error(error instanceof Error ? `Erreur sauvegarde: ${error.message}`: "Erreur réseau sauvegarde chat.");
            return { updatedDbId: currentDbId, updatedTitle: currentTitle };
        }
    }, [authStatus]);
    

    const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
        e?.preventDefault();
        if (!clientSessionId) {
            toast.error("ID de session client manquant. Veuillez rafraîchir.");
            return;
        }
        if (!input.trim() && !selectedImage) return;

        const userMessageText = input.trim();
        const newUserMsg = createUIMessageFromUtil(userMessageText, "user", selectedImage ? imagePreview || undefined : undefined);
        
        const currentMessagesWithUser = [...messages, newUserMsg];
        setMessages(currentMessagesWithUser);

        const currentSelectedImage = selectedImage;
        setInput("");
        removeSelectedImage();
        setIsLoading(true);

        let tempActiveDbId = activeDatabaseSessionId;
        let tempCurrentTitle = currentChatTitle;

        const saveResult = await saveChatHistoryInternal(currentMessagesWithUser, clientSessionId, tempActiveDbId, tempCurrentTitle);
        if (saveResult.updatedDbId && !tempActiveDbId) {
            setActiveDatabaseSessionId(saveResult.updatedDbId);
            tempActiveDbId = saveResult.updatedDbId; 
        }
        if (saveResult.updatedTitle && !tempCurrentTitle) {
             setCurrentChatTitle(saveResult.updatedTitle);
             tempCurrentTitle = saveResult.updatedTitle;
        }

        try {
            const imageBase64Data = currentSelectedImage ? await convertFileToBase64(currentSelectedImage) : undefined;
            const mimeType = currentSelectedImage?.type;
            
            const apiHistoryForGemini: ApiHistoryMessage[] = messages.map(msg => ({ 
                role: msg.sender === "user" ? "user" : "model",
                parts: msg.text ? [{ text: msg.text }] : [],
            }));

            const response = await fetch("/api/services/ai/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: userMessageText,
                    imageBase64: imageBase64Data,
                    mimeType,
                    useThinking: useThinkingMode,
                    history: apiHistoryForGemini,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Erreur de l'API Gemini");
            }

            const data = await response.json();
            const geminiMsg = createUIMessageFromUtil(data.response, "gemini");
            const finalMessages = [...currentMessagesWithUser, geminiMsg];
            setMessages(finalMessages);
            toast.success("Réponse de Gemini reçue !");
            await saveChatHistoryInternal(finalMessages, clientSessionId, tempActiveDbId, tempCurrentTitle);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Une erreur inconnue.";
            const errorMsg = createUIMessageFromUtil(`Erreur: ${errorMessage}`, "gemini");
            setMessages(prev => [...prev, errorMsg]);
            toast.error(`Erreur Gemini: ${errorMessage}`);
            await saveChatHistoryInternal([...currentMessagesWithUser, errorMsg], clientSessionId, tempActiveDbId, tempCurrentTitle);
        } finally {
            setIsLoading(false);
        }
    };
    
    const loadChatSessionFromHistory = useCallback(async (dbSessionId: string, sessionTitle?: string) => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/chat/sessions/${dbSessionId}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Erreur chargement session");
            }
            const data = await response.json();
            if (data.success && data.data) {
                const loadedSession: ChatSessionDoc = data.data;
                const uiMessages: UIMessage[] = loadedSession.messages.map((msg: StoredChatMessage) => ({
                    id: uuidv4(), // Generate new UI IDs
                    text: msg.parts.find((p: StoredMessagePart) => p.text)?.text || "",
                    sender: msg.role === "user" ? "user" : "gemini",
                    timestamp: msg.timestamp,
                }));
                setMessages(uiMessages);
                setClientSessionId(loadedSession.clientSessionId); // Restore clientSessionId
                setActiveDatabaseSessionId(String(loadedSession._id));
                setCurrentChatTitle(loadedSession.title || sessionTitle);
                toast.success(`Session "${loadedSession.title || sessionTitle || 'Chat'}" chargée.`);
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Impossible de charger la session.");
            console.error("Load chat session error:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);


    const handleDeleteSession = useCallback(async (dbSessionIdToDelete: string, sessionsSetter: React.Dispatch<React.SetStateAction<UISavedChatSession[]>>) => {
        try {
            const response = await fetch(`/api/chat/sessions/${dbSessionIdToDelete}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Erreur suppression session");
            }
            toast.success("Session de chat supprimée.");
            sessionsSetter(prev => prev.filter(s => s._id !== dbSessionIdToDelete));
            if (activeDatabaseSessionId === dbSessionIdToDelete) {
                initializeNewSession();
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Impossible de supprimer la session.");
            console.error("Delete chat session error:", error);
        }
    }, [activeDatabaseSessionId, initializeNewSession]);


    return {
        messages,
        input,
        isLoading,
        selectedImage,
        imagePreview,
        clientSessionId,
        activeDatabaseSessionId,
        currentChatTitle,
        useThinkingMode,
        fileInputRef,
        setMessages,
        setInput,
        setIsLoading,
        setSelectedImage,
        setImagePreview,
        setClientSessionId,
        setActiveDatabaseSessionId,
        setCurrentChatTitle,
        setUseThinkingMode,
        initializeNewSession,
        handleImageChange,
        removeSelectedImage,
        handleSubmit,
        loadChatSessionFromHistory,
        handleDeleteSession,
        saveChatHistory: (msgs: UIMessage[]) => saveChatHistoryInternal(msgs, clientSessionId, activeDatabaseSessionId, currentChatTitle),
    };
}; 