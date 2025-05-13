import {
    CheerioCrawler,
    CheerioCrawlingContext,
    log,
    RequestQueue,
    Request,
} from 'crawlee';
import { CheerioAPI } from 'cheerio';
// import * as cheerio from 'cheerio'; // Cheerio est déjà inclus dans Crawlee via CheerioCrawlingContext.$ et CheerioAPI
import { URL } from 'url';

// Types definition based on documentation and common Amazon structure
export type ProductAttribute = {
    label: string;
    value: string;
};

export type AmazonProductDetails = {
    asin?: string; // Added ASIN
    url: string;
    title: string | null;
    price: number | null;
    listPrice: number | null;
    reviewRating: number | null;
    reviewCount: number | null;
    imageUrls: string[];
    attributes: ProductAttribute[];
    brand?: string | null; // Ajouté pour une meilleure correspondance avec ProductModel
    category?: string | null; // Ajouté pour une meilleure correspondance avec ProductModel
};

// --- Utility Functions ---

/**
 * Parses a number from a string by removing all non-numeric characters.
 * Keeps the decimal point. Returns null if parsing fails or string is empty.
 */
const parseNumberValue = (rawString: string | null | undefined): number | null => {
    if (!rawString) return null;
    const cleanedString = rawString.replace(/[^\d.]+/g, '');
    if (cleanedString === '') return null;
    const value = Number(cleanedString);
    return isNaN(value) ? null : value;
};

/**
 * Parses a number value from the first element matching the given selector.
 */
const parseNumberFromSelector = ($: CheerioAPI, selector: string): number | null => {
    const rawValue = $(selector).first().text();
    return parseNumberValue(rawValue);
};

/**
 * Extracts text content from the first element matching the selector.
 */
const extractText = ($: CheerioAPI, selector: string): string | null => {
    const text = $(selector).first().text().trim();
    return text || null;
};

// --- Selectors ---

// Selectors might need adjustments based on Amazon's current structure
const SEARCH_SELECTORS = {
    // Ancien sélecteur : Cibler le lien <a> directement dans le div.s-title-instructions-style
    // FIRST_RESULT_LINK: `div[data-component-type='s-search-result'] h2 a.a-link-normal[href*="/dp/"]`,
    // Nouveau sélecteur : Cible l'élément <a> avec les classes appropriées et href contenant "/dp/"
    // Ce sélecteur sera utilisé avec item.find(), où 'item' est un 'div[data-component-type='s-search-result']'
    FIRST_RESULT_LINK: `a.a-link-normal.s-link-style[href*="/dp/"]`,
};

const PRODUCT_SELECTORS = {
    TITLE: 'span#productTitle',
    PRICE: 'span.priceToPay span.a-offscreen, span.reinventPricePriceToPayMargin span.a-offscreen, #corePrice_feature_div .a-offscreen, #price_inside_buybox, .a-price .a-offscreen',
    LIST_PRICE: 'span.basisPrice .a-offscreen, #listPrice .a-offscreen',
    REVIEW_RATING: '#acrPopover .a-popover-trigger .a-icon-alt', // Extract rating from alt text (e.g., "4.5 out of 5 stars")
    REVIEW_COUNT: '#acrCustomerReviewText',
    IMAGES: '#altImages .item img',
    PRODUCT_ATTRIBUTE_ROWS: '#productOverview_feature_div tr, #detailBullets_feature_div .a-list-item', // Check both overview and detail bullets
    ATTRIBUTES_LABEL: 'td:nth-of-type(1) span, th .a-text-bold, .a-span3 .a-text-bold', // Label can be in td or th
    ATTRIBUTES_VALUE: 'td:nth-of-type(2) span, td, .a-span9 span', // Value can be directly in td
    // Correctly escape the selector string for action
    CAPTCHA_CHECK: 'form[action*="Captcha"]',
    ASIN_DETAIL_BULLETS: '#detailBullets_feature_div li:contains("ASIN") span:nth-child(2)',
    ASIN_PROD_DETAILS: '#productDetails_detailBullets_sections1 tr:contains("ASIN") td',
    ASIN_INPUT: 'input#ASIN',
    ASIN_DATA_ATTRIBUTE: '[data-asin]',
    BRAND_SELECTOR_1: '#bylineInfo_feature_div a[href*="/stores/"]', // "Visit the [Brand] Store"
    BRAND_SELECTOR_2: '#bylineInfo_feature_div a[id*="brandLink"]', // Generic brand link
    BRAND_SELECTOR_3: '#productDetails_techSpec_section_1 tr:contains("Brand") td', // Brand in tech specs
    BRAND_SELECTOR_4: '#productDetails_detailBullets_sections1 tr:contains("Manufacturer") td', // Manufacturer as fallback
    BRAND_FROM_ATTRIBUTES: 'Brand', // Case-insensitive check in attributes
};

