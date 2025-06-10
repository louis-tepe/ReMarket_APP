import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import dbConnect from "@/lib/mongodb/dbConnect";
import ChatSession, { IChatMessage, IChatSession } from "@/lib/mongodb/models/ChatSession";
import { Types } from 'mongoose';

interface ChatSessionRequestBody {
  clientSessionId: string;
  messages?: IChatMessage[]; 
  firstMessageContent?: string; 
  title?: string; 
  existingSessionId?: string; 
}

// POST /api/chat/sessions - Crée, met à jour ou ajoute un message à une session de chat.
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Authentification requise." }, { status: 401 });
    }
    const userId = session.user.id;

    const body: ChatSessionRequestBody = await request.json();
    const { clientSessionId, messages, firstMessageContent, title, existingSessionId } = body;

    if (!clientSessionId || typeof clientSessionId !== 'string') {
      return NextResponse.json({ success: false, message: "clientSessionId est requis." }, { status: 400 });
    }
    if (!messages && !firstMessageContent) {
        return NextResponse.json({ success: false, message: "Contenu du message ou messages requis." }, { status: 400 });
    }

    await dbConnect();

    // Optionnel : Vérifier si l'utilisateur existe réellement. Peut être omis si l'ID de session est suffisant.
    // const user = await User.findById(userId);
    // if (!user) {
    //   return NextResponse.json({ success: false, message: "Utilisateur non trouvé." }, { status: 404 });
    // }

    let chatSessionToUpdateOrSave: IChatSession | null = null;
    let isNewSession = false;

    if (existingSessionId && Types.ObjectId.isValid(existingSessionId)) {
      chatSessionToUpdateOrSave = await ChatSession.findOne({ _id: existingSessionId, userId: userId });
      if (!chatSessionToUpdateOrSave) {
        return NextResponse.json({ success: false, message: `Session ${existingSessionId} non trouvée ou accès non autorisé.` }, { status: 404 });
      }
    } else {
      chatSessionToUpdateOrSave = await ChatSession.findOne({ clientSessionId: clientSessionId, userId: userId });
    }

    if (chatSessionToUpdateOrSave) { // Session existante
      isNewSession = false;
      if (messages) chatSessionToUpdateOrSave.messages = messages as IChatMessage[];
      if (firstMessageContent) {
        chatSessionToUpdateOrSave.messages.push({
          role: "user",
          parts: [{ text: firstMessageContent }],
          timestamp: new Date(),
        });
      }
      if (title) chatSessionToUpdateOrSave.title = title;
      chatSessionToUpdateOrSave.updatedAt = new Date();
    } else { // Nouvelle session
      isNewSession = true;
      const newMessages: IChatMessage[] = [];
      if (messages) newMessages.push(...messages as IChatMessage[]);
      if (firstMessageContent) {
        newMessages.push({ role: "user", parts: [{ text: firstMessageContent }], timestamp: new Date() });
      }
      if (newMessages.length === 0) {
        return NextResponse.json({ success: false, message: "Impossible de créer une session vide." }, { status: 400 });
      }
      chatSessionToUpdateOrSave = new ChatSession({
        userId: userId,
        clientSessionId: clientSessionId,
        title: title || newMessages[0]?.parts[0]?.text?.substring(0, 75) || "Nouveau Chat",
        messages: newMessages,
      });
    }

    const savedChatSession: IChatSession = await chatSessionToUpdateOrSave.save();
    
    const responseData = {
        _id: (savedChatSession._id as Types.ObjectId).toString(), 
        title: savedChatSession.title,
        clientSessionId: savedChatSession.clientSessionId,
        updatedAt: savedChatSession.updatedAt,
        isNewSession: isNewSession,
        lastMessage: firstMessageContent ? savedChatSession.messages[savedChatSession.messages.length -1] : undefined
    };

    return NextResponse.json({ 
        success: true, 
        message: isNewSession ? "Session de chat créée." : "Session de chat mise à jour.", 
        data: responseData
    }, { status: isNewSession ? 201 : 200 });

  } catch (error) {
    // console.error("Erreur POST /api/chat/sessions:", error); // Log serveur optionnel
    const errorMessage = error instanceof Error ? error.message : "Erreur serveur inconnue.";
    return NextResponse.json({ success: false, message: "Erreur lors du traitement de la session de chat.", errorDetails: errorMessage }, { status: 500 });
  }
}

// GET /api/chat/sessions - Récupère la liste des sessions pour l'utilisateur.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Authentification requise." }, { status: 401 });
    }
    const userId = session.user.id;

    await dbConnect();

    // Spécifier le type de _id dans IChatSession comme Types.ObjectId si possible dans la définition du modèle
    // ou caster ici pour s'assurer que le linter comprend.
    const userChatSessions = await ChatSession.find({ userId: userId })
      .sort({ updatedAt: -1 })
      .select("_id clientSessionId title updatedAt messages") 
      .lean<IChatSession[]>(); 

    const formattedSessions = userChatSessions.map(cs => ({
        _id: (cs._id as Types.ObjectId).toString(), // Assurer le cast vers Types.ObjectId avant toString()
        clientSessionId: cs.clientSessionId,
        title: cs.title,
        updatedAt: cs.updatedAt,
        messageCount: cs.messages?.length || 0,
        lastMessagePreview: cs.messages?.length > 0 
            ? cs.messages[cs.messages.length - 1].parts[0]?.text?.substring(0, 100) || "(Message sans texte)"
            : "Aucun message",
    }));

    return NextResponse.json({ success: true, data: formattedSessions });

  } catch (error) {
    // console.error("Erreur GET /api/chat/sessions:", error); // Log serveur optionnel
    const errorMessage = error instanceof Error ? error.message : "Erreur serveur inconnue.";
    return NextResponse.json({ success: false, message: "Erreur lors de la récupération des sessions.", errorDetails: errorMessage }, { status: 500 });
  }
}

// TODO: Implémenter GET /api/chat/history/[sessionId] pour récupérer les messages d'une session spécifique 