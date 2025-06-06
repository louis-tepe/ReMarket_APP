#!/usr/bin/env ts-node

import { scrapeLedenicheurProduct } from '../src/services/scraping/ledenicheur/ledenicheur.scraper';
import { calculateSimilarityWithProductTypeBonus } from '../src/services/scraping/ledenicheur/ledenicheur.helpers';

/**
 * Script de test pour vérifier les améliorations de l'algorithme de recherche
 */
async function testImprovedSearch() {
  console.log('🚀 Test de l\'algorithme de recherche amélioré');
  
  // Tests d'algorithme de similarité
  console.log('\n📊 Test du calcul de similarité:');
  
  const testCases = [
    {
      search: 'Apple MacBook Pro M2',
      candidates: [
        'Apple MacBook Pro 13" M2 8GB 256GB',
        'Apple Leather Sleeve MacBook Pro 13"',
        'Apple MacBook Air M2 13"',
        'Speck MacBook Pro Case'
      ]
    },
    {
      search: 'iPhone 15 Pro',
      candidates: [
        'Apple iPhone 15 Pro 128GB',
        'Apple iPhone 15 Pro Case Clear',
        'Apple iPhone 15 256GB',
        'Screen Protector iPhone 15 Pro'
      ]
    }
  ];
  
  testCases.forEach((testCase, index) => {
    console.log(`\n🔍 Test ${index + 1}: "${testCase.search}"`);
    
    const normalizedSearch = testCase.search.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(' ').sort().join(' ');
    
    const results = testCase.candidates.map(candidate => {
      const normalizedCandidate = candidate.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(' ').sort().join(' ');
      const similarity = calculateSimilarityWithProductTypeBonus(
        testCase.search,
        candidate,
        normalizedSearch,
        normalizedCandidate
      );
      
      return { candidate, similarity };
    }).sort((a, b) => b.similarity - a.similarity);
    
    results.forEach((result, i) => {
      const emoji = i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : '📦';
      console.log(`  ${emoji} ${result.candidate}: ${result.similarity.toFixed(4)}`);
    });
  });
  
  // Test de scraping réel
  console.log('\n🔍 Test de scraping réel:');
  const testProducts = [
    'MacBook Pro M2',
    'iPhone 15 Pro Max',
    'iPad Air M2'
  ];
  
  for (const productName of testProducts) {
    try {
      console.log(`\n📝 Test de scraping pour: "${productName}"`);
      
      const productDetails = await scrapeLedenicheurProduct(productName);
      
      if (productDetails) {
        console.log(`✅ Produit trouvé: ${productDetails.pageTitle}`);
        console.log(`📍 URL: ${productDetails.url}`);
        console.log(`📊 Spécifications: ${productDetails.specifications.length}`);
        console.log(`🖼️ Images: ${productDetails.imageUrls?.length || 0}`);
        
        if (productDetails.priceHistory) {
          console.log(`💰 Historique des prix: Disponible`);
        } else {
          console.log(`⚠️ Historique des prix: Non disponible`);
        }
      } else {
        console.log(`❌ Aucun produit trouvé pour "${productName}"`);
      }
      
    } catch (error) {
      console.error(`💥 Erreur pour "${productName}":`, error);
    }
  }
}

// Exécuter le test
if (require.main === module) {
  testImprovedSearch()
    .then(() => {
      console.log('\n🏁 Test des améliorations terminé');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Erreur fatale:', error);
      process.exit(1);
    });
}

export { testImprovedSearch }; 