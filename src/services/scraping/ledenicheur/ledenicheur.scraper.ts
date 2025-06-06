import {
  PlaywrightCrawler,
  PlaywrightCrawlingContext,
  log,
  RequestQueue,
} from 'crawlee';
import * as cheerio from 'cheerio';
import { URL } from 'url';
import { compareTwoStrings } from 'string-similarity';

import {
  LedenicheurProductDetails,
  LedenicheurSearchResultItem
} from './ledenicheur.types'; 
import {
  normalizeProductTitle,
  extractText,
  randomDelay,
} from '../utils/scraper.utils'; 
import { downloadAndSaveImages } from '../utils/image.utils';
import { SEARCH_RESULTS_SELECTORS, PRODUCT_PAGE_SELECTORS } from './ledenicheur.selectors';
import {
  extractLedenicheurProductDetails,
  handleLedenicheurCookieConsent,
  calculateSimilarityWithProductTypeBonus,
} from './ledenicheur.helpers'; 
import {
  IS_PRODUCTION_MODE,
  LEDENICHEUR_SIMILARITY_THRESHOLD,
  getRandomUserAgent,
  getStealthLaunchOptions,
  NAVIGATION_TIMEOUT_MS,
  REQUEST_HANDLER_TIMEOUT_MS,
  SELECTOR_TIMEOUT_MS,
  SLOW_MO_MS,
  PROXY_CONFIGURATION,
  SHORT_RANDOM_DELAY_MIN_MS,
  SHORT_RANDOM_DELAY_MAX_MS,
  SHORT_SELECTOR_TIMEOUT_MS,
  POST_ACTION_DELAY_MIN_MS,
} from '../scraping.config';

const LEDENICHEUR_BASE_URL = 'https://ledenicheur.fr';

/**
 * Construit l'URL de recherche pour Ledenicheur.
 * @param productName - Le nom du produit à rechercher.
 * @returns L'URL de recherche complète.
 */
const constructLedenicheurSearchUrl = (productName: string): string => {
  const encodedProductName = encodeURIComponent(productName);
  return `${LEDENICHEUR_BASE_URL}/search?query=${encodedProductName}`;
};

/**
 * Extrait les informations des produits à partir des éléments de la liste des résultats de recherche.
 * @param $ - L'instance CheerioAPI de la page de recherche.
 * @returns Un tableau d'objets LedenicheurSearchResultItem.
 */
const extractSearchResults = (
  $: cheerio.CheerioAPI
): LedenicheurSearchResultItem[] => {
  const results: LedenicheurSearchResultItem[] = [];
  $(SEARCH_RESULTS_SELECTORS.PRODUCT_LIST_CONTAINER)
    .find(SEARCH_RESULTS_SELECTORS.PRODUCT_ITEM)
    .each((_, el) => {
      const itemElement = $(el);
      const productCard = itemElement.find(SEARCH_RESULTS_SELECTORS.PRODUCT_CARD_WRAPPER);
      if (productCard.length === 0) return; // Passer si pas une carte produit valide

      const title = extractText($, SEARCH_RESULTS_SELECTORS.PRODUCT_TITLE_IN_CARD, productCard);
      let productPageUrl = productCard.find(SEARCH_RESULTS_SELECTORS.PRODUCT_LINK).attr('href');
      if (productPageUrl) {
        productPageUrl = new URL(productPageUrl, LEDENICHEUR_BASE_URL).toString();
      }

      const imageUrl = productCard.find(SEARCH_RESULTS_SELECTORS.PRODUCT_IMAGE).attr('src');
      // TODO: Nettoyer/rendre absolue l'URL de l'image si nécessaire

      const priceText = extractText($, SEARCH_RESULTS_SELECTORS.PRODUCT_PRICE_TEXT, productCard);
      const priceUsedText = extractText($, SEARCH_RESULTS_SELECTORS.PRODUCT_PRICE_USED_TEXT, productCard);
      const merchantInfo = extractText($, SEARCH_RESULTS_SELECTORS.PRODUCT_MERCHANT_INFO, productCard);
      const category = extractText($, SEARCH_RESULTS_SELECTORS.PRODUCT_CATEGORY, productCard);
      
      if (title && productPageUrl) {
        results.push({
          title,
          productPageUrl,
          imageUrl: imageUrl || undefined,
          priceText: priceText || undefined,
          priceUsedText: priceUsedText || undefined,
          merchantInfo: merchantInfo || undefined,
          category: category || undefined,
        });
      }
    });
  return results;
};