// --- Extraction Logic ---

/**
 * Extracts the product image URLs.
 */
const extractImageUrls = ($: CheerioAPI): string[] => {
    return $(PRODUCT_SELECTORS.IMAGES)
        .map((_, imageEl) => $(imageEl).attr('src'))
        .get()
        .filter((src): src is string => !!src && src.startsWith('http'))
        .map(src => src.replace(/\._.*_\./, '._SL1500_.'));
};

/**
 * Extracts the product attributes. Robustly checks different structures.
 */
const extractProductAttributes = ($: CheerioAPI): ProductAttribute[] => {
    const attributeMap = new Map<string, string>();

    // Function to add or update attribute, prioritizing existing non-empty values
    const addOrUpdateAttribute = (label: string, value: string) => {
        const cleanLabel = label.trim().replace(/:$/, '');
        const cleanValue = value.trim();
        if (cleanLabel && cleanValue && !attributeMap.has(cleanLabel)) {
            attributeMap.set(cleanLabel, cleanValue);
        }
    };

    // 1. Try #productOverview_feature_div table rows
    $('#productOverview_feature_div tr').each((_, rowEl) => {
        const labelEl = $(rowEl).find(PRODUCT_SELECTORS.ATTRIBUTES_LABEL).first();
        const valueEl = $(rowEl).find(PRODUCT_SELECTORS.ATTRIBUTES_VALUE).first();
        addOrUpdateAttribute(labelEl.text(), valueEl.text());
    });

    // 2. Try #detailBullets_feature_div list items (often includes ASIN, dimensions, etc.)
    $('#detailBullets_feature_div .a-list-item').each((_, el) => {
        const text = $(el).text().trim();
        // Split only on the first colon using indexOf for broader compatibility
        const colonIndex = text.indexOf(':');
        if (colonIndex > -1) {
            const label = text.substring(0, colonIndex);
            const value = text.substring(colonIndex + 1);
            addOrUpdateAttribute(label, value);
        }
    });

     // 3. Try #productDetails generic tables (fallback)
     $('#productDetails_detailBullets_sections1 tr, #productDetails_techSpec_section_1 tr').each((_, rowEl) => {
         const labelEl = $(rowEl).find('th').first();
         const valueEl = $(rowEl).find('td').first();
         addOrUpdateAttribute(labelEl.text(), valueEl.text());
     });


    // Convert Map to array
    return Array.from(attributeMap, ([label, value]) => ({ label, value }));
};

/**
 * Extracts the ASIN from various potential locations.
 */
