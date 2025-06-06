#!/usr/bin/env ts-node

import { scrapeLedenicheurProduct } from '../src/services/scraping/ledenicheur/ledenicheur.scraper';

/**
 * Script de test pour vérifier l'extraction d'images améliorée
 */
async function testImageExtraction() {
  console.log('🖼️ Test de l\'extraction d\'images améliorée');
  
  // Tester avec un produit qui devrait avoir des images
  const testProduct = 'Apple MacBook Pro M2';
  
  try {
    console.log(`\n🔍 Test d'extraction d'images pour: "${testProduct}"`);
    
    const productDetails = await scrapeLedenicheurProduct(testProduct);
    
    if (productDetails) {
      console.log(`✅ Produit trouvé: ${productDetails.pageTitle}`);
      console.log(`📍 URL: ${productDetails.url}`);
      console.log(`📊 Spécifications: ${productDetails.specifications.length}`);
      
      if (productDetails.imageUrls && productDetails.imageUrls.length > 0) {
        console.log(`🖼️ Images extraites: ${productDetails.imageUrls.length}`);
        productDetails.imageUrls.forEach((url, index) => {
          console.log(`  ${index + 1}. ${url}`);
        });
      } else {
        console.log(`❌ Aucune image extraite`);
      }
      
      if (productDetails.priceHistory) {
        console.log(`💰 Historique des prix: Disponible`);
        console.log(`  - Prix le plus bas 3 mois: ${productDetails.priceHistory.lowest3MonthsPrice}`);
        console.log(`  - Prix médian: ${productDetails.priceHistory.medianPrice3Months}`);
      } else {
        console.log(`⚠️ Historique des prix: Non disponible`);
      }
      
    } else {
      console.log(`❌ Aucun produit trouvé pour "${testProduct}"`);
    }
    
  } catch (error) {
    console.error(`💥 Erreur pour "${testProduct}":`, error);
  }
}

// Exécuter le test
if (require.main === module) {
  testImageExtraction()
    .then(() => {
      console.log('\n🏁 Test d\'extraction d\'images terminé');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Erreur fatale:', error);
      process.exit(1);
    });
}

export { testImageExtraction }; 