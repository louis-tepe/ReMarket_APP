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
import {
    UserCircle,
    LayoutDashboard,
    Settings,
    Heart,
    LogIn,
    LogOut,
    Search,
    ShoppingCart,
    MessageCircle,
} from "lucide-react";
import Image from "next/image";

// Interface pour la structure d'une catégorie
interface CategoryFromAPI {
    _id: string;
    name: string;
    slug: string;
    depth: number;
    isLeafNode: boolean;
    // Ajoutez d'autres champs si l'API les retourne et qu'ils sont utiles ici
}

export default function Header() {
    const { data: session, status } = useSession();
    const [categories, setCategories] = useState<CategoryFromAPI[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(true);
    const [errorCategories, setErrorCategories] = useState<string | null>(null);

    useEffect(() => {
        const fetchCategories = async () => {
            setIsLoadingCategories(true);
            setErrorCategories(null);
            try {
                // Récupérer uniquement les catégories de niveau 0
                const response = await fetch("/api/categories?depth=0");
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: "Erreur lors de la récupération des catégories" }));
                    throw new Error(errorData.message || "Erreur inconnue du serveur");
                }
                const data = await response.json();
                if (data.success && Array.isArray(data.categories)) {
                    setCategories(data.categories);
                } else {
                    console.warn("Réponse API inattendue pour les catégories:", data);
                    setCategories([]);
                    if (!data.success) {
                        setErrorCategories(data.message || "Format de réponse incorrect pour les catégories.");
                    }
                }
            } catch (err) {
                setErrorCategories(err instanceof Error ? err.message : "Une erreur inconnue est survenue lors du chargement des catégories.");
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
                    {errorCategories && <p className="text-destructive text-sm">Erreur catégories: {errorCategories}</p>}
                    {!isLoadingCategories && !errorCategories && categories.length === 0 && (
                        <p className="text-sm text-muted-foreground">Aucune catégorie principale.</p>
                    )}
                    {!isLoadingCategories && !errorCategories && categories.length > 0 &&
                        // Afficher toutes les catégories de niveau 0 récupérées
                        categories.map((category) => (
                            <Link
                                key={category._id}
                                href={`/categories/${category.slug}`}
                                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                            >
                                {category.name}
                            </Link>
                        ))}
                </div>

                <div className="flex items-center space-x-3 sm:space-x-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/categories" aria-label="Rechercher">
                            <Search className="h-5 w-5" />
                        </Link>
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/cart" aria-label="Panier">
                            <ShoppingCart className="h-5 w-5" />
                        </Link>
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/chat" aria-label="Chat avec Gemini">
                            <MessageCircle className="h-5 w-5" />
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
                                    <Link href="/favorites">
                                        <Heart className="mr-2 h-4 w-4" />
                                        Mes Favoris
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/settings">
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