import { NextRequest, NextResponse } from 'next/server';
import { scrapeLedenicheurProduct } from '@/services/scraping/ledenicheur/ledenicheur.scraper';
import { LedenicheurProductDetails } from '@/services/scraping/ledenicheur/ledenicheur.types';
import dbConnect from '@/lib/mongodb/dbConnect';
import ProductModel, { IProductModel, IProductModelBase } from '@/lib/mongodb/models/ProductModel';
import CategoryModel, { ICategory } from '@/lib/mongodb/models/CategoryModel';
import BrandModel, { IBrand } from '@/lib/mongodb/models/BrandModel';
import { Types, FilterQuery } from 'mongoose';

// TODO: Connecter à la base de données et utiliser les modèles Mongoose
// import dbConnect from '@/lib/db.Connect';
// import ProductModel from '@/models/ScrapedProduct'; // Utiliser le modèle ScrapedProduct ou un modèle ProductModel unifié

// Interface pour la structure des données du produit envoyées dans le corps de la requête POST
interface PostProductData {
  name: string;
  categoryId: string; // Slug de la catégorie
  brandId: string; // Slug de la marque
}

interface ProductSelectItem {
  id: string;
  name: string; 
  brandName?: string;
  categoryName?: string;
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
    const productModelQueryFilters: FilterQuery<IProductModel> = {};

    if (categorySlug) {
      const categoryDoc = await CategoryModel.findOne({ slug: categorySlug }).select('_id').lean<Pick<ICategory, '_id'> | null>();
      if (!categoryDoc) return NextResponse.json({ message: `Catégorie avec slug '${categorySlug}' non trouvée.` }, { status: 404 });
      productModelQueryFilters.category = categoryDoc._id as Types.ObjectId;
    }

    if (brandSlug) {
      const brandDoc = await BrandModel.findOne({ slug: brandSlug }).select('_id').lean<Pick<IBrand, '_id'> | null>();
      if (!brandDoc) return NextResponse.json({ message: `Marque avec slug '${brandSlug}' non trouvée.` }, { status: 404 });
      productModelQueryFilters.brand = brandDoc._id as Types.ObjectId;
    }
    
    if (searchTerm) productModelQueryFilters.$text = { $search: searchTerm };

    // Suppression de la projection qui cause la collision avec populate()
    const productModelsQuery = ProductModel.find(productModelQueryFilters)
      .populate<{ brand: Pick<IBrand, 'name' | 'slug'> }>('brand', 'name slug')
      .populate<{ category: Pick<ICategory, 'name' | 'slug'> }>('category', 'name slug')
      .select('title slug') // Projection simple sans conflit
      .limit(20);

    if (searchTerm) {
      // Pour la recherche textuelle, on doit ajouter le score dans la sélection
      productModelsQuery.select('title slug score');
      productModelsQuery.sort({ score: { $meta: "textScore" } });
    } else {
      productModelsQuery.sort({ title: 1 });
    }
    
    const productModels = await productModelsQuery.lean<IProductModel[]>().exec();

    const productModelItems: ProductSelectItem[] = productModels.map(pm => ({
      id: (pm._id as Types.ObjectId).toString(),
      name: pm.title,
      brandName: (pm.brand as unknown as Pick<IBrand, 'name' | 'slug'>)?.name,
      categoryName: (pm.category as unknown as Pick<ICategory, 'name' | 'slug'>)?.name,
    }));
    
    return NextResponse.json(productModelItems, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur serveur inconnue.';
    return NextResponse.json({ message: 'Erreur lors de la recherche des ProductModels.', errorDetails: errorMessage }, { status: 500 });
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
      return NextResponse.json({ error: "Nom du produit, slug de catégorie et slug de marque sont requis." }, { status: 400 });
    }

    const categoryDoc = await CategoryModel.findOne({ slug: categorySlug }).select('_id name').lean<Pick<ICategory, '_id' | 'name'> | null>();
    if (!categoryDoc) return NextResponse.json({ error: `Catégorie non trouvée: ${categorySlug}` }, { status: 404 });

    const brandDoc = await BrandModel.findOne({ slug: brandSlugFromRequest }).select('_id name').lean<Pick<IBrand, '_id' | 'name'> | null>();
    if (!brandDoc) return NextResponse.json({ error: `Marque non trouvée: ${brandSlugFromRequest}` }, { status: 404 });

    const scrapedData = await scrapeLedenicheurProduct(productNameToScrape);
    if (!scrapedData) {
      return NextResponse.json({ error: `Aucune donnée scrapée pour "${productNameToScrape}". Le produit est introuvable ou le scraping a échoué.` }, { status: 404 });
    }

    // On a des données, mais elles peuvent être incomplètes.
    // Un titre est essentiel. Si absent, on considère l'opération comme un échec partiel.
    if (!scrapedData.pageTitle) {
      return NextResponse.json({ 
        error: `Données scrapées incomplètes pour "${productNameToScrape}" (titre manquant).`,
        details: `Une page a été trouvée (${scrapedData.url}) mais le contenu essentiel n'a pas pu être extrait.`
      }, { status: 404 });
    }
    
