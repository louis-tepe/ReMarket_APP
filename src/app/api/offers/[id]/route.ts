import { NextResponse } from 'next/server';
// import { getServerSession } from "next-auth/next";
// import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Ajustez le chemin

// TODO: Connecter à la DB et utiliser les modèles
// import dbConnect from '@/lib/db.Connect';
// import Offer from '@/models/Offer';

/**
 * @swagger
 * /api/offers/{id}:
 *   put:
 *     summary: Met à jour une offre existante.
 *     description: Permet à un vendeur de mettre à jour les détails de son offre (si elle n'est pas vendue).
 *     tags:
 *       - Offers
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: L'ID de l'offre à mettre à jour.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               price:
 *                 type: number
 *               condition:
 *                 type: string
 *               sellerDescription:
 *                 type: string
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *               dynamicFields:
 *                 type: object
 *     responses:
 *       200:
 *         description: Offre mise à jour avec succès.
 *         content:
 *           application/json:
 *             schema: // TODO: Définir le schéma de l'offre mise à jour
 *               type: object
 *       400:
 *         description: Données d'entrée invalides.
 *       401:
 *         description: Non autorisé.
 *       403:
 *         description: Interdit (ex: l'utilisateur n'est pas le propriétaire de l'offre, ou l'offre est déjà vendue).
 *       404:
 *         description: Offre non trouvée.
 *       500:
 *         description: Erreur serveur.
 */
export async function PUT(
  request: Request,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { params }: any
) {
  const { id: offerId } = params as { id: string };
  // const session = await getServerSession(authOptions);
  // if (!session || !session.user) {
  //   return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
  // }
  // const userId = session.user.id;
  const userId = 'simulated-user-id'; // Placeholder

  try {
    const body = await request.json();
    // await dbConnect();

    // TODO: Récupérer l'offre
    // const offer = await Offer.findById(offerId);
    // if (!offer) {
    //   return NextResponse.json({ message: 'Offre non trouvée.' }, { status: 404 });
    // }

    // TODO: Vérifier que l'utilisateur est le propriétaire de l'offre et que l'offre peut être modifiée
    // if (offer.seller.toString() !== userId) { 
    //   return NextResponse.json({ message: 'Interdit de modifier cette offre.' }, { status: 403 });
    // }
    // if (offer.status === 'sold' || offer.status === 'pending_shipment') { // Exemple de statuts non modifiables
    //   return NextResponse.json({ message: 'Cette offre ne peut plus être modifiée.' }, { status: 403 });
    // }

    // TODO: Mettre à jour l'offre
    // const updatedOffer = await Offer.findByIdAndUpdate(offerId, body, { new: true });

    console.log(`Mise à jour de l'offre ${offerId} avec:`, body, `par l'utilisateur ${userId}`);
    // Simulation de réponse
    const simulatedUpdatedOffer = {
      id: offerId,
      ...body, // Supposons que le corps contient les champs mis à jour
      sellerId: userId,
      status: 'available' // Le statut pourrait aussi être mis à jour
    };

    return NextResponse.json(simulatedUpdatedOffer, { status: 200 });
  } catch (error) {
    console.error(`[PUT /api/offers/${offerId}]`, error);
    return NextResponse.json({ message: "Erreur lors de la mise à jour de l'offre.", error: (error as Error).message }, { status: 500 });
  }
}