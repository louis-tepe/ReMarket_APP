'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import ShippingAddressForm from "./components/ShippingAddressForm";
import { IUser } from "@/lib/mongodb/models/User";

/**
 * SettingsPage: Allows users to manage their profile information and notification preferences.
 * Handles user session and displays appropriate messages for loading or unauthenticated states.
 */
export default function SettingsPage() {
    const { data: session, status: sessionStatus } = useSession();
    const [userData, setUserData] = useState<IUser | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchUserData = async (userId: string) => {
        try {
            const response = await fetch(`/api/users/${userId}`);
            if (!response.ok) throw new Error("Failed to fetch user data.");
            const data = await response.json();
            setUserData(data);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not fetch user data.");
        }
    };

    useEffect(() => {
        if (session?.user?.id) {
            fetchUserData(session.user.id);
        }
    }, [session]);

    // Handle loading state for the session
    if (sessionStatus === "loading" || (sessionStatus === "authenticated" && !userData)) {
        return <div className="container mx-auto py-8"><p>Chargement des paramètres...</p></div>;
    }

    // Handle unauthenticated state
    if (sessionStatus === "unauthenticated" || !session?.user) {
        return <div className="container mx-auto py-8"><p>Veuillez vous connecter pour accéder aux paramètres.</p></div>;
    }

    /**
     * Submits updated user profile information (name, email) to the backend.
     */
    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        if (!userData?._id) {
            toast.error("Erreur: ID utilisateur non trouvé.");
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(`/api/users/${userData._id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name: userData.name, email: userData.email }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Une erreur s'est produite lors de la mise à jour.");
            }

            toast.success("Profil mis à jour avec succès!");

        } catch (error) {
            console.error("Erreur lors de la mise à jour du profil:", error);
            toast.error(error instanceof Error ? error.message : "Une erreur inconnue s'est produite.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold flex items-center">
                    <SettingsIcon className="mr-3 h-8 w-8 text-primary" />
                    Paramètres du Compte
                </h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Informations du Profil</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleProfileSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="name">Nom</Label>
                            <Input
                                id="name"
                                value={userData.name || ''}
                                onChange={(e) => setUserData(prev => prev ? {...prev, name: e.target.value} : null)}
                                placeholder="Votre nom"
                            />
                        </div>
                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={userData.email || ''}
                                onChange={(e) => setUserData(prev => prev ? {...prev, email: e.target.value} : null)}
                                placeholder="Votre email"
                            />
                        </div>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Enregistrement..." : "Enregistrer les modifications"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {userData.role === 'seller' && (
              <ShippingAddressForm initialData={userData.shippingAddress} />
            )}

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Préférences de Notification</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="notification-offers" className="flex flex-col space-y-1">
                            <span>Nouvelles offres</span>
                            <span className="font-normal leading-snug text-muted-foreground">
                                Recevoir des notifications pour les nouvelles offres correspondant à vos intérêts.
                            </span>
                        </Label>
                        <Switch id="notification-offers" defaultChecked />
                        {/* TODO: Lier à l'état et sauvegarder la préférence */}
                    </div>
                    <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="notification-sales" className="flex flex-col space-y-1">
                            <span>Confirmations de vente</span>
                            <span className="font-normal leading-snug text-muted-foreground">
                                Être notifié lorsque l&apos;un de vos articles est vendu.
                            </span>
                        </Label>
                        <Switch id="notification-sales" />
                        {/* TODO: Lier à l'état et sauvegarder la préférence */}
                    </div>
                    <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="notification-updates" className="flex flex-col space-y-1">
                            <span>Mises à jour du site</span>
                            <span className="font-normal leading-snug text-muted-foreground">
                                Recevoir des informations sur les nouveautés et mises à jour de ReMarket.
                            </span>
                        </Label>
                        <Switch id="notification-updates" defaultChecked />
                        {/* TODO: Lier à l'état et sauvegarder la préférence */}
                    </div>
                </CardContent>
            </Card>

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Sécurité</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                        <Input id="confirmPassword" type="password" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        Assurez-vous que c&apos;est bien vous. Votre mot de passe actuel est requis pour modifier l&apos;adresse e-mail ou le mot de passe.
                    </p>
                </CardContent>
            </Card>

            {/* D'autres sections de paramètres peuvent être ajoutées ici */}
        </div>
    );
} 