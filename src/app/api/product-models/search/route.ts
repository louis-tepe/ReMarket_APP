import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb/dbConnect';
import ScrapingProduct, { IScrapedProduct, IScrapedProductDocument } from '@/lib/mongodb/models/ScrapingProduct';
import BrandModel from '@/lib/mongodb/models/BrandModel';
import CategoryModel from '@/lib/mongodb/models/CategoryModel';
import { FilterQuery } from 'mongoose';

export async function GET(request: NextRequest) {
    try {
        await dbConnect();
        const searchParams = request.nextUrl.searchParams;
        const categorySlug = searchParams.get('categorySlug');
        const brandSlug = searchParams.get('brandSlug');

        if (!categorySlug || !brandSlug) {
            return NextResponse.json({ message: "Les slugs de catégorie et de marque sont requis." }, { status: 400 });
        }

        const category = await CategoryModel.findOne({ slug: categorySlug }).select('_id').lean();
        if (!category) {
            return NextResponse.json({ message: `Catégorie non trouvée: ${categorySlug}` }, { status: 404 });
        }

        const brand = await BrandModel.findOne({ slug: brandSlug }).select('name').lean();
        if (!brand) {
            return NextResponse.json({ message: `Marque non trouvée: ${brandSlug}` }, { status: 404 });
        }

        const query: FilterQuery<IScrapedProductDocument> = {
            category: category._id.toString(),
            'product.brand': brand.name,
        };

        const products = await ScrapingProduct.find(query).select('product.title').lean();

        const productItems = products.map((p: any) => ({
            id: p._id.toString(),
            name: p.product.title
        }));

        return NextResponse.json(productItems, { status: 200 });

    } catch (error) {
        console.error("Erreur dans l'API /api/product-models/ GET:", error);
        const errorMessage = error instanceof Error ? error.message : 'Erreur serveur inconnue.';
        return NextResponse.json({ message: 'Erreur lors de la récupération des produits.', errorDetails: errorMessage }, { status: 500 });
    }
}