const extractAsin = ($: CheerioAPI, attributes: ProductAttribute[], url: string): string | null => {
    // 1. Check extracted attributes first
    const asinAttr = attributes.find(attr => attr.label.toUpperCase() === 'ASIN');
    if (asinAttr?.value) return asinAttr.value;

    // 2. Check specific selectors in detail bullets/tables
    let asin = extractText($, PRODUCT_SELECTORS.ASIN_DETAIL_BULLETS);
    if (asin) return asin;

    asin = extractText($, PRODUCT_SELECTORS.ASIN_PROD_DETAILS);
    if (asin) return asin;

     // 3. Check common input fields or data attributes
     const asinInput = $(PRODUCT_SELECTORS.ASIN_INPUT);
     if (asinInput.length) {
         const val = asinInput.val();
         asin = typeof val === 'string' ? val.trim() : null;
         if (asin) return asin;
     }

     const asinData = $(PRODUCT_SELECTORS.ASIN_DATA_ATTRIBUTE).filter((i, el) => {
      const asinVal = $(el).data('asin');
      if (typeof asinVal === 'string' && asinVal.length === 10) {
        return true;
      }
      return false;
    });
     if (asinData.length) {
         const dataVal = asinData.first().data('asin');
         asin = typeof dataVal === 'string' ? dataVal.trim() : null;
         if (asin) return asin;
     }

    // 4. Fallback: Look for ASIN in the current URL
     const urlMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
     if (urlMatch && urlMatch[1]) {
         return urlMatch[1];
     }


    return null; // ASIN not found
};

/**
 * Extracts the brand from various potential locations.
 */
const extractBrand = ($: CheerioAPI, attributes: ProductAttribute[]): string | null => {
    let brand = extractText($, PRODUCT_SELECTORS.BRAND_SELECTOR_1);
    if (brand && brand.toLowerCase().startsWith('visit the')) {
        brand = brand.substring('visit the '.length).replace(/ store$/i, '').trim();
        if(brand) return brand;
    }
    if (brand && brand.toLowerCase().startsWith('brand:')) {
        brand = brand.substring('brand:'.length).trim();
        if(brand) return brand;
    }

    brand = extractText($, PRODUCT_SELECTORS.BRAND_SELECTOR_2);
    if (brand && brand.toLowerCase().startsWith('brand:')) {
        brand = brand.substring('brand:'.length).trim();
        if(brand) return brand;
    }
    if(brand) return brand.trim();

    brand = extractText($, PRODUCT_SELECTORS.BRAND_SELECTOR_3);
    if(brand) return brand.trim();

    const brandAttr = attributes.find(attr => attr.label.toLowerCase() === PRODUCT_SELECTORS.BRAND_FROM_ATTRIBUTES.toLowerCase());
    if (brandAttr?.value) return brandAttr.value.trim();

    brand = extractText($, PRODUCT_SELECTORS.BRAND_SELECTOR_4); // Manufacturer as fallback
    if(brand) return brand.trim();

    return null;
};


/**
 * Scrapes the product details from the product page.
 */
const extractProductDetails = ($: CheerioAPI, url: string): AmazonProductDetails => {
    const title = extractText($, PRODUCT_SELECTORS.TITLE);
    const price = parseNumberFromSelector($, PRODUCT_SELECTORS.PRICE);
    const listPrice = parseNumberFromSelector($, PRODUCT_SELECTORS.LIST_PRICE);

    // Extract rating value specifically
    const ratingText = $(PRODUCT_SELECTORS.REVIEW_RATING).first().text().trim();
    const ratingMatch = ratingText.match(/^\d[\d.]*/);
    const reviewRating = ratingMatch ? parseFloat(ratingMatch[0]) : null;

    const reviewCountText = extractText($, PRODUCT_SELECTORS.REVIEW_COUNT);
    const reviewCount = parseNumberValue(reviewCountText); // Parse count which might have commas/text

    const imageUrls = extractImageUrls($);
    const attributes = extractProductAttributes($);
    const asin = extractAsin($, attributes, url);
    const brand = extractBrand($, attributes);
    // Category needs to be determined, perhaps from breadcrumbs or attributes if available
    // For now, let's leave it as null or a placeholder
    const category = attributes.find(attr => attr.label.toLowerCase() === 'category')?.value || null;


    return { 
        asin: asin ?? undefined, 
        url, 
        title, 
        price, 
        listPrice, 
        reviewRating, 
        reviewCount, 
        imageUrls, 
        attributes, 
        brand,
        category 
    };
};

/**
 * Handles potential CAPTCHA blocking. Throws error to trigger retry.
 */
