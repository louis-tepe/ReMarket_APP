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
  categoryId: string;
  brandId: string; // Ceci est un slug de marque
}

const mapApiDataToScrapedProduct = (
  apiData: LedenicheurProductDetails,
  productNameToScrape: string,
  categoryId: Types.ObjectId,
  brandId: Types.ObjectId
): IScrapedProduct => {
  const slug = slugify(apiData.product.title, { lower: true, strict: true });
  return {
    source_name: 'ledenicheur',
    product_search_name: productNameToScrape,
    category: categoryId,
    brand: brandId,
    slug: slug,
    product: {
        title: apiData.product.title,
        brand: apiData.product.brand,
        url: apiData.product.url,
        image_url: apiData.product.image_url,
        images: apiData.product.images
    },
    options: apiData.options,
    specifications: apiData.specifications,
    price_analysis: apiData.price_analysis
  };
};

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body: PostProductData = await request.json();
    const { name: productNameToScrape, categoryId: categorySlug, brandId: brandSlug } = body;

    if (!productNameToScrape || !categorySlug || !brandSlug) {
      return NextResponse.json({ error: "Le nom du produit, le slug de la catégorie et le slug de la marque sont requis." }, { status: 400 });
    }
    
    const categoryDoc = await CategoryModel.findOne({ slug: categorySlug }).select('_id').lean();
    if (!categoryDoc) {
        return NextResponse.json({ error: `Catégorie avec le slug '${categorySlug}' non trouvée.`}, { status: 404 });
    }

    const brandDoc = await BrandModel.findOne({ slug: brandSlug }).select('_id').lean();
    if (!brandDoc) {
        return NextResponse.json({ error: `Marque avec le slug '${brandSlug}' non trouvée.`}, { status: 404 });
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

    const mappedData = mapApiDataToScrapedProduct(scrapedData, productNameToScrape, categoryDoc._id, brandDoc._id);
    
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