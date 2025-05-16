'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
    // TODO: Implémenter la logique des paramètres utilisateur (ex: profil, notifications, etc.)

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
                    <p className="text-muted-foreground">
                        Section pour modifier les informations de profil (nom, email, mot de passe, etc.).
                    </p>
                    {/* TODO: Ajouter les champs de formulaire pour le profil */}
                </CardContent>
            </Card>

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Préférences de Notification</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Gérez ici vos préférences de notification.
                    </p>
                    {/* TODO: Ajouter les options de notification */}
                </CardContent>
            </Card>

            {/* D'autres sections de paramètres peuvent être ajoutées ici */}
        </div>
    );
} 