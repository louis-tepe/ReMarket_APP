#!/usr/bin/env ts-node

import { PlaywrightCrawler } from 'crawlee';
import { extractPriceHistoryData } from '../src/services/scraping/ledenicheur/ledenicheur.helpers';

/**
 * Script de test manuel pour vérifier l'extraction des données d'historique des prix
 * sur une URL directe
 */
async function testPriceHistoryManual() {
  console.log('🚀 Test manuel de l\'extraction des données d\'historique des prix');
  
  // URL de test - vous pouvez changer cette URL selon vos besoins
  const testUrl = 'https://ledenicheur.fr/product.php?p=12105533'; // iPhone 15 Pro 1To
  
  const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl: 1,
    requestHandlerTimeoutSecs: 60,
    launchContext: {
      launchOptions: {
        headless: false, // Fenêtre visible pour debugging
        devtools: false,
      },
    },
    
    async requestHandler(context) {
      const { page, log } = context;
      
      console.log(`\n📝 Test sur: ${testUrl}`);
      
      try {
        // Attendre un peu que la page soit complètement chargée
        await page.waitForTimeout(3000);
        
        // Lister tous les onglets/boutons disponibles
        console.log('\n🔍 Recherche des onglets disponibles...');
        const allButtons = await page.locator('button, a[role="tab"], [role="tab"]').all();
        const buttonTexts = await Promise.all(
          allButtons.slice(0, 20).map(async (button, index) => {
            try {
              const text = await button.textContent();
              const isVisible = await button.isVisible();
              return `${index + 1}. "${text?.trim()}" (visible: ${isVisible})`;
            } catch {
              return `${index + 1}. [erreur extraction texte]`;
            }
          })
        );
        
        console.log('📋 Onglets/boutons trouvés:');
        buttonTexts.forEach(text => console.log(`  ${text}`));
        
        // Essayer d'extraire les données d'historique
        console.log('\n💰 Tentative d\'extraction des données d\'historique...');
        const priceHistoryData = await extractPriceHistoryData(context);
        
        if (priceHistoryData) {
          console.log('\n✅ Données d\'historique extraites:');
          console.log(JSON.stringify(priceHistoryData, null, 2));
        } else {
          console.log('\n⚠️  Aucune donnée d\'historique extraite');
          
          // Debug: chercher manuellement les éléments d'historique des prix
          console.log('\n🔍 Recherche manuelle d\'éléments d\'historique...');
          
          const priceElements = await page.locator('*:has-text("€")').all();
          console.log(`💶 ${priceElements.length} éléments contenant "€" trouvés`);
          
          const historyKeywords = ['historique', 'prix', 'plus bas', 'médian', 'statistics', 'graphique'];
          for (const keyword of historyKeywords) {
            const elements = await page.locator(`*:has-text("${keyword}")`).all();
            if (elements.length > 0) {
              console.log(`🔎 ${elements.length} éléments contenant "${keyword}" trouvés`);
            }
          }
        }
        
      } catch (error) {
        console.error('💥 Erreur lors du test:', error);
      }
      
      // Pause pour permettre l'inspection manuelle
      console.log('\n⏸️  Pause pour inspection manuelle (la fenêtre reste ouverte 30 secondes)...');
      await page.waitForTimeout(30000);
    }
  });
  
  await crawler.run([testUrl]);
}

// Exécuter le test
if (require.main === module) {
  testPriceHistoryManual()
    .then(() => {
      console.log('\n🏁 Test manuel terminé');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Erreur fatale:', error);
      process.exit(1);
    });
}

export { testPriceHistoryManual }; 