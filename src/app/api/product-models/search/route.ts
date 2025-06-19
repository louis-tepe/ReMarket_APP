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
        const brandId = searchParams.get('brandId');

        if (!categorySlug || !brandId) {
            return NextResponse.json({ message: "L'ID de la marque et le slug de la catégorie sont requis." }, { status: 400 });
        }

        const category = await CategoryModel.findOne({ slug: categorySlug }).select('_id').lean();
        if (!category) {
            return NextResponse.json({ message: `Catégorie non trouvée: ${categorySlug}` }, { status: 404 });
        }

        const query: FilterQuery<IScrapedProductDocument> = {
            category: category._id,
            brand: brandId,
        };

        const products = await ScrapingProduct.find(query)
            .populate('brand', 'name')
            .select('product.title')
            .lean();

        const productModels = products
            .map(p => ({
                id: (p._id as any).toString(),
                name: p.product?.title 
            }))
            .filter(p => p.name);

        return NextResponse.json({ success: true, productModels });

    } catch (error) {
        console.error("Erreur dans l'API /api/product-models/search GET:", error);
        const errorMessage = error instanceof Error ? error.message : 'Erreur serveur inconnue.';
        return NextResponse.json({ message: 'Erreur lors de la récupération des produits.', errorDetails: errorMessage }, { status: 500 });
    }
}