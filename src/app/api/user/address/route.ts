import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/mongodb/dbConnect';
import UserModel from '@/lib/mongodb/models/User';
import { z } from 'zod';

const addressSchema = z.object({
  name: z.string().min(2, "Le nom complet est requis"),
  companyName: z.string().optional(),
  address: z.string().min(5, "L'adresse est requise"),
  houseNumber: z.string().min(1, "Le numéro de rue est requis"),
  city: z.string().min(2, "La ville est requise"),
  postalCode: z.string().min(4, "Le code postal est requis"),
  country: z.string().length(2, "Le code pays doit faire 2 caractères (ex: FR)"),
  telephone: z.string().optional(),
});


export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const validation = addressSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ message: 'Données d\'adresse invalides', errors: validation.error.issues }, { status: 400 });
        }
        
        await dbConnect();
        
        const updatedUser = await UserModel.findByIdAndUpdate(
            session.user.id,
            {
                shippingAddress: body,
            },
            { new: true }
        );

        if (!updatedUser) {
            return NextResponse.json({ message: 'Utilisateur non trouvé' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Adresse enregistrée avec succès', address: updatedUser.shippingAddress });
        
    } catch (error) {
        console.error('Failed to save shipping address:', error);
        const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue';
        return NextResponse.json({ message: 'Erreur interne du serveur', error: errorMessage }, { status: 500 });
    }
}
