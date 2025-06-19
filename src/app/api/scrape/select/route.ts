import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb/dbConnect';
import ScrapingProduct, { IScrapedProduct } from '@/lib/mongodb/models/ScrapingProduct';
import { selectAndScrape } from '@/services/scraping/ledenicheur/scraper';
import { LedenicheurProductDetails } from '@/services/scraping/ledenicheur/ledenicheur.types';
import CategoryModel from '@/lib/mongodb/models/CategoryModel';
import BrandModel from '@/lib/mongodb/models/BrandModel';
import slugify from 'slugify';
import { Types } from 'mongoose';

interface SelectRequestBody {
    jobId: string;
    selectedUrl: string;
    productNameToScrape: string; // Le nom de recherche original
    categorySlug: string;
    brandId: string;
}

const flattenSpecifications = (specs: any): { label: string; value: string; }[] => {
    const flattened: { label: string; value: string; }[] = [];
    if (!specs) return flattened;

    const formatValue = (value: any): string => {
        if (Array.isArray(value)) return value.join(', ');
        if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
        if (value === null || value === undefined) return 'N/A';
        return String(value);
    };

    if (typeof specs === 'object' && !Array.isArray(specs)) {
        for (const groupValue of Object.values(specs)) {
            if (groupValue && typeof groupValue === 'object') {
                 for (const [label, value] of Object.entries(groupValue)) {
                    flattened.push({
                        label: label,
                        value: formatValue(value)
                    });
                }
            }
        }
    }
    return flattened;
};

const mapApiDataToScrapedProduct = (
  apiData: LedenicheurProductDetails,
  productNameToScrape: string,
  categoryId: Types.ObjectId,
  brandDocument: { _id: Types.ObjectId, name: string }
): Omit<IScrapedProduct, 'createdAt' | 'updatedAt'> => {
  const slug = slugify(apiData.product.title, { lower: true, strict: true });
  return {
    _id: apiData.product.id,
    source_name: 'ledenicheur',
    product_search_name: productNameToScrape,
    category: categoryId,
    brand: brandDocument._id,
    slug: slug,
    product: {
        id: apiData.product.id,
        title: apiData.product.title,
        brand: apiData.product.brand || brandDocument.name,
        url: apiData.product.url,
        image_url: apiData.product.image_url,
        images: apiData.product.images
    },
    options: apiData.options,
    specifications: flattenSpecifications(apiData.specifications),
    price_analysis: apiData.price_analysis
  };
};

export async function POST(request: NextRequest) {
    try {
        const body: SelectRequestBody = await request.json();
        const { jobId, selectedUrl, productNameToScrape, categorySlug, brandId } = body;

        if (!jobId || !selectedUrl || !productNameToScrape || !categorySlug || !brandId) {
            return NextResponse.json({ message: 'Tous les champs sont requis.' }, { status: 400 });
        }
        
        await dbConnect();

        const productIdMatch = selectedUrl.match(/[?&]p=(\d+)/);
        const productId = productIdMatch ? productIdMatch[1] : null;

        if (productId) {
            const existingProduct = await ScrapingProduct.findById(productId)
                .populate('brand', 'name slug')
                .populate('category', 'name slug')
                .lean();
        
            if (existingProduct) {
                console.log(`[API_SCRAPE_SELECT] Produit ${productId} trouvé en BDD. Pas de scraping nécessaire.`);
                const response = {
                    _id: existingProduct._id.toString(),
                    slug: existingProduct.slug,
                    title: existingProduct.product.title,
                    brand: existingProduct.brand,
                    category: existingProduct.category,
                    standardImageUrls: existingProduct.product.images || [],
                    specifications: existingProduct.specifications,
                };
                return NextResponse.json({ message: "Produit déjà existant.", productModel: response }, { status: 200 });
            }
        }

        // 1. Valider la catégorie et la marque
        const categoryDoc = await CategoryModel.findOne({ slug: categorySlug }).select('_id').lean();
        if (!categoryDoc) {
            return NextResponse.json({ message: `Catégorie non trouvée.` }, { status: 404 });
        }

        const brandDoc = await BrandModel.findById(brandId).select('_id name').lean();
        if (!brandDoc) {
            return NextResponse.json({ message: `Marque non trouvée.` }, { status: 404 });
        }

        // 2. Lancer le scraping final
        const scrapedData = await selectAndScrape(jobId, selectedUrl);
        if (!scrapedData || !scrapedData.product || !scrapedData.product.id) {
            return NextResponse.json({ message: `Le scraping final n'a retourné aucune donnée valide.` }, { status: 404 });
        }
        
        // 3. Mapper les données et sauvegarder le nouveau produit
        const mappedData = mapApiDataToScrapedProduct(scrapedData, productNameToScrape, categoryDoc._id, brandDoc);
        
        const newScrapedProduct = new ScrapingProduct(mappedData);
        await newScrapedProduct.save();

        // 4. Récupérer le produit avec les champs populés pour le retour
        const populatedProduct = await ScrapingProduct.findById(newScrapedProduct._id)
            .populate('brand', 'name slug')
            .populate('category', 'name slug')
            .lean();

        if (!populatedProduct) {
            return NextResponse.json({ message: 'Erreur lors de la récupération du produit nouvellement créé.' }, { status: 500 });
        }

        // 5. Aplatir la réponse pour correspondre au format de la route GET [id]
        const response = {
            _id: populatedProduct._id.toString(),
            slug: populatedProduct.slug,
            title: populatedProduct.product.title,
            brand: populatedProduct.brand,
            category: populatedProduct.category,
            standardImageUrls: populatedProduct.product.images || [],
            specifications: populatedProduct.specifications,
        };

        return NextResponse.json({ message: "Produit créé avec succès via scraping.", productModel: response }, { status: 201 });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur serveur inconnue.';
        console.error('[API_SCRAPE_SELECT] Erreur:', errorMessage);
        
        if (error instanceof SyntaxError) {
            return NextResponse.json({ message: 'Erreur dans le format du JSON envoyé.', error: errorMessage }, { status: 400 });
        }

        return NextResponse.json({ message: 'Erreur lors du scraping final ou de la sauvegarde.', error: errorMessage }, { status: 500 });
    }
} 