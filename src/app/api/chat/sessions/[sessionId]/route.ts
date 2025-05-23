import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import dbConnect from "@/lib/db.Connect";
import ChatSession from "@/models/ChatSession";

// GET /api/chat/history/[sessionId] - Récupérer les messages d'une session spécifique
export async function GET(request: Request, { params }: { params: { sessionId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ success: false, error: "Non autorisé." }, { status: 401 });
    }

    const { sessionId } = params;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "L'ID de la session est requis." },
        { status: 400 }
      );
    }

    await dbConnect();

    const chatSession = await ChatSession.findOne({
      _id: sessionId,
      userId: session.user.id, // S'assurer que la session appartient à l'utilisateur connecté
    }).lean();

    if (!chatSession) {
      return NextResponse.json(
        { success: false, error: "Session de chat non trouvée ou accès non autorisé." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: chatSession });

  } catch (error) {
    console.error("Erreur lors de la récupération de la session de chat:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur serveur inconnue";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// DELETE /api/chat/history/[sessionId] - Supprimer une session de chat spécifique
export async function DELETE(request: Request, { params }: { params: { sessionId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ success: false, error: "Non autorisé." }, { status: 401 });
    }

    const { sessionId } = params;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "L'ID de la session est requis." },
        { status: 400 }
      );
    }

    await dbConnect();

    const result = await ChatSession.deleteOne({
      _id: sessionId,
      userId: session.user.id, // S'assurer que la session appartient à l'utilisateur connecté
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Session de chat non trouvée, non supprimée ou accès non autorisé." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Session de chat supprimée." });

  } catch (error) {
    console.error("Erreur lors de la suppression de la session de chat:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur serveur inconnue";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
} 