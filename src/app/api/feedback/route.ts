import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/mongodb/dbConnect';
import FeedbackModel from '@/lib/mongodb/models/FeedbackModel';
import { feedbackSchema } from '@/types/feedback';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
  }

  try {
    await dbConnect();

    const body = await req.json();
    const validatedData = feedbackSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({ message: 'Données invalides', errors: validatedData.error.errors }, { status: 400 });
    }

    const { feedbackType, message } = validatedData.data;

    const newFeedback = new FeedbackModel({
      user: session.user.id,
      feedbackType,
      message,
    });

    await newFeedback.save();

    return NextResponse.json({ message: 'Feedback envoyé avec succès' }, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la soumission du feedback:', error);
    return NextResponse.json({ message: 'Erreur interne du serveur' }, { status: 500 });
  }
} 