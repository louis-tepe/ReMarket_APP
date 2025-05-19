import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
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
      console.log(`[API UPLOAD] Dossier d'upload assuré: ${uploadDir}`);
    } catch (mkdirError) {
      console.error("[API UPLOAD] Erreur lors de la création du dossier d'upload:", mkdirError);
      return NextResponse.json({ success: false, message: "Erreur serveur lors de la création du dossier d'upload." }, { status: 500 });
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
        console.log(`[API UPLOAD] Fichier '${file.name}' sauvegardé localement: ${filePath} (URL: ${publicUrl})`);
      } catch (writeError) {
        console.error(`[API UPLOAD] Erreur lors de l'écriture du fichier ${file.name}:`, writeError);
        // Continuer avec les autres fichiers si possible, ou retourner une erreur
        // Pour l'instant, on ne retourne pas d'erreur ici pour tenter de sauvegarder les autres fichiers
      }
    }
    
    if(uploadedImageUrls.length === 0 && files.length > 0){
        return NextResponse.json({ success: false, message: 'Échec de la sauvegarde de toutes les images.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, urls: uploadedImageUrls }, { status: 200 });

  } catch (error) {
    console.error('[API UPLOAD] Erreur lors du traitement des fichiers:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue lors de l\'upload.';
    return NextResponse.json({ success: false, message: 'Erreur serveur lors de l\'upload des images.', error: errorMessage }, { status: 500 });
  }
} 