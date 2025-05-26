import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import dbConnect from "@/lib/db.Connect";
import ChatSession, { IChatMessage } from "@/models/ChatSession";
import User from "@/models/User"; // Assurez-vous que le chemin est correct

interface SaveChatRequestBody {
  clientSessionId: string;
  messages: IChatMessage[]; // L'historique complet des messages de la session en cours
  title?: string;
}

// POST /api/chat/history - Sauvegarde ou met à jour une session de chat
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ success: false, error: "Non autorisé. Utilisateur non connecté." }, { status: 401 });
    }

    const body: SaveChatRequestBody = await request.json();
    const { clientSessionId, messages, title } = body;

    if (!clientSessionId || !messages) {
      return NextResponse.json(
        { success: false, error: "clientSessionId et messages sont requis." },
        { status: 400 }
      );
    }

    await dbConnect();

    // Vérifier si l'utilisateur existe (juste au cas où)
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ success: false, error: "Utilisateur non trouvé." }, { status: 404 });
    }

    // Créer ou mettre à jour la session de chat
    // Upsert basé sur clientSessionId et userId pour garantir que la session est unique par utilisateur et clientSessionId
    // Si une session avec ce clientSessionId existe déjà pour cet utilisateur, elle sera mise à jour.
    // Sinon, une nouvelle session sera créée.
    const chatSession = await ChatSession.findOneAndUpdate(
      {
        clientSessionId: clientSessionId,
        userId: user._id, 
      },
      {
        $set: {
          messages: messages,
          userId: user._id,
          clientSessionId: clientSessionId,
          ...(title && { title: title }), // Ajoute le titre seulement s'il est fourni
        },
      },
      {
        upsert: true, // Crée le document s'il n'existe pas
        new: true, // Retourne le document modifié/nouveau
        setDefaultsOnInsert: true, // Applique les valeurs par défaut du schéma lors de l'insertion
      }
    );

    return NextResponse.json({ success: true, data: chatSession }, { status: 200 });

  } catch (error) {
    console.error("Erreur lors de la sauvegarde de l'historique du chat:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur serveur inconnue";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// GET /api/chat/history - Récupérer la liste des sessions pour l'utilisateur
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ success: false, error: "Non autorisé." }, { status: 401 });
    }

    await dbConnect();

    const userChatSessions = await ChatSession.find({ userId: session.user.id })
      .sort({ updatedAt: -1 }) // Les plus récents en premier
      .select("_id clientSessionId title updatedAt createdAt") // Sélectionner les champs nécessaires
      .lean(); // .lean() pour des objets JS simples, plus rapide

    return NextResponse.json({ success: true, data: userChatSessions });

  } catch (error) {
    console.error("Erreur lors de la récupération des sessions de chat:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur serveur inconnue";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// TODO: Implémenter GET /api/chat/history/[sessionId] pour récupérer les messages d'une session spécifique 