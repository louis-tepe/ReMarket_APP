import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";

export default async function ProductPage({
    params
}: {
    params: Promise<{ productSlug: string }>;
    // searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { productSlug } = await params;
    // TODO: Récupérer les informations du produit en utilisant params.productSlug
    // TODO: Récupérer les offres des vendeurs pour ce produit

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                {/* Colonne Image Produit */}
                <div className="aspect-square bg-gray-200 rounded-lg animate-pulse"></div>

                {/* Colonne Informations Produit et Offres */}
                <div>
                    <h1 className="text-3xl lg:text-4xl font-bold mb-2">{productSlug}</h1>
                    <p className="text-lg text-gray-600 mb-4">Brève description du produit placeholder.</p>

                    <Separator className="my-6" />

                    {/* TODO: Section pour sélectionner l'état/grade du produit si applicable */}
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold mb-3">Choisir une offre :</h2>
                        {/* Exemple d'offre - à remplacer par les données réelles */}
                        {Array.from({ length: 3 }).map((_, index) => (
                            <div key={index} className="border rounded-lg p-4 mb-3 flex justify-between items-center">
                                <div>
                                    <p className="font-medium">Vendeur {index + 1} - État: Bon</p>
                                    <p className="text-sm text-gray-500">Quelques détails sur l&apos;offre...</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-semibold">199,99 €</p>
                                    <Button size="sm" className="mt-1">
                                        <ShoppingCart className="mr-2 h-4 w-4" /> Ajouter
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {/* Placeholder si aucune offre */}
                        {/* <p className="text-gray-500">Aucune offre disponible pour ce produit pour le moment.</p> */}
                    </div>

                    <Separator className="my-6" />

                    <div>
                        <h2 className="text-xl font-semibold mb-3">Description détaillée</h2>
                        <div className="space-y-2 text-gray-700">
                            <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                            <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                        </div>
                    </div>

                    {/* TODO: Section pour les caractéristiques techniques */}
                </div>
            </div>
        </div>
    );
} 