import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge"; // Badge supprimé car non utilisé

export interface ProductCardProps {
    id: string;
    slug: string;
    name: string;
    imageUrl: string | undefined; // Changé de optionnel à string | undefined
    price: number;
    // condition?: string; // Exemple: "Comme neuf", "Très bon état"
    // category?: string;
}

export default function ProductCard({
    slug,
    name,
    imageUrl,
    price
}: ProductCardProps) {
    return (
        <Card className="overflow-hidden flex flex-col h-full">
            <CardHeader className="p-0 relative aspect-square">
                <Link href={`/${slug}`} className="block w-full h-full">
                    {imageUrl ? (
                        <Image
                            src={imageUrl}
                            alt={name}
                            width={300} // Taille par défaut, peut être ajustée via props ou CSS
                            height={300}
                            className="object-cover w-full h-full transition-transform duration-300 hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                            <span className="text-muted-foreground text-sm">Image Indisponible</span>
                        </div>
                    )}
                </Link>
                {/* Possibilité d'ajouter un badge ici, ex: <Badge className="absolute top-2 right-2">Promo</Badge> */}
            </CardHeader>
            <CardContent className="p-4 flex-grow">
                <CardTitle className="text-lg font-semibold mb-1">
                    <Link href={`/${slug}`} className="hover:text-primary transition-colors">
                        {name}
                    </Link>
                </CardTitle>
                {/* {condition && <p className="text-sm text-muted-foreground mb-2">État: {condition}</p>} */}
            </CardContent>
            <CardFooter className="p-4 pt-0 flex justify-between items-center">
                <p className="text-xl font-bold text-primary">{price.toFixed(2)} €</p>
                <Button asChild size="sm">
                    <Link href={`/${slug}`}>Voir l&apos;offre</Link>
                </Button>
            </CardFooter>
        </Card>
    );
} 