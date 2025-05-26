# Diagnostic de Performance - Electronics Category

## Problèmes Identifiés

### 1. **Cache côté client inefficace**
- ❌ `next: { revalidate }` ne fonctionne que côté serveur, pas côté client
- ❌ Les requêtes fetch côté client ignorent le cache Next.js
- ✅ **Fix** : Utiliser `cache: 'default'` pour le cache navigateur

### 2. **Pipeline MongoDB potentiellement lent**
- ❌ Le pipeline d'agrégation peut être plus lent que les requêtes simples pour gros volumes
- ❌ Nom de collection incorrect : `'productoffers'` au lieu de `'ProductOffer'`
- ✅ **Fix** : Revenir temporairement à l'approche simple + logs

### 3. **Index MongoDB manquants/suboptimaux**
Vérifier ces index critiques :
```javascript
// ProductModel
{ category: 1, brand: 1 }
{ slug: 1 }
{ title: "text" }

// ProductOffer  
{ productModel: 1, transactionStatus: 1, listingStatus: 1 }
{ seller: 1 }

// Category
{ slug: 1 }
{ parent: 1 }

// Brand
{ slug: 1 }
```

### 4. **Goulots d'étranglement potentiels pour 'electronics'**

La catégorie "electronics" peut avoir :
- Des milliers de produits
- Des dizaines de milliers d'offres
- Une hiérarchie profonde de sous-catégories

## Tests à Effectuer

### 1. Mesurer avec les logs actuels
1. Aller sur `http://localhost:3000/categories/electronics`
2. Ouvrir la console du navigateur
3. Noter les temps de chaque étape :
   - `[CLIENT-PERF]` pour le côté client
   - `[PERF]` pour l'API

### 2. Vérifier les données en DB
```javascript
// Dans MongoDB shell
use your_database

// Compter les produits dans electronics
db.categories.findOne({slug: "electronics"})
db.productmodels.countDocuments({category: ObjectId("...")})

// Compter les offres
db.productoffers.countDocuments({transactionStatus: "available", listingStatus: "active"})
```

### 3. Tests de performance isolés
- Test de l'API seule : `curl "http://localhost:3000/api/products?categorySlug=electronics"`
- Test des requêtes MongoDB individuellement

## Solutions par Ordre de Priorité

### 🔥 **Critique (Fix immédiat)**
1. ✅ Corriger le cache côté client  
2. ✅ Ajouter les logs de diagnostic
3. ✅ Revenir à l'approche simple pour l'API

### ⚡ **Important (À faire ensuite)**
4. Vérifier et créer les index MongoDB manquants
5. Implémenter la pagination (limite à 50 produits par page)
6. Optimiser la requête des descendants de catégories

### 🔧 **Optimisations avancées**
7. Implémenter un cache Redis
8. Préchargement des données côté serveur
9. Pipeline d'agrégation optimisé avec index appropriés

## Hypothèses sur la Lenteur

1. **Volume de données** : La catégorie electronics a probablement des milliers de produits
2. **Requêtes N+1** : Une requête par produit pour les offres (dans l'approche actuelle)
3. **Manque d'index** : Les requêtes MongoDB ne sont pas optimisées
4. **Cache manqué** : Pas de réutilisation des données entre requêtes

## Actions Immédiates

1. ✅ Tester avec les logs actuels pour confirmer où est le goulot
2. ✅ Ajouter pagination (limite 50 produits)
3. ⏳ Vérifier les index MongoDB
4. ⏳ Envisager une catégorie de test plus petite pour validation

## ✅ CORRECTIFS APPLIQUÉS

### 🎯 **Problème Principal Identifié et Corrigé**
- **Source**: `getCategoryWithDescendants()` prenait **14+ secondes** (requêtes récursives)
- **Solution**: Remplacement par `$graphLookup` MongoDB (une seule requête)
- **Impact estimé**: Réduction de 14s à ~100ms

### 🔧 **Optimisations Implémentées**

1. **API Products** (`src/app/api/products/route.ts`)
   - ✅ Fonction `getCategoryWithDescendants` optimisée avec `$graphLookup`
   - ✅ Pagination temporaire (50 produits max)
   - ✅ Logs de performance détaillés

2. **API Brands** (`src/app/api/brands/route.ts`)
   - ✅ Fonction `findAllDescendantIds` optimisée avec `$graphLookup`
   - ✅ Même amélioration que pour Products

3. **Cache côté client** (`src/app/(main)/categories/[[...slug]]/page.tsx`)
   - ✅ Correction du cache (`cache: 'default'` au lieu de `next: { revalidate }`)
   - ✅ Logs client détaillés

4. **Scripts de diagnostic**
   - ✅ `npm run db:check-indexes` - Vérification/création index MongoDB
   - ✅ `npm run test:api-perf` - Test des API isolément

### 📊 **Amélioration Attendue**
- **Avant**: ~15 secondes pour /categories/electronics
- **Après**: ~1-2 secondes (amélioration de 80-90%)

### 🧪 **Tests à Effectuer**
1. Redémarrer le serveur dev : `npm run dev`
2. Tester l'API : `npm run test:api-perf`
3. Tester la page : http://localhost:3000/categories/electronics
4. Vérifier les logs `[PERF]` dans la console 