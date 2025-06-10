import {
  PlaywrightCrawler,
  PlaywrightCrawlingContext,
  log,
} from 'crawlee';
import * as cheerio from 'cheerio';
import { URL } from 'url';

import {
  LedenicheurProductDetails,
  LedenicheurSearchResultItem
} from './ledenicheur.types';
import {
  normalizeProductTitle,
} from '../utils/scraper.utils';
import { SEARCH_RESULTS_SELECTORS } from './ledenicheur.selectors';
import {
  extractLedenicheurProductDetails,
  handleLedenicheurCookieConsent,
  calculateSimilarityWithProductTypeBonus,
} from './ledenicheur.helpers';
import { SELECTOR_TIMEOUT_MS } from '../scraping.config';

const LEDENICHEUR_BASE_URL = 'https://ledenicheur.fr';

/**
 * Fonction principale pour scraper un produit sur Ledenicheur.fr en utilisant un seul crawler unifié.
 * @param productName Le nom du produit à scraper.
 * @returns Une promesse qui se résout avec les détails du produit ou null.
 */
export const scrapeLedenicheurProduct = async (
  productName: string
): Promise<LedenicheurProductDetails | null> => {
  log.info(`[LEDENICHEUR_SCRAPER] Début du scraping unifié pour: "${productName}"`);

  const searchUrl = new URL(`/search?query=${encodeURIComponent(productName)}`, LEDENICHEUR_BASE_URL).toString();
  let productDetails: LedenicheurProductDetails | null = null;

  const crawler = new PlaywrightCrawler({
    headless: true, // Mettre à false pour le debug visuel
    requestHandler: async (context) => {
      const { request, page, log, crawler } = context;
      const { userData } = request;

      if (userData.type === 'SEARCH') {
        // --- LOGIQUE DE LA PAGE DE RECHERCHE ---
        log.info(`[SEARCH_HANDLER] Traitement de la recherche : ${request.url}`);
        const normalizedSearchedProductName = normalizeProductTitle(productName);

        await handleLedenicheurCookieConsent(page, log, 'page de recherche');
        try {
            await page.waitForSelector(SEARCH_RESULTS_SELECTORS.PRODUCT_LIST_CONTAINER, { timeout: SELECTOR_TIMEOUT_MS });
        } catch {
            log.warning(`Conteneur de résultats non trouvé pour "${productName}"`);
            return;
        }

        const html = await page.content();
        const $ = cheerio.load(html);

        const searchResults: LedenicheurSearchResultItem[] = [];
        $(SEARCH_RESULTS_SELECTORS.PRODUCT_LIST_CONTAINER).find(SEARCH_RESULTS_SELECTORS.PRODUCT_ITEM).each((_, el) => {
            const title = $(el).find(SEARCH_RESULTS_SELECTORS.PRODUCT_TITLE_IN_CARD).text().trim();
            let productPageUrl = $(el).find(SEARCH_RESULTS_SELECTORS.PRODUCT_LINK).attr('href');
            if (title && productPageUrl) {
                productPageUrl = new URL(productPageUrl, LEDENICHEUR_BASE_URL).toString();
                searchResults.push({ title, productPageUrl });
            }
        });

        log.info(`[SEARCH_HANDLER] ${searchResults.length} produits trouvés pour "${productName}".`);

        if (searchResults.length > 0) {
            const candidates = searchResults
                .filter(item => item.title)
                .map(item => {
                    const normalizedItemTitle = normalizeProductTitle(item.title!);
                    const similarity = calculateSimilarityWithProductTypeBonus(productName, item.title!, normalizedSearchedProductName, normalizedItemTitle);
                    return { ...item, similarity };
                }).sort((a, b) => b.similarity - a.similarity);

            const bestCandidate = candidates[0];

            if (bestCandidate && bestCandidate.productPageUrl) {
                log.info(`[SEARCH_HANDLER] Meilleur résultat: "${bestCandidate.title}" (${bestCandidate.similarity.toFixed(4)}). Ajout à la file.`);
                await crawler.addRequests([{
                    url: bestCandidate.productPageUrl,
                    userData: { type: 'PRODUCT' },
                }]);
            } else {
                log.warning(`[SEARCH_HANDLER] Aucun résultat trouvé avec une similarité suffisante pour "${productName}".`);
            }
        }

      } else if (userData.type === 'PRODUCT') {
        // --- LOGIQUE DE LA PAGE PRODUIT ---
        log.info(`[PRODUCT_HANDLER] Traitement de la page produit: ${request.url}`);
        await handleLedenicheurCookieConsent(page, log, 'page produit');

        const extractedDetails = await extractLedenicheurProductDetails(context);
        if (extractedDetails) {
            const imageUrls = await extractImagesWithMultipleStrategies(page, log, productName);
            productDetails = {
                ...extractedDetails,
                imageUrls: imageUrls,
            };
            log.info(`[PRODUCT_HANDLER] Scraping de la page produit réussi pour ${request.url}`);
        } else {
            log.warning(`[PRODUCT_HANDLER] Impossible d'extraire les détails pour ${request.url}`);
        }
      }
    },
    failedRequestHandler({ request, log }) {
        log.error(`[SCRAPER_FAILURE] La requête a échoué: ${request.url}`);
    },
  });

  await crawler.run([{
    url: searchUrl,
    userData: { type: 'SEARCH' }
  }]);

  log.info(`[LEDENICHEUR_SCRAPER] Scraping unifié terminé. Détails ${productDetails ? 'trouvés' : 'non trouvés'}.`);
  return productDetails;
};


/**
 * Extrait les images avec plusieurs stratégies d'extraction (version placeholder).
 */
async function extractImagesWithMultipleStrategies(
  page: PlaywrightCrawlingContext['page'],
  log: PlaywrightCrawlingContext['log'],
  productNameForLog: string
): Promise<string[]> {
  log.info(`(Placeholder) L'extraction d'images pour "${productNameForLog}" n'est pas implémentée.`);
  return [];
} 