"use client";

import Link from "next/link";
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
import { useCategoriesNavigation } from "@/hooks/useCategoriesNavigation";

// L'interface CategoryFromAPI est maintenant définie dans le hook

export default function Header() {
    const { data: session, status } = useSession();
    const { categories, isLoading: isLoadingCategories, error: errorCategories } = useCategoriesNavigation();

    const renderCategoryLinks = () => {
        if (isLoadingCategories) {
            return (
                <>
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-28" />
                </>
            );
        }
        if (errorCategories) {
            return <p className="text-destructive text-sm">Erreur chargement catégories.</p>;
        }
        if (categories.length === 0) {
            return <p className="text-sm text-muted-foreground">Aucune catégorie.</p>;
        }
        return categories.map((category) => (
            <Link
                key={category._id}
                href={`/categories/${category.slug}`}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
                {category.name}
            </Link>
        ));
    };

    const renderAuthStatus = () => {
        if (status === "loading") {
            return <Skeleton className="h-8 w-8 rounded-full" />;
        }
        if (status === "unauthenticated") {
            return (
                <Button asChild>
                    <Link href="/signin">
                        <LogIn className="mr-2 h-4 w-4" /> Se connecter
                    </Link>
                </Button>
            );
        }
        if (status === "authenticated" && session?.user) {
            return (
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
                            <Link href="/account/sales">
                                <LayoutDashboard className="mr-2 h-4 w-4" />
                                Tableau de bord
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/account/favorites">
                                <Heart className="mr-2 h-4 w-4" />
                                Mes favoris
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/account/settings">
                                <Settings className="mr-2 h-4 w-4" />
                                Paramètres
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                            <LogOut className="mr-2 h-4 w-4" />
                            Se déconnecter
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        }
        return null;
    };

    return (
        <header className="bg-background border-b sticky top-0 z-50">
            <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
                <Link href="/" className="text-2xl font-bold text-primary">
                    ReMarket
                </Link>

                <div className="hidden md:flex items-center space-x-4 lg:space-x-6">
                    {renderCategoryLinks()}
                </div>

                <div className="flex items-center space-x-3 sm:space-x-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/categories" aria-label="Rechercher">
                            <Search className="h-5 w-5" />
                        </Link>
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/account/cart" aria-label="Panier">
                            <ShoppingCart className="h-5 w-5" />
                        </Link>
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/chat" aria-label="Chat avec Gemini">
                            <MessageCircle className="h-5 w-5" />
                        </Link>
                    </Button>
                    {renderAuthStatus()}
                </div>
            </nav>
        </header>
    );
} 