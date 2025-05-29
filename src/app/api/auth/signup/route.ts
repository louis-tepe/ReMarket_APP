import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db.Connect'; // Utilitaire de connexion Mongoose
import User from '@/models/User'; // Modèle User Mongoose

const MIN_PASSWORD_LENGTH = 6;

export async function POST(req: NextRequest) {
  try {
    await dbConnect(); // Assurer la connexion à la base de données

    const { email, name, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'L\'email et le mot de passe sont requis.' },
        { status: 400 }
      );
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
        return NextResponse.json(
            { message: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.` },
            { status: 400 }
        );
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // Message générique pour ne pas révéler l'existence d'un email
      return NextResponse.json(
        { message: 'Impossible de créer le compte avec ces informations.' }, 
        { status: 409 } 
      );
    }

    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10); // 10 est le nombre de tours de salage

    // Créer le nouvel utilisateur
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    // Ne pas retourner le mot de passe, même haché, dans la réponse
    return NextResponse.json(
      {
        message: 'Utilisateur créé avec succès.',
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
        },
      },
      { status: 201 } // 201 Created
    );
  } catch (error) {
    console.error("Erreur lors de la création de l'utilisateur:", error);
    if (error instanceof Error && error.name === 'ValidationError') {
        // Extrait les messages d'erreur de validation spécifiques
        interface ValidationError {
            errors: Record<string, { message: string }>;
        }
        const validationError = error as unknown as ValidationError;
        const messages = Object.values(validationError.errors).map((e) => e.message).join(', ');
        return NextResponse.json({ message: `Erreur de validation: ${messages}` }, { status: 400 });
    }
    return NextResponse.json(
      { message: "Erreur serveur lors de la création de l'utilisateur." },
      { status: 500 }
    );
  }
} 