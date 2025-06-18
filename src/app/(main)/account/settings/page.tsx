'use client';

import { useSession, signOut } from 'next-auth/react';
import ShippingAddressForm from './components/ShippingAddressForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

/**
 * SettingsPage: Allows users to manage their profile information and notification preferences.
 * Handles user session and displays appropriate messages for loading or unauthenticated states.
 */
export default function SettingsPage() {
    const { data: session } = useSession();
    const userData = session?.user;

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Compte</h3>
                <p className="text-sm text-muted-foreground">
                    Gérez les informations de votre compte.
                </p>
            </div>
            <Separator />
            
            {userData && (
                <Card>
                    <CardHeader>
                        <CardTitle>Profil</CardTitle>
                        <CardDescription>
                            Voici les informations de votre profil.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-medium">Nom d'utilisateur</p>
                                <p className="text-sm text-muted-foreground">{userData.name}</p>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-medium">Email</p>
                                <p className="text-sm text-muted-foreground">{userData.email}</p>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-medium">Rôle</p>
                                <p className="text-sm text-muted-foreground capitalize">{userData.role}</p>
                            </div>
                        </div>
                        <Button variant="outline" onClick={() => signOut()}>Se déconnecter</Button>
                    </CardContent>
                </Card>
            )}

            {userData && (
                <ShippingAddressForm initialData={userData.shippingAddress} />
            )}
        </div>
    );
} 