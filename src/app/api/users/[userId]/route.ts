import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import User from '@/models/User';
import dbConnect from '@/lib/db.Connect';

export async function PATCH(req: Request, { params }: { params: Promise<{ userId: string }> }) {
    await dbConnect();
    const { userId } = await params;

    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.id !== userId) {
        return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, email } = body;

        if (!name && !email) {
            return NextResponse.json({ message: 'Aucune information à mettre à jour' }, { status: 400 });
        }

        const updateData: { name?: string; email?: string } = {};
        if (name) updateData.name = name;
        if (email) {
            const existingUser = await User.findOne({ email: email, _id: { $ne: userId } });
            if (existingUser) {
                return NextResponse.json({ message: 'Cet email est déjà utilisé.' }, { status: 409 });
            }
            updateData.email = email;
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true, select: '-password' }
        );

        if (!updatedUser) {
            return NextResponse.json({ message: 'Utilisateur non trouvé' }, { status: 404 });
        }

        return NextResponse.json(updatedUser, { status: 200 });

    } catch (error) {
        if (error instanceof Error && error.name === 'ValidationError') {
            interface MongooseValidationError {
                errors: { [path: string]: { message: string; name?: string; kind?: string; path?: string; value?: unknown } };
                message: string;
                name: 'ValidationError';
            }
            const validationError = error as MongooseValidationError;
            return NextResponse.json({ message: 'Erreur de validation', errors: validationError.errors }, { status: 400 });
        }
        return NextResponse.json({ message: 'Erreur interne du serveur' }, { status: 500 });
    }
} 