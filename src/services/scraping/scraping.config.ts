/**
 * Configuration settings for scraping processes.
 */

// Suggestion 1: Externalize IS_PRODUCTION_MODE and SIMILARITY_THRESHOLD
/** 
 * Flag indicating if the scraper is running in production mode.
 * In production mode, headless is true, timeouts are shorter, and slowMo is minimal.
 * Set via environment variable `NODE_ENV === 'production'` or a specific scraping env var.
 */
export const IS_PRODUCTION_MODE = process.env.NODE_ENV === 'production';
// export const IS_PRODUCTION_MODE = process.env.SCRAPING_ENV === 'production'; // Alternative specific env var

/**
 * The minimum similarity score (0 to 1) for a scraped product title to be considered a match
 * against the searched product name during Ledenicheur searches.
 */
export const LEDENICHEUR_SIMILARITY_THRESHOLD = 0.3; // Réduit de 0.65 à 0.5 pour améliorer la détection

// export const IDEALO_SIMILARITY_THRESHOLD = 0.7; // Supprimé ou commenté

// Suggestion 2: User-Agent Management - Amélioration anti-détection
const COMMON_USER_AGENTS = [
    // Chrome récents
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    
    // Firefox récents
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/121.0',
    
    // Safari récents
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',
];

/**
 * Returns a randomly selected User-Agent string from a predefined list.
 * @returns A User-Agent string.
 */
export const getRandomUserAgent = (): string => {
    return COMMON_USER_AGENTS[Math.floor(Math.random() * COMMON_USER_AGENTS.length)];
};

/**
 * Obtient des options de lancement réalistes pour le navigateur pour éviter la détection.
 * @returns Options de lancement Playwright.
 */
export const getStealthLaunchOptions = () => ({
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images', // Économiser de la bande passante
        // JavaScript activé car nécessaire pour la plupart des sites modernes
    ],
    ignoreDefaultArgs: ['--enable-automation'],
    ignoreHTTPSErrors: true,
});

// Suggestion 3: Configurable Timeouts
/** Default timeout for navigation actions in milliseconds. */
export const NAVIGATION_TIMEOUT_MS = IS_PRODUCTION_MODE ? 90000 : 180000; // 90s in prod, 180s in dev

/** Default timeout for individual request handlers in milliseconds. */
export const REQUEST_HANDLER_TIMEOUT_MS = IS_PRODUCTION_MODE ? 60000 : 120000; // 60s in prod, 120s in dev

/** Timeout for waiting for selectors in milliseconds. */
export const SELECTOR_TIMEOUT_MS = IS_PRODUCTION_MODE ? 10000 : 20000;

/** Shorter timeout for secondary/optional elements or checks. */
export const SHORT_SELECTOR_TIMEOUT_MS = IS_PRODUCTION_MODE ? 5000 : 10000;

/** Timeout for getting attributes from elements. */
export const GET_ATTRIBUTE_TIMEOUT_MS = IS_PRODUCTION_MODE ? 2000 : 3000;

/** Standard delay after critical actions like cookie consent. */
export const POST_ACTION_DELAY_MIN_MS = 1000;
export const POST_ACTION_DELAY_MAX_MS = IS_PRODUCTION_MODE ? 2000 : 3000;

/** General short random delay. */
export const SHORT_RANDOM_DELAY_MIN_MS = IS_PRODUCTION_MODE ? 500 : 1000;
export const SHORT_RANDOM_DELAY_MAX_MS = IS_PRODUCTION_MODE ? 1500 : 3000;

/** General medium random delay. */
export const MEDIUM_RANDOM_DELAY_MIN_MS = IS_PRODUCTION_MODE ? 1500 : 2000;
export const MEDIUM_RANDOM_DELAY_MAX_MS = IS_PRODUCTION_MODE ? 3500 : 5000;


// Configuration for PlaywrightCrawler launch options
/** Slow motion speed for Playwright actions. Higher in dev for observation. */
export const SLOW_MO_MS = IS_PRODUCTION_MODE ? 50 : 250;
export const PRODUCT_PAGE_SLOW_MO_MS = IS_PRODUCTION_MODE ? 100 : 500;

/**
 * Placeholder for future proxy configuration.
 * For now, it's undefined, meaning no proxy will be used by default.
 * @see https://crawlee.dev/docs/guides/proxy-management
 */
export const PROXY_CONFIGURATION = undefined; // TODO: Implement proxy configuration if needed 