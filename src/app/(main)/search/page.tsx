import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export default async function SearchPage({
    searchParams
}: {
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const resolvedSearchParams = searchParams ? await searchParams : {};
    const searchQuery = resolvedSearchParams?.query || "";

    // TODO: Implémenter la logique de recherche en utilisant searchQuery
    // TODO: Récupérer et afficher les produits correspondants

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <form className="flex w-full max-w-2xl mx-auto items-center space-x-2">
                    <Input
                        type="search"
                        name="query"
                        placeholder="Rechercher un produit... (ex: iPhone 13, Samsung Galaxy S22)"
                        className="flex-1"
                        defaultValue={searchQuery}
                    />
                    <Button type="submit">
                        <Search className="h-4 w-4 mr-2" /> Rechercher
                    </Button>
                </form>
            </div>

            {searchQuery && (
                <h1 className="text-2xl font-bold mb-6">Résultats pour : &quot;{searchQuery}&quot;</h1>
            )}

            {/* Exemple de grille de résultats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {/* TODO: Itérer sur les produits trouvés et afficher une carte pour chaque produit */}
                {/* Exemple de carte produit (placeholder) */}
                {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="border rounded-lg p-4 shadow-sm">
                        <div className="aspect-square bg-gray-200 rounded-md mb-2 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-1 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                    </div>
                ))}
                {/* TODO: Gérer le cas où aucun produit n'est trouvé */}
                {/* {products.length === 0 && searchQuery && <p>Aucun produit trouvé pour "{searchQuery}".</p>} */}
            </div>
        </div>
    );
} 