/**
 * Recherche un produit sur Ledenicheur.fr et retourne l'URL de la page du produit le plus pertinent.
 * @param productName Le nom du produit à rechercher.
 * @returns Une promesse qui se résout avec l'URL du produit ou null.
 */
const searchLedenicheurProductUrl = async (
  productName: string,
): Promise<string | null> => {
  const searchUrl = constructLedenicheurSearchUrl(productName);
  const requestQueue = await RequestQueue.open(`ledenicheur-search-${Date.now()}`);
  await requestQueue.addRequest({ url: searchUrl, uniqueKey: `ledenicheur_search_${productName}` });

  log.info(`[SEARCH_PRODUCT_URL] Début de la recherche pour: "${productName}" sur ${searchUrl}`);
  const normalizedSearchedProductName = normalizeProductTitle(productName);
  log.info(`[SEARCH_PRODUCT_URL] Nom du produit normalisé pour la recherche: "${normalizedSearchedProductName}"`);

  let foundUrl: string | null = null;

  const searchCrawler = new PlaywrightCrawler({
    requestQueue,
    headless: IS_PRODUCTION_MODE,
    launchContext: {
      launchOptions: { 
        slowMo: SLOW_MO_MS,
        ...getStealthLaunchOptions(),
      },
      userAgent: getRandomUserAgent(),
    },
    proxyConfiguration: PROXY_CONFIGURATION,
    maxRequestsPerCrawl: 1, // Une seule page de recherche à traiter
    requestHandlerTimeoutSecs: REQUEST_HANDLER_TIMEOUT_MS / 1000,
    navigationTimeoutSecs: NAVIGATION_TIMEOUT_MS / 1000,
    async requestHandler({ page, request, log, $ }: PlaywrightCrawlingContext) {
      log.info(`[SEARCH_PRODUCT_URL] Traitement des résultats de recherche Ledenicheur: ${request.url}`);
      
      // Bloquer les ressources inutiles (images, CSS, fonts, trackers)
      await page.route('**/*', route => {
        const resourceType = route.request().resourceType();
        const url = route.request().url();
        const domainsToBlock = [
          'google-analytics.com', 'googletagmanager.com', 'facebook.net', 'twitter.com',
          'bing.com', 'hotjar.com', 'criteo.com', 'adservice.google.com',
          'googlesyndication.com', 'doubleclick.net',
          // Domaines spécifiques à Ledenicheur/Prisjakt si identifiés comme non essentiels
          'cdn.pji.nu', // Semble être pour les assets (icônes étoiles etc)
        ];
        // Aborter les images et feuilles de style pour accélérer, sauf si on a besoin des images pour le scraping initial
        if (['font', 'media'].includes(resourceType) || domainsToBlock.some(domain => url.includes(domain))) {
            route.abort();
        } else if (resourceType === 'stylesheet') { // Garder les CSS car Tailwind est utilisé
            route.continue();
        } else if (resourceType === 'image' && !url.includes('pricespy-75b8.kxcdn.com')) { // Bloquer les images SAUF celles des produits sur la liste
            route.abort();
        } else {
            route.continue();
        }
      });

      await handleLedenicheurCookieConsent(page, log, 'page de recherche');
      await randomDelay(SHORT_RANDOM_DELAY_MIN_MS, SHORT_RANDOM_DELAY_MAX_MS);

      try {
        await page.waitForSelector(SEARCH_RESULTS_SELECTORS.PRODUCT_LIST_CONTAINER, { state: 'visible', timeout: SELECTOR_TIMEOUT_MS });
      } catch (e) {
        log.warning(`[SEARCH_PRODUCT_URL] Conteneur de résultats (${SEARCH_RESULTS_SELECTORS.PRODUCT_LIST_CONTAINER}) non visible ou non trouvé sur ${request.url}. Produit: "${productName}".`, { error: (e as Error).message });
        return;
      }
      
      // Solution pour corriger l'erreur "$ is not a function"
      let cheerioInstance: cheerio.CheerioAPI;
      
      if ($ && typeof $ === 'function') {
        // Utiliser $ fourni par le contexte si disponible
        cheerioInstance = $ as cheerio.CheerioAPI;
      } else {
        // Fallback: créer une instance Cheerio manuellement
        log.warning(`[SEARCH_PRODUCT_URL] $ non disponible dans le contexte, création manuelle d'une instance Cheerio`);
        const html = await page.content();
        cheerioInstance = cheerio.load(html);
      }
      
      const searchResults = extractSearchResults(cheerioInstance);
      log.info(`[SEARCH_PRODUCT_URL] ${searchResults.length} produits extraits de la page de recherche pour "${productName}".`);

      if (searchResults.length > 0) {
        const candidates = searchResults
          .map(item => {
            if (!item.title) return null;
            const normalizedItemTitle = normalizeProductTitle(item.title);
            // Utiliser la nouvelle fonction de similarité qui tient compte du type de produit
            const similarity = calculateSimilarityWithProductTypeBonus(
              productName,
              item.title,
              normalizedSearchedProductName,
              normalizedItemTitle
            );
            // Log de chaque candidat et de sa similarité
            log.info(`[SEARCH_PRODUCT_URL_DEBUG] Candidat: "${item.title}" (Normalisé: "${normalizedItemTitle}"), Similarité avec "${normalizedSearchedProductName}": ${similarity.toFixed(4)}`);
            return { ...item, similarity, normalizedItemTitle };
          })
          .filter(item => item !== null) // Garder tous les items pour le tri initial, filtrer après
          .sort((a, b) => b!.similarity - a!.similarity);

        // Log des 5 meilleurs candidats pour analyse
        if (candidates.length > 0) {
            log.info(`[SEARCH_PRODUCT_URL_DEBUG] Top 5 candidats (ou moins) pour "${productName}":`);
            candidates.slice(0, 5).forEach(candidate => {
                log.info(`  - Titre: "${candidate!.title}", Similarité: ${candidate!.similarity.toFixed(4)}, URL: ${candidate!.productPageUrl}`);
            });
        }
        
        const bestMatch = candidates.find(candidate => candidate!.similarity >= LEDENICHEUR_SIMILARITY_THRESHOLD);

        if (bestMatch && bestMatch.productPageUrl) {
          foundUrl = bestMatch.productPageUrl;
          log.info(`[SEARCH_PRODUCT_URL] Meilleur résultat pour "${productName}": "${bestMatch.title}" (Similarité: ${bestMatch.similarity.toFixed(4)}) - URL: ${foundUrl}`);
        } else {
          log.warning(`[SEARCH_PRODUCT_URL] Aucun produit trouvé pour "${productName}" avec une similarité >= ${LEDENICHEUR_SIMILARITY_THRESHOLD}`);
          if (candidates.length > 0) {
            log.info(`[SEARCH_PRODUCT_URL_DEBUG] Le meilleur candidat était "${candidates[0]!.title}" avec une similarité de ${candidates[0]!.similarity.toFixed(4)}, ce qui est inférieur au seuil.`);
          }
        }
      } else {
        log.warning(`[SEARCH_PRODUCT_URL] Aucun produit brut extrait de la page de recherche pour "${productName}".`);
      }
    },
    async failedRequestHandler({ request, log }, error) {
      log.error(`[SEARCH_PRODUCT_URL] Échec de la requête pour ${request.url}: ${error.message}`);
    },
  });

  await searchCrawler.run();
  await requestQueue.drop(); // Nettoyer la file d'attente
  return foundUrl;
};

