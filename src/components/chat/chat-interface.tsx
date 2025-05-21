"use client";

import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetClose,
    SheetFooter
} from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Paperclip, Send, User, Sparkles, Loader2, MessageSquareText, PlusCircle, Trash2, Menu } from "lucide-react";
import { Toaster, toast } from "sonner";
import type { Content, Part } from "@google/generative-ai";
import { v4 as uuidv4 } from 'uuid';
import type { ChatMessage as StoredChatMessage, MessagePart as StoredMessagePart, ChatSessionDoc } from "@/models/ChatSession";
import { useSession } from "next-auth/react";

interface UIMessage {
    id: string;
    text: string;
    sender: "user" | "gemini";
    imagePreview?: string;
    timestamp?: Date;
}

interface UISavedChatSession {
    _id: string;
    clientSessionId: string;
    title?: string;
    updatedAt: string;
    createdAt: string;
}

const ChatInterface: React.FC = () => {
    const { status: authStatus } = useSession();
    const [messages, setMessages] = useState<UIMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [useThinkingMode, setUseThinkingMode] = useState(false);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [clientSessionId, setClientSessionId] = useState<string>("");
    const [activeDatabaseSessionId, setActiveDatabaseSessionId] = useState<string | null>(null);
    const [chatSessions, setChatSessions] = useState<UISavedChatSession[]>([]);
    const [currentChatTitle, setCurrentChatTitle] = useState<string | undefined>(undefined);

    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const initializeNewSession = () => {
        setMessages([]);
        setInput("");
        setSelectedImage(null);
        setImagePreview(null);
        setClientSessionId(uuidv4());
        setActiveDatabaseSessionId(null);
        setCurrentChatTitle(undefined);
        console.log("Nouvelle session de chat initialisée avec clientSessionId:", clientSessionId);
    };

    useEffect(() => {
        initializeNewSession();
    }, []);

    const fetchChatSessions = async () => {
        if (authStatus !== "authenticated") return;
        setIsLoadingHistory(true);
        try {
            const response = await fetch("/api/chat/history");
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Erreur fetch sessions");
            }
            const data = await response.json();
            if (data.success) {
                setChatSessions(data.data);
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Impossible de charger l'historique des chats.");
            console.error("Fetch chat sessions error:", error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (authStatus === "authenticated") {
            fetchChatSessions();
        }
    }, [authStatus]);

    const loadChatSession = async (sessionIdToLoad: string, sessionTitle?: string) => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/chat/history/${sessionIdToLoad}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Erreur chargement session");
            }
            const data = await response.json();
            if (data.success && data.data) {
                const loadedSession: ChatSessionDoc = data.data;
                const uiMessages: UIMessage[] = loadedSession.messages.map((msg) => ({
                    id: uuidv4(),
                    text: msg.parts.find(p => p.text)?.text || "",
                    sender: msg.role === "user" ? "user" : "gemini",
                    timestamp: msg.timestamp,
                }));
                setMessages(uiMessages);
                setClientSessionId(loadedSession.clientSessionId);
                setActiveDatabaseSessionId(String(loadedSession._id));
                setCurrentChatTitle(loadedSession.title || sessionTitle);
                toast.success(`Session "${loadedSession.title || sessionTitle || 'Chat'}" chargée.`);
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Impossible de charger la session de chat.");
            console.error("Load chat session error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteSession = async (sessionIdToDelete: string) => {
        try {
            const response = await fetch(`/api/chat/history/${sessionIdToDelete}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Erreur suppression session");
            }
            toast.success("Session de chat supprimée.");
            setChatSessions(prev => prev.filter(s => s._id !== sessionIdToDelete));
            if (activeDatabaseSessionId === sessionIdToDelete) {
                initializeNewSession();
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Impossible de supprimer la session.");
            console.error("Delete chat session error:", error);
        }
    };

    const scrollToBottom = () => {
        if (scrollAreaRef.current) {
            const scrollViewport = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]");
            if (scrollViewport) {
                scrollViewport.scrollTop = scrollViewport.scrollHeight;
            }
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
            setInput("");
        }
    };

    const convertFileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
        });
    };

    const saveChatHistory = async (currentMessages: UIMessage[]) => {
        if (authStatus !== "authenticated") {
            console.log("Utilisateur non connecté, sauvegarde du chat non effectuée.");
            return;
        }
        if (!clientSessionId || currentMessages.length === 0) return;

        const storedMessages: StoredChatMessage[] = currentMessages.map(msg => {
            const parts: StoredMessagePart[] = [];
            if (msg.text) {
                parts.push({ text: msg.text });
            }
            return {
                role: msg.sender === "user" ? "user" : "model",
                parts: parts,
                timestamp: msg.timestamp || new Date(),
            };
        });

        let titleToSave = currentChatTitle;
        if (!titleToSave && storedMessages.length > 0 && storedMessages.some(m => m.role === 'user' && m.parts.some(p => p.text))) {
            const firstUserMessage = storedMessages.find(m => m.role === 'user' && m.parts.some(p => p.text))?.parts.find(p => p.text)?.text;
            if (firstUserMessage) {
                titleToSave = firstUserMessage.substring(0, 50) + (firstUserMessage.length > 50 ? "..." : "");
                setCurrentChatTitle(titleToSave);
            }
        }

        try {
            const response = await fetch("/api/chat/history", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    clientSessionId: clientSessionId,
                    messages: storedMessages,
                    title: titleToSave,
                }),
            });
            const savedData = await response.json();
            if (!response.ok) {
                console.error("Erreur sauvegarde chat:", savedData.error);
                toast.error("Erreur sauvegarde du chat: " + savedData.error);
            } else {
                console.log("Chat history saved/updated. Server session ID:", savedData.data?._id);
                if (savedData.data?._id && !activeDatabaseSessionId) {
                    setActiveDatabaseSessionId(savedData.data._id);
                }
                fetchChatSessions();
            }
        } catch (error) {
            console.error("Erreur réseau sauvegarde chat:", error);
            toast.error("Erreur réseau lors de la sauvegarde du chat.");
        }
    };

    const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
        e?.preventDefault();
        if (!clientSessionId) {
            toast.error("ID de session client manquant. Veuillez rafraîchir.");
            return;
        }
        if (!input.trim() && !selectedImage) return;

        const userMessageText = input.trim();

        const apiHistoryForGemini: Content[] = messages.map((msg) => {
            const parts: Part[] = [];
            if (msg.text) {
                parts.push({ text: msg.text });
            }
            return {
                role: msg.sender === "user" ? "user" : "model",
                parts: parts,
            };
        });

        const newUserMessage: UIMessage = {
            id: uuidv4(),
            text: userMessageText,
            sender: "user",
            imagePreview: selectedImage ? imagePreview || undefined : undefined,
            timestamp: new Date(),
        };

        const updatedMessagesForUI = [...messages, newUserMessage];
        setMessages(updatedMessagesForUI);
        saveChatHistory(updatedMessagesForUI);

        setInput("");
        const currentSelectedImage = selectedImage;
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";

        setIsLoading(true);

        try {
            let imageBase64Data: string | undefined = undefined;
            let mimeType: string | undefined = undefined;

            if (currentSelectedImage) {
                const base64String = await convertFileToBase64(currentSelectedImage);
                imageBase64Data = base64String;
                mimeType = currentSelectedImage.type;
            }

            const response = await fetch("/api/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
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
            const geminiMessage: UIMessage = {
                id: uuidv4(),
                text: data.response,
                sender: "gemini",
                timestamp: new Date(),
            };
            const finalMessagesForUI = [...updatedMessagesForUI, geminiMessage];
            setMessages(finalMessagesForUI);
            toast.success("Réponse de Gemini reçue !");
            saveChatHistory(finalMessagesForUI);

        } catch (error) {
            console.error("Erreur lors de l'envoi du message à Gemini:", error);
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Une erreur inconnue est survenue.";
            const errorUIMessage: UIMessage = {
                id: uuidv4(),
                text: `Erreur de Gemini: ${errorMessage}`,
                sender: "gemini",
                timestamp: new Date(),
            };
            const messagesWithError = [...updatedMessagesForUI, errorUIMessage];
            setMessages(messagesWithError);
            toast.error(`Erreur Gemini: ${errorMessage}`);
            saveChatHistory(messagesWithError);
        } finally {
            setIsLoading(false);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <>
            <Toaster position="top-center" richColors />
            <div className="flex h-full w-full">
                {authStatus === "authenticated" && (
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="fixed top-18 left-4 z-50 sm:static sm:mb-2 sm:mr-2">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Ouvrir l&apos;historique des chats</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0 flex flex-col">
                            <SheetHeader className="p-4 border-b">
                                <SheetTitle>Historique des Chats</SheetTitle>
                                <SheetDescription>
                                    Vos conversations sauvegardées avec Gemini.
                                </SheetDescription>
                            </SheetHeader>
                            <div className="p-4">
                                <Button onClick={initializeNewSession} className="w-full mb-4">
                                    <PlusCircle className="mr-2 h-4 w-4" /> Nouveau Chat
                                </Button>
                            </div>
                            <ScrollArea className="flex-grow px-4">
                                {isLoadingHistory && <p className="text-sm text-muted-foreground p-2">Chargement...</p>}
                                {!isLoadingHistory && chatSessions.length === 0 && (
                                    <p className="text-sm text-muted-foreground p-2 text-center">Aucun chat sauvegardé.</p>
                                )}
                                <div className="space-y-2">
                                    {chatSessions.map((chat) => (
                                        <Card
                                            key={chat._id}
                                            className={`p-3 hover:bg-muted/50 cursor-pointer 
                                            ${(activeDatabaseSessionId === chat._id || (!activeDatabaseSessionId && clientSessionId === chat.clientSessionId)) ? 'border-primary bg-muted/30' : ''}`}
                                            onClick={() => {
                                                if (activeDatabaseSessionId !== chat._id) {
                                                    loadChatSession(chat._id, chat.title);
                                                }
                                            }}
                                        >
                                            <div className="flex justify-between items-center">
                                                <p className="text-sm font-medium truncate flex-grow pr-2">
                                                    {chat.title || `Chat du ${new Date(chat.createdAt).toLocaleDateString()}`}
                                                </p>
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>Supprimer le chat ?</DialogTitle>
                                                            <DialogDescription>
                                                                Cette action est irréversible. Voulez-vous vraiment supprimer ce chat ?<br />
                                                                <strong>{chat.title || `Chat du ${new Date(chat.createdAt).toLocaleDateString()}`}</strong>
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <DialogFooter className="sm:justify-start">
                                                            <DialogClose asChild>
                                                                <Button type="button" variant="outline">Annuler</Button>
                                                            </DialogClose>
                                                            <Button
                                                                type="button"
                                                                variant="destructive"
                                                                onClick={() => handleDeleteSession(chat._id)}
                                                            >
                                                                Supprimer
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Modifié le: {new Date(chat.updatedAt).toLocaleDateString()} {new Date(chat.updatedAt).toLocaleTimeString()}
                                            </p>
                                        </Card>
                                    ))}
                                </div>
                            </ScrollArea>
                            <SheetFooter className="p-4 border-t">
                                <SheetClose asChild>
                                    <Button variant="outline" className="w-full">Fermer</Button>
                                </SheetClose>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>
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
                        <ScrollArea className="flex-grow min-h-0 p-4 border rounded-md mb-4 bg-muted/30" ref={scrollAreaRef}>
                            <div className="space-y-4">
                                {messages.length === 0 && !isLoading && (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                        <MessageSquareText size={48} className="mb-4" />
                                        <p>Commencez une nouvelle conversation avec Gemini.</p>
                                        <p className="text-sm">Posez une question ou joignez une image.</p>
                                    </div>
                                )}
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex items-end gap-2 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                                    >
                                        {msg.sender === "gemini" && (
                                            <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                                                <AvatarFallback>
                                                    <Sparkles size={18} />
                                                </AvatarFallback>
                                            </Avatar>
                                        )}
                                        <Card
                                            className={`max-w-[75%] p-3 rounded-xl shadow ${msg.sender === "user"
                                                ? "bg-primary text-primary-foreground rounded-br-none"
                                                : "bg-background text-foreground rounded-bl-none"
                                                }`}
                                        >
                                            {msg.imagePreview && (
                                                <img
                                                    src={msg.imagePreview}
                                                    alt="Aperçu utilisateur"
                                                    className="max-w-xs max-h-48 rounded-md mb-2"
                                                />
                                            )}
                                            <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                                            {msg.timestamp && (
                                                <p className="text-xs text-muted-foreground/70 mt-1 text-right">
                                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            )}
                                        </Card>
                                        {msg.sender === "user" && (
                                            <Avatar className="h-8 w-8 bg-secondary text-secondary-foreground">
                                                <AvatarFallback>
                                                    <User size={18} />
                                                </AvatarFallback>
                                            </Avatar>
                                        )}
                                    </div>
                                ))}
                                {isLoading && messages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                        <Loader2 size={48} className="mb-4 animate-spin" />
                                        <p>Chargement de la session...</p>
                                    </div>
                                )}
                                {isLoading && messages.length > 0 && (
                                    <div className="flex items-center gap-2 justify-start mt-4">
                                        <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                                            <AvatarFallback>
                                                <Loader2 size={18} className="animate-spin" />
                                            </AvatarFallback>
                                        </Avatar>
                                        <Card className="max-w-[75%] p-3 rounded-xl shadow bg-background text-foreground rounded-bl-none">
                                            <p className="text-sm italic">Gemini réfléchit...</p>
                                        </Card>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>

                        {imagePreview && (
                            <div className="mb-2 p-2 border rounded-md relative max-w-xs mx-auto">
                                <img src={imagePreview} alt="Aperçu sélectionné" className="max-h-40 rounded-md" />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-1 right-1 h-6 w-6 bg-red-500 hover:bg-red-600 text-white rounded-full"
                                    onClick={() => {
                                        setImagePreview(null);
                                        setSelectedImage(null);
                                        if (fileInputRef.current) fileInputRef.current.value = "";
                                    }}
                                >
                                    &times;
                                </Button>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="flex items-center gap-2 p-2 border-t">
                            <Button type="button" variant="outline" size="icon" onClick={triggerFileInput} disabled={isLoading} className="shrink-0">
                                <Paperclip className="h-5 w-5" />
                                <span className="sr-only">Joindre un fichier</span>
                            </Button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageChange}
                                accept="image/png, image/jpeg, image/webp, image/heic, image/heif"
                                className="hidden"
                                disabled={isLoading}
                            />
                            <Input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={selectedImage ? `Ajouter un commentaire pour ${selectedImage.name}...` : "Envoyer un message à Gemini..."}
                                className="flex-grow"
                                disabled={isLoading}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit();
                                    }
                                }}
                            />
                            <Button type="submit" size="icon" disabled={isLoading || (!input.trim() && !selectedImage)} className="shrink-0">
                                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                <span className="sr-only">Envoyer</span>
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ChatInterface; 