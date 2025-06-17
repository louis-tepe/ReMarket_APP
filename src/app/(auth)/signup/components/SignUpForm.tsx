'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SignUpSchema, TSignUpSchema } from '@/lib/validators/auth';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface SignUpFormProps {
    onSuccess?: () => void;
}

/**
 * Composant SignUpForm
 * Gère l'état et la soumission du formulaire d'inscription.
 * Affiche des notifications toast pour les succès ou erreurs.
 * Valide la longueur minimale du mot de passe.
 */
export function SignUpForm({ onSuccess }: SignUpFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<TSignUpSchema>({
        resolver: zodResolver(SignUpSchema),
    });

    const onSubmit = async (data: TSignUpSchema) => {
        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const responseData = await response.json();

            if (!response.ok) {
                toast.error("Erreur d'inscription", { description: responseData.message || 'Une erreur est survenue.' });
            } else {
                toast.success("Inscription réussie !", { description: 'Vous allez être redirigé.' });
                if (onSuccess) {
                    onSuccess();
                } else {
                    setTimeout(() => {
                        router.push('/signin');
                    }, 2000);
                }
            }
        } catch (err) {
            console.error("Erreur lors de la tentative d'inscription:", err);
            toast.error("Erreur Serveur", { description: "Une erreur serveur est survenue." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">Nom complet (optionnel)</Label>
                <Input
                    id="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Votre nom et prénom"
                    {...register('name')}
                    disabled={isLoading}
                    className="bg-input"
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="email">Adresse email</Label>
                <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="votre@email.com"
                    {...register('email')}
                    disabled={isLoading}
                    className="bg-input"
                />
                {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Choisissez un mot de passe"
                    {...register('password')}
                    disabled={isLoading}
                    className="bg-input"
                />
                {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Inscription en cours...' : "S'inscrire"}
            </Button>
        </form>
    );
} 