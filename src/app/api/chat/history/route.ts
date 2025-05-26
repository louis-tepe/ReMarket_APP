import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db.Connect';
import ChatSession, { IChatMessage } from '@/models/ChatSession';

// TODO: Implémenter GET /api/chat/history/[sessionId] pour récupérer les messages d'une session spécifique
// Cette fonctionnalité semble déjà implémentée dans src/app/api/chat/history/[sessionId]/route.ts
// et devrait être testée et ce commentaire supprimé ou mis à jour.

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ success: false, message: "Non autorisé. Session utilisateur manquante." }, { status: 401 });
    }

    const body = await request.json();
    const { clientSessionId, firstMessageContent, messages, title, existingSessionId } = body;

    if (!clientSessionId || typeof clientSessionId !== 'string') {
        return NextResponse.json({ success: false, message: "clientSessionId est requis et doit être une chaîne de caractères." }, { status: 400 });
    }

    // Mode simple: ajout d'un premier message seulement
    if (firstMessageContent && !messages) {
        if (typeof firstMessageContent !== 'string') {
            return NextResponse.json({ success: false, message: "firstMessageContent doit être une chaîne de caractères." }, { status: 400 });
        }
    }
    
    // Mode complet: sauvegarde d'un historique complet
    else if (messages && Array.isArray(messages)) {
        if (messages.length === 0) {
            return NextResponse.json({ success: false, message: "L'historique de messages ne peut pas être vide." }, { status: 400 });
        }
    }
    
    // Ni firstMessageContent ni messages fournis
    else {
        return NextResponse.json({ success: false, message: "Soit 'firstMessageContent' soit 'messages' est requis." }, { status: 400 });
    }

    try {
        await dbConnect();

        let chatSession;
        let isNewSession = false;

        // Mode simple: ajout d'un premier message
        if (firstMessageContent && !messages) {
            const existingSession = await ChatSession.findOne({
                clientSessionId: clientSessionId,
                userId: session.user.id 
            });

            if (existingSession) {
                // Créer le nouveau message selon le format IChatMessage
                const newMessage: IChatMessage = {
                    role: "user",
                    parts: [{ text: firstMessageContent }],
                    timestamp: new Date(),
                };

                // Ajouter le message à l'historique existant
                existingSession.messages.push(newMessage);
                existingSession.updatedAt = new Date();
                await existingSession.save();
                chatSession = existingSession;
            } else {
                // Créer le premier message selon le format IChatMessage
                const firstMessage: IChatMessage = {
                    role: "user",
                    parts: [{ text: firstMessageContent }],
                    timestamp: new Date(),
                };

                chatSession = new ChatSession({
                    userId: session.user.id,
                    clientSessionId: clientSessionId,
                    title: firstMessageContent.substring(0, 75),
                    messages: [firstMessage],
                });
                await chatSession.save();
                isNewSession = true;
            }

            // Récupérer le dernier message ajouté
            const lastMessage = chatSession.messages[chatSession.messages.length - 1];

            return NextResponse.json({ 
                success: true, 
                message: isNewSession ? "Nouvelle session de chat créée avec le premier message." : "Activité de session de chat mise à jour et message ajouté.", 
                data: {
                    _id: chatSession._id.toString(),
                    title: chatSession.title,
                    clientSessionId: chatSession.clientSessionId,
                    updatedAt: chatSession.updatedAt,
                    isNewSession: isNewSession
                },
                firstMessage: {
                    content: lastMessage.parts[0]?.text || '',
                    timestamp: lastMessage.timestamp
                }
            }, { status: isNewSession ? 201 : 200 });
        }

        // Mode complet: sauvegarde d'un historique complet
        else if (messages && Array.isArray(messages)) {
            // Chercher une session existante par ID ou par clientSessionId
            let existingSession = null;
            
            if (existingSessionId) {
                existingSession = await ChatSession.findOne({
                    _id: existingSessionId,
                    userId: session.user.id
                });
            }
            
            if (!existingSession) {
                existingSession = await ChatSession.findOne({
                    clientSessionId: clientSessionId,
                    userId: session.user.id 
                });
            }

            if (existingSession) {
                // Mettre à jour la session existante
                existingSession.messages = messages;
                if (title) existingSession.title = title;
                existingSession.updatedAt = new Date();
                await existingSession.save();
                chatSession = existingSession;
            } else {
                // Créer une nouvelle session
                chatSession = new ChatSession({
                    userId: session.user.id,
                    clientSessionId: clientSessionId,
                    title: title || (messages[0]?.parts[0]?.text?.substring(0, 75) || "Nouveau Chat"),
                    messages: messages,
                });
                await chatSession.save();
                isNewSession = true;
            }

            return NextResponse.json({ 
                success: true, 
                message: isNewSession ? "Nouvelle session de chat créée." : "Session de chat mise à jour.", 
                data: {
                    _id: chatSession._id.toString(),
                    title: chatSession.title,
                    clientSessionId: chatSession.clientSessionId,
                    updatedAt: chatSession.updatedAt,
                    isNewSession: isNewSession
                }
            }, { status: isNewSession ? 201 : 200 });
        }

    } catch (error) {
        console.error("[API_CHAT_HISTORY_POST]", error);
        const errorMessage = error instanceof Error ? error.message : "Une erreur inconnue est survenue";
        return NextResponse.json({ success: false, message: "Erreur serveur lors de la création/mise à jour de la session de chat.", error: errorMessage }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ success: false, message: "Non autorisé" }, { status: 401 });
    }

    try {
        await dbConnect();

        const chatSessions = await ChatSession.find({ userId: session.user.id })
            .sort({ updatedAt: -1 })
            .lean();
        
        const formattedSessions = chatSessions.map(cs => ({
            _id: String(cs._id),
            clientSessionId: cs.clientSessionId,
            title: cs.title,
            updatedAt: cs.updatedAt,
            messageCount: cs.messages?.length || 0,
            lastMessagePreview: cs.messages && cs.messages.length > 0 
                ? cs.messages[cs.messages.length - 1].parts[0]?.text?.substring(0, 100) || "Aucun message"
                : "Aucun message",
        }));

        return NextResponse.json({ success: true, sessions: formattedSessions });
    } catch (error) {
        console.error("[API_CHAT_HISTORY_GET]", error);
        const errorMessage = error instanceof Error ? error.message : "Une erreur inconnue est survenue";
        return NextResponse.json({ success: false, message: "Erreur serveur lors de la récupération de l'historique des chats.", error: errorMessage }, { status: 500 });
    }
} 