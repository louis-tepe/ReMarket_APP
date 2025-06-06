#!/usr/bin/env ts-node

import { scrapeLedenicheurProduct } from '../src/services/scraping/ledenicheur/ledenicheur.scraper';

/**
 * Script de test pour vérifier l'extraction des données d'historique des prix
 */
async function testPriceHistoryScraping() {
  console.log('🚀 Test de l\'extraction des données d\'historique des prix');
  
  // Produit de test - vous pouvez changer ce nom selon vos besoins
  const productName = 'iPhone 15 Pro';
  
  try {
    console.log(`📝 Recherche et scraping pour: "${productName}"`);
    
    const productDetails = await scrapeLedenicheurProduct(productName);
    
    if (productDetails) {
      console.log('\n✅ Scraping terminé avec succès !');
      console.log('\n📊 Informations produit:');
      console.log(`- URL: ${productDetails.url}`);
      console.log(`- Titre: ${productDetails.pageTitle || 'N/A'}`);
      console.log(`- Spécifications: ${productDetails.specifications.length} trouvées`);
      
      if (productDetails.priceHistory) {
        console.log('\n💰 Données d\'historique des prix:');
        console.log(`- Prix le plus bas 3 mois: ${productDetails.priceHistory.lowest3MonthsPrice || 'N/A'}`);
        console.log(`- Date du plus bas: ${productDetails.priceHistory.lowest3MonthsDate || 'N/A'}`);
        console.log(`- Prix actuel le plus bas: ${productDetails.priceHistory.currentLowestPrice || 'N/A'}`);
        console.log(`- Magasin: ${productDetails.priceHistory.currentLowestShop || 'N/A'}`);
        console.log(`- Prix médian 3 mois: ${productDetails.priceHistory.medianPrice3Months || 'N/A'}`);
        console.log(`- Période sélectionnée: ${productDetails.priceHistory.selectedPeriod || 'N/A'}`);
      } else {
        console.log('\n⚠️  Aucune donnée d\'historique des prix extraite');
      }
      
      if (productDetails.imageUrls && productDetails.imageUrls.length > 0) {
        console.log(`\n🖼️  Images: ${productDetails.imageUrls.length} trouvées`);
      }
      
    } else {
      console.log('\n❌ Échec du scraping - aucun produit trouvé');
    }
    
  } catch (error) {
    console.error('\n💥 Erreur lors du test:', error);
  }
}

// Exécuter le test
if (require.main === module) {
  testPriceHistoryScraping()
    .then(() => {
      console.log('\n🏁 Test terminé');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Erreur fatale:', error);
      process.exit(1);
    });
}

export { testPriceHistoryScraping }; 