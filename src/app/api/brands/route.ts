import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db.Connect'; // Assurez-vous que le chemin est correct
import ProductModel from '@/models/ProductModel'; 
import BrandModel, { IBrand } from '@/models/BrandModel';
import CategoryModel from '@/models/CategoryModel'; // Nécessaire pour trouver le nom de la catégorie par son slug

/**
 * @swagger
 * /api/brands:
 *   get:
 *     summary: Récupère les marques pour une catégorie donnée depuis la base de données.
 *     description: >
 *       Retourne une liste de marques disponibles pour la catégorie de produit spécifiée (slug de la catégorie).
 *       Les marques sont dérivées des ProductModel approuvés associés à cette catégorie.
 *     tags:
 *       - Brands
 *       - Categories
 *     parameters:
 *       - in: query
 *         name: categoryId # Ce sera le slug de la catégorie
 *         required: true
 *         schema:
 *           type: string
 *         description: Le slug de la catégorie pour laquelle récupérer les marques.
 *     responses:
 *       200:
 *         description: Une liste de marques.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string # Correspond au slug de la marque
 *                   name:
 *                     type: string
 *       400:
 *         description: Paramètre categoryId manquant.
 *       404:
 *         description: Catégorie non trouvée ou aucune marque trouvée pour cette catégorie.
 *       500:
 *         description: Erreur serveur.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const categorySlug = searchParams.get('categoryId'); // Renommé pour clarifier que c'est un slug

  if (!categorySlug) {
    return NextResponse.json({ message: 'Le paramètre categoryId (slug de la catégorie) est requis.' }, { status: 400 });
  }

  try {
    await dbConnect();

    // 1. Trouver le nom de la catégorie à partir de son slug
    const category = await CategoryModel.findOne({ slug: categorySlug });
    if (!category) {
      return NextResponse.json({ message: `Catégorie avec slug '${categorySlug}' non trouvée.` }, { status: 404 });
    }
    const categoryName = category.name; // Utiliser le vrai nom pour requêter ProductModel

    // 2. Récupérer les noms de marques distincts des ProductModel approuvés pour cette catégorie
    const distinctBrandNamesFromProducts: string[] = await ProductModel.find({
      category: categoryName, // Filtrer par le nom de la catégorie (ou son _id si ProductModel référence CategoryModel._id)
      status: 'approved'
    }).distinct('brand');

    let brands: IBrand[] = [];

    if (distinctBrandNamesFromProducts && distinctBrandNamesFromProducts.length > 0) {
      console.log(`[GET /api/brands] Marques trouvées pour la catégorie '${categoryName}' via ProductModels: ${distinctBrandNamesFromProducts.join(', ')}`);
      // 3. Récupérer les détails complets de ces marques depuis la collection BrandModel
      // On suppose que les noms de marques dans ProductModel correspondent aux noms dans BrandModel
      brands = await BrandModel.find({
        name: { $in: distinctBrandNamesFromProducts }
      }).sort({ name: 1 });
    } else {
      // Aucun ProductModel approuvé trouvé pour cette catégorie avec des marques spécifiées.
      // Fallback: Charger toutes les marques pour permettre la sélection et la création/scraping.
      console.log(`[GET /api/brands] Aucune marque trouvée via ProductModels pour la catégorie '${categoryName}'. Fallback vers toutes les marques.`);
      brands = await BrandModel.find({}).sort({ name: 1 });
    }

    if (!brands || brands.length === 0) {
      // Ce cas ne devrait survenir que si la collection BrandModel est vide.
      return NextResponse.json({ message: `Aucune marque disponible, ni spécifiquement pour la catégorie '${categoryName}', ni globalement.` }, { status: 404 });
    }

    const formattedBrands = brands.map(brand => ({
      id: brand.slug, // Utiliser le slug comme ID pour le frontend
      name: brand.name,
    }));
    
    return NextResponse.json(formattedBrands, { status: 200 });

  } catch (error) {
    console.error('[GET /api/brands]', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue.';
    return NextResponse.json({ message: 'Erreur lors de la récupération des marques.', error: errorMessage }, { status: 500 });
  }
} 