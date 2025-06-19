import { NextRequest, NextResponse } from 'next/server';
import { initiateScrape } from '@/services/scraping/ledenicheur/scraper';

interface InitiateRequestBody {
  productName: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: InitiateRequestBody = await request.json();
    const { productName } = body;

    if (!productName || typeof productName !== 'string') {
      return NextResponse.json({ message: 'Le nom du produit est requis.' }, { status: 400 });
    }

    // Appelle le service pour initier le scraping
    const result = await initiateScrape(productName);

    // Vérifie si des candidats ont été trouvés
    if (result.candidates.length === 0) {
      return NextResponse.json({
        message: 'Aucun produit correspondant trouvé. Essayez de reformuler votre recherche.'
      }, { status: 404 });
    }

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue.';
    console.error('[API_SCRAPE_INITIATE] Erreur:', errorMessage);
    
    // Renvoyer une réponse d'erreur générique mais informative
    return NextResponse.json({ message: 'Erreur lors de l\'initialisation du scraping.', error: errorMessage }, { status: 500 });
  }
} 