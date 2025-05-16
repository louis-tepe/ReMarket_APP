"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserCircle, LayoutDashboard, Settings, Heart, LogIn, LogOut, Search, ShoppingCart } from "lucide-react";
import Image from "next/image";

// Interface pour la structure d'une catégorie (doit correspondre à ce que l'API retourne)
interface Category {
    _id: string; // ou id si l'API le transforme
    name: string;
    slug: string;
    // Ajoutez d'autres champs si nécessaire, par ex. iconUrl
}

export default function Header() {
    const { data: session, status } = useSession();
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(true);
    const [errorCategories, setErrorCategories] = useState<string | null>(null);

    useEffect(() => {
        const fetchCategories = async () => {
            setIsLoadingCategories(true);
            setErrorCategories(null);
            try {
                const response = await fetch("/api/categories");
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: "Erreur lors de la récupération des catégories" }));
                    throw new Error(errorData.message);
                }
                const data = await response.json();
                setCategories(data.categories || []);
            } catch (err) {
                setErrorCategories(err instanceof Error ? err.message : "Une erreur inconnue est survenue");
                console.error("Failed to fetch categories:", err);
                setCategories([]);
            } finally {
                setIsLoadingCategories(false);
            }
        };
        fetchCategories();
    }, []);

    return (
        <header className="bg-background border-b sticky top-0 z-50">
            <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
                <Link href="/" className="text-2xl font-bold text-primary">
                    ReMarket
                </Link>

                <div className="hidden md:flex items-center space-x-4 lg:space-x-6">
                    {isLoadingCategories && (
                        <>
                            <Skeleton className="h-5 w-20" />
                            <Skeleton className="h-5 w-24" />
                            <Skeleton className="h-5 w-28" />
                        </>
                    )}
                    {errorCategories && <p className="text-destructive text-sm">{errorCategories}</p>}
                    {!isLoadingCategories && !errorCategories && categories.length === 0 && (
                        <p className="text-sm text-muted-foreground">Aucune catégorie.</p>
                    )}
                    {!isLoadingCategories && !errorCategories && categories.length > 0 &&
                        categories.slice(0, 4).map((category) => (
                            <Link
                                key={category._id}
                                href={`/categories/${category.slug}`}
                                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                            >
                                {category.name}
                            </Link>
                        ))}
                    {/* TODO: Ajouter un lien "Plus de catégories" si > 4 cats */}
                </div>

                <div className="flex items-center space-x-3 sm:space-x-4">
                    {/* TODO: Bouton Recherche et Panier à styliser/intégrer correctement */}
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/search" aria-label="Rechercher">
                            <Search className="h-5 w-5" />
                        </Link>
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/cart" aria-label="Panier"> {/* TODO: Créer la page /cart */}
                            <ShoppingCart className="h-5 w-5" />
                            {/* TODO: Badge avec nombre d'articles dans le panier */}
                        </Link>
                    </Button>

                    {status === "loading" && (
                        <Skeleton className="h-8 w-8 rounded-full" />
                    )}

                    {status === "unauthenticated" && (
                        <Button asChild>
                            <Link href="/signin">
                                <LogIn className="mr-2 h-4 w-4" /> Se connecter
                            </Link>
                        </Button>
                    )}

                    {status === "authenticated" && session?.user && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="rounded-full h-9 w-9 p-0">
                                    {session.user.image ? (
                                        <Image
                                            src={session.user.image}
                                            alt={session.user.name || "Avatar utilisateur"}
                                            width={36}
                                            height={36}
                                            className="rounded-full"
                                        />
                                    ) : (
                                        <UserCircle className="h-7 w-7 text-muted-foreground" />
                                    )}
                                    {/* <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" /> */}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>
                                    <p className="text-sm font-medium truncate">{session.user.name || "Utilisateur"}</p>
                                    {session.user.email && <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard/sales">
                                        <LayoutDashboard className="mr-2 h-4 w-4" />
                                        Tableau de bord
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/favorites"> {/* TODO: Créer la page /favorites */}
                                        <Heart className="mr-2 h-4 w-4" />
                                        Mes Favoris
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/settings"> {/* TODO: Créer la page /settings */}
                                        <Settings className="mr-2 h-4 w-4" />
                                        Paramètres du compte
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Se déconnecter
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </nav>
        </header>
    );
} 