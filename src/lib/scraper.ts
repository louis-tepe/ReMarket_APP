import {
    PlaywrightCrawler,
    PlaywrightCrawlingContext,
    log,
    RequestQueue,
    Request,
} from 'crawlee';
import { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';
import { URL } from 'url';
// import { Page } from 'playwright'; // Supprimé car non utilisé directement ici

// Configuration pour le mode de fonctionnement (true pour production, false pour développement/debug)
const IS_PRODUCTION_MODE = false; // Passer à false pour le débogage avec navigateur visible et logs détaillés

// Redefined types based on new selectors
export type ProductFeature = string; // For "Infos rapides produits"

export type ProductOptionChoice = {
    optionName: string | null;
    availableValues: string[];
};

export type ProductSpecification = {
    key: string;
    value: string;
};

export type ProductDescription = string | null;

export type QAItem = {
    question: string;
    answer: string;
};

export type ProductQA = QAItem[];

export type IdealoProductDetails = {
    url: string;
    title: string | null;
    variantTitle?: string | null; // For "titre secondaire"
    priceNew: number | null;      // For "prix neuf"
    priceUsed?: number | null;     // For "prix d'occasion"
    imageUrls: string[];
    features: ProductFeature[];       // For "Infos rapides produits"
    optionChoices?: ProductOptionChoice[]; // For "Choix d'options du produit"
    specifications?: ProductSpecification[]; // For "Détails du produit"
    description?: ProductDescription;
    qas?: ProductQA;
};

// --- Utility Functions (mostly unchanged) ---
const randomDelay = async (minMs: number, maxMs: number): Promise<void> => {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    log.debug(`Waiting for ${delay}ms`);
    return new Promise(resolve => setTimeout(resolve, delay));
};

const parseNumberValue = (rawString: string | null | undefined): number | null => {
    if (!rawString) return null;

    // Remplacer &nbsp; par un espace pour la cohérence
    let str = rawString.replace(/&nbsp;/g, ' ');

    // Supprimer les symboles monétaires communs (dont €) et tous les types d'espaces (trimming global)
    str = str.replace(/[€$£¥\s]+/g, '');

    // Remplacer la virgule décimale par un point pour la conversion en nombre standard
    str = str.replace(',', '.');
    
    // Gérer les cas où un point pourrait être utilisé comme séparateur de milliers
    // S'il y a plusieurs points, on suppose que le dernier est le séparateur décimal
    // et on supprime les autres (ex: "1.234.56" devient "1234.56")
    const parts = str.split('.');
    if (parts.length > 2) { 
        str = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
    } 
    // Si parts.length est 2, c'est déjà au format X.XX ou XXXX.XX
    // Si parts.length est 1, c'est un entier XXXXX

    const value = parseFloat(str); // parseFloat est généralement plus tolérant

    return isNaN(value) ? null : value;
};

const parseNumberFromSelector = ($: CheerioAPI, selector: string, context?: cheerio.Cheerio<cheerio.AnyNode>): number | null => {
    const rawValue = extractText($, selector, context);
    return parseNumberValue(rawValue);
};

const extractText = ($: CheerioAPI, selector: string, context?: cheerio.Cheerio<cheerio.AnyNode>): string | null => {
    const element = context ? context.find(selector).first() : $(selector).first();
    const text = element.text().trim();
    return text || null;
};

// --- Selectors ---

const SEARCH_SELECTORS = {
    PRODUCT_LINK_IN_SEARCH: 'a[class^="sr-resultItemTile__link_"][class*="sr-resultItemTile__link--GRID"]',
};

const PRODUCT_SELECTORS = {
    // General product container: div.oopStage (useful for context setting if needed)
    PRODUCT_WRAPPER: 'div.oopStage',

    // Images - Modifié pour cibler directement les images de la galerie principale
    // Ancien: IMAGES_THUMBNAIL_CONTAINER: 'div.simple-carousel-thumbnails',
    // Ancien: IMAGE_IN_THUMBNAIL: 'div.simple-carousel-thumbnail-wrapper > img',
    OOPSTAGE_GALLERY_IMAGE: 'img.oopStage-galleryCollageImage', // Nouveau sélecteur basé sur l'image HTML fournie

    // Titles
    TITLE_H1: 'h1#oopStage-title',
    TITLE_MAIN: 'span:first-child', // Relative to TITLE_H1
    TITLE_VARIANT: 'span.oopStage-variantTitle', // Relative to TITLE_H1

    // Product Info / Features
    PRODUCT_INFO_TOP_ITEMS_CONTAINER: 'div.oopStage-productInfoTopItems',
    PRODUCT_INFO_TOP_ITEM: 'span.oopStage-productInfoTopItem', // Relative to PRODUCT_INFO_TOP_ITEMS_CONTAINER

    // Product Option Choices (e.g., storage, color)
    OPTION_CHOICES_CONTAINER: 'div#delta-filters',
    OPTION_FILTER_BLOCK: 'div.oopStage-deltaFilter', // Relative to OPTION_CHOICES_CONTAINER
    OPTION_NAME_STRONG: 'div.oopStage-deltaFilterLabel > strong', // Relative to OPTION_FILTER_BLOCK
    OPTION_VALUE_BUTTONS_CONTAINER: 'div.oopStage-deltaFilterButtons', // Relative to OPTION_FILTER_BLOCK, c'est le conteneur des div "boutons"
    OPTION_VALUE_BUTTON_ITEM: 'div.button', // Cible chaque div "bouton" de valeur (simplifié, en espérant que la classe .button soit assez spécifique ici)
    OPTION_VALUE_TEXT_IN_BUTTON: 'span', // Cible le span à l'intérieur du bouton pour obtenir le texte de la valeur

    // Prices
    PRICE_NEW_STRONG: 'div#oopStage-conditionButton-new div.oopStage-conditionButton-wrapper-text-price > strong',
    PRICE_USED_STRONG: 'div#oopStage-conditionButton-used div.oopStage-conditionButton-wrapper-text-price > strong',
    
    // Detailed Specifications (Datasheet)
    DATASHEET_CONTAINER: 'div#datasheet',
    DATASHEET_LIST_ITEM_PROPERTIES: 'tr.datasheet-listItem--properties', // Targets rows with key-value pairs
    DATASHEET_LIST_ITEM_KEY: 'td.datasheet-listItemKey',       // Key within the row
    DATASHEET_LIST_ITEM_VALUE: 'td.datasheet-listItemValue',   // Value within the row
    // Note: DATASHEET_LIST_ITEM_GROUP ('tr.datasheet-listItem--group') can be used to identify sections if needed

    CAPTCHA_CHECK: 'form[action*="Captcha"]', // Generic captcha check

    // Description and Q&A selectors
    DESCRIPTION_CONTENT: 'div#product-guide div.textris', 
    QA_JSON_LD_SCRIPT: 'div.q-and-a-container script[type="application/ld+json"]',
    QA_ITEMS_CONTAINER_FALLBACK: 'div.q-and-a-container div.items', 
    QA_ITEM_FALLBACK: 'div.q-and-a-item', 
    QA_QUESTION_FALLBACK: 'div.question p', 
    QA_ANSWER_FALLBACK: 'div.answer p',   
};

// --- Extraction Logic ---

const extractImageUrls = ($: CheerioAPI, productWrapper: cheerio.Cheerio<cheerio.AnyNode>): string[] => {
    // Modifié pour utiliser le nouveau sélecteur OOPSTAGE_GALLERY_IMAGE directement sur le productWrapper
    return productWrapper.find(PRODUCT_SELECTORS.OOPSTAGE_GALLERY_IMAGE)
        .map((_, imgEl) => {
            let src = $(imgEl).attr('src');
            if (src && src.startsWith('//')) {
                src = 'https:' + src;
            }
            return src;
        })
        .get()
        .filter((src): src is string => !!src && src.startsWith('http'));
};

const extractProductFeatures = ($: CheerioAPI, productWrapper: cheerio.Cheerio<cheerio.AnyNode>): ProductFeature[] => {
    const featuresContainer = productWrapper.find(PRODUCT_SELECTORS.PRODUCT_INFO_TOP_ITEMS_CONTAINER);
    return featuresContainer.find(PRODUCT_SELECTORS.PRODUCT_INFO_TOP_ITEM)
        .map((_, el) => $(el).text().trim())
        .get()
        .filter(feature => !!feature);
};

const extractProductOptionChoices = ($: CheerioAPI, productWrapper: cheerio.Cheerio<cheerio.AnyNode>): ProductOptionChoice[] => {
    const optionsContainer = productWrapper.find(PRODUCT_SELECTORS.OPTION_CHOICES_CONTAINER);
    const choices: ProductOptionChoice[] = [];
    if (!IS_PRODUCTION_MODE) log.debug(`[OPTIONS_DEBUG] Found options container (selector: ${PRODUCT_SELECTORS.OPTION_CHOICES_CONTAINER}): ${optionsContainer.length > 0}`);

    optionsContainer.find(PRODUCT_SELECTORS.OPTION_FILTER_BLOCK).each((i, blockEl) => {
        const block = $(blockEl);
        const optionName = extractText($, PRODUCT_SELECTORS.OPTION_NAME_STRONG, block);
        if (!IS_PRODUCTION_MODE) log.debug(`[OPTIONS_DEBUG] Block ${i}: Found option name element (selector: ${PRODUCT_SELECTORS.OPTION_NAME_STRONG}). Raw text: "${block.find(PRODUCT_SELECTORS.OPTION_NAME_STRONG).text().trim()}". Parsed name: "${optionName}"`);
        
        const availableValues: string[] = [];
        const valuesContainer = block.find(PRODUCT_SELECTORS.OPTION_VALUE_BUTTONS_CONTAINER);
        if (!IS_PRODUCTION_MODE) log.debug(`[OPTIONS_DEBUG] Block ${i}, Option "${optionName}": Found values container (selector: ${PRODUCT_SELECTORS.OPTION_VALUE_BUTTONS_CONTAINER}): ${valuesContainer.length > 0}`);

        // Itérer sur chaque bouton de valeur, puis trouver le span à l'intérieur
        valuesContainer.find(PRODUCT_SELECTORS.OPTION_VALUE_BUTTON_ITEM).each((j, buttonEl) => {
            // Le texte de la valeur est dans un span enfant du buttonEl
            const valueText = $(buttonEl).find(PRODUCT_SELECTORS.OPTION_VALUE_TEXT_IN_BUTTON).first().text().trim();
            if (!IS_PRODUCTION_MODE) log.debug(`[OPTIONS_DEBUG] Block ${i}, Option "${optionName}", Value Button ${j} (selector: ${PRODUCT_SELECTORS.OPTION_VALUE_BUTTON_ITEM}): Raw text from span (selector: ${PRODUCT_SELECTORS.OPTION_VALUE_TEXT_IN_BUTTON}): "${valueText}"`);
            if (valueText) {
                availableValues.push(valueText);
            }
        });

        if (optionName && availableValues.length > 0) {
            log.info(`[OPTIONS_INFO] Successfully extracted option: "${optionName}" with values: [${availableValues.join(', ')}]`);
            choices.push({ optionName, availableValues });
        } else {
            if (!IS_PRODUCTION_MODE) log.debug(`[OPTIONS_DEBUG] Block ${i}: Option name "${optionName}" or availableValues (count: ${availableValues.length}) are empty. Not adding to choices.`);
        }
    });
    if (choices.length === 0) {
        log.info('[OPTIONS_INFO] No product option choices were extracted.');
    }
    return choices;
};

const extractProductSpecifications = ($: CheerioAPI): ProductSpecification[] => {
    const specs: ProductSpecification[] = [];
    const datasheetContainer = $(PRODUCT_SELECTORS.DATASHEET_CONTAINER); // Search globally for datasheet
    if (!IS_PRODUCTION_MODE) log.debug(`[SPECS_DEBUG] Found datasheet container (selector: ${PRODUCT_SELECTORS.DATASHEET_CONTAINER}): ${datasheetContainer.length > 0}`);

    if (datasheetContainer.length === 0) {
        log.info('[SPECS_INFO] Datasheet container not found.');
        return specs;
    }

    datasheetContainer.find(PRODUCT_SELECTORS.DATASHEET_LIST_ITEM_PROPERTIES).each((i, el) => {
        const row = $(el);
        const key = extractText($, PRODUCT_SELECTORS.DATASHEET_LIST_ITEM_KEY, row)?.replace(/\s+/g, ' ').trim();
        const value = extractText($, PRODUCT_SELECTORS.DATASHEET_LIST_ITEM_VALUE, row)?.replace(/\s+/g, ' ').trim();

        if (!IS_PRODUCTION_MODE) log.debug(`[SPECS_DEBUG] Row ${i}: Raw Key: "${row.find(PRODUCT_SELECTORS.DATASHEET_LIST_ITEM_KEY).text()}", Raw Value: "${row.find(PRODUCT_SELECTORS.DATASHEET_LIST_ITEM_VALUE).text()}"`);

        if (key && value) {
            log.info(`[SPECS_INFO] Extracted specification: "${key}": "${value}"`);
            specs.push({ key, value });
        } else {
            if (!IS_PRODUCTION_MODE) log.debug(`[SPECS_DEBUG] Row ${i}: Key "${key}" or Value "${value}" is empty. Not adding to specifications.`);
        }
    });

    if (specs.length === 0) {
        log.info('[SPECS_INFO] No product specifications were extracted from the datasheet.');
    }
    return specs;
};

const extractProductDescription = ($: CheerioAPI): ProductDescription => {
    const descriptionContent = $(PRODUCT_SELECTORS.DESCRIPTION_CONTENT);
    if (descriptionContent.length > 0) {
        const textContent = descriptionContent.text();
        if (textContent) {
            log.info('[DESCRIPTION_INFO] Successfully extracted product description text.');
            return textContent.replace(/\s+/g, ' ').trim();
        } else {
            log.info('[DESCRIPTION_INFO] Product description content element found but is empty.');
            return null;
        }
    }
    log.info('[DESCRIPTION_INFO] Product description content element not found.');
    return null;
};

const extractProductQAs = ($: CheerioAPI): ProductQA | undefined => {
    const qas: ProductQA = [];

    // Attempt 1: Parse JSON-LD
    const qaJsonLdScript = $(PRODUCT_SELECTORS.QA_JSON_LD_SCRIPT);
    if (qaJsonLdScript.length > 0) {
        try {
            const jsonLdText = qaJsonLdScript.html();
            if (jsonLdText) {
                const jsonData = JSON.parse(jsonLdText);
                // Define a more specific type for the JSON-LD item
                type JsonLdQAItem = {
                    '@type': string;
                    name?: string;
                    acceptedAnswer?: {
                        '@type': string;
                        text?: string;
                    };
                };
                type JsonLdFAQPage = {
                    '@type': string;
                    mainEntity?: JsonLdQAItem[];
                };

                const faqPageData = jsonData as JsonLdFAQPage;

                if (faqPageData && faqPageData['@type'] === 'FAQPage' && Array.isArray(faqPageData.mainEntity)) {
                    faqPageData.mainEntity.forEach((item: JsonLdQAItem) => {
                        if (item['@type'] === 'Question' && item.name && item.acceptedAnswer && item.acceptedAnswer.text) {
                            // Correctly apply text() before replace() and trim()
                            const questionText = cheerio.load(item.name).text().replace(/\s+/g, ' ').trim(); 
                            const answerText = cheerio.load(item.acceptedAnswer.text).text().replace(/\s+/g, ' ').trim(); 
                            qas.push({ question: questionText, answer: answerText });
                        }
                    });
                    if (qas.length > 0) {
                        log.info(`[QAS_INFO] Successfully extracted ${qas.length} Q&As from JSON-LD.`);
                        return qas;
                    }
                }
            }
        } catch (e) {
            log.warning('[QAS_WARN] Failed to parse Q&A JSON-LD.', { error: e instanceof Error ? e.message : String(e) });
        }
    } else {
        if (!IS_PRODUCTION_MODE) log.debug('[QAS_DEBUG] Q&A JSON-LD script not found. Attempting HTML fallback.');
        else log.info('[QAS_INFO] Q&A JSON-LD script not found. Attempting HTML fallback.');
    }
    
    // Attempt 2: HTML scraping (fallback)
    const qaItemsContainer = $(PRODUCT_SELECTORS.QA_ITEMS_CONTAINER_FALLBACK);
    if (!IS_PRODUCTION_MODE) log.debug(`[QAS_DEBUG_HTML] Found Q&A items container (selector: ${PRODUCT_SELECTORS.QA_ITEMS_CONTAINER_FALLBACK}): ${qaItemsContainer.length > 0}`);

    qaItemsContainer.find(PRODUCT_SELECTORS.QA_ITEM_FALLBACK).each((i, itemEl) => {
        const item = $(itemEl);
        const questionText = extractText($, PRODUCT_SELECTORS.QA_QUESTION_FALLBACK, item)?.replace(/\s+/g, ' ').trim();
        const answerText = extractText($, PRODUCT_SELECTORS.QA_ANSWER_FALLBACK, item)?.replace(/\s+/g, ' ').trim();
        
        if (!IS_PRODUCTION_MODE) log.debug(`[QAS_DEBUG_HTML] Item ${i}: Raw Question: "${item.find(PRODUCT_SELECTORS.QA_QUESTION_FALLBACK).text()}", Raw Answer: "${item.find(PRODUCT_SELECTORS.QA_ANSWER_FALLBACK).text()}"`);

        if (questionText && answerText) {
            log.info(`[QAS_INFO_HTML] Extracted Q&A (HTML): Q: "${questionText}", A: "${answerText}"`);
            qas.push({ question: questionText, answer: answerText });
        } else {
            if (!IS_PRODUCTION_MODE) log.debug(`[QAS_DEBUG_HTML] Item ${i}: Question or Answer is empty. Not adding.`);
        }
    });

    if (qas.length > 0) {
        log.info(`[QAS_INFO] Successfully extracted ${qas.length} Q&As using HTML fallback.`);
        return qas;
    }

    log.info('[QAS_INFO] No Q&As extracted.');
    return undefined;
};

const extractProductDetails = ($: CheerioAPI, url: string): IdealoProductDetails | null => {
    const productWrapper = $(PRODUCT_SELECTORS.PRODUCT_WRAPPER).first();
    if (!productWrapper.length) {
        log.error(`[PRODUCT_DETAILS_ERROR] Product wrapper (selector: ${PRODUCT_SELECTORS.PRODUCT_WRAPPER}) not found on page ${url}. Cannot extract details.`);
        return null; // Return null if the main product container is not found
    }

    const titleH1 = productWrapper.find(PRODUCT_SELECTORS.TITLE_H1);
    const title = extractText($, PRODUCT_SELECTORS.TITLE_MAIN, titleH1);
    const variantTitle = extractText($, PRODUCT_SELECTORS.TITLE_VARIANT, titleH1);

    const priceNew = parseNumberFromSelector($, PRODUCT_SELECTORS.PRICE_NEW_STRONG, productWrapper);
    const priceUsed = parseNumberFromSelector($, PRODUCT_SELECTORS.PRICE_USED_STRONG, productWrapper);

    const imageUrls = extractImageUrls($, productWrapper);
    const features = extractProductFeatures($, productWrapper);
    const optionChoices = extractProductOptionChoices($, productWrapper);
    const specifications = extractProductSpecifications($);
    const description = extractProductDescription($);
    const qas = extractProductQAs($);
    
    return { 
        url, 
        title, 
        variantTitle,
        priceNew,
        priceUsed: priceUsed ?? undefined, // Make it optional
        imageUrls, 
        features,
        optionChoices: optionChoices.length > 0 ? optionChoices : undefined,
        specifications: specifications.length > 0 ? specifications : undefined,
        description: description ?? undefined,
        qas: qas && qas.length > 0 ? qas : undefined,
    };
};

const handleCaptchaBlocking = ($: CheerioAPI, url: string): void => {
    const isCaptchaDisplayed = $(PRODUCT_SELECTORS.CAPTCHA_CHECK).length > 0;
    if (isCaptchaDisplayed) {
        log.warning(`CAPTCHA detected on page: ${url}`);
        throw new Error(`CAPTCHA detected on page: ${url}`);
    }
};

// Helper function to handle cookie consent banners
const handleCookieConsent = async (page: PlaywrightCrawlingContext['page'], logger: PlaywrightCrawlingContext['log'], pageName: string): Promise<void> => {
    try {
        const cookieWrapperSelector = 'div.cmp-wrapper';
        const acceptButtonSelector = 'button#accept';
        const shadowRootButtonSelector = 'div#usercentrics-root button[data-testid="uc-accept-all-button"]';

        // Attempt 1: Standard cookie banner
        try {
            // Attend que le wrapper du cookie soit visible
            await page.waitForSelector(cookieWrapperSelector, { timeout: IS_PRODUCTION_MODE ? 7000 : 10000, state: 'visible' });
            logger.info(`Cookie consent wrapper found on ${pageName}.`);
            const acceptButton = page.locator(acceptButtonSelector);
            
            if (await acceptButton.isVisible({ timeout: 3000 }) && await acceptButton.isEnabled({ timeout: 1000 })) {
                logger.info(`Standard accept button is visible and enabled on ${pageName}. Clicking accept...`);
                await acceptButton.click({ timeout: 5000, force: !IS_PRODUCTION_MODE });
                await randomDelay(1000, 2000); // Délai après le clic
                logger.info(`Cookie consent (standard) accepted on ${pageName}.`);
                return; // Consentement géré
            } else {
                logger.info(`Standard accept button in wrapper not actionable or not found on ${pageName}.`);
            }
        } catch (e) {
            logger.debug(`Standard cookie wrapper not found or error during standard handling on ${pageName}.`, { error: e instanceof Error ? e.message : String(e) });
        }

        // Attempt 2: Shadow DOM button (si l'approche standard a échoué ou n'a pas trouvé le wrapper)
        try {
            const shadowRootButton = page.locator(shadowRootButtonSelector);
            // Attend que le bouton lui-même soit visible, en supposant que son parent (shadow host) le serait aussi.
            await shadowRootButton.waitFor({ state: 'visible', timeout: IS_PRODUCTION_MODE ? 7000 : 10000 });
            logger.info(`Shadow DOM button potentially visible on ${pageName}.`);

            if (await shadowRootButton.isEnabled({ timeout: 1000 })) { // Vérifie s'il est activé
                logger.info(`Cookie consent banner (Shadow DOM) found and enabled on ${pageName}. Clicking accept...`);
                await shadowRootButton.click({ timeout: 5000, force: !IS_PRODUCTION_MODE });
                await randomDelay(1000, 2000);
                logger.info(`Cookie consent (Shadow DOM) accepted on ${pageName}.`);
                return; // Consentement géré
            } else {
                logger.info(`Shadow DOM accept button found but not enabled on ${pageName}.`);
            }
        } catch (e) {
            logger.debug(`Shadow DOM cookie button not found or error during Shadow DOM handling on ${pageName}.`, { error: e instanceof Error ? e.message : String(e) });
        }
        
        logger.info(`Cookie consent button not successfully handled on ${pageName} using known selectors/methods.`);

    } catch (e) { // Catch externe pour toute la fonction
        logger.debug(`General error in handleCookieConsent on ${pageName}.`, { error: e instanceof Error ? e.message : String(e) });
    }
};

export const scrapeIdealoProduct = async (
    productName: string
): Promise<IdealoProductDetails | null> => {
    log.info(`Starting Idealo scrape for product: "${productName}"`);
    const searchUrl = `https://www.idealo.fr/prechcat.html?q=${encodeURIComponent(productName)}`;
    log.info(`Idealo searchUrl constructed: ${searchUrl}`);
    let productUrl: string | null = null;
    let productDetails: IdealoProductDetails | null = null;
    let extractedDetailsLocally: IdealoProductDetails | null = null;

    const searchQueue = await RequestQueue.open(`idealo-search-${Date.now()}`);

    log.info(`Searching for product URL on Idealo: ${searchUrl}`);
    const searchCrawler = new PlaywrightCrawler({
        requestQueue: searchQueue,
        headless: IS_PRODUCTION_MODE, // Contrôlé par la constante
        launchContext: {
            launchOptions: {
                slowMo: IS_PRODUCTION_MODE ? 50 : 250, // Plus rapide en prod, plus lent en dév
            },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36', // User agent commun
        },
        maxRequestsPerCrawl: 3,
        minConcurrency: 1,
        maxConcurrency: 1,
        requestHandlerTimeoutSecs: 180,
        navigationTimeoutSecs: 180,
        async requestHandler({ page, request, log }: PlaywrightCrawlingContext) {
            log.info(`Processing Idealo search results page with Playwright: ${request.url}`);
            
            await handleCookieConsent(page, log, 'search page'); // Appel de la fonction helper
            await randomDelay(1000, 3000); // Délai aléatoire après gestion cookies / chargement page
            
            const productLinkElements = page.locator(SEARCH_SELECTORS.PRODUCT_LINK_IN_SEARCH);
            const count = await productLinkElements.count();
            log.info(`Found ${count} potential product links on Idealo search page using Playwright with selector: "${SEARCH_SELECTORS.PRODUCT_LINK_IN_SEARCH}".`);

            if (count > 0) {
                const firstResultHref = await productLinkElements.first().getAttribute('href');

                if (firstResultHref) {
                    try {
                        const absoluteUrl = new URL(firstResultHref, 'https://www.idealo.fr/').toString();
                        log.info(`Found potential Idealo product URL: ${absoluteUrl}`);
                        if (absoluteUrl.includes('/prix/') || absoluteUrl.match(/\/offre\//) || absoluteUrl.match(/\/fiche-technique\//) ) {
                            productUrl = absoluteUrl;
                            log.info(`Validated Idealo product URL found: ${productUrl}`);
                        } else {
                            log.warning(`Link does not look like an Idealo product page: ${absoluteUrl}`);
                        }
                    } catch (e) {
                        const err = e as Error;
                        log.error(`Failed to construct absolute URL from Idealo href: ${firstResultHref}`, { message: err.message });
                    }
                } else {
                    log.debug('First product link element found, but href is missing.');
                }
            }
            if (productUrl) {
                log.info('Product URL found, intending to stop search crawler soon.');
            }

            if (!productUrl && count === 0) {
                 log.warning('Could not find a valid product link on this Idealo search page.');
            }
        },
        failedRequestHandler({ request, log }) {
            log.error(`Idealo search (Playwright) request failed: ${request.url}`, { errorMessage: request.errorMessages?.join(', ') });
        },
    });

    await searchQueue.addRequest({ url: searchUrl, uniqueKey: `idealo_search_${productName}` });
    await searchCrawler.run();
    await searchQueue.drop();

    if (productUrl) {
        log.info(`Proceeding to scrape Idealo product page: ${productUrl}`);
        const productQueue = await RequestQueue.open(`idealo-product-${Date.now()}`);
        const productRequest = new Request({
            url: productUrl,
            uniqueKey: `idealo_product_${productName}`,
            headers: { 'Referer': searchUrl },
        });
        await productQueue.addRequest(productRequest);

        // Temporairement productCrawler en mode Playwright visible pour test
        const productCrawler = new PlaywrightCrawler({
            requestQueue: productQueue,
            headless: IS_PRODUCTION_MODE, // <<< POUR VOIR LE NAVIGATEUR
            launchContext: {
                launchOptions: {
                    slowMo: IS_PRODUCTION_MODE ? 100 : 500, // Ralentit les actions pour mieux observer
                },
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.80 Safari/537.36', // User agent différent
            },
            maxRequestsPerCrawl: 1,
            minConcurrency: 1,
            maxConcurrency: 1,
            requestHandlerTimeoutSecs: 120000, // Augmenté pour observation
            navigationTimeoutSecs: 12000, // Augmenté pour observation  //debuguaggggeeeee
            async requestHandler({ page, request, log }: PlaywrightCrawlingContext) { // Contexte Playwright
                log.info(`Processing Idealo product page with Playwright: ${request.loadedUrl ?? request.url}`);

                await handleCookieConsent(page, log, 'product page'); // Appel de la fonction helper
                await randomDelay(1500, 3500); // Délai aléatoire après gestion cookies
                
                // Attentes pour les éléments clés de la page produit (déplacé ici après la gestion des cookies)
                try {
                    await page.waitForSelector(PRODUCT_SELECTORS.PRODUCT_WRAPPER, { state: 'visible', timeout: IS_PRODUCTION_MODE ? 15000: 10000 });
                    log.info('Product wrapper is visible.');

                    log.info('Attempting to wait for price container to be visible...');
                    await page.waitForSelector('div#oopStage-conditionButton-new', { state: 'visible', timeout: IS_PRODUCTION_MODE ? 20000 : 15000 });
                    log.info('Container for new price button is visible.');
                    
                    log.info('Attempting to wait for price strong element to be visible...');
                    await page.waitForSelector(PRODUCT_SELECTORS.PRICE_NEW_STRONG, { state: 'visible', timeout: IS_PRODUCTION_MODE ? 15000 : 10000 });
                    log.info('Price strong element is visible.');

                    try {
                        log.info('Attempting to wait for options container to be visible...');
                        await page.waitForSelector(PRODUCT_SELECTORS.OPTION_CHOICES_CONTAINER, { state: 'visible', timeout: IS_PRODUCTION_MODE ? 15000 : 10000 });
                        log.info('Options container (delta-filters) is visible.');
                    } catch (optionsWaitError) {
                        log.info('Options container (delta-filters) did not become visible or is not present.', { error: optionsWaitError });
                    }
                    
                    try {
                        log.info('Attempting to wait for datasheet container to be visible...');
                        await page.waitForSelector(PRODUCT_SELECTORS.DATASHEET_CONTAINER, { state: 'visible', timeout: IS_PRODUCTION_MODE ? 15000 : 10000 });
                        log.info('Datasheet container is visible.');
                    } catch (datasheetWaitError) {
                        log.info('Datasheet container did not become visible or is not present.', { error: datasheetWaitError });
                    }

                    if (!IS_PRODUCTION_MODE) {
                        log.info('>>> DEV MODE: PAUSING for 5 seconds for manual DOM inspection after element waits...');
                        await page.waitForTimeout(5000); 
                    } else {
                        await randomDelay(500, 1500); // Petite pause en production après les attentes
                    }

                } catch (waitError) {
                    log.warning('Essential product page elements did not become visible within timeout.', { error: waitError });
                     // En mode production, on pourrait vouloir échouer ici ou essayer une autre stratégie
                    if (IS_PRODUCTION_MODE) throw new Error('Essential product elements not found.');
                }
                
                // Log direct du contenu du prix avec Playwright
                const priceNewElementForDebug = page.locator(PRODUCT_SELECTORS.PRICE_NEW_STRONG);
                const priceTextFromPlaywright = await priceNewElementForDebug.textContent();
                if (!IS_PRODUCTION_MODE) log.info(`[DEBUG_PRICE] Text content of PRICE_NEW_STRONG directly from Playwright: "${priceTextFromPlaywright}"`);
                const priceHtmlFromPlaywright = await priceNewElementForDebug.innerHTML();
                if (!IS_PRODUCTION_MODE) log.info(`[DEBUG_PRICE] Inner HTML of PRICE_NEW_STRONG directly from Playwright: "${priceHtmlFromPlaywright}"`);

                await randomDelay(1000, 2500); // Délai avant de récupérer le contenu
                const htmlContent = await page.content();
                const $ = cheerio.load(htmlContent); 

                handleCaptchaBlocking($, request.loadedUrl || request.url);
                const details = extractProductDetails($, request.loadedUrl || request.url); // Utilise le $ chargé
                
                extractedDetailsLocally = details;
                const titleForLog = details?.title ?? 'N/A';
                log.info(`Successfully extracted details for Idealo product (Title: ${titleForLog})`);
                
                // Log des spécifications extraites pour vérification
                if (details?.specifications && details.specifications.length > 0) {
                    log.info(`Extracted ${details.specifications.length} specifications:`);
                    details.specifications.forEach(spec => log.info(`  - ${spec.key}: ${spec.value}`));
                } else {
                    log.info('No specifications were extracted or found.');
                }

                // await page.waitForTimeout(3000); // Pause de 3s pour voir la page. Remplacé par un délai aléatoire ou supprimé.
                if (!IS_PRODUCTION_MODE) {
                    await randomDelay(2000, 4000); // Garder une petite pause en mode non-production
                }
            },
            failedRequestHandler({ request, log }) {
                 log.error(`Idealo product page request failed: ${request.url}`, { errorMessage: request.errorMessages?.join(', ') });
            },
        });
        await productCrawler.run();
        await productQueue.drop();
        productDetails = extractedDetailsLocally;
    } else {
        log.error(`Could not find a valid Idealo product URL for "${productName}" after search.`);
    }

    if (productDetails) {
         const typedProductDetails = productDetails as IdealoProductDetails;
         const finalTitle = typedProductDetails.title ?? 'N/A';
         log.info(`Idealo scraping finished successfully for "${productName}" (Title: ${finalTitle}).`);
         return typedProductDetails;
    } else {
         log.warning(`Idealo scraping did not yield product details for "${productName}".`);
         return null;
    }
}; 