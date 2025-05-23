import { NextRequest, NextResponse } from 'next/server';
import { scrapeIdealoProduct, IdealoProductDetails } from '@/services/scraping/scraper';
import dbConnect from '@/lib/db.Connect';
import ProductModel, { IProductModel, IProductModelBase } from '@/models/ProductModel';
import CategoryModel, { ICategory } from '@/models/CategoryModel';
import BrandModel, { IBrand } from '@/models/BrandModel';
import slugify from 'slugify';
import { Types } from 'mongoose';

// TODO: Connecter à la base de données et utiliser les modèles Mongoose
// import dbConnect from '@/lib/db.Connect';
// import ProductModel from '@/models/ScrapedProduct'; // Utiliser le modèle ScrapedProduct ou un modèle ProductModel unifié

// Interface pour les filtres de requête ProductModel
interface ProductModelQueryFilters {
  // status?: string; // Supprimé car on ne filtre plus par statut
  category?: string;
  brand?: string;
  status?: string | { $in: string[] }; // Permet de filtrer par statut ou un tableau de statuts
  $text?: { $search: string };
}

// Typage pour l'erreur MongoDB et l'erreur de validation Mongoose
interface MongoError extends Error {
    code?: number;
    errors?: Record<string, { message: string }>; // Pour ValidationError
}

interface IProductAttribute {
  label: string;
  value: string;
}

// Interface pour la structure des données du produit envoyées dans le corps de la requête POST
interface PostProductData {
  name: string;
  categoryId: string; // Slug de la catégorie
  brandId: string; // Slug de la marque
}

// Interface pour la réponse de la création de produit
// Elle retournera directement le ProductModel complet (qui contient maintenant les infos brutes et standardisées)
interface PostProductModelResponse {
  productModel: IProductModel; // Peut inclure les données brutes et standardisées
  message?: string;
  error?: string; // Pour les erreurs spécifiques
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
 *         name: categorySlug
 *         schema:
 *           type: string
 *         description: Le SLUG de la catégorie (ex: telephones-mobiles).
 *       - in: query
 *         name: brandSlug
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
  const categorySlug = searchParams.get('categorySlug');
  const brandSlug = searchParams.get('brandSlug');
  const searchTerm = searchParams.get('searchTerm');

