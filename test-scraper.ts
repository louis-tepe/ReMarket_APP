// test-scraper.ts
import { scrapeIdealoProduct } from './src/lib/scraper'; // Ajustez le chemin si votre structure est différente
import { log } from 'crawlee';

// Configurer le niveau de log pour voir plus de détails pendant le test
log.setLevel(log.LEVELS.DEBUG);

async function runIdealoScraperTest() {
    // Vous pouvez changer ce nom de produit pour tester différents articles
    const productNameToTest = "samsung galaxy s23"; 
    // const productNameToTest = "iphone 15 pro max";
    // const productNameToTest = "sony wh-1000xm5";

    log.info(`[TEST_SCRIPT] Initializing test for Idealo product: "${productNameToTest}"`);

    try {
        const productDetails = await scrapeIdealoProduct(productNameToTest);

        if (productDetails) {
            log.info("[TEST_SCRIPT] Successfully extracted product details:");
            // Afficher les détails extraits de manière lisible
            console.log(JSON.stringify(productDetails, null, 2)); 
        } else {
            log.warning(`[TEST_SCRIPT] Failed to extract details for product: "${productNameToTest}".`);
        }
    } catch (error) {
        const err = error as Error; // Caster pour l'accès à message et stack
        log.error("[TEST_SCRIPT] An unexpected error occurred during the scraping test:", { 
            message: err.message, 
            stack: err.stack, 
            errorObject: err // Garder l'objet erreur original si besoin
        });
    }

    log.info("[TEST_SCRIPT] Idealo scraper test finished.");
}

// Exécuter la fonction de test
runIdealoScraperTest(); 