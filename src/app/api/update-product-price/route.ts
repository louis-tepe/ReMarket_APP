import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb/dbConnect';
import ScrapingProduct from '@/lib/mongodb/models/ScrapingProduct';
import { loadEnv } from '@/lib/loadEnv';
import { LedenicheurProductDetails } from '@/services/scraping/ledenicheur/ledenicheur.types';

loadEnv();

export async function POST(request: Request) {
    try {
        await dbConnect();

        const body = await request.json();
        const { productId } = body;

        if (!productId) {
            return NextResponse.json({ success: false, message: 'Product ID is required.' }, { status: 400 });
        }

        const scraperApiUrl = process.env.SCRAPER_API_URL;
        if (!scraperApiUrl) {
            throw new Error('SCRAPER_API_URL is not defined in environment variables.');
        }

        const response = await fetch(`${scraperApiUrl}/update-price/${productId}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})); // try to parse error, but don't fail if it's not JSON
            const errorMessage = errorData.detail || `Scraper API returned status ${response.status}`;
            throw new Error(errorMessage);
        }

        const scrapedData: LedenicheurProductDetails = await response.json();

        const updatedProduct = await ScrapingProduct.findByIdAndUpdate(
            productId,
            {
                $set: {
                    options: scrapedData.options,
                    price_analysis: scrapedData.price_analysis,
                },
            },
            { new: true, runValidators: true }
        );

        if (!updatedProduct) {
            return NextResponse.json({ success: false, message: 'Product not found in database.' }, { status: 404 });
        }

        return NextResponse.json({ success: true, product: updatedProduct });

    } catch (error: unknown) {
        console.error('Error updating product price:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return NextResponse.json({ success: false, message }, { status: 500 });
    }
} 