  try {
    await dbConnect();
    // console.log(`[API GET /product-models] Recherche de ProductModel avec CatSlug: ${categorySlug}, BrandSlug: ${brandSlug}, Terme: ${searchTerm || 'N/A'}`);

    let categoryDocForFilter: ICategory | null = null;
    let brandDocForFilter: IBrand | null = null;

    if (categorySlug) {
      categoryDocForFilter = (await CategoryModel.findOne({ slug: categorySlug }).lean()) as ICategory | null;
      if (!categoryDocForFilter) {
        return NextResponse.json({ message: `Catégorie ReMarket avec slug '${categorySlug}' non trouvée.` }, { status: 404 });
      }
    }

    if (brandSlug) {
      brandDocForFilter = (await BrandModel.findOne({ slug: brandSlug }).lean()) as IBrand | null;
      if (!brandDocForFilter) {
        return NextResponse.json({ message: `Marque ReMarket avec slug '${brandSlug}' non trouvée.` }, { status: 404 });
      }
    }

    // Le filtre productModelQueryFilters est déjà correctement défini pour status: 'approved'
    const productModelQueryFilters: ProductModelQueryFilters = {};
    if (categoryDocForFilter && categoryDocForFilter._id) productModelQueryFilters.category = categoryDocForFilter._id.toString();
    if (brandDocForFilter && brandDocForFilter._id) productModelQueryFilters.brand = brandDocForFilter._id.toString();
    
    if (searchTerm) {
      productModelQueryFilters.$text = { $search: searchTerm };
    }

    const commonProjection = { title: 1, asin: 1 }; // brand et category seront peuplés

    const productModelsQuery = ProductModel.find(productModelQueryFilters, commonProjection)
      .populate<{ brand: { name: string, slug: string } }>('brand', 'name slug')      // Peupler brand
      .populate<{ category: { name: string, slug: string } }>('category', 'name slug') // Peupler category
      .limit(20);

    if (searchTerm) {
      // Si searchTerm est présent, on ne trie pas par score par défaut mais on pourrait l'ajouter
      // productModelsQuery.select({ score: { $meta: "textScore" } }).sort({ score: { $meta: "textScore" } });
    } else {
      productModelsQuery.sort({ title: 1 }); // Trier par titre si pas de recherche textuelle
    }
    
    const productModels = await productModelsQuery.lean().exec() as (IProductModel & { brand?: { name: string, slug: string }, category?: { name: string, slug: string } })[];

    interface ProductSelectItem {
      id: string;
      name: string; 
      brandName?: string; // Ajout pour le nom de la marque
      categoryName?: string; // Ajout pour le nom de la catégorie
      // brandId?: string; // Optionnel si on veut aussi les IDs
      // categoryId?: string;
    }
    const productModelItems: ProductSelectItem[] = productModels.map(pm => ({
      id: String(pm._id),
      name: pm.title,
      brandName: pm.brand?.name,
      // brandId: pm.brand?._id.toString(),
      categoryName: pm.category?.name,
      // categoryId: pm.category?._id.toString(),
    }));
    
    // La section pour ScrapedProduct est supprimée
    // productModelItems.sort((a, b) => a.name.localeCompare(b.name)); // Déjà trié par la requête si pas de searchTerm
    
    return NextResponse.json(productModelItems, { status: 200 });

  } catch (error) {
    // console.error('[GET /api/product-models]', error);
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
 *               $ref: '#/components/schemas/IProductModel' # Modifié de IScrapedProduct à IProductModel
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
    const body: PostProductData = await request.json();
    const { name: productNameToScrape, categoryId: categorySlug, brandId: brandSlugFromRequest } = body;

    if (!productNameToScrape || !categorySlug || !brandSlugFromRequest) {
      return NextResponse.json({ 
        productModel: null, 
        error: "Nom du produit, slug de catégorie et slug de marque sont requis." 
      }, { status: 400 });
    }

    const categoryDoc = await CategoryModel.findOne({ slug: categorySlug }).lean() as ICategory | null;
    if (!categoryDoc) {
      return NextResponse.json({ productModel: null, error: `Catégorie non trouvée pour le slug: ${categorySlug}` }, { status: 404 });
    }

    const brandDoc = await BrandModel.findOne({ slug: brandSlugFromRequest }).lean() as IBrand | null;
    if (!brandDoc) {
      return NextResponse.json({ productModel: null, error: `Marque non trouvée pour le slug: ${brandSlugFromRequest}` }, { status: 404 });
    }
    // Slug de la marque vérifié
    const actualBrandSlug = brandDoc.slug;
    if (!actualBrandSlug) {
      return NextResponse.json({ productModel: null, error: `Le slug de la marque (ID: ${brandDoc._id}, Name: ${brandDoc.name}) est vide ou manquant.` }, { status: 500 });
    }

    const scrapedData = await scrapeIdealoProduct(productNameToScrape, brandDoc.name);

    if (!scrapedData || !scrapedData.title) {
      return NextResponse.json({ 
        productModel: null, 
        error: `Aucune donnée n'a pu être scrapée pour "${productNameToScrape}". Vérifiez le nom du produit ou réessayez.` 
      }, { status: 404 });
    }
    
    let existingProductModel = await ProductModel.findOne({ 
      scrapedSourceUrl: scrapedData.url,
      scrapedSource: 'idealo'
    });

    if (existingProductModel) {
      console.log(`[API ProductModels POST] Produit existant trouvé par URL source: ${existingProductModel.title}`);
      const rawUpdateData = mapIdealoToRawProductModelData(scrapedData, brandDoc, categoryDoc);
      Object.assign(existingProductModel, rawUpdateData);
      // Si le titre a changé, le slug doit potentiellement être mis à jour.
      // Pour simplifier ici, on ne régénère pas le slug pour un produit existant,
      // mais on pourrait ajouter cette logique si nécessaire.
      await existingProductModel.save();
      return NextResponse.json({ productModel: existingProductModel.toObject() as IProductModel, message: "Produit existant mis à jour avec les nouvelles données scrapées." });
    }
    
    const initialRawData = mapIdealoToRawProductModelData(scrapedData, brandDoc, categoryDoc);
    const standardizedDataAttempt = standardizeScrapedData(initialRawData, brandDoc, categoryDoc);
    
    // S'assurer que le titre standardisé est présent pour la génération du slug
    const titleForSlug = standardizedDataAttempt.title || initialRawData.rawTitle || `Produit sans titre - ${new Date().toISOString()}`;
    if (!titleForSlug.trim()) {
        // console.error("[API ProductModels POST] Erreur: Titre pour génération de slug est vide après tentative de standardisation et fallback.");
        return NextResponse.json({ productModel: null, error: "Impossible de générer un slug, le titre du produit est vide." }, { status: 400 });
    }

    // Suppression de la génération manuelle du slug. Le hook pre-save du modèle s'en chargera.
    // const titleSlug = slugify(titleForSlug, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });
    // if (!titleSlug && titleForSlug.trim() !== '') {
    //     console.error(`[API ProductModels POST] Erreur: titleSlug généré est vide pour un titre non vide "${titleForSlug}".`);
    //     return NextResponse.json({ productModel: null, error: `Erreur lors de la génération du slug à partir du titre "${titleForSlug}".` }, { status: 500 });
    // }
    // const finalGeneratedSlug = `${actualBrandSlug}_${titleSlug}`;
    // if (!finalGeneratedSlug || finalGeneratedSlug === `${actualBrandSlug}_` || finalGeneratedSlug.startsWith('_') || finalGeneratedSlug.endsWith('_')) {
    //   console.error(`[API ProductModels POST] Erreur: Slug final généré est invalide ou vide ("${finalGeneratedSlug}") pour titre "${titleForSlug}" et brand slug "${actualBrandSlug}".`);
    //   return NextResponse.json({ productModel: null, error: `Slug final généré ("${finalGeneratedSlug}") est invalide.` }, { status: 500 });
    // }
    // console.log(`[API ProductModels POST] Slug généré dans l'API route: "${finalGeneratedSlug}"`);

    const newProductModelData: Partial<IProductModelBase> /*& { slug: string }*/ = { // slug n'est plus ajouté manuellement ici
      ...initialRawData,
      ...standardizedDataAttempt,
      brand: brandDoc._id,
      category: categoryDoc._id,
      // slug: finalGeneratedSlug, // Le slug sera généré par le hook pre-save
      title: titleForSlug, 
      status: 'standardization_pending',
    };
    
    try {
      const productModelInstance = new ProductModel(newProductModelData);
      const savedProductModel = await productModelInstance.save();
      
      return NextResponse.json({ 
        productModel: savedProductModel.toObject() as IProductModel, 
        message: "Nouveau produit créé et en attente de révision/standardisation." 
      }, { status: 201 });

    } catch (error: any) {
      // console.error("Erreur lors de la sauvegarde du nouveau ProductModel:", error);
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map((err: any) => err.message).join(', ');
        return NextResponse.json({ productModel: null, error: `Erreur de validation: ${messages}` }, { status: 400 });
      }
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return NextResponse.json({ 
          productModel: null, 
          error: `Un produit avec une valeur similaire pour '${field}' (probablement le slug '${newProductModelData.slug}' ou le titre '${newProductModelData.title}') existe déjà.` 
        }, { status: 409 });
      }
      return NextResponse.json({ productModel: null, error: error.message || "Erreur interne du serveur lors de la création du produit." }, { status: 500 });
    }

  } catch (error: any) {
    // console.error("[API ProductModels POST] Erreur générale:", error);
    return NextResponse.json({ productModel: null, error: error.message || "Erreur serveur inattendue." }, { status: 500 });
  }
}

