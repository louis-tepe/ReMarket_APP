import dbConnect from "@/lib/db.Connect";
import ProductModel, { IProductModel } from "@/models/ProductModel";
import OfferModel, { IOffer } from "@/models/OfferModel";
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
      const cheapestOffer: IOffer | null = await OfferModel.findOne({
        productModel: product._id,
        status: "available",
      })
        .sort({ price: 1 })
        .lean<IOffer>();

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
    (p): p is ProductCardProps => p.price !== null
  );

  return validProducts.map(p => ({
    ...p,
  }));
} 