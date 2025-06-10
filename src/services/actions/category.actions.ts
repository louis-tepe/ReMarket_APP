"use server";

import dbConnect from "@/lib/mongodb/dbConnect";
import CategoryModel, { ICategory } from "@/lib/mongodb/models/CategoryModel";
import { unstable_cache as cache } from 'next/cache';

// Type pour une catégorie "lean" (sans les méthodes Mongoose)
export type LeanCategory = Omit<ICategory, 'parent' | 'children'> & {
    _id: string;
    parent?: string;
    children?: string[];
    productCount?: number;
};

// Fonction cachée pour récupérer toutes les catégories
const getCachedCategories = cache(
    async (): Promise<LeanCategory[]> => {
        console.log('Fetching all categories from DB...');
        await dbConnect();
        
        const categories = await CategoryModel.find({})
            .populate('parent', 'name slug')
            .lean<LeanCategory[]>();

        return categories.map(cat => ({
            ...cat,
            _id: cat._id.toString(),
            parent: cat.parent ? cat.parent.toString() : undefined,
        }));
    },
    ['all-categories'], // Clé de cache
    {
        revalidate: 60 * 60, // Révalider toutes les heures
        tags: ['categories'], // Tag pour la révalidation à la demande
    }
);

/**
 * Récupère toutes les catégories depuis la base de données, en utilisant un cache.
 * @returns Un objet avec `success`, `data` (la liste des catégories) et optionnellement `message`.
 */
export async function getAllCategories(): Promise<{
    success: boolean;
    data: LeanCategory[];
    message?: string;
}> {
    try {
        const categories = await getCachedCategories();
        return { success: true, data: categories };
    } catch (error) {
        console.error("Error in getAllCategories:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return { success: false, data: [], message: errorMessage };
    }
} 