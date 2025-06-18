import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb/dbConnect';
import ScrapingProduct, { IScrapedProduct } from '@/lib/mongodb/models/ScrapingProduct';
import { scrapeLedenicheurProduct } from '@/services/scraping/ledenicheur/scraper';
import { LedenicheurProductDetails } from '@/services/scraping/ledenicheur/ledenicheur.types';
import CategoryModel from '@/lib/mongodb/models/CategoryModel';
import BrandModel from '@/lib/mongodb/models/BrandModel';
import slugify from 'slugify';
import { Types } from 'mongoose';

interface PostProductData {
  name: string;
  categoryId: string; // Ceci est un slug de catégorie
  brandId: string; // Ceci est un ID de marque
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

    // Cas 1: specs est un tableau de groupes (structure attendue par l'ancien code)
    if (Array.isArray(specs)) {
        for (const group of specs) {
            if (group && Array.isArray(group.specs)) {
                for (const spec of group.specs) {
                    if (spec && spec.label) {
                        flattened.push({
                            label: spec.label,
                            value: formatValue(spec.value)
                        });
                    }
                }
            }
        }
    }
    // Cas 2: specs est un objet de groupes (structure vue dans l'exemple iPhone SE)
    else if (typeof specs === 'object') {
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
): IScrapedProduct => {
  const slug = slugify(apiData.product.title, { lower: true, strict: true });
  return {
    source_name: 'ledenicheur',
    product_search_name: productNameToScrape,
    category: categoryId,
    brand: brandDocument._id,
    slug: slug,
    product: {
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
    await dbConnect();
    const body: PostProductData = await request.json();
    const { name: productNameToScrape, categoryId: categorySlug, brandId } = body;

    if (!productNameToScrape || !categorySlug || !brandId) {
      return NextResponse.json({ error: "Le nom du produit, le slug de la catégorie et l'ID de la marque sont requis." }, { status: 400 });
    }
    
    const categoryDoc = await CategoryModel.findOne({ slug: categorySlug }).select('_id').lean();
    if (!categoryDoc) {
        return NextResponse.json({ error: `Catégorie avec le slug '${categorySlug}' non trouvée.`}, { status: 404 });
    }

    const brandDoc = await BrandModel.findById(brandId).select('_id name').lean();
    if (!brandDoc) {
        return NextResponse.json({ error: `Marque avec l'ID '${brandId}' non trouvée.`}, { status: 404 });
    }

    const scrapedData = await scrapeLedenicheurProduct(productNameToScrape);

    if (!scrapedData || !scrapedData.product) {
      return NextResponse.json({ error: `Aucune donnée scrapée pour "${productNameToScrape}".` }, { status: 404 });
    }
    
    // Vérifier si un produit avec un slug similaire existe déjà pour éviter les doublons
    const potentialSlug = slugify(scrapedData.product.title, { lower: true, strict: true });
    let existingProduct = await ScrapingProduct.findOne({ slug: potentialSlug });
    if(existingProduct) {
        return NextResponse.json({ message: "Ce produit existe déjà.", productModel: existingProduct }, { status: 200 });
    }

    // Alternativement, vérifier par URL source
    existingProduct = await ScrapingProduct.findOne({ 'product.url': scrapedData.product.url });
    if (existingProduct) {
      return NextResponse.json({ message: "Ce produit a déjà été scrapé et est enregistré.", productModel: existingProduct }, { status: 200 });
    }

    const mappedData = mapApiDataToScrapedProduct(scrapedData, productNameToScrape, categoryDoc._id, brandDoc);
    
    const newScrapedProduct = new ScrapingProduct(mappedData);
    await newScrapedProduct.save();

    return NextResponse.json({ message: "Produit créé avec succès", productModel: newScrapedProduct }, { status: 201 });

  } catch (error) {
    console.error("Erreur dans l'API /api/product-models/create POST:", error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur serveur inconnue.';
    
    if (error instanceof SyntaxError) {
        return NextResponse.json({ message: 'Erreur dans le format du JSON envoyé.', errorDetails: errorMessage }, { status: 400 });
    }

    return NextResponse.json({ message: 'Erreur lors du scraping ou de la sauvegarde du produit.', errorDetails: errorMessage }, { status: 500 });
  }
} 