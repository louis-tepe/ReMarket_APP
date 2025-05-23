import dbConnect from "@/lib/db.Connect";
import ProductModel, { IProductModel } from "@/models/ProductModel";
import ProductOfferModel, { IProductBase } from "@/models/ProductBaseModel";
import { ProductCardProps } from "@/components/shared/ProductCard";

const FEATURED_PRODUCTS_LIMIT = 4;

export async function fetchFeaturedProductData(): Promise<ProductCardProps[]> {
  await dbConnect();

  const randomProductModels: IProductModel[] = await ProductModel.aggregate([
    { $sample: { size: FEATURED_PRODUCTS_LIMIT * 2 } },
  ]).exec();

  if (!randomProductModels || randomProductModels.length === 0) {
    return [];
  }

  const productsForCardPromises = randomProductModels.map(
    async (product: IProductModel) => {
      const cheapestOffer: IProductBase | null = await ProductOfferModel.findOne({
        productModel: product._id,
        transactionStatus: "available",
      })
        .sort({ price: 1 })
        .lean<IProductBase>();

      const slug = product.slug || product.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

      return {
        id: product._id.toString(),
        slug: slug,
        name: product.title,
        imageUrl: product.standardImageUrls?.[0],
        price: cheapestOffer ? cheapestOffer.price : null,
      };
    }
  );

  const productsForCard = await Promise.all(productsForCardPromises);
  
  const validProducts = productsForCard.filter(
    (p): p is Omit<typeof p, 'price'> & { price: number } => p.price !== null && p.price > 0
  );

  return validProducts.slice(0, FEATURED_PRODUCTS_LIMIT) as ProductCardProps[];
} 