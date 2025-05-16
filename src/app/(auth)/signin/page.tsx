'use client';

import { useState, FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner"; // Pour les notifications

export default function ConnexionPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);

        try {
            const result = await signIn('credentials', {
                redirect: false,
                email,
                password,
            });

            if (result?.error) {
                const errorMessage = result.error === "CredentialsSignin" ? "Email ou mot de passe incorrect." : "Une erreur est survenue. Veuillez réessayer.";
                toast.error("Erreur de connexion", { description: errorMessage });
                setIsLoading(false);
            } else if (result?.ok) {
                toast.success("Connexion réussie!", { description: "Vous allez être redirigé." });
                router.push('/');
            } else {
                toast.error("Erreur inattendue", { description: "Une erreur de connexion inattendue est survenue." });
                setIsLoading(false);
            }
        } catch (err) {
            console.error("Erreur lors de la tentative de connexion:", err);
            toast.error("Erreur Serveur", { description: "Une erreur serveur est survenue." });
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-3xl font-bold tracking-tight">Connexion</CardTitle>
                    <CardDescription>
                        Accédez à votre compte ReMarket.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
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
                                autoComplete="current-password"
                                placeholder="Votre mot de passe"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                                className="bg-input"
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Connexion en cours...' : 'Se connecter'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col items-center space-y-2">
                    <div className="text-sm text-muted-foreground">
                        Pas encore de compte ?{' '}
                        <Link href="/signup" className="font-medium text-primary hover:underline">
                            Inscrivez-vous
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
} 