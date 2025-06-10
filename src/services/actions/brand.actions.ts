"use server";

import dbConnect from "@/lib/mongodb/dbConnect";
import BrandModel, { IBrand } from "@/lib/mongodb/models/BrandModel";
import { unstable_cache as cache } from 'next/cache';

// Type pour une marque "lean"
export type LeanBrand = Omit<IBrand, never> & {
    _id: string;
    productCount?: number;
};

// Fonction cachée pour récupérer toutes les marques
const getCachedBrands = cache(
    async (): Promise<LeanBrand[]> => {
        console.log('Fetching all brands from DB...');
        await dbConnect();
        const brands = await BrandModel.find({}).lean<LeanBrand[]>();
        return brands.map(brand => ({
            ...brand,
            _id: brand._id.toString(),
        }));
    },
    ['all-brands'],
    {
        revalidate: 60 * 60, // 1 hour
        tags: ['brands'],
    }
);

/**
 * Récupère toutes les marques.
 * @returns Un objet avec `success`, `data` et `message`.
 */
export async function getAllBrands(): Promise<{
    success: boolean;
    data: LeanBrand[];
    message?: string;
}> {
    try {
        const brands = await getCachedBrands();
        return { success: true, data: brands };
    } catch (error) {
        console.error("Error in getAllBrands:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return { success: false, data: [], message: errorMessage };
    }
} 