const handleCaptchaBlocking = ($: CheerioAPI, url: string): void => {
    const isCaptchaDisplayed = $(PRODUCT_SELECTORS.CAPTCHA_CHECK).length > 0;
    if (isCaptchaDisplayed) {
        log.warning(`CAPTCHA detected on page: ${url}`);
        // Throwing an error signals Crawlee to retry the request (potentially with different session/headers)
        throw new Error(`CAPTCHA detected on page: ${url}`);
    }
};

// --- Main Scraper Function ---

export const scrapeAmazonProduct = async (
    productName: string
): Promise<AmazonProductDetails | null> => {
    log.info(`Starting Amazon scrape for product: "${productName}"`);
    log.info(`[SCRAPER_DEBUG] productName reçu: "${productName}"`);

    const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(productName)}&language=en_US&ref=nb_sb_noss`;
    log.info(`[SCRAPER_DEBUG] searchUrl construit: ${searchUrl}`);
    let productUrl: string | null = null;
    let productDetails: AmazonProductDetails | null = null;
    // Déclarer une variable pour stocker le résultat du handler
    let extractedDetailsLocally: AmazonProductDetails | null = null;

    // Configuration : Laisser Crawlee utiliser son comportement de persistance par défaut (true)
    // ou configurer explicitement si nécessaire.
    // const baseConfig = new Configuration({ persistStorage: true }); // Optionnel, true est la valeur par défaut
    // Supprimer la ligne `persistStorage: false` permet d'utiliser la valeur par défaut.
    // Pour être explicite, on peut la mettre à true.
    // const baseConfig = new Configuration({ persistStorage: true }); 
    // Testons en désactivant explicitement la persistance pour éviter les conflits de cache.
    // const baseConfig = new Configuration({ persistStorage: false }); // Supprimé car non utilisé

    // Utiliser un nom de queue unique basé sur la date pour éviter les conflits potentiels
    // Le config: baseConfig ici devient moins critique si la config globale est déjà persistante.
    const searchQueue = await RequestQueue.open(`search-${Date.now()}`); // config: baseConfig peut être omis si on utilise la config par défaut

    // --- Phase 1: Search for the product URL ---
    log.info(`Searching for product URL: ${searchUrl}`);
    const searchCrawler = new CheerioCrawler({
        requestQueue: searchQueue,
        maxRequestsPerCrawl: 5, // Limit search page crawls (can be increased if needed)
        minConcurrency: 1,
        maxConcurrency: 2, // Slightly reduce concurrency for search
        requestHandlerTimeoutSecs: 75, // Timeout appliqué ici
        navigationTimeoutSecs: 75, // Timeout appliqué ici

        async requestHandler({ $, request, log }: CheerioCrawlingContext) {
            log.info(`Processing search results page: ${request.url}`);
            handleCaptchaBlocking($, request.url);

            // Itérer sur les conteneurs de résultats au lieu de prendre seulement le premier lien global
            const resultItems = $('div[role="listitem"][data-component-type="s-search-result"]');
            log.info(`Found ${resultItems.length} potential result items.`);

            for (let i = 0; i < resultItems.length; i++) {
                const item = resultItems.eq(i);
                const firstResultLink = item.find(SEARCH_SELECTORS.FIRST_RESULT_LINK).first();
                const resultHref = firstResultLink.attr('href');

                if (resultHref) {
                    log.debug(`Checking item ${i + 1} link: ${resultHref}`);

                    // Vérifier si le lien est sponsorisé (contient /sspa/)
                    if (resultHref.includes('/sspa/')) {
                        log.info(`Item ${i + 1} is a sponsored link, skipping.`);
                        continue; // Passer à l'élément suivant
                    }

                    // Construct absolute URL carefully
                    try {
                        const absoluteUrl = new URL(resultHref, 'https://www.amazon.com/').toString();
                        log.info(`Found potential non-sponsored product URL: ${absoluteUrl}`);
                        log.info(`[SCRAPER_DEBUG] Considération du lien: ${absoluteUrl}`);

                        // Validate URL structure (basic check)
                        if (absoluteUrl.includes('/dp/') || absoluteUrl.includes('/gp/product/')) {
                            productUrl = absoluteUrl;
                            log.info(`Validated product URL found: ${productUrl}`);
                            log.info(`[SCRAPER_DEBUG] URL de produit sélectionnée pour la Phase 2: ${productUrl}`);
                            // Stop the search crawler once a valid, non-sponsored URL is found
                            await searchCrawler.autoscaledPool?.abort();
                            break; // Sortir de la boucle for
                        } else {
                            log.warning(`Non-sponsored link does not look like a standard product page: ${absoluteUrl}`);
                            // Continuer à chercher le prochain lien non-sponsorisé valide
                        }
                    } catch (e) {
                        log.error(`Failed to construct absolute URL from href: ${resultHref}`, { error: e });
                    }
                } else {
                    log.debug(`No link found in item ${i + 1}.`);
                }
            }

            // Si la boucle se termine sans trouver de productUrl
            if (!productUrl) {
                 log.warning('Could not find a valid, non-sponsored product link on this page.');
                 // Le crawler s'arrêtera naturellement s'il n'y a plus de requêtes.
            }
        },
        failedRequestHandler({ request, log }) {
            log.error(`Search request failed: ${request.url}`, { errorMessage: request.errorMessages?.join(', ') });
        },
    });

    await searchQueue.addRequest({ url: searchUrl, uniqueKey: `search_${productName}` });
    await searchCrawler.run();
    await searchQueue.drop();

    log.info(`[SCRAPER_DEBUG] productUrl avant la Phase 2 (après searchCrawler.run): ${productUrl}`);

    // --- Phase 2: Scrape the product page if URL was found ---
    if (productUrl) {
        log.info(`Proceeding to scrape product page: ${productUrl}`);
        // Utiliser un nom de queue unique
        const productQueue = await RequestQueue.open(`product-${Date.now()}`); // config: baseConfig peut être omis

        // Add request with the search URL as Referer in headers
        const productRequest = new Request({
            url: productUrl,
            uniqueKey: `product_${productName}`,
            headers: {
                'Referer': searchUrl,
            },
        });

        await productQueue.addRequest(productRequest);

        const productCrawler = new CheerioCrawler({
            requestQueue: productQueue,
            maxRequestsPerCrawl: 1, // Only this product page
            minConcurrency: 1,
            maxConcurrency: 1, // Single request at a time for the product page
            requestHandlerTimeoutSecs: 75, // Timeout appliqué ici
            navigationTimeoutSecs: 75, // Timeout appliqué ici

            async requestHandler({ $, request, log }: CheerioCrawlingContext) {
                log.info(`Processing product page: ${request.loadedUrl ?? request.url}`);
                handleCaptchaBlocking($, request.loadedUrl ?? request.url);

                // Stocker dans la variable locale temporaire
                const details = extractProductDetails($, request.loadedUrl || request.url);
                extractedDetailsLocally = details; // Assigner à la variable locale
                const asinForLog = details?.asin ?? 'N/A';
                log.info(`Successfully extracted details for ASIN: ${asinForLog}`);
            },
            failedRequestHandler({ request, log }) {
                 log.error(`Product page request failed: ${request.url}`, { errorMessage: request.errorMessages?.join(', ') });
            },
        }); // Pas besoin de passer baseConfig ici

        await productCrawler.run();
        await productQueue.drop();

        // Assigner le résultat local à la variable externe APRES l'exécution complète
        productDetails = extractedDetailsLocally;

    } else {
        log.error(`Could not find a valid product URL for "${productName}" after search.`);
    }

    // Utiliser directement productDetails qui a le type correct AmazonProductDetails | null
    if (productDetails) {
         // Caster explicitement en AmazonProductDetails pour résoudre le problème de type 'never'
         const typedProductDetails = productDetails as AmazonProductDetails;
         const finalAsin = typedProductDetails.asin ?? 'N/A';
         log.info(`Scraping finished successfully for "${productName}" (ASIN: ${finalAsin}).`);
         return typedProductDetails; // Retourner la variable typée
    } else {
         log.warning(`Scraping did not yield product details for "${productName}".`);
         return null;
    }
}; 