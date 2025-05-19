import dbConnect from "@/lib/db.Connect";
import ProductModel, { IProductModel } from "@/models/ProductModel";
import ProductOfferModel, { IProductBase } from "@/models/ProductBaseModel";
import { ProductCardProps } from "@/components/shared/ProductCard";

const FEATURED_PRODUCTS_LIMIT = 4;

export async function fetchFeaturedProductData(): Promise<ProductCardProps[]> {
  await dbConnect();

  const featuredProductModels: IProductModel[] = await ProductModel.find({
    isFeatured: true,
  })
    .limit(FEATURED_PRODUCTS_LIMIT)
    .lean<IProductModel[]>();

  const productsForCardPromises = featuredProductModels.map(
    async (product: IProductModel) => {
      const cheapestOffer: IProductBase | null = await ProductOfferModel.findOne({
        productModel: product._id,
        listingStatus: "active",
        transactionStatus: "available",
      })
        .sort({ price: 1 })
        .lean<IProductBase>();

      const slug = product.slug || product.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

      return {
        id: product._id.toString(),
        slug: slug,
        name: product.title,
        imageUrl: product.standardImageUrls?.[0] || undefined,
        price: cheapestOffer ? cheapestOffer.price : null,
      };
    }
  );

  const productsForCard = await Promise.all(productsForCardPromises);
  
  const validProducts = productsForCard.filter(
    (p): p is Omit<typeof p, 'price'> & { price: number } => p.price !== null
  );

  return validProducts.map(p => ({
    ...p,
  })) as ProductCardProps[];
} 