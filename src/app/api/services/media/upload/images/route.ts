import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
// import { getServerSession } from "next-auth/next"; // Décommenter pour l'authentification
// import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Décommenter pour l'authentification

export async function POST(request: NextRequest) {
  // TODO: Ajouter la vérification de session utilisateur ici
  // const session = await getServerSession(authOptions);
  // if (!session || !session.user) {
  //   return NextResponse.json({ success: false, message: 'Authentification requise.' }, { status: 401 });
  // }

  try {
    const formData = await request.formData();
    const files = formData.getAll('images') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, message: 'Aucun fichier reçu.' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'images');
    await fs.mkdir(uploadDir, { recursive: true });

    const uploadedFileUrls = [];

    for (const file of files) {
        const uniqueFileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
        const filePath = path.join(uploadDir, uniqueFileName);
        const publicUrl = `/uploads/images/${uniqueFileName}`;

        const fileBuffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(filePath, fileBuffer);

        uploadedFileUrls.push({ url: publicUrl });
    }
    
    return NextResponse.json({ success: true, files: uploadedFileUrls }, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue lors de l'upload.";
    return NextResponse.json({ success: false, message: "Erreur serveur lors de l'upload des images.", error: errorMessage }, { status: 500 });
  }
} 