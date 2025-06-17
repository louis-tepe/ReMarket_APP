import User from '@/lib/mongodb/models/User'; // Modèle User Mongoose
import dbConnect from '@/lib/mongodb/dbConnect';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignUpSchema } from '@/lib/validators/auth';
import { ZodError } from 'zod';

export async function POST(req: NextRequest) {
  try {
    await dbConnect(); // Assurer la connexion à la base de données

    const body = await req.json();
    const { email, name, password } = SignUpSchema.parse(body);

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();

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
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0].message }, { status: 400 });
    }
    
    // Erreur de clé dupliquée de MongoDB (email déjà utilisé)
    if (error instanceof Error && 'code' in error && (error as { code: number }).code === 11000) {
        return NextResponse.json(
            { message: 'Un utilisateur avec cet email existe déjà.' },
            { status: 409 }
        );
    }

    console.error("Erreur lors de la création de l'utilisateur:", error);
    return NextResponse.json(
      { message: "Erreur serveur lors de la création de l'utilisateur." },
      { status: 500 }
    );
  }
} 