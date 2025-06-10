"use server";

import dbConnect from "@/lib/mongodb/dbConnect";
import CategoryModel from "@/lib/mongodb/models/CategoryModel";
import { LeanCategory } from "@/types/category";
import { cache } from "react";

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

/**
 * @returns {Promise<LeanCategory[]>} Une promesse qui résout à un tableau de catégories "lean".
 */
export const getCategories = cache(async (): Promise<LeanCategory[]> => {
  console.log("Fetching categories...");
  await dbConnect();

  // Remplacez 'parent: null' par le critère de recherche que vous souhaitez utiliser par défaut
  const categories = await CategoryModel.find({ parent: null }).sort({ name: 1 }).lean<LeanCategory[]>();

  return categories;
}); 