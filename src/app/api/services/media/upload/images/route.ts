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
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, message: 'Aucun fichier reçu.' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'images');

    // Créer le dossier de destination s'il n'existe pas
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch {
      // Message d'erreur simplifié
      return NextResponse.json({ success: false, message: "Erreur serveur lors de la préparation de l'upload." }, { status: 500 });
    }

    const uploadedImageUrls: string[] = [];
    for (const file of files) {
      const uniqueFileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
      const filePath = path.join(uploadDir, uniqueFileName);
      const publicUrl = `/uploads/images/${uniqueFileName}`; // URL accessible publiquement

      // Lire le contenu du fichier et l'écrire sur le disque
      try {
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(filePath, fileBuffer);
        uploadedImageUrls.push(publicUrl);
      } catch {
        // Le log de l'erreur d'écriture individuelle est supprimé pour éviter la verbosité.
        // L'échec sera capturé par la vérification `uploadedImageUrls.length` plus bas.
      }
    }
    
    if(uploadedImageUrls.length === 0 && files.length > 0){
        return NextResponse.json({ success: false, message: 'Échec de la sauvegarde de toutes les images.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, urls: uploadedImageUrls }, { status: 200 });

  } catch (error) {
    // Le console.error général est supprimé.
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue lors de l\'upload.';
    return NextResponse.json({ success: false, message: 'Erreur serveur lors de l\'upload des images.', error: errorMessage }, { status: 500 });
  }
} 