/**
 * Scrape les détails d'une page produit Ledenicheur.
 * @param productUrl L'URL de la page produit.
 * @param searchUrlReferer L'URL de recherche qui a mené à cette page produit (pour logs/contexte).
 * @param productNameForLog Le nom du produit originalement recherché (pour logs).
 * @returns Une promesse qui se résout avec les détails du produit ou null.
 */
const scrapeLedenicheurProductPage = async (
  productUrl: string,
  searchUrlReferer: string, // Peut être utile pour le logging ou debug
  productNameForLog: string
): Promise<LedenicheurProductDetails | null> => {
  const requestQueue = await RequestQueue.open(`ledenicheur-product-${Date.now()}`);
  await requestQueue.addRequest({ url: productUrl, uniqueKey: `ledenicheur_product_${productUrl}` });

  log.info(`[SCRAPE_PRODUCT_PAGE] Début du scraping pour: "${productNameForLog}" sur ${productUrl}`);
  let productDetails: LedenicheurProductDetails | null = null;

  const productCrawler = new PlaywrightCrawler({
    requestQueue,
    headless: IS_PRODUCTION_MODE,
    launchContext: {
      launchOptions: { 
        slowMo: SLOW_MO_MS,
        ...getStealthLaunchOptions(),
      },
      userAgent: getRandomUserAgent(),
    },
    proxyConfiguration: PROXY_CONFIGURATION,
    maxRequestsPerCrawl: 1,
    requestHandlerTimeoutSecs: REQUEST_HANDLER_TIMEOUT_MS / 1000,
    navigationTimeoutSecs: NAVIGATION_TIMEOUT_MS / 1000,
    async requestHandler(context: PlaywrightCrawlingContext) {
      const { page, request, log } = context;
      log.info(`[SCRAPE_PRODUCT_PAGE] Traitement de la page produit: ${request.url}`);
      
      // Bloquer ressources non essentielles
      await page.route('**/*', route => {
        const resourceType = route.request().resourceType();
        const url = route.request().url();
        const domainsToBlock = [
            'google-analytics.com', 'googletagmanager.com', 'facebook.net', 'twitter.com',
            'bing.com', 'hotjar.com', 'criteo.com', 'adservice.google.com',
            'googlesyndication.com', 'doubleclick.net', 'cdn.pji.nu'
        ];
        // Garder les images car nous allons les scraper, mais bloquer le reste
        if (resourceType === 'image') {
          route.continue();
        } else if (['font', 'media', 'stylesheet'].includes(resourceType) || domainsToBlock.some(domain => url.includes(domain))) {
            route.abort();
        } else {
            route.continue();
        }
    });

      await handleLedenicheurCookieConsent(page, log, 'page produit');
      // Augmenter le délai après la gestion des cookies pour laisser le temps à l'UI de se stabiliser
      await page.waitForTimeout(POST_ACTION_DELAY_MIN_MS * 2); 

      try {
        await page.waitForSelector(PRODUCT_PAGE_SELECTORS.PRODUCT_INFO_WRAPPER, { state: 'visible', timeout: SELECTOR_TIMEOUT_MS });
        log.info(`[SCRAPE_PRODUCT_PAGE] Conteneur d'informations produit (${PRODUCT_PAGE_SELECTORS.PRODUCT_INFO_WRAPPER}) trouvé et visible.`);
      } catch (e) {
        log.warning(`[SCRAPE_PRODUCT_PAGE] Conteneur d'informations produit (${PRODUCT_PAGE_SELECTORS.PRODUCT_INFO_WRAPPER}) non visible ou non trouvé sur ${request.url}. Produit: "${productNameForLog}".`, { error: (e as Error).message });
        
        try {
          const debugSelectors = [
            'div[id*="properties"]',
            'div[class*="SectionWrapper"]',
            'section[data-test*="Properties"]',
            'h2:contains("Info produit")',
            'h2.Text--q06h0j',
            'div[data-test-type="product-info"]'
          ];
          
          for (const selector of debugSelectors) {
            const elements = await page.locator(selector).count();
            if (elements > 0) {
              log.info(`[SCRAPE_PRODUCT_PAGE_DEBUG] Trouvé ${elements} élément(s) pour le sélecteur: ${selector}`);
            }
          }
        } catch (debugError) {
          log.warning(`[SCRAPE_PRODUCT_PAGE_DEBUG] Erreur lors du débogage: ${(debugError as Error).message}`);
        }
        
        return; 
      }
      
      productDetails = await extractLedenicheurProductDetails(context);

      if (productDetails) {
        // Scraper les images avec stratégies multiples
        try {
          log.info(`[SCRAPE_PRODUCT_PAGE] Tentative d'extraction des images pour ${productNameForLog}`);
          const imageUrls = await extractImagesWithMultipleStrategies(page, log, productNameForLog);
          
          if (imageUrls.length > 0) {
            // Créer un slug basé sur le nom du produit pour organiser les images
            const productSlug = productNameForLog.toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '');
            
            log.info(`[SCRAPE_PRODUCT_PAGE] Début du téléchargement de ${imageUrls.length} images pour ${productNameForLog}...`);
            const localImageUrls = await downloadAndSaveImages(imageUrls, productSlug);
            
            if (localImageUrls.length > 0) {
              productDetails.imageUrls = localImageUrls;
              log.info(`[SCRAPE_PRODUCT_PAGE] ${localImageUrls.length} images téléchargées et enregistrées localement pour ${productNameForLog}.`);
            } else {
              log.warning(`[SCRAPE_PRODUCT_PAGE] Aucune image n'a pu être téléchargée localement pour ${productNameForLog}.`);
              productDetails.imageUrls = imageUrls; // Fallback vers les URLs distantes
            }
          } else {
            log.warning(`[SCRAPE_PRODUCT_PAGE] Aucune image trouvée pour ${productNameForLog}`);
            productDetails.imageUrls = [];
          }
        } catch (imgError) {
          log.error(`[SCRAPE_PRODUCT_PAGE] Erreur lors du scraping des images pour ${productNameForLog}: ${(imgError as Error).message}`, { error: imgError });
          productDetails.imageUrls = [];
        }
      }
    },
    async failedRequestHandler({ request, log }, error) {
      log.error(`[SCRAPE_PRODUCT_PAGE] Échec de la requête pour ${request.url}: ${error.message}`);
    },
  });

  await productCrawler.run();
  await requestQueue.drop();
  return productDetails;
};

