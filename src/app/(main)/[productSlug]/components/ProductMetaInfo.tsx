import { Badge } from "@/components/ui/badge";

interface BrandOrCategory {
    name: string;
    slug: string;
}

interface ProductMetaInfoProps {
    category?: BrandOrCategory;
    brand?: BrandOrCategory;
    title: string;
    variantTitle?: string;
    offerCount: number;
}

/**
 * Displays meta-information about a product, including its category, brand,
 * title, variant title (if any), and the count of available offers.
 */
export default function ProductMetaInfo({
    category,
    brand,
    title,
    variantTitle,
    offerCount
}: ProductMetaInfoProps) {
    return (
        <div>
            <Badge variant="outline" className="mb-2">
                {category?.name} {brand?.name ? `> ${brand.name}` : ''}
            </Badge>
            <h1 className="text-3xl lg:text-4xl font-bold mb-1">{title}</h1>
            {variantTitle && (
                <p className="text-lg text-muted-foreground mb-1">{variantTitle}</p>
            )}
            <p className="text-lg text-muted-foreground mb-1">
                Par <span className="font-semibold text-foreground">{brand?.name || 'Marque inconnue'}</span>
            </p>
            <p className="text-sm text-primary mb-6">
                {offerCount} offre(s) disponible(s)
            </p>
        </div>
    );
} 