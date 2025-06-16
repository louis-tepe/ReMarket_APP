import { LedenicheurProductDetails } from './ledenicheur.types';

/**
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