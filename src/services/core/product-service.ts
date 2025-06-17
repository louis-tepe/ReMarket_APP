import dbConnect from "@/lib/mongodb/dbConnect";
import ProductModel from "@/lib/mongodb/models/ScrapingProduct";
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
                input: { $toLower: "$product.title" },
                find: " ",
                replacement: "-",
              },
            },
          ],
        },
        name: "$product.title",
        imageUrl: { $arrayElemAt: ["$product.images", 0] },
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

  const query: FilterQuery<any> = {};

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

  const totalProducts = await ProductModel.countDocuments(query);

  const sortOptions: { [key: string]: SortOrder | { $meta: "textScore" } } = {};
  if (sort === 'relevance' && filters.searchQuery) {
    sortOptions.score = { $meta: "textScore" };
  } else if (sort === 'price-asc') {
    sortOptions.minPrice = 1;
  } else if (sort === 'price-desc') {
    sortOptions.minPrice = -1;
  }

  const skip = (page - 1) * limit;

  const aggregationPipeline: any[] = [
    { $match: query },
    {
      $lookup: {
        from: "productoffers",
        localField: "_id",
        foreignField: "productModel",
        as: "sellerOffers",
        pipeline: [
          { $match: { transactionStatus: "available" } },
          { $sort: { price: 1 } },
        ],
      },
    },
    {
      $addFields: {
        minPrice: { $ifNull: [{ $min: "$sellerOffers.price" }, null] },
      },
    },
    { $match: { minPrice: { $ne: null } } },
    {
      $project: {
        _id: 1,
        slug: 1,
        title: "$product.title",
        standardImageUrls: "$product.images",
        category: 1,
        brand: 1,
        minPrice: 1,
        sellerOffers: {
          $cond: {
            if: includeOffers,
            then: "$sellerOffers",
            else: [],
          },
        },
      },
    },
  ];

  if (Object.keys(sortOptions).length > 0) {
    aggregationPipeline.push({ $sort: sortOptions });
  }

  aggregationPipeline.push({ $skip: skip }, { $limit: limit });

  const products = await ProductModel.aggregate(aggregationPipeline).exec();

  return { products, totalProducts };
}