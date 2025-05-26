/**
 * Script simple pour tester les performances de l'API
 * Usage: node scripts/test-api-performance.js
 */

// Utilisation de fetch natif de Node.js (disponible depuis Node 18)

async function testApiPerformance() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🚀 Test de performance de l\'API categories/electronics');
  console.log('=========================================================');
  
  // Test 1: API Products directement
  console.log('\n📊 Test 1: API /api/products?categorySlug=electronics');
  const start1 = Date.now();
  
  try {
    const response1 = await fetch(`${baseUrl}/api/products?categorySlug=electronics`);
    const data1 = await response1.json();
    const time1 = Date.now() - start1;
    
    console.log(`✅ Temps de réponse: ${time1}ms`);
    console.log(`📦 Produits retournés: ${data1.data ? data1.data.length : 0}`);
    
    if (data1.success) {
      console.log('✅ Statut: Succès');
    } else {
      console.log('❌ Statut: Échec -', data1.message);
    }
    
  } catch (error) {
    console.error('❌ Erreur test 1:', error.message);
  }
  
  // Test 2: API Brands
  console.log('\n📊 Test 2: API /api/brands?categorySlug=electronics');
  const start2 = Date.now();
  
  try {
    const response2 = await fetch(`${baseUrl}/api/brands?categorySlug=electronics`);
    const data2 = await response2.json();
    const time2 = Date.now() - start2;
    
    console.log(`✅ Temps de réponse: ${time2}ms`);
    console.log(`🏷️ Marques retournées: ${data2.brands ? data2.brands.length : 0}`);
    
    if (data2.success) {
      console.log('✅ Statut: Succès');
    } else {
      console.log('❌ Statut: Échec -', data2.message);
    }
    
  } catch (error) {
    console.error('❌ Erreur test 2:', error.message);
  }
  
  // Test 3: API Categories
  console.log('\n📊 Test 3: API /api/categories');
  const start3 = Date.now();
  
  try {
    const response3 = await fetch(`${baseUrl}/api/categories`);
    const data3 = await response3.json();
    const time3 = Date.now() - start3;
    
    console.log(`✅ Temps de réponse: ${time3}ms`);
    console.log(`📂 Catégories retournées: ${data3.categories ? data3.categories.length : 0}`);
    
    if (data3.success || data3.categories) {
      console.log('✅ Statut: Succès');
    } else {
      console.log('❌ Statut: Échec');
    }
    
  } catch (error) {
    console.error('❌ Erreur test 3:', error.message);
  }
  
  console.log('\n🏁 Tests terminés');
  console.log('=================');
  console.log('💡 Attendez-vous à voir des améliorations significatives dans les logs serveur');
  console.log('🔍 Vérifiez la console du serveur Next.js pour les logs [PERF]');
}

// Vérifier que le serveur est démarré
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/api/categories');
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  const isServerRunning = await checkServer();
  
  if (!isServerRunning) {
    console.error('❌ Serveur Next.js non accessible sur http://localhost:3000');
    console.log('💡 Assurez-vous que "npm run dev" est en cours d\'exécution');
    process.exit(1);
  }
  
  await testApiPerformance();
}

main().catch(console.error); 