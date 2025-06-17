"use server";

import { z } from "zod";
import dbConnect from "@/lib/mongodb/dbConnect";
import CategoryModel from "@/lib/mongodb/models/CategoryModel";
import { LeanCategory } from "@/types/category";
import { cache } from "react";
import { Types } from "mongoose";

interface GetAllCategoriesOptions {
    activeSlug?: string;
}

const GetAllCategoriesOptionsSchema = z.object({
    activeSlug: z.string().optional(),
});

export const getCategoriesByParent = cache(async (parentId: Types.ObjectId | null = null): Promise<LeanCategory[]> => {
    if (parentId && !Types.ObjectId.isValid(parentId)) {
        console.error("Invalid parentId:", parentId);
        return [];
    }
    await dbConnect();
    const categories = await CategoryModel.find({ parent: parentId })
        .sort({ name: 1 })
        .lean<LeanCategory>();
    return JSON.parse(JSON.stringify(categories));
});

export async function getAllCategories(options: GetAllCategoriesOptions = {}): Promise<{
    success: boolean;
    data: {
        allRootCategories: LeanCategory[];
        currentCategory: LeanCategory | null;
        currentCategoryChildren: LeanCategory[];
        breadcrumbs: LeanCategory[];
    };
    message?: string;
}> {
    const validatedOptions = GetAllCategoriesOptionsSchema.safeParse(options);

    if (!validatedOptions.success) {
        // Handle validation error, maybe return a specific error response
        return {
            success: false,
            data: { allRootCategories: [], currentCategory: null, currentCategoryChildren: [], breadcrumbs: [] },
            message: "Invalid options provided.",
        };
    }

    const { activeSlug } = validatedOptions.data;
    const fallbackData = { allRootCategories: [], currentCategory: null, currentCategoryChildren: [], breadcrumbs: [] };

    try {
        await dbConnect();
        const allCategories = await CategoryModel.find({}).lean<LeanCategory[]>();
        const allRootCategories = allCategories.filter(c => !c.parent);

        if (!activeSlug) {
            return {
                success: true,
                data: { ...fallbackData, allRootCategories: JSON.parse(JSON.stringify(allRootCategories)) }
            };
        }

        const currentCategory = allCategories.find(c => c.slug === activeSlug) || null;
        if (!currentCategory) {
            return {
                success: true,
                data: { ...fallbackData, allRootCategories: JSON.parse(JSON.stringify(allRootCategories)) }
            };
        }

        const currentCategoryChildren = allCategories.filter(c => c.parent?.toString() === currentCategory._id.toString());

        const breadcrumbs: LeanCategory[] = [];
        let parentId = currentCategory.parent;
        while (parentId) {
            const parent = allCategories.find(c => c._id.toString() === parentId?.toString());
            if (parent) {
                breadcrumbs.unshift(parent);
                parentId = parent.parent;
            } else {
                break;
            }
        }

        return {
            success: true,
            data: JSON.parse(JSON.stringify({
                allRootCategories,
                currentCategory,
                currentCategoryChildren,
                breadcrumbs,
            }))
        };
    } catch (error) {
        console.error("Error in getAllCategories:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return { success: false, data: fallbackData, message: errorMessage };
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