'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function InscriptionPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);

        if (password.length < 6) {
            toast.error("Mot de passe trop court", { description: "Le mot de passe doit contenir au moins 6 caractères." });
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error("Erreur d'inscription", { description: data.message || 'Une erreur est survenue lors de l\'inscription.' });
            } else {
                toast.success("Inscription réussie !", { description: data.message || 'Vous allez être redirigé vers la page de connexion.' });
                setTimeout(() => {
                    router.push('/signin');
                }, 2000);
            }
        } catch (err) {
            console.error("Erreur lors de la tentative d'inscription:", err);
            toast.error("Erreur Serveur", { description: "Une erreur serveur est survenue lors de l\'inscription." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-3xl font-bold tracking-tight">Créer un compte</CardTitle>
                    <CardDescription>
                        Rejoignez ReMarket et commencez à vendre ou acheter.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nom complet (optionnel)</Label>
                            <Input
                                id="name"
                                name="name"
                                type="text"
                                autoComplete="name"
                                placeholder="Votre nom et prénom"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={isLoading}
                                className="bg-input"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Adresse email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                placeholder="votre@email.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                                className="bg-input"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Mot de passe</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                placeholder="Choisissez un mot de passe (min. 6 caractères)"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                                className="bg-input"
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Inscription en cours...' : 'S\'inscrire'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col items-center">
                    <div className="text-sm text-muted-foreground">
                        Déjà un compte ?{' '}
                        <Link href="/signin" className="font-medium text-primary hover:underline">
                            Connectez-vous
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
} 