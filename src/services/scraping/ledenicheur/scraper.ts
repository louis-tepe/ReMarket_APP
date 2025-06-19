import {
  LedenicheurProductDetails,
  ScrapeInitiateResponse,
  ScrapeSelectResponse,
} from './ledenicheur.types';

/**
 * @deprecated Utiliser le nouveau flux initiateScrape et selectAndScrape.
 * Fonction principale pour scraper un produit en utilisant le serveur de scraping externe.
 * @param productName Le nom du produit à scraper.
 * @returns Une promesse qui se résout avec les détails du produit ou null.
 */
export const scrapeLedenicheurProduct = async (
  productName: string
): Promise<LedenicheurProductDetails | null> => {
  console.log(`[EXTERNAL_SCRAPER] Lancement du scraping pour: "${productName}"`);

  const scraperUrl = `http://127.0.0.1:8000/scrape`;

  try {
    const response = await fetch(scraperUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: productName }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[EXTERNAL_SCRAPER] Le serveur de scraping a retourné une erreur: ${response.status} ${response.statusText}`
      );
      console.error(`[EXTERNAL_SCRAPER] Détails de l'erreur: ${errorText}`);
      return null;
    }

    const productDetails: LedenicheurProductDetails = await response.json();
    console.log(`[EXTERNAL_SCRAPER] Scraping réussi pour "${productName}".`);
    return productDetails;
  } catch (error) {
    if (error instanceof Error) {
      console.error(
        `[EXTERNAL_SCRAPER] Erreur de communication avec le serveur de scraping: ${error.message}`
      );
    } else {
      console.error(
        `[EXTERNAL_SCRAPER] Une erreur inconnue est survenue lors de la communication avec le serveur de scraping.`
      );
    }
    return null;
  }
};

const SCRAPER_BASE_URL = 'http://127.0.0.1:8000';

/**
 * Étape 1: Initialise une session de scraping.
 * Envoie une requête de recherche et reçoit une liste de produits candidats.
 * @param productName Le nom du produit à rechercher.
 * @returns Un objet contenant l'ID du job et la liste des candidats.
 */
export const initiateScrape = async (
  productName: string
): Promise<ScrapeInitiateResponse> => {
  console.log(`[SCRAPER_INIT] Initialisation pour: "${productName}"`);
  const url = `${SCRAPER_BASE_URL}/scrape/initiate`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: productName, similarity_threshold: 0.1 }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'Réponse non-JSON' }));
    console.error(`[SCRAPER_INIT] Erreur ${response.status}:`, errorBody.message || response.statusText);
    // Propage l'erreur avec un message structuré
    throw new Error(errorBody.message || `Le serveur de scraping a répondu avec le statut ${response.status}`);
  }

  return response.json();
};

/**
 * Étape 2: Sélectionne un produit candidat et lance le scraping détaillé.
 * @param jobId L'ID du job retourné par l'étape 1.
 * @param selectedUrl L'URL du produit choisi par l'utilisateur.
 * @returns Les détails complets du produit scrapé.
 */
export const selectAndScrape = async (
  jobId: string,
  selectedUrl: string
): Promise<ScrapeSelectResponse> => {
  console.log(`[SCRAPER_SELECT] Sélection pour job ${jobId}: "${selectedUrl}"`);
  const url = `${SCRAPER_BASE_URL}/scrape/select`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id: jobId, selected_url: selectedUrl }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'Réponse non-JSON' }));
    console.error(`[SCRAPER_SELECT] Erreur ${response.status}:`, errorBody.message || response.statusText);
    throw new Error(errorBody.message || `Le scraping final a échoué avec le statut ${response.status}`);
  }

  return response.json();
}; 