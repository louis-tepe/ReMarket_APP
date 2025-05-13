// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { NextRequest, NextResponse } from 'next/server';
// import { getServerSession } from "next-auth/next"; // Supprimé
// import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Ajustez le chemin

// TODO: Connecter à la DB et utiliser les modèles
// import dbConnect from '@/lib/db.Connect';
// import Offer from '@/models/Offer';

/**
 * @swagger
 * /api/users/{userId}/offers:
 *   get:
 *     summary: Récupère les offres d'un utilisateur spécifique (vendeur).
 *     description: Permet à un utilisateur (ou à un admin) de voir toutes les offres soumises par un vendeur.
 *     tags:
 *       - Users
 *       - Offers
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: L'ID de l'utilisateur (vendeur).
 *     responses:
 *       200:
 *         description: Une liste des offres du vendeur.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: // TODO: Définir le schéma de l'offre
 *                 type: object 
 *       401:
 *         description: Non autorisé (si l'accès est restreint au propriétaire ou admin).
 *       404:
 *         description: Utilisateur non trouvé.
 *       500:
 *         description: Erreur serveur.
 *
export async function GET(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  request: NextRequest, 
  context: any 
): Promise<NextResponse> {
  const params = context.params as { userId: string }; 
  const { userId } = params;
  console.log('Received request for userId:', userId); 
  return NextResponse.json({ message: `Offers for user ${userId} - placeholder` });
}
*/ 