import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { useFavoriteProduct } from '@/hooks/useFavoriteProduct';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';

export interface ProductCardProps {
    id: string;
    slug: string;
    name: string;
    imageUrl?: string;
    price?: number; // Rendu optionnel
    minPrice?: number; // Ajout de minPrice
    className?: string;
    initialIsFavorite?: boolean; // Nouvel état initial
    onFavoriteToggle?: (productId: string, isFavorite: boolean) => void;
}

// OPTIMISATION: Composant skeleton pour ProductCard
export function ProductCardSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn("border rounded-lg p-0 overflow-hidden shadow-sm flex flex-col", className)}>
            <Skeleton className="aspect-square w-full" />
            <div className="p-3 sm:p-4 flex-grow flex flex-col">
                <Skeleton className="h-4 sm:h-5 w-3/4 mb-1" />
                <Skeleton className="h-3 w-1/2 mb-3" />
                <div className="mt-auto pt-2 sm:pt-3 flex justify-between items-center">
                    <Skeleton className="h-6 sm:h-7 w-1/3" />
                    <Skeleton className="h-8 w-16" />
                </div>
            </div>
        </div>
    );
}

export default function ProductCard({
    id,
    slug,
    name,
    imageUrl,
    price,
    minPrice, // Récupération de minPrice
    className,
    initialIsFavorite = false,
    onFavoriteToggle
}: ProductCardProps) {
    const { status } = useSession();
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    const {
        isFavorite,
        isLoadingFavorite,
        toggleFavorite,
        isInteractionDisabled
    } = useFavoriteProduct({
        productId: id,
        initialIsFavorite,
        onFavoriteToggle
    });

    const handleFavoriteButtonClick = async (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        await toggleFavorite();
    };

    const displayPrice = price ?? minPrice;

    let correctedImageUrl = imageUrl;
    if (correctedImageUrl?.startsWith('https//')) {
        correctedImageUrl = 'https://' + correctedImageUrl.slice('https//'.length);
    } else if (correctedImageUrl?.startsWith('http//')) {
        correctedImageUrl = 'http://' + correctedImageUrl.slice('http//'.length);
    }

    const placeholderImage = '/images/placeholder-product.webp';
    const finalImageUrl = imageError || !correctedImageUrl ? placeholderImage : correctedImageUrl;

    return (
        <Link
            href={`/${slug}`}
            className={cn("border rounded-lg p-0 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col group", className)}
        >
            <div className="aspect-square w-full overflow-hidden relative bg-gray-100">
                {/* OPTIMISATION: Skeleton de chargement pour l'image */}
                {!imageLoaded && (
                    <Skeleton className="absolute inset-0 rounded-none" />
                )}

                <Image
                    src={finalImageUrl}
                    alt={name || 'Image du produit'}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className={cn(
                        "object-cover group-hover:scale-105 transition-transform duration-300 ease-in-out",
                        imageLoaded ? "opacity-100" : "opacity-0"
                    )}
                    priority={false}
                    loading="lazy" // OPTIMISATION: Lazy loading explicite
                    onLoad={() => setImageLoaded(true)}
                    onError={() => {
                        setImageError(true);
                        setImageLoaded(true); // Afficher le placeholder même en cas d'erreur
                    }}
                    // OPTIMISATION: Placeholder blurré pendant le chargement
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                />

                {/* OPTIMISATION: Bouton favori avec état de chargement optimisé */}
                {status === 'authenticated' && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "absolute top-2 right-2 z-10 h-9 w-9 rounded-full bg-background/70 hover:bg-background/90 transition-all duration-200",
                            isLoadingFavorite && "opacity-50 cursor-not-allowed",
                            isFavorite && "text-red-500 hover:text-red-600"
                        )}
                        onClick={handleFavoriteButtonClick}
                        disabled={isInteractionDisabled}
                        aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                    >
                        <Heart
                            className={cn(
                                "h-5 w-5 transition-all duration-200",
                                isFavorite && "fill-current scale-110"
                            )}
                        />
                    </Button>
                )}
            </div>

            <div className="p-3 sm:p-4 flex-grow flex flex-col">
                <h3 className="font-semibold text-sm sm:text-base leading-tight group-hover:text-primary transition-colors truncate" title={name || 'Produit'}>
                    {name || "Produit non disponible"}
                </h3>

                <div className="mt-auto pt-2 sm:pt-3 flex justify-between items-center">
                    <p className="text-lg sm:text-xl font-bold text-primary">
                        {displayPrice && displayPrice > 0 
                            ? `À partir de ${displayPrice.toLocaleString('fr-FR')} €` 
                            : 'Prix non disponible'}
                    </p>
                </div>
            </div>
        </Link>
    );
}