// Fonction pour mapper IdealoProductDetails vers les champs raw de IProductModelBase
const mapIdealoToRawProductModelData = (
  scrapedData: IdealoProductDetails,
  brandDoc: IBrand,
  categoryDoc: ICategory
): Partial<IProductModelBase> => {
  return {
    scrapedSource: 'idealo',
    scrapedSourceUrl: scrapedData.url,
    rawTitle: scrapedData.title ?? undefined,
    rawBrandName: brandDoc.name, // Utiliser le nom de la marque trouvée
    rawCategoryName: categoryDoc.name, // Utiliser le nom de la catégorie trouvée
    rawDescription: scrapedData.description ?? undefined,
    rawImageUrls: scrapedData.imageUrls,
    rawCurrentPrice: scrapedData.priceNew ?? undefined,
    rawListPrice: undefined, // Idealo ne fournit pas de "listPrice" directement de cette manière
    rawCurrency: 'EUR', // Supposons EUR pour idealo.fr
    rawReviewRating: undefined, // Pas de review rating direct d'Idealo
    rawReviewCount: undefined,  // Pas de review count direct d'Idealo
    rawAttributes: scrapedData.specifications?.map(spec => ({ label: spec.key, value: spec.value })) || [],
    // Champs spécifiques Idealo (qui sont maintenant aussi des champs directs sur ProductModel)
    variantTitle: scrapedData.variantTitle ?? undefined,
    priceNewIdealo: scrapedData.priceNew ?? undefined,
    priceUsedIdealo: scrapedData.priceUsed ?? undefined,
    optionChoicesIdealo: scrapedData.optionChoices,
    qasIdealo: scrapedData.qas,
    // keyFeatures pourrait être mappé depuis scrapedData.features si pertinent
    keyFeatures: scrapedData.features, 
  };
};

