import React from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetClose, SheetFooter
} from "@/components/ui/sheet";
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { PlusCircle, Trash2, Menu } from "lucide-react";
import type { UISavedChatSession } from './chat-types';

interface ChatHistoryPanelProps {
    chatSessions: UISavedChatSession[];
    isLoadingHistory: boolean;
    activeDatabaseSessionId: string | null;
    clientSessionId: string; // To highlight new, unsaved session based on client ID
    onLoadSession: (sessionId: string, sessionTitle?: string) => void;
    onDeleteSession: (sessionId: string) => void;
    onNewSession: () => void;
    authStatus: "authenticated" | "loading" | "unauthenticated";
}

const ChatHistoryItem: React.FC<{
    chat: UISavedChatSession;
    isActive: boolean;
    onLoad: () => void;
    onDelete: () => void;
}> = ({ chat, isActive, onLoad, onDelete }) => {
    return (
        <Card
            className={`p-3 hover:bg-muted/50 cursor-pointer 
            ${isActive ? 'border-primary bg-muted/30' : ''}`}
            onClick={onLoad}
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
                            <DialogClose asChild><Button type="button" variant="outline">Annuler</Button></DialogClose>
                            <Button type="button" variant="destructive" onClick={onDelete}>Supprimer</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
                Modifié le: {new Date(chat.updatedAt).toLocaleDateString()} {new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
        </Card>
    );
};

export const ChatHistoryPanel: React.FC<ChatHistoryPanelProps> = ({
    chatSessions,
    isLoadingHistory,
    activeDatabaseSessionId,
    clientSessionId,
    onLoadSession,
    onDeleteSession,
    onNewSession,
    authStatus
}) => {
    if (authStatus !== "authenticated") return null;

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="fixed top-18 left-4 z-50 sm:static sm:mb-2 sm:mr-2">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Ouvrir l&apos;historique</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0 flex flex-col">
                <SheetHeader className="p-4 border-b">
                    <SheetTitle>Historique des Chats</SheetTitle>
                    <SheetDescription>Vos conversations sauvegardées.</SheetDescription>
                </SheetHeader>
                <div className="p-4">
                    <Button onClick={onNewSession} className="w-full mb-4">
                        <PlusCircle className="mr-2 h-4 w-4" /> Nouveau Chat
                    </Button>
                </div>
                <ScrollArea className="flex-grow px-4">
                    {isLoadingHistory && <p className="text-sm text-muted-foreground p-2">Chargement...</p>}
                    {!isLoadingHistory && (!chatSessions || chatSessions.length === 0) && (
                        <p className="text-sm text-muted-foreground p-2 text-center">Aucun chat sauvegardé.</p>
                    )}
                    <div className="space-y-2">
                        {chatSessions?.map((chat) => (
                            <ChatHistoryItem
                                key={chat._id}
                                chat={chat}
                                isActive={activeDatabaseSessionId === chat._id || (!activeDatabaseSessionId && clientSessionId === chat.clientSessionId)}
                                onLoad={() => {
                                    if (activeDatabaseSessionId !== chat._id) {
                                        onLoadSession(chat._id, chat.title);
                                    }
                                }}
                                onDelete={() => onDeleteSession(chat._id)}
                            />
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
    );
}; 