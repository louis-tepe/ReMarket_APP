import dbConnect from "@/lib/mongodb/dbConnect";
import ProductModel from "@/lib/mongodb/models/ProductModel";
import CategoryModel from "@/lib/mongodb/models/CategoryModel";
import BrandModel from "@/lib/mongodb/models/BrandModel";
import { Types, FilterQuery, SortOrder } from "mongoose";
import { LeanProduct, ProductSearchServiceResult, SearchFilters } from "@/types/product";

const FEATURED_PRODUCTS_LIMIT = 4;

export interface FeaturedProductData {
  id: string;
  slug: string;
  name: string;
  imageUrl?: string;
  price: number | null;
}

export async function fetchFeaturedProductData(): Promise<FeaturedProductData[]> {
  await dbConnect();

  const products: FeaturedProductData[] = await ProductModel.aggregate([
    { $sample: { size: FEATURED_PRODUCTS_LIMIT } },
    {
      $lookup: {
        from: "productoffers",
        localField: "_id",
        foreignField: "productModel",
        as: "offers",
        pipeline: [
          { $match: { transactionStatus: "available" } },
          { $sort: { price: 1 } },
          { $limit: 1 }
        ],
      },
    },
    { $match: { "offers.0": { $exists: true } } },
    {
      $project: {
        _id: 0,
        id: { $toString: "$_id" },
        slug: {
          $ifNull: [
            "$slug",
            {
              $replaceAll: {
                input: { $toLower: "$title" },
                find: " ",
                replacement: "-",
              },
            },
          ],
        },
        name: "$title",
        imageUrl: { $arrayElemAt: ["$standardImageUrls", 0] },
        price: { $arrayElemAt: ["$offers.price", 0] },
      },
    },
  ]).exec();

  return products;
}

async function getCategoryWithDescendants(categorySlug: string): Promise<Types.ObjectId[]> {
    const mainCategory = await CategoryModel.findOne({ slug: categorySlug }).lean();
    if (!mainCategory) {
        return [];
    }

    const allCategories = await CategoryModel.find({}).lean();
    const categoryMap = new Map(allCategories.map(c => [c._id.toString(), c]));
    
    const descendants: Types.ObjectId[] = [mainCategory._id];
    const queue: Types.ObjectId[] = [mainCategory._id];

    while (queue.length > 0) {
        const currentId = queue.shift()?.toString();
        if (!currentId) continue;
        
        for (const category of allCategories) {
            if (category.parent?.toString() === currentId) {
                descendants.push(category._id);
                queue.push(category._id);
            }
        }
    }
    return descendants;
}

export async function searchProducts(filters: SearchFilters): Promise<ProductSearchServiceResult> {
  await dbConnect();

  const {
    sort = 'relevance',
    limit = 12,
    page = 1,
    includeOffers = false,
  } = filters;

  const query: FilterQuery<typeof ProductModel> = {};

  if (filters.searchQuery) {
    query.$text = { $search: filters.searchQuery };
  }
  if (filters.categorySlug) {
    const categoryIds = await getCategoryWithDescendants(filters.categorySlug);
    if (categoryIds.length > 0) {
      query.category = { $in: categoryIds };
    } else {
      return { products: [], totalProducts: 0 };
    }
  }
  if (filters.brandSlugs?.length) {
    const brands = await BrandModel.find({ slug: { $in: filters.brandSlugs } }).select('_id').lean();
    if (brands.length > 0) {
      query.brand = { $in: brands.map(b => b._id) };
    } else {
      return { products: [], totalProducts: 0 };
    }
  }

  const sortOptions: { [key: string]: SortOrder | { $meta: "textScore" } } = {};
  if (sort === 'relevance' && query.$text) {
    sortOptions.score = { $meta: "textScore" };
  } else if (sort === 'price-asc') {
    sortOptions.minPrice = 1;
  } else if (sort === 'price-desc') {
    sortOptions.minPrice = -1;
  }

  const skip = (page - 1) * limit;

  const populateOptions: { path: string; select?: string }[] = [];
  if (includeOffers) {
    populateOptions.push({ path: 'sellerOffers' });
  }

  const products = await ProductModel.find(query)
    .sort(sortOptions)
    .skip(skip)
    .limit(limit)
    .populate(populateOptions)
    .lean<LeanProduct[]>();

  const totalProducts = await ProductModel.countDocuments(query);

  return { products, totalProducts };
}