import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db.Connect';
import ChatSession from '@/models/ChatSession';
import ChatMessage from '@/models/ChatMessage';

// TODO: Implémenter GET /api/chat/history/[sessionId] pour récupérer les messages d'une session spécifique
// Cette fonctionnalité semble déjà implémentée dans src/app/api/chat/history/[sessionId]/route.ts
// et devrait être testée et ce commentaire supprimé ou mis à jour.

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ success: false, message: "Non autorisé. Session utilisateur manquante." }, { status: 401 });
    }

    // La vérification de l'existence de l'utilisateur via User.findById(session.user.id) a été supprimée
    // car l'obtention d'une session valide garantit déjà que session.user.id est un ID utilisateur valide.

    const { clientSessionId, firstMessageContent } = await request.json();

    if (!clientSessionId || typeof clientSessionId !== 'string') {
        return NextResponse.json({ success: false, message: "clientSessionId est requis et doit être une chaîne de caractères." }, { status: 400 });
    }
    if (!firstMessageContent || typeof firstMessageContent !== 'string') {
        return NextResponse.json({ success: false, message: "firstMessageContent est requis et doit être une chaîne de caractères." }, { status: 400 });
    }

    try {
        await dbConnect();

        const existingSession = await ChatSession.findOne({
            clientSessionId: clientSessionId,
            userId: session.user.id 
        });

        let chatSession;
        let isNewSession = false;

        if (existingSession) {
            existingSession.lastActivity = new Date();
            // Optionnel: Mettre à jour le titre si le premier message change de manière significative?
            // Pour l'instant, on ne met à jour que lastActivity pour une session existante.
            await existingSession.save();
            chatSession = existingSession;
        } else {
            chatSession = new ChatSession({
                userId: session.user.id,
                clientSessionId: clientSessionId,
                title: firstMessageContent.substring(0, 75), // Un titre un peu plus long
                lastActivity: new Date(),
            });
            await chatSession.save();
            isNewSession = true;
        }

        // Créer le premier message dans la session de chat
        const newMessage = new ChatMessage({
            chatSessionId: chatSession._id,
            sender: session.user.id, 
            contentType: 'text',
            content: firstMessageContent,
        });
        await newMessage.save();
        
        // Mettre à jour la session de chat avec le dernier message et incrémenter le compteur
        chatSession.lastMessage = newMessage._id;
        chatSession.messageCount = (chatSession.messageCount || 0) + 1;
        if (isNewSession) { // Si c'est une nouvelle session, définir également le premier message
            chatSession.firstMessage = newMessage._id;
        }
        await chatSession.save();

        return NextResponse.json({ 
            success: true, 
            message: isNewSession ? "Nouvelle session de chat créée avec le premier message." : "Activité de session de chat mise à jour et message ajouté.", 
            chatSession: {
                _id: chatSession._id.toString(),
                title: chatSession.title,
                clientSessionId: chatSession.clientSessionId,
                lastActivity: chatSession.lastActivity,
                isNewSession: isNewSession
            },
            firstMessage: {
                _id: newMessage._id.toString(),
                content: newMessage.content,
                timestamp: newMessage.createdAt
            }
        }, { status: isNewSession ? 201 : 200 });

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
            .sort({ lastActivity: -1 })
            .populate('lastMessage', 'content contentType createdAt sender')
            .lean();
        
        const formattedSessions = chatSessions.map(cs => ({
            _id: cs._id.toString(),
            clientSessionId: cs.clientSessionId,
            title: cs.title,
            lastActivity: cs.lastActivity,
            messageCount: cs.messageCount || 0,
            lastMessagePreview: cs.lastMessage ? (cs.lastMessage as any).content.substring(0, 100) : "Aucun message",
        }));

        return NextResponse.json({ success: true, sessions: formattedSessions });
    } catch (error) {
        console.error("[API_CHAT_HISTORY_GET]", error);
        const errorMessage = error instanceof Error ? error.message : "Une erreur inconnue est survenue";
        return NextResponse.json({ success: false, message: "Erreur serveur lors de la récupération de l'historique des chats.", error: errorMessage }, { status: 500 });
    }
} 