/**
 * Extrait les images avec plusieurs stratégies d'extraction.
 */
const extractImagesWithMultipleStrategies = async (
  page: PlaywrightCrawlingContext['page'],
  log: PlaywrightCrawlingContext['log'],
  productNameForLog: string
): Promise<string[]> => {
  let imageUrls: string[] = [];
  
  // Stratégie 0: Extraction directe de toutes les images pricespy d'abord (le plus fiable)
  try {
    log.info('[EXTRACT_IMAGES_STRATEGY_0] Extraction directe des images pricespy avant lightbox');
    
    const allPricespyImages = await page.locator('img[src*="pricespy-75b8.kxcdn.com"]').all();
    log.info(`[EXTRACT_IMAGES_STRATEGY_0] Trouvé ${allPricespyImages.length} images pricespy sur la page`);
    
    for (const imgLocator of allPricespyImages) {
      try {
        const src = await imgLocator.getAttribute('src');
        if (src && src.trim() !== '' && src.includes('/product/')) {
          // Essayer de convertir en version 800px si ce n'est pas déjà le cas
          const fullSizeUrl = src.replace(/\/(front|back|left|right|top|standard|280)\//g, '/800/');
          if (!imageUrls.includes(fullSizeUrl)) {
            imageUrls.push(new URL(fullSizeUrl, LEDENICHEUR_BASE_URL).toString());
            log.info(`[EXTRACT_IMAGES_STRATEGY_0] Image ajoutée: ${fullSizeUrl}`);
          }
        }
      } catch (e) {
        log.warning(`[EXTRACT_IMAGES_STRATEGY_0] Erreur lors de l'extraction d'une image: ${(e as Error).message}`);
      }
    }
    
    log.info(`[EXTRACT_IMAGES_STRATEGY_0] ${imageUrls.length} images extraites directement`);
    
    // Si on a déjà des images, pas besoin d'ouvrir la lightbox
    if (imageUrls.length > 0) {
      return imageUrls;
    }
  } catch (error) {
    log.warning(`[EXTRACT_IMAGES_STRATEGY_0] Erreur: ${(error as Error).message}`);
  }
  
  // Stratégie 1: Essayer d'ouvrir la lightbox via le bouton média
  try {
    log.info('[EXTRACT_IMAGES_STRATEGY_1] Tentative d\'ouverture de la lightbox');
    
    // Sélecteurs multiples pour le bouton média
    const mediaButtonSelectors = [
      'button[data-test="ProductMedia"]',
      'button:has(img)', // Bouton contenant une image
      'div[data-test="ProductMedia"] button',
      'button[aria-label*="image" i]',
      'button[aria-label*="photo" i]',
      '[role="button"]:has(img)',
      'div[data-sentry-component="DynamicImage"] ~ button',
      'img[src*="pricespy"]:not([alt=""]) ~ button'
    ];
    
    let mediaButtonFound = false;
    for (const selector of mediaButtonSelectors) {
      try {
        const mediaButtonLocator = page.locator(selector).first();
        if (await mediaButtonLocator.isVisible({ timeout: SHORT_SELECTOR_TIMEOUT_MS })) {
          log.info(`[EXTRACT_IMAGES_STRATEGY_1] Bouton média trouvé avec sélecteur: ${selector}`);
          
          // Gérer les overlays potentiels
          await handlePotentialOverlays(page, log);
          
          await mediaButtonLocator.click({ timeout: POST_ACTION_DELAY_MIN_MS * 2 });
          await page.waitForTimeout(POST_ACTION_DELAY_MIN_MS * 2);
          mediaButtonFound = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!mediaButtonFound) {
      log.warning('[EXTRACT_IMAGES_STRATEGY_1] Aucun bouton média trouvé');
    } else {
      // Vérifier si la lightbox est ouverte avec sélecteurs multiples
      const lightboxSelectors = [
        'div.Lightbox-sc-0-0',
        'div[data-test="Carousel"]',
        'div.CarouselWrapper-sc-0-3',
        'div[class*="Lightbox"]',
        'div[class*="Modal"]:has(img)',
        'div.ReactModal__Overlay--after-open'
      ];
      
      let lightboxContainer = null;
      for (const selector of lightboxSelectors) {
        try {
          const container = page.locator(selector).first();
          if (await container.isVisible({ timeout: SHORT_SELECTOR_TIMEOUT_MS })) {
            lightboxContainer = container;
            log.info(`[EXTRACT_IMAGES_STRATEGY_1] Lightbox trouvée avec sélecteur: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (lightboxContainer) {
        log.info('[EXTRACT_IMAGES_STRATEGY_1] Lightbox ouverte, extraction des images');
        
        // Sélecteurs multiples pour les images dans la lightbox
        const imageSelectors = [
          'div.CarouselSlide-sc-0-4 img',
          'div[data-index] img',
          'div[class*="Slide"] img',
          'img[src*="pricespy"]',
          'img[src*="product"]'
        ];
        
        let imagesFound = false;
        for (const imgSelector of imageSelectors) {
          try {
            const carouselImages = await lightboxContainer.locator(imgSelector).all();
            if (carouselImages.length > 0) {
              log.info(`[EXTRACT_IMAGES_STRATEGY_1] ${carouselImages.length} images trouvées avec sélecteur: ${imgSelector}`);
              
              for (const imgLocator of carouselImages) {
                try {
                  const src = await imgLocator.getAttribute('src');
                  if (src && src.trim() !== '' && !imageUrls.includes(src)) {
                    const fullUrl = new URL(src, LEDENICHEUR_BASE_URL).toString();
                    imageUrls.push(fullUrl);
                    log.info(`[EXTRACT_IMAGES_STRATEGY_1] Image extraite: ${fullUrl}`);
                  }
                } catch (e) {
                  log.warning(`[EXTRACT_IMAGES_STRATEGY_1] Erreur lors de l'extraction d'une image: ${(e as Error).message}`);
                }
              }
              imagesFound = true;
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (!imagesFound) {
          log.warning('[EXTRACT_IMAGES_STRATEGY_1] Aucune image trouvée dans la lightbox avec les sélecteurs disponibles');
          
          // Debug: afficher le contenu de la lightbox
          try {
            const lightboxHTML = await lightboxContainer.innerHTML();
            log.info(`[EXTRACT_IMAGES_STRATEGY_1_DEBUG] Contenu lightbox (premiers 500 chars): ${lightboxHTML.substring(0, 500)}`);
          } catch (e) {
            log.warning(`[EXTRACT_IMAGES_STRATEGY_1_DEBUG] Impossible d'extraire le HTML de la lightbox`);
          }
        }
        
        log.info(`[EXTRACT_IMAGES_STRATEGY_1] ${imageUrls.length} images extraites de la lightbox`);
        
        // Fermer la lightbox
        try {
          const closeSelectors = [
            'button[aria-label="Close lightbox"]',
            'button[aria-label*="close" i]',
            'button[aria-label*="fermer" i]',
            'button:has-text("×")',
            'button:has-text("X")',
            'button[class*="close"]'
          ];
          
          let lightboxClosed = false;
          for (const closeSelector of closeSelectors) {
            try {
              const closeButton = lightboxContainer.locator(closeSelector).first();
              if (await closeButton.isVisible({ timeout: SHORT_SELECTOR_TIMEOUT_MS / 2 })) {
                await closeButton.click();
                await page.waitForTimeout(POST_ACTION_DELAY_MIN_MS / 2);
                lightboxClosed = true;
                break;
              }
            } catch (e) {
              continue;
            }
          }
          
          if (!lightboxClosed) {
            // Essayer d'appuyer sur Escape
            await page.keyboard.press('Escape');
            await page.waitForTimeout(POST_ACTION_DELAY_MIN_MS / 2);
          }
        } catch (e) {
          log.warning(`[EXTRACT_IMAGES_STRATEGY_1] Impossible de fermer la lightbox: ${(e as Error).message}`);
        }
      } else {
        log.warning('[EXTRACT_IMAGES_STRATEGY_1] Lightbox non visible après clic sur le bouton média');
      }
    }
  } catch (error) {
    log.warning(`[EXTRACT_IMAGES_STRATEGY_1] Erreur: ${(error as Error).message}`);
  }
  
  // Stratégie 2: Extraction directe du carrousel visible (sans lightbox)
  if (imageUrls.length === 0) {
    try {
      log.info('[EXTRACT_IMAGES_STRATEGY_2] Tentative d\'extraction directe du carrousel');
      
      const carouselSelectors = [
        'div[data-test="Carousel"]',
        'div.CarouselWrapper-sc-0-3',
        'div[class*="Carousel"]',
        'div.react-swipe-container'
      ];
      
      for (const carouselSelector of carouselSelectors) {
        try {
          const carouselContainer = page.locator(carouselSelector).first();
          if (await carouselContainer.isVisible({ timeout: SHORT_SELECTOR_TIMEOUT_MS })) {
            log.info(`[EXTRACT_IMAGES_STRATEGY_2] Carrousel trouvé avec: ${carouselSelector}`);
            
            const carouselImages = await carouselContainer.locator('img[src*="pricespy"]').all();
            
            for (const imgLocator of carouselImages) {
              try {
                const src = await imgLocator.getAttribute('src');
                if (src && src.trim() !== '' && !imageUrls.includes(src)) {
                  imageUrls.push(new URL(src, LEDENICHEUR_BASE_URL).toString());
                  log.info(`[EXTRACT_IMAGES_STRATEGY_2] Image extraite: ${src}`);
                }
              } catch (e) {
                log.warning(`[EXTRACT_IMAGES_STRATEGY_2] Erreur lors de l'extraction d'une image: ${(e as Error).message}`);
              }
            }
            
            if (carouselImages.length > 0) {
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }
      
      log.info(`[EXTRACT_IMAGES_STRATEGY_2] ${imageUrls.length} images extraites du carrousel direct`);
    } catch (error) {
      log.warning(`[EXTRACT_IMAGES_STRATEGY_2] Erreur: ${(error as Error).message}`);
    }
  }
  
  // Stratégie 3: Extraction des miniatures et conversion en taille standard
  if (imageUrls.length === 0) {
    try {
      log.info('[EXTRACT_IMAGES_STRATEGY_3] Tentative d\'extraction des miniatures');
      
      const thumbnailSelectors = [
        'ul.List-sc-0-6 li img',
        'img[src*="/280/"]',
        'img[src*="pricespy"][width="280"]',
        'img[src*="thumbnail"]'
      ];
      
      for (const thumbSelector of thumbnailSelectors) {
        try {
          const thumbnailImages = await page.locator(thumbSelector).all();
          
          if (thumbnailImages.length > 0) {
            log.info(`[EXTRACT_IMAGES_STRATEGY_3] ${thumbnailImages.length} miniatures trouvées avec: ${thumbSelector}`);
            
            for (const imgLocator of thumbnailImages) {
              try {
                const src = await imgLocator.getAttribute('src');
                if (src && src.trim() !== '') {
                  // Convertir les miniatures en images de taille standard
                  const fullSizeUrl = src.replace(/\/(280|thumb|thumbnail)\//g, '/800/');
                  if (!imageUrls.includes(fullSizeUrl)) {
                    imageUrls.push(new URL(fullSizeUrl, LEDENICHEUR_BASE_URL).toString());
                    log.info(`[EXTRACT_IMAGES_STRATEGY_3] Miniature convertie: ${src} -> ${fullSizeUrl}`);
                  }
                }
              } catch (e) {
                log.warning(`[EXTRACT_IMAGES_STRATEGY_3] Erreur lors de l'extraction d'une miniature: ${(e as Error).message}`);
              }
            }
            
            if (thumbnailImages.length > 0) {
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }
      
      log.info(`[EXTRACT_IMAGES_STRATEGY_3] ${imageUrls.length} images extraites des miniatures`);
    } catch (error) {
      log.warning(`[EXTRACT_IMAGES_STRATEGY_3] Erreur: ${(error as Error).message}`);
    }
  }
  
  // Nettoyer et dédupliquer les URLs
  const uniqueImageUrls = [...new Set(imageUrls)]
    .filter(url => url && url.trim() !== '' && url.includes('pricespy'))
    .map(url => {
      // S'assurer que toutes les URLs sont en 800px pour une qualité optimale
      return url.replace(/\/(280|front|back|left|right|top|standard)\//g, '/800/');
    });
  
  // Supprimer les doublons après conversion
  const finalImageUrls = [...new Set(uniqueImageUrls)];
  
  log.info(`[EXTRACT_IMAGES_FINAL] ${finalImageUrls.length} images uniques extraites pour ${productNameForLog}`);
  
  if (finalImageUrls.length > 0) {
    finalImageUrls.forEach((url, index) => {
      log.info(`[EXTRACT_IMAGES_FINAL] ${index + 1}. ${url}`);
    });
  }
  
  return finalImageUrls;
};

/**
 * Gère les overlays potentiels qui pourraient bloquer l'interaction.
 */
const handlePotentialOverlays = async (
  page: PlaywrightCrawlingContext['page'],
  log: PlaywrightCrawlingContext['log']
): Promise<void> => {
  const overlaySelector = 'div.ReactModal__Overlay--after-open';
  const overlayLocator = page.locator(overlaySelector).first();
  
  if (await overlayLocator.isVisible({ timeout: SHORT_SELECTOR_TIMEOUT_MS / 2 })) {
    log.info('[HANDLE_OVERLAY] Overlay modal détecté, tentative de fermeture');
    
    // Tentative 1: Appuyer sur Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(POST_ACTION_DELAY_MIN_MS / 2);
    
    if (!await overlayLocator.isVisible({ timeout: SHORT_SELECTOR_TIMEOUT_MS / 4 })) {
      log.info('[HANDLE_OVERLAY] Overlay fermé avec Escape');
      return;
    }
    
    // Tentative 2: Bouton de fermeture
    const closeSelectors = [
      'button[aria-label*="close" i]',
      'button[aria-label*="fermer" i]',
      'button:has-text("×")',
      'button:has-text("X")',
      'button[class*="close"]'
    ];
    
    for (const selector of closeSelectors) {
      try {
        const closeButton = overlayLocator.locator(selector).first();
        if (await closeButton.isVisible({ timeout: SHORT_SELECTOR_TIMEOUT_MS / 8 })) {
          await closeButton.click({ force: true });
          await page.waitForTimeout(POST_ACTION_DELAY_MIN_MS / 2);
          if (!await overlayLocator.isVisible({ timeout: SHORT_SELECTOR_TIMEOUT_MS / 4 })) {
            log.info(`[HANDLE_OVERLAY] Overlay fermé avec sélecteur: ${selector}`);
            return;
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    log.warning('[HANDLE_OVERLAY] Impossible de fermer l\'overlay');
  }
};

/**
 * Fonction principale pour scraper un produit sur Ledenicheur.fr.
 * @param productName Le nom du produit à scraper.
 * @returns Une promesse qui se résout avec les détails du produit ou null.
 */
export const scrapeLedenicheurProduct = async (
  productName: string
): Promise<LedenicheurProductDetails | null> => {
  log.info(`[LEDENICHEUR_SCRAPER] Début du scraping pour le produit: "${productName}"`);
  
  const productPageUrl = await searchLedenicheurProductUrl(productName);

  if (productPageUrl) {
    log.info(`[LEDENICHEUR_SCRAPER] URL de la page produit trouvée: ${productPageUrl}`);
    // Le searchUrlReferer est l'URL de recherche construite, pas forcément celle qui a trouvé le produit si redirection etc.
    const originalSearchUrl = constructLedenicheurSearchUrl(productName);
    return await scrapeLedenicheurProductPage(productPageUrl, originalSearchUrl, productName);
  } else {
    log.warning(`[LEDENICHEUR_SCRAPER] Aucune URL de page produit trouvée pour "${productName}" après la recherche.`);
    return null;
  }
};

// TODO: Ajouter une fonction pour scraper une liste de produits ou une catégorie si nécessaire.
// TODO: Ajouter une gestion plus robuste des erreurs, des tentatives, et des CAPTCHAs. 