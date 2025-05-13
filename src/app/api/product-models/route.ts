import { NextRequest, NextResponse } from 'next/server';
import { scrapeAmazonProduct, AmazonProductDetails } from '@/lib/scraper';
import dbConnect from '@/lib/db.Connect';
import ScrapedProduct, { IScrapedProduct } from '@/models/ScrapedProduct';
import ProductModel from '@/models/ProductModel';
import CategoryModel, { ICategory } from '@/models/CategoryModel';
import BrandModel, { IBrand } from '@/models/BrandModel';
import slugify from 'slugify';

// TODO: Connecter à la base de données et utiliser les modèles Mongoose
// import dbConnect from '@/lib/db.Connect';
// import ProductModel from '@/models/ScrapedProduct'; // Utiliser le modèle ScrapedProduct ou un modèle ProductModel unifié

// Interface pour les filtres de requête ProductModel
interface ProductModelQueryFilters {
  // status?: string; // Supprimé car on ne filtre plus par statut
  category?: string;
  brand?: string;
  $text?: { $search: string };
}

/**
 * @swagger
 * /api/product-models:
 *   get:
 *     summary: Recherche les modèles de produits ReMarket (standardisés).
 *     description: Recherche les ProductModel ReMarket par slug de catégorie et slug de marque. Optionnellement par terme de recherche.
 *     tags:
 *       - ProductModels
 *     parameters:
 *       - in: query
 *         name: categoryId # Devrait être categorySlug
 *         schema:
 *           type: string
 *         description: Le SLUG de la catégorie (ex: telephones-mobiles).
 *       - in: query
 *         name: brandId # Devrait être brandSlug
 *         schema:
 *           type: string
 *         description: Le SLUG de la marque (ex: apple).
 *       - in: query
 *         name: searchTerm
 *         schema:
 *           type: string
 *         description: Terme de recherche textuel (sur titre, description, etc.).
 *     responses:
 *       200:
 *         description: Une liste de ProductModel ReMarket (simplifiée pour la sélection).
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string # _id du ProductModel
 *                   name:
 *                     type: string # Correspond au `title` du ProductModel
 *                   brand:
 *                     type: string
 *                   category:
 *                     type: string
 *       400:
 *         description: Paramètres invalides.
 *       404:
 *         description: Catégorie ou marque non trouvée.
 *       500:
 *         description: Erreur serveur.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const categorySlug = searchParams.get('categoryId');
  const brandSlug = searchParams.get('brandId');
  const searchTerm = searchParams.get('searchTerm');

  try {
    await dbConnect();
    console.log(`[API GET /product-models] Recherche de ProductModel avec CatSlug: ${categorySlug}, BrandSlug: ${brandSlug}, Terme: ${searchTerm || 'N/A'}`);

    let reMarketCategoryName: string | undefined = undefined;
    let reMarketBrandName: string | undefined = undefined;

    if (categorySlug) {
      const categoryDoc = (await CategoryModel.findOne({ slug: categorySlug }).lean()) as ICategory | null;
      if (!categoryDoc) {
        return NextResponse.json({ message: `Catégorie ReMarket avec slug '${categorySlug}' non trouvée.` }, { status: 404 });
      }
      reMarketCategoryName = categoryDoc.name;
    }

    if (brandSlug) {
      const brandDoc = (await BrandModel.findOne({ slug: brandSlug }).lean()) as IBrand | null;
      if (!brandDoc) {
        return NextResponse.json({ message: `Marque ReMarket avec slug '${brandSlug}' non trouvée.` }, { status: 404 });
      }
      reMarketBrandName = brandDoc.name;
    }

    // Le filtre productModelQueryFilters est déjà correctement défini pour status: 'approved'
    const productModelQueryFilters: ProductModelQueryFilters = {};
    if (reMarketCategoryName) productModelQueryFilters.category = reMarketCategoryName;
    if (reMarketBrandName) productModelQueryFilters.brand = reMarketBrandName;
    
    if (searchTerm) {
      productModelQueryFilters.$text = { $search: searchTerm };
    }

    const commonProjection = { title: 1, brand: 1, category: 1, asin: 1 }; // ASIN est utile pour la déduplication ou référence

    const productModels = await ProductModel.find(productModelQueryFilters, commonProjection).limit(20).lean().exec();
    // const scrapedProductsPromise = ScrapedProduct.find(queryFilters, commonProjection).limit(20).lean().exec(); // Supprimé

    // const [productModels, scrapedProducts] = await Promise.all([
    //   productModelsPromise,
    //   scrapedProductsPromise
    // ]); // Supprimé

    interface ProductSelectItem {
      id: string;
      name: string; // Correspond au `title` du ProductModel
      brand?: string;
      category?: string;
    }
    const productModelItems: ProductSelectItem[] = [];
    // const seenAsins = new Set<string>(); // Plus forcément nécessaire si on ne fusionne plus avec ScrapedProducts, sauf si des PM peuvent avoir même ASIN.
                                         // Gardons-le pour la robustesse au cas où des ProductModels non uniques par ASIN existeraient (même si title est unique)

    // Formatter et ajouter les ProductModel approuvés
    productModels.forEach(pm => {
      // if (pm.asin && seenAsins.has(pm.asin)) return; // La contrainte unique sur title devrait suffire, mais ASIN peut être partagé par des variants.
                                                  // Pour la sélection de modèle, on se base sur l'ID unique du ProductModel.
      productModelItems.push({
        id: String(pm._id), // S'assurer que c'est bien _id de ProductModel
        name: pm.title,    // title de ProductModel
        brand: pm.brand,   // brand de ProductModel
        category: pm.category, // category de ProductModel
      });
      // if (pm.asin) seenAsins.add(pm.asin);
    });

    // La section pour ScrapedProduct est supprimée
    // scrapedProducts.forEach(sp => { ... });
    
    productModelItems.sort((a, b) => a.name.localeCompare(b.name));
    
    return NextResponse.json(productModelItems, { status: 200 });

  } catch (error) {
    console.error('[GET /api/product-models]', error);
    return NextResponse.json({ message: 'Erreur lors de la recherche des modèles de produits.', error: (error as Error).message }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/product-models:
 *   post:
 *     summary: Scrape et sauvegarde un nouveau modèle de produit.
 *     description: Récupère les informations d'un produit depuis Amazon, les sauvegarde en tant que ScrapedProduct.
 *     tags:
 *       - ProductModels
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nom du produit à rechercher sur Amazon.
 *                 example: "Sony WH-1000XM5"
 *     responses:
 *       201:
 *         description: Produit scrapé et sauvegardé avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/IScrapedProduct' # Référence au schéma IScrapedProduct
 *       400:
 *         description: Nom du produit manquant.
 *       404:
 *         description: Produit non trouvé ou impossible de récupérer les informations.
 *       409:
 *         description: Ce produit a déjà été scrapé (basé sur sourceUrl).
 *       500:
 *         description: Erreur serveur durant le scraping ou la sauvegarde.
 * components:
 *  schemas:
 *    IProductAttribute: # Ajout pour Swagger si IScrapedProduct l'utilise
 *      type: object
 *      properties:
 *        label:
 *          type: string
 *        value:
 *          type: string
 *    IScrapedProduct:
 *      type: object
 *      properties:
 *        _id:
 *          type: string
 *        asin:
 *          type: string
 *        source:
 *          type: string
 *        sourceUrl:
 *          type: string
 *        title:
 *          type: string
 *        brand:
 *          type: string
 *        model:
 *          type: string
 *        category:
 *          type: string
 *        description:
 *          type: string
 *        imageUrls:
 *          type: array
 *          items:
 *            type: string
 *        currentPrice:
 *          type: number
 *        listPrice:
 *          type: number
 *        currency:
 *          type: string
 *        reviewRating:
 *          type: number
 *        reviewCount:
 *          type: number
 *        attributes:
 *          type: array
 *          items:
 *            $ref: '#/components/schemas/IProductAttribute'
 *        createdAt:
 *          type: string
 *          format: date-time
 *        updatedAt:
 *          type: string
 *          format: date-time
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const { name, categoryId, brandId } = body; // categoryId et brandId sont des slugs

    if (!name || !categoryId || !brandId) {
      return NextResponse.json({ message: 'Le nom du produit, categoryId (slug) et brandId (slug) sont requis.' }, { status: 400 });
    }

    // Récupérer les noms de catégorie et marque ReMarket à partir des slugs
    const categoryDoc = (await CategoryModel.findOne({ slug: categoryId }).lean()) as ICategory | null;
    if (!categoryDoc) {
      return NextResponse.json({ message: `Catégorie ReMarket avec slug '${categoryId}' non trouvée.` }, { status: 404 });
    }
    const reMarketCategoryName = categoryDoc.name;

    const brandDoc = (await BrandModel.findOne({ slug: brandId }).lean()) as IBrand | null;
    if (!brandDoc) {
      return NextResponse.json({ message: `Marque ReMarket avec slug '${brandId}' non trouvée.` }, { status: 404 });
    }
    const reMarketBrandName = brandDoc.name;

    console.log(`[API POST /product-models] Lancement du scraping pour: "${name}" (Cat: ${reMarketCategoryName}, Marque: ${reMarketBrandName})`);
    const scrapedProductData: AmazonProductDetails | null = await scrapeAmazonProduct(name);

    if (!scrapedProductData) {
      console.warn(`[API POST /product-models] Produit non trouvé via scraping pour "${name}"`);
      return NextResponse.json({ message: `Produit non trouvé ou informations insuffisantes pour "${name}" via scraping.` }, { status: 404 });
    }
    
    console.log(`[API POST /product-models] Données scrapées pour "${name}": ${scrapedProductData.title}`);

    // Préparer les données pour ScrapedProduct, en s'assurant que sourceUrl est défini
    const preparedScrapedData = {
      ...scrapedProductData,
      sourceUrl: scrapedProductData.url, // Supposant que l'URL du produit est dans scrapedProductData.url
      source: 'amazon', // Assurez-vous que la source est définie si elle n'est pas dans scrapedProductData
      // Assurez-vous que les autres champs requis par IScrapedProduct sont présents ou mappés
      // Par exemple, si scrapedProductData n'a pas de champ 'status' pour ScrapedProduct,
      // il faudrait le définir ici, ou s'assurer que le modèle ScrapedProduct a une valeur par défaut.
      // Pour l'instant, le modèle ScrapedProduct a un statut par défaut 'pending_review'
    };

    if (!preparedScrapedData.sourceUrl) {
        console.error("[API POST /product-models] Erreur: impossible de déterminer sourceUrl à partir des données scrapées.", scrapedProductData);
        return NextResponse.json({ message: 'Erreur critique: URL source manquante après scraping.' }, { status: 500 });
    }

    // Sauvegarder le produit scrapé
    let existingScrapedProduct = await ScrapedProduct.findOne({ sourceUrl: preparedScrapedData.sourceUrl });
    
    if (existingScrapedProduct) {
      console.log(`[API POST /product-models] ScrapedProduct existant trouvé pour sourceUrl: ${preparedScrapedData.sourceUrl}. Mise à jour.`);
      // Lors de la mise à jour, assurez-vous de ne pas écraser des champs importants avec undefined si scrapedProductData ne les contient pas.
      // Il est plus sûr de spécifier les champs à mettre à jour.
      existingScrapedProduct = await ScrapedProduct.findByIdAndUpdate(existingScrapedProduct._id, preparedScrapedData, { new: true });
    } else {
      console.log(`[API POST /product-models] Aucun ScrapedProduct existant pour sourceUrl: ${preparedScrapedData.sourceUrl}. Création.`);
      existingScrapedProduct = await ScrapedProduct.create(preparedScrapedData);
    }
    if (!existingScrapedProduct) { // Sécurité, si la création/MAJ a échoué
        return NextResponse.json({ message: 'Erreur lors de la sauvegarde du produit scrapé.' }, { status: 500 });
    }
    console.log(`[API POST /product-models] Nouvelle entrée ScrapedProduct sauvegardée/mise à jour pour "${name}" avec ID: ${existingScrapedProduct._id}.`);


    // Tenter de trouver ou créer un ProductModel ReMarket
    // Utiliser le titre du produit scrapé pour rechercher un ProductModel existant
    let productModel = await ProductModel.findOne({ title: scrapedProductData.title });
    let pmError: string | undefined = undefined;

    if (productModel) {
      console.log(`[API POST /product-models] ProductModel existant trouvé pour le titre: "${scrapedProductData.title}". ID: ${productModel._id}`);
      // Mettre à jour si nécessaire (par exemple, si les standardImageUrls ou specs ont changé)
      // Pour l'instant, on considère que si le titre match, on ne le modifie pas automatiquement via scraping.
      // Un processus d'admin pourrait gérer les mises à jour.
      // On s'assure juste qu'il n'a plus de statut 'pending_approval' s'il en avait un.
      // if (productModel.status !== 'approved') {
      // productModel.status = 'approved'; // Plus de statut, donc cette logique est inutile
      //   await productModel.save();
      // }
    } else {
      console.log(`[API POST /product-models] Création d'un nouveau ProductModel pour: ${scrapedProductData.title}`);
      try {
        productModel = new ProductModel({
          title: scrapedProductData.title,
          brand: brandDoc.name, // Utiliser le nom de la marque ReMarket
          category: categoryDoc.name, // Utiliser le nom de la catégorie ReMarket
          standardDescription: scrapedProductData.description || "Description non disponible.",
          standardImageUrls: scrapedProductData.imageUrls && scrapedProductData.imageUrls.length > 0 ? scrapedProductData.imageUrls : ['/placeholder-image.png'],
          keyFeatures: scrapedProductData.keyFeatures || [],
          specifications: scrapedProductData.attributes ? scrapedProductData.attributes.map(attr => ({ label: attr.label, value: attr.value })) : [],
          // status: 'approved', // Statut par défaut, maintenant implicitement approuvé
          slug: slugify(`${brandDoc.name} ${scrapedProductData.title}`, { lower: true, strict: true }),
          // originalScrapedProductId: existingScrapedProduct._id, // Décommenter si besoin
        });
        await productModel.save();
      } catch (error) {
        const mongoError = error as MongoError;
        console.error('[API POST /product-models] Erreur lors de la création/mise à jour du ProductModel:', mongoError.code === 11000 ? `Doublon (titre): ${scrapedProductData.title}` : mongoError);
        if (mongoError.code === 11000) { // Erreur de clé dupliquée
          // Si c'est un doublon, on essaie de récupérer le ProductModel existant par son titre.
          // Cela peut arriver si deux requêtes quasi-simultanées tentent de créer le même produit.
          productModel = await ProductModel.findOne({ title: scrapedProductData.title });
          if (!productModel) { // Vraiment pas de chance, le findOne a échoué après un E11000
             pmError = `Un produit avec un titre similaire existe déjà, mais n'a pas pu être récupéré. (${scrapedProductData.title})`;
          } else {
             console.log(`[API POST /product-models] Récupération du ProductModel existant après erreur de doublon pour titre: "${scrapedProductData.title}". ID: ${productModel._id}`);
             // Pas besoin de re-sauvegarder si on vient de le trouver
          }
        } else {
            const messages = mongoError.errors ? Object.values(mongoError.errors).map(err => err.message).join(', ') : mongoError.message;
            pmError = `Erreur lors de la création du ProductModel standardisé: ${messages}`;
        }
      }
    }
    
    // Préparer la réponse
    const responsePayload: PostProductModelResponse = {
      scrapedProduct: existingScrapedProduct.toObject(), // Convertir en objet simple
      productModel: productModel ? productModel.toObject() : null, // Convertir en objet simple
      pmError: pmError,
    };

    // Si productModel est null et qu'il n'y a pas d'erreur spécifique de création de PM (pmError),
    // cela signifie que le scraping a eu lieu, mais le PM n'a pas été créé/trouvé et aucune erreur n'a été explicitement mise dans pmError.
    // Cela ne devrait pas arriver avec la logique actuelle (soit on trouve, soit on crée, soit on a une erreur E11000 qui trouve ou pmError).
    // On pourrait ajouter un pmError générique si productModel est null à la fin sans autre explication.
    if (!responsePayload.productModel && !responsePayload.pmError) {
        // Ce cas peut se produire si on trouve un PM existant, mais qu'ensuite on ne le retourne pas
        // ou si le try/catch de création ne set pas productModel et ne set pas pmError.
        // La logique actuelle devrait couvrir ça, mais par sécurité :
        // S'il n'y a pas de productModel à la fin de tout ça (même après une tentative de récupération sur E11000)
        // et pas d'erreur pmError spécifique, alors c'est un problème.
        // Cependant, la page de vente s'attend à un productModel ou un pmError.
        // Si productModel est null ici, la page de vente affichera une erreur.
    }


    return NextResponse.json(responsePayload, { status: productModel && !pmError ? 201 : (pmError ? 201 : 500) }); // 201 même si pmError pour que le client gère

  } catch (error) {
    console.error(`[POST /api/product-models] Erreur:`, error);
    // Typage pour l'erreur MongoDB et l'erreur de validation Mongoose
    interface MongoError extends Error {
        code?: number;
        errors?: Record<string, { message: string }>; // Pour ValidationError
    }
    const typedError = error as MongoError;
    const errorMessage = typedError.message || 'Erreur inconnue.';
    
    if (typedError.code === 11000) { // Code d'erreur MongoDB pour clé dupliquée (unique index)
      return NextResponse.json({ message: 'Erreur: Un produit avec des identifiants similaires (ex: ASIN ou URL source) existe déjà.', error: errorMessage }, { status: 409 });
    }
    // Pour les erreurs de validation Mongoose
    if (typedError.name === 'ValidationError' && typedError.errors) {
        const validationErrors: Record<string, string> = {};
        for (const field in typedError.errors) {
            if (typedError.errors[field] && typedError.errors[field].message) {
                validationErrors[field] = typedError.errors[field].message;
            }
        }
        return NextResponse.json({ message: 'Erreur de validation des données du produit.', errors: validationErrors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Erreur lors du scraping ou de la sauvegarde du produit.', error: errorMessage }, { status: 500 });
  }
} 