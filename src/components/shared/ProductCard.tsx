import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

export interface ProductCardProps {
    id: string;
    slug: string;
    name: string;
    imageUrl?: string;
    price: number;
    offerCount?: number; // Nombre d'offres pour ce modèle de produit
    className?: string;
    initialIsFavorite?: boolean; // Nouvel état initial
    onFavoriteToggle?: (productId: string, isFavorite: boolean) => void;
}

export default function ProductCard({
    id,
    slug,
    name,
    imageUrl,
    price,
    offerCount,
    className,
    initialIsFavorite = false,
    onFavoriteToggle
}: ProductCardProps) {
    const { data: session, status } = useSession();
    const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
    const [isLoadingFavorite, setIsLoadingFavorite] = useState(false);

    // Synchroniser l'état si la prop initiale change
    useEffect(() => {
        setIsFavorite(initialIsFavorite);
    }, [initialIsFavorite]);

    const handleToggleFavorite = async (event: React.MouseEvent) => {
        event.preventDefault(); // Empêche la navigation si la carte est un lien
        event.stopPropagation(); // Empêche la propagation si le bouton est dans un autre élément cliquable

        if (status !== 'authenticated' || !session?.user) {
            toast.info("Veuillez vous connecter pour ajouter des favoris.");
            // Optionnel: rediriger vers la page de connexion
            // router.push('/signin');
            return;
        }

        setIsLoadingFavorite(true);
        const newFavoriteStatus = !isFavorite;

        try {
            const response = await fetch('/api/favorites', {
                method: newFavoriteStatus ? 'POST' : 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ productId: id }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Erreur lors de la mise à jour des favoris');
            }

            setIsFavorite(newFavoriteStatus);
            toast.success(newFavoriteStatus ? "Ajouté aux favoris!" : "Retiré des favoris.");
            if (onFavoriteToggle) {
                onFavoriteToggle(id, newFavoriteStatus);
            }
            // Optionnel: déclencher un événement global ou invalider un cache SWR/React Query ici

        } catch (error) {
            console.error("Erreur lors de la mise à jour des favoris:", error);
            toast.error(error instanceof Error ? error.message : "Une erreur s'est produite.");
        } finally {
            setIsLoadingFavorite(false);
        }
    };

    const placeholderImage = '/images/placeholder-product.webp'; // Assurez-vous que cette image existe dans public/images

    return (
        <Link
            href={`/${slug}`}
            className={cn("border rounded-lg p-0 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col group", className)}
        >
            <div className="aspect-square w-full overflow-hidden relative">
                <Image
                    src={imageUrl || placeholderImage}
                    alt={name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300 ease-in-out"
                    priority={false} // Mettre à true pour les images LCP (ex: produits vedettes en haut de page)
                />
                {status === 'authenticated' && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "absolute top-2 right-2 z-10 h-9 w-9 rounded-full bg-background/70 hover:bg-background/90",
                            isLoadingFavorite && "opacity-50 cursor-not-allowed",
                            isFavorite && "text-red-500 hover:text-red-600"
                        )}
                        onClick={handleToggleFavorite}
                        disabled={isLoadingFavorite}
                        aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                    >
                        <Heart className={cn("h-5 w-5", isFavorite && "fill-current")} />
                    </Button>
                )}
            </div>
            <div className="p-3 sm:p-4 flex-grow flex flex-col">
                <h3 className="font-semibold text-sm sm:text-base leading-tight group-hover:text-primary transition-colors truncate" title={name}>
                    {name}
                </h3>
                {offerCount !== undefined && offerCount > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">{offerCount} offre{offerCount > 1 ? 's' : ''} disponible{offerCount > 1 ? 's' : ''}</p>
                )}
                {offerCount === 0 && (
                    <p className="text-xs text-red-500 mt-0.5 sm:mt-1">Aucune offre pour le moment</p>
                )}
                <div className="mt-auto pt-2 sm:pt-3 flex justify-between items-center">
                    <p className="text-lg sm:text-xl font-bold text-primary">
                        {price > 0 ? `${price.toLocaleString('fr-FR')} €` : 'Sur devis'}
                    </p>
                    {/* <Button size="sm" variant="outline" className="text-xs sm:text-sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); console.log("Action sur ", id)}}>Détails</Button> */}
                </div>
            </div>
        </Link>
    );
}