    const existingProductModel = await ProductModel.findOne({ scrapedSourceUrl: scrapedData.url, scrapedSource: 'ledenicheur' });

    if (existingProductModel) {
      const rawUpdateData = mapLedenicheurToRawProductModelData(scrapedData, brandDoc, categoryDoc);
      Object.assign(existingProductModel, rawUpdateData);
      await existingProductModel.save();
      return NextResponse.json({ productModel: existingProductModel.toObject(), message: "ProductModel existant mis à jour." });
    }
    
    const initialRawData = mapLedenicheurToRawProductModelData(scrapedData, brandDoc, categoryDoc);
    const standardizedData = standardizeScrapedData(initialRawData, brandDoc, categoryDoc);
    
    const titleForModel = standardizedData.title || initialRawData.rawTitle;
    if (!titleForModel?.trim()) {
        return NextResponse.json({ error: "Titre du produit vide après tentative de standardisation." }, { status: 400 });
    }

    const newProductModelData: Partial<IProductModelBase> = {
      ...initialRawData,
      ...standardizedData,
      title: titleForModel,
      brand: brandDoc._id as Types.ObjectId,
      category: categoryDoc._id as Types.ObjectId,
    };
    
    const productModelInstance = new ProductModel(newProductModelData);
    const savedProductModel = await productModelInstance.save();
      
    return NextResponse.json({ productModel: savedProductModel.toObject(), message: "Nouveau ProductModel créé." }, { status: 201 });

  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ValidationError') {
      interface ValidationError {
        errors: Record<string, { message: string }>;
      }
      const validationError = error as unknown as ValidationError;
      const messages = Object.values(validationError.errors).map((err) => err.message).join(', ');
      return NextResponse.json({ error: `Erreur de validation: ${messages}` }, { status: 400 });
    }
    if (error instanceof Error && 'code' in error && (error as { code: number }).code === 11000) {
      interface DuplicateKeyError {
        keyPattern: Record<string, number>;
      }
      const duplicateError = error as unknown as DuplicateKeyError;
      const field = Object.keys(duplicateError.keyPattern)[0];
      return NextResponse.json({ error: `Conflit: Un ProductModel avec une valeur similaire pour '${field}' existe déjà.` }, { status: 409 });
    }
    const errorMessage = error instanceof Error ? error.message : "Erreur serveur lors de la création du ProductModel.";
    return NextResponse.json({ error: errorMessage, errorDetails: error }, { status: 500 });
  }
}

// Fonction pour mapper LedenicheurProductDetails vers les champs raw de IProductModelBase
const mapLedenicheurToRawProductModelData = (
  scrapedData: LedenicheurProductDetails,
  brandDoc: Pick<IBrand, '_id' | 'name'>,
  categoryDoc: Pick<ICategory, '_id' | 'name'>
): Partial<IProductModelBase> => ({
  scrapedSource: 'ledenicheur',
  scrapedSourceUrl: scrapedData.url,
  rawTitle: scrapedData.pageTitle || '',
  rawBrandName: brandDoc.name,
  rawCategoryName: categoryDoc.name,
  rawDescription: scrapedData.productInfoTitle || '',
  rawImageUrls: [], // LedenicheurProductDetails n'a pas d'images dans la version actuelle
  rawCurrentPrice: undefined, // Pas de prix dans la version actuelle focalisée sur les spécifications
  rawCurrency: 'EUR',
  rawAttributes: scrapedData.specifications?.map((spec: { key: string; value: string }) => ({ label: spec.key, value: spec.value })) || [],
  // Suppression des propriétés spécifiques à Idealo qui n'existent pas dans LedenicheurProductDetails
  keyFeatures: [], // Pas de features dans la version actuelle
});

// Fonction pour tenter de standardiser les données scrapées en ProductModel
// Cette fonction est un placeholder et devrait être beaucoup plus sophistiquée,
// utilisant potentiellement l'IA ou des règles de mapping complexes.
const standardizeScrapedData = (
  rawData: Partial<IProductModelBase>,
  brandDoc: Pick<IBrand, '_id'>,
  categoryDoc: Pick<ICategory, '_id'>
): Partial<IProductModelBase> => ({
  title: rawData.rawTitle || "Titre standardisé à définir",
  brand: brandDoc._id as Types.ObjectId,
  category: categoryDoc._id as Types.ObjectId,
  standardDescription: rawData.rawDescription || "Description standardisée à définir",
  standardImageUrls: rawData.rawImageUrls?.length ? rawData.rawImageUrls : ['/images/placeholder-product.png'],
  specifications: rawData.rawAttributes?.map((attr: { label: string; value: string }) => ({ label: attr.label, value: attr.value })) || [],
  keyFeatures: rawData.keyFeatures,
  // Suppression des propriétés spécifiques à Idealo
  status: 'standardization_pending',
});