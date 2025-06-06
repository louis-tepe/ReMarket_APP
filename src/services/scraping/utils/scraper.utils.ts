import { log } from 'crawlee';
import { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

/**
 * Introduces a random delay between a minimum and maximum number of milliseconds.
 * Useful for mimicking human behavior and avoiding rate limiting.
 * @param minMs - The minimum delay in milliseconds.
 * @param maxMs - The maximum delay in milliseconds.
 * @returns A promise that resolves after the delay.
 */
export const randomDelay = async (minMs: number, maxMs: number): Promise<void> => {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    log.debug(`Waiting for ${delay}ms`);
    return new Promise(resolve => setTimeout(resolve, delay));
};

/**
 * Normalizes a product title by converting it to lowercase, removing diacritics,
 * replacing non-alphanumeric characters (excluding digits) with spaces,
 * trimming excess whitespace, sorting words alphabetically, and joining them back.
 * This helps in standardizing titles for comparison.
 * @param title - The product title to normalize.
 * @returns The normalized product title, or an empty string if the input is falsy.
 */
export const normalizeProductTitle = (title: string): string => {
    if (!title) return '';
    let normalized = title.toLowerCase();
    // Étape 1: Normalisation Unicode (NFD) et suppression des diacritiques
    normalized = normalized.normalize('NFD').replace(/\p{Diacritic}/gu, "");
    // Étape 2: Remplacer les caractères non alphanumériques (tout ce qui n'est pas une lettre ou un chiffre) par des espaces.
    // Conserve les espaces existants pour le moment.
    normalized = normalized.replace(/[^\p{L}\p{N}\s]/gu, " ");
    // Étape 3: Remplacer les séquences d'espaces multiples par un seul espace et couper les espaces au début/fin.
    normalized = normalized.replace(/\s+/g, " ").trim();
    // Étape 4: Séparer les mots, filtrer les mots vides (si certains caractères non alphanumériques ont été remplacés par des espaces seuls)
    const words = normalized.split(' ').filter(word => word.length > 0);
    // Étape 5: Trier les mots
    words.sort();
    // Étape 6: Rejoindre les mots
    normalized = words.join(' ');
    return normalized;
};

/**
 * Parses a numerical value from a raw string.
 * It handles currency symbols, thousands separators (implicitly by joining parts before the last dot/comma),
 * and decimal separators (comma or dot).
 * @param rawString - The string containing the number to parse (e.g., "€1,234.56", "$ 78.90").
 * @returns The parsed number, or null if the string is empty or cannot be parsed into a valid number.
 */
export const parseNumberValue = (rawString: string | null | undefined): number | null => {
    if (!rawString) return null;
    let str = rawString.replace(/&nbsp;/g, ' '); // Replace non-breaking space first
    str = str.replace(/[€$£¥\s]+/g, ''); // Remove currency symbols and all spaces

    // Keep only digits, commas, and dots
    str = str.replace(/[^\d,.]/g, '');

    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');

    // Determine if comma or dot is the decimal separator
    // This heuristic assumes that if both are present, the one that appears later is the decimal separator.
    // If only one is present, it's assumed to be the decimal separator if followed by 1-3 digits typically.
    // However, for simplicity here, we will prioritize based on last occurrence if both exist.

    if (lastComma > -1 && lastDot > -1) { // Both comma and dot exist
        if (lastComma > lastDot) {
            // Comma is likely decimal separator, remove dots (thousands)
            str = str.replace(/\./g, '');
            str = str.replace(',', '.');
        } else {
            // Dot is likely decimal separator, remove commas (thousands)
            str = str.replace(/,/g, '');
        }
    } else if (lastComma > -1) {
        // Only comma exists, assume it's the decimal separator
        str = str.replace(',', '.');
    } else if (lastDot > -1) {
        // Only dot exists, assume it's the decimal separator (no change needed if it's already a dot)
        // If we want to be very strict and remove dots if they act as thousand separators when no comma is present:
        // This part is tricky without more context on typical number formats.
        // For now, we assume a single dot is a decimal separator.
    }
    // At this point, str should have only digits and at most one dot for the decimal.

    const value = parseFloat(str);
    return isNaN(value) ? null : value;
};

/**
 * Extracts text from a given selector using Cheerio and then parses it as a number.
 * @param $ - The CheerioAPI instance.
 * @param selector - The CSS selector to find the element containing the number.
 * @param context - (Optional) A Cheerio context to search within.
 * @returns The parsed number, or null if the element is not found or its text cannot be parsed.
 */
export const parseNumberFromSelector = ($: CheerioAPI, selector: string, context?: cheerio.Cheerio<cheerio.AnyNode>): number | null => {
    const rawValue = extractText($, selector, context);
    return parseNumberValue(rawValue);
};

/**
 * Extracts and trims the text content of the first element matching a CSS selector.
 * @param $ - The CheerioAPI instance.
 * @param selector - The CSS selector for the target element.
 * @param context - (Optional) A Cheerio context (e.g., a specific part of the document) to search within.
 * @returns The trimmed text content of the element, or null if the element is not found or has no text.
 */
export const extractText = ($: CheerioAPI, selector: string, context?: cheerio.Cheerio<cheerio.AnyNode>): string | null => {
    const element = context ? context.find(selector).first() : $(selector).first();
    const text = element.text().trim();
    return text || null;
};

/**
 * Cleans a product title by removing a specified brand name from the beginning of the title.
 * The brand removal is case-insensitive.
 * Logs a message if the brand was actually removed.
 * @param title - The product title to clean.
 * @param brandToRemove - (Optional) The brand name to remove from the start of the title.
 * @returns The cleaned title, or the original title if no brand was provided or found.
 */
export const cleanProductTitle = (title: string | null, brandToRemove?: string): string | null => {
    if (title && brandToRemove) {
        // Escape special characters in brandToRemove for regex
        const escapedBrand = brandToRemove.replace(/[.*+?^${}()|[\]\\]]/g, '\\$&');
        const regex = new RegExp(`^${escapedBrand}\s+`, 'i');
        const originalTitle = title;
        const cleanedTitle = title.replace(regex, '');
        if (cleanedTitle !== originalTitle) {
            log.info(`[TITLE_CLEANUP] Removed brand "${brandToRemove}" from title. Original: "${originalTitle}", New: "${cleanedTitle}"`);
        }
        return cleanedTitle;
    }
    return title;
}; 