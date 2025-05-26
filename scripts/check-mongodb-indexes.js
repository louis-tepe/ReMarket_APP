/**
 * Script pour vérifier et créer les index MongoDB manquants
 * Usage: node scripts/check-mongodb-indexes.js
 */

const { MongoClient } = require('mongodb');

// Essayer plusieurs sources pour les variables d'environnement
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;
const DB_NAME = process.env.MONGODB_DB || process.env.DB_NAME || 'remarket';

console.log(`🔍 Tentative de connexion avec URI: ${MONGODB_URI ? 'trouvé' : 'non trouvé'}`);
console.log(`🔍 Base de données: ${DB_NAME}`);

if (!MONGODB_URI) {
  console.error('❌ Variable MONGODB_URI non trouvée. Vérifiez votre fichier .env.local');
  console.log('Variables d\'environnement disponibles:');
  Object.keys(process.env).filter(key => key.includes('MONGO') || key.includes('DB')).forEach(key => {
    console.log(`  ${key}: ${process.env[key] ? 'défini' : 'non défini'}`);
  });
  process.exit(1);
}

async function checkAndCreateIndexes() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connecté à MongoDB');
    
    const db = client.db(DB_NAME);
    
    // Index pour ProductModel
    console.log('\n📊 Vérification des index ProductModel...');
    const productModelIndexes = await db.collection('productmodels').indexes();
    console.log('Index existants:', productModelIndexes.map(idx => idx.key));
    
    // Index critiques pour ProductModel
    const productModelIndexesToCreate = [
      { category: 1 },
      { brand: 1 },
      { category: 1, brand: 1 }, // Index composé pour filtres combinés
      { slug: 1 },
      { title: 'text', standardDescription: 'text' } // Index text pour recherche
    ];
    
    for (const indexSpec of productModelIndexesToCreate) {
      try {
        await db.collection('productmodels').createIndex(indexSpec);
        console.log(`✅ Index créé/vérifié:`, indexSpec);
      } catch (error) {
        if (error.code === 85) { // Index déjà existant
          console.log(`ℹ️ Index déjà existant:`, indexSpec);
        } else {
          console.error(`❌ Erreur création index:`, indexSpec, error.message);
        }
      }
    }
    
    // Index pour ProductOffer
    console.log('\n📊 Vérification des index ProductOffer...');
    const productOfferIndexes = await db.collection('productoffers').indexes();
    console.log('Index existants:', productOfferIndexes.map(idx => idx.key));
    
    const productOfferIndexesToCreate = [
      { productModel: 1 },
      { transactionStatus: 1 },
      { listingStatus: 1 },
      { productModel: 1, transactionStatus: 1, listingStatus: 1 }, // Index composé critique
      { seller: 1 }
    ];
    
    for (const indexSpec of productOfferIndexesToCreate) {
      try {
        await db.collection('productoffers').createIndex(indexSpec);
        console.log(`✅ Index créé/vérifié:`, indexSpec);
      } catch (error) {
        if (error.code === 85) {
          console.log(`ℹ️ Index déjà existant:`, indexSpec);
        } else {
          console.error(`❌ Erreur création index:`, indexSpec, error.message);
        }
      }
    }
    
    // Index pour Category
    console.log('\n📊 Vérification des index Category...');
    const categoryIndexes = await db.collection('categories').indexes();
    console.log('Index existants:', categoryIndexes.map(idx => idx.key));
    
    const categoryIndexesToCreate = [
      { slug: 1 },
      { parent: 1 }
    ];
    
    for (const indexSpec of categoryIndexesToCreate) {
      try {
        await db.collection('categories').createIndex(indexSpec);
        console.log(`✅ Index créé/vérifié:`, indexSpec);
      } catch (error) {
        if (error.code === 85) {
          console.log(`ℹ️ Index déjà existant:`, indexSpec);
        } else {
          console.error(`❌ Erreur création index:`, indexSpec, error.message);
        }
      }
    }
    
    // Index pour Brand
    console.log('\n📊 Vérification des index Brand...');
    const brandIndexes = await db.collection('brands').indexes();
    console.log('Index existants:', brandIndexes.map(idx => idx.key));
    
    const brandIndexesToCreate = [
      { slug: 1 }
    ];
    
    for (const indexSpec of brandIndexesToCreate) {
      try {
        await db.collection('brands').createIndex(indexSpec);
        console.log(`✅ Index créé/vérifié:`, indexSpec);
      } catch (error) {
        if (error.code === 85) {
          console.log(`ℹ️ Index déjà existant:`, indexSpec);
        } else {
          console.error(`❌ Erreur création index:`, indexSpec, error.message);
        }
      }
    }
    
    // Statistiques des collections
    console.log('\n📈 Statistiques des collections:');
    
    const electronicsCategory = await db.collection('categories').findOne({ slug: 'electronics' });
    if (electronicsCategory) {
      const productCount = await db.collection('productmodels').countDocuments({ category: electronicsCategory._id });
      const offerCount = await db.collection('productoffers').countDocuments({ 
        transactionStatus: 'available', 
        listingStatus: 'active' 
      });
      
      console.log(`📦 Catégorie Electronics:`);
      console.log(`   - ID: ${electronicsCategory._id}`);
      console.log(`   - Produits: ${productCount}`);
      console.log(`   - Offres actives: ${offerCount}`);
    } else {
      console.log('❌ Catégorie "electronics" non trouvée');
    }
    
    const totalProducts = await db.collection('productmodels').countDocuments();
    const totalOffers = await db.collection('productoffers').countDocuments();
    console.log(`📊 Total base: ${totalProducts} produits, ${totalOffers} offres`);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await client.close();
    console.log('\n🔚 Connexion fermée');
  }
}

checkAndCreateIndexes().catch(console.error); 