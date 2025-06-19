import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/mongodb/dbConnect';
import UserModel from '@/lib/mongodb/models/User';
import { z } from 'zod';

const addressSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(2, "Le nom complet est requis"),
  companyName: z.string().optional(),
  address: z.string().min(5, "L'adresse est requise"),
  houseNumber: z.string().min(1, "Le numéro de rue est requis"),
  city: z.string().min(2, "La ville est requise"),
  postalCode: z.string().min(4, "Le code postal est requis"),
  country: z.string().length(2, "Le code pays doit faire 2 caractères (ex: FR)"),
  telephone: z.string().optional(),
});

const getAddressSchema = z.object({
  userId: z.string(),
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
        
        const { _id, ...addressData } = validation.data;
        let updatedUser;

        if (_id) {
            // Modification d'une adresse existante
            const updateFields: { [key:string]: string | undefined } = {};
            for (const key in addressData) {
                // On construit l'objet pour $set avec le positional operator $
                updateFields[`shippingAddresses.$.${key}`] = addressData[key as keyof typeof addressData];
            }

            updatedUser = await UserModel.findOneAndUpdate(
                { _id: session.user.id, "shippingAddresses._id": _id },
                { $set: updateFields },
                { new: true, runValidators: true }
            );
        } else {
            // Ajout d'une nouvelle adresse
            updatedUser = await UserModel.findByIdAndUpdate(
                session.user.id,
                { $push: { shippingAddresses: addressData } },
                { new: true, runValidators: true }
            );
        }

        if (!updatedUser) {
            return NextResponse.json({ message: 'Utilisateur non trouvé ou adresse non modifiée' }, { status: 404 });
        }

        return NextResponse.json({ 
            success: true, 
            message: `Adresse ${ _id ? 'mise à jour' : 'enregistrée'} avec succès`, 
            addresses: updatedUser.shippingAddresses
        });
        
    } catch (error) {
        console.error('Failed to save shipping address:', error);
        const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue';
        return NextResponse.json({ message: 'Erreur interne du serveur', error: errorMessage }, { status: 500 });
    }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const validation = getAddressSchema.safeParse({
    userId: searchParams.get('userId'),
  });

  if (!validation.success || session.user.id !== validation.data.userId) {
    return NextResponse.json({ message: 'Invalid or unauthorized request' }, { status: 400 });
  }

  try {
    await dbConnect();
    const user = await UserModel.findById(validation.data.userId).select('shippingAddresses').lean();

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user.shippingAddresses || []);

  } catch (error) {
    console.error('Failed to fetch user addresses:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
