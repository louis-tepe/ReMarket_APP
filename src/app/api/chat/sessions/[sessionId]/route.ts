import { NextResponse } from "next/server";
/*
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import dbConnect from "@/lib/mongodb/dbConnect";
import ChatSession from "@/lib/mongodb/models/ChatSession";
import { Types } from "mongoose"; // Importer Types pour valider l'ObjectId
*/

/**
 * @swagger
 * /api/chat/sessions/{sessionId}:
 *   get:
 *     summary: Récupérer les messages d'une session de chat spécifique
 *     tags: [ChatSessions]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         description: ID de la session de chat
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session de chat récupérée avec succès
 *       400:
 *         description: ID de session invalide ou manquant
 *       401:
 *         description: Authentification requise
 *       404:
 *         description: Session de chat non trouvée ou accès non autorisé
 *       500:
 *         description: Erreur serveur inconnue
 *   delete:
 *     summary: Supprimer une session de chat spécifique
 *     tags: [ChatSessions]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         description: ID de la session de chat
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session de chat supprimée avec succès
 *       400:
 *         description: ID de session invalide ou manquant pour la suppression
 *       401:
 *         description: Authentification requise
 *       404:
 *         description: Session non trouvée, non supprimée ou accès non autorisé
 *       500:
 *         description: Erreur serveur inconnue
 */

// GET /api/chat/sessions/[sessionId] - Récupérer les messages d'une session de chat spécifique
export async function GET(/*request: Request, { params }: { params: { sessionId: string } }*/) {
  return NextResponse.json({ success: true, message: "OK" });
  /*
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) { // Vérification plus concise
      return NextResponse.json({ success: false, message: "Authentification requise." }, { status: 401 });
    }
    const userId = session.user.id;

    const { sessionId } = params;
    if (!sessionId || !Types.ObjectId.isValid(sessionId)) { // Valider le format de sessionId
      return NextResponse.json(
        { success: false, message: "ID de session invalide ou manquant." },
        { status: 400 }
      );
    }

    await dbConnect();

    const chatSession = await ChatSession.findOne({
      _id: sessionId,
      userId: userId, 
    }).lean();

    if (!chatSession) {
      return NextResponse.json(
        { success: false, message: "Session de chat non trouvée ou accès non autorisé." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: chatSession });

  } catch (error) {
    // console.error("Erreur GET /api/chat/sessions/[sessionId]:", error); // Log serveur optionnel
    const errorMessage = error instanceof Error ? error.message : "Erreur serveur inconnue.";
    return NextResponse.json({ success: false, message: "Erreur lors de la récupération de la session.", errorDetails: errorMessage }, { status: 500 });
  }
  */
}

// DELETE /api/chat/sessions/[sessionId] - Supprimer une session de chat spécifique
export async function DELETE(/*request: Request, { params }: { params: { sessionId: string } }*/) {
  return NextResponse.json({ success: true, message: "OK" });
  /*
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) { // Vérification plus concise
      return NextResponse.json({ success: false, message: "Authentification requise." }, { status: 401 });
    }
    const userId = session.user.id;

    const { sessionId } = params;
    if (!sessionId || !Types.ObjectId.isValid(sessionId)) { // Valider le format de sessionId
      return NextResponse.json(
        { success: false, message: "ID de session invalide ou manquant pour la suppression." },
        { status: 400 }
      );
    }

    await dbConnect();

    const result = await ChatSession.deleteOne({
      _id: sessionId,
      userId: userId, 
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: "Session non trouvée, non supprimée ou accès non autorisé." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Session de chat supprimée avec succès." });

  } catch (error) {
    // console.error("Erreur DELETE /api/chat/sessions/[sessionId]:", error); // Log serveur optionnel
    const errorMessage = error instanceof Error ? error.message : "Erreur serveur inconnue.";
    return NextResponse.json({ success: false, message: "Erreur lors de la suppression de la session.", errorDetails: errorMessage }, { status: 500 });
  }
  */
} 