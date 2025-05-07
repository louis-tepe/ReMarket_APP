import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db.Connect'; // Utilitaire de connexion Mongoose
import User from '@/models/User'; // Modèle User Mongoose

export async function POST(req: NextRequest) {
  try {
    await dbConnect(); // Assurer la connexion à la base de données

    const { email, name, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email et mot de passe sont requis.' },
        { status: 400 }
      );
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { message: 'Un utilisateur avec cet email existe déjà.' },
        { status: 409 } // 409 Conflict
      );
    }

    // Hacher le mot de passe
    if (password.length < 6) { // Exemple de validation simple de la longueur du mot de passe
        return NextResponse.json(
            { message: 'Le mot de passe doit contenir au moins 6 caractères.' },
            { status: 400 }
        );
    }
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
    // Gestion plus fine des erreurs de Mongoose (ex: validation)
    if (error instanceof Error && error.name === 'ValidationError') {
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { message: "Erreur serveur lors de la création de l'utilisateur." },
      { status: 500 }
    );
  }
} 