// Fonction pour tenter de standardiser les données scrapées en ProductModel
// Cette fonction est un placeholder et devrait être beaucoup plus sophistiquée,
// utilisant potentiellement l'IA ou des règles de mapping complexes.
const standardizeScrapedData = (
  rawData: Partial<IProductModelBase>,
  brandDoc: IBrand,
  categoryDoc: ICategory
): Partial<IProductModelBase> => {
  
  // Exemple simple de standardisation
  // Dans un cas réel, ceci serait beaucoup plus complexe, impliquant de l'IA,
  // des transformations de données, des validations, etc.
  
  const standardTitle = rawData.rawTitle || "Titre standardisé manquant"; // Logique de nettoyage/IA ici
  const standardDescription = rawData.rawDescription || "Description standardisée manquante"; // Logique de nettoyage/IA ici
  
  // Pour les images, on pourrait sélectionner les meilleures, les redimensionner, etc.
  const standardImageUrls = rawData.rawImageUrls && rawData.rawImageUrls.length > 0 ? rawData.rawImageUrls : ['/images/placeholder-product.png'];
  
  // Exemple de transformation des spécifications brutes en spécifications standardisées
  // Cela nécessiterait une logique de mapping basée sur `categoryDoc.attributeMappings` ou similaire.
  const specifications: IProductModelBase['specifications'] = rawData.rawAttributes?.map(attr => ({
    label: attr.label, // Devrait être mappé à un label standard
    value: attr.value, // Devrait être nettoyé/transformé
    // unit: ... // Extraire/mapper l'unité si possible
  })) || [];

  return {
    title: standardTitle,
    // slug sera généré par le pre-save hook
    brand: brandDoc._id,
    category: categoryDoc._id,
    standardDescription: standardDescription,
    standardImageUrls: standardImageUrls,
    specifications: specifications,
    keyFeatures: rawData.keyFeatures, // Conserver les keyFeatures bruts pour l'instant
    // Les champs spécifiques à Idealo comme priceNewIdealo, etc. sont déjà au bon niveau
    sourceUrlIdealo: rawData.scrapedSourceUrl, // Si on garde une URL source Idealo spécifique
    variantTitle: rawData.variantTitle,
    priceNewIdealo: rawData.priceNewIdealo,
    priceUsedIdealo: rawData.priceUsedIdealo,
    optionChoicesIdealo: rawData.optionChoicesIdealo,
    qasIdealo: rawData.qasIdealo,
    status: 'standardization_pending', // ou 'active' si la standardisation est jugée complète et réussie
  };
};