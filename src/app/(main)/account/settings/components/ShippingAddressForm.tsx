'use client';

import { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { IShippingAddress } from '@/lib/mongodb/models/User';

const addressSchema = z.object({
  name: z.string().min(2, "Le nom complet est requis"),
  companyName: z.string().optional(),
  address: z.string().min(5, "L'adresse est requise"),
  houseNumber: z.string().min(1, "Le numéro de rue est requis"),
  city: z.string().min(2, "La ville est requise"),
  postalCode: z.string().min(4, "Le code postal est requis"),
  country: z.string().length(2, "Le code pays doit faire 2 caractères (ex: FR)"),
  telephone: z.string().optional(),
});

type ShippingAddressFormData = z.infer<typeof addressSchema>;

interface ShippingAddressFormProps {
  initialData?: IShippingAddress | null;
}

export default function ShippingAddressForm({ initialData }: ShippingAddressFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ShippingAddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      name: initialData?.name || '',
      companyName: initialData?.companyName || '',
      address: initialData?.address || '',
      houseNumber: initialData?.houseNumber || '',
      city: initialData?.city || '',
      postalCode: initialData?.postalCode || '',
      country: initialData?.country || 'FR',
      telephone: initialData?.telephone || '',
    },
  });

  useEffect(() => {
    reset(initialData || { country: 'FR' });
  }, [initialData, reset]);

  const onSubmit: SubmitHandler<ShippingAddressFormData> = async (data) => {
    setIsLoading(true);
    toast.info("Mise à jour de l'adresse en cours...");

    try {
      const response = await fetch('/api/user/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de la mise à jour de l'adresse.");
      }

      toast.success("Adresse d'expédition enregistrée avec succès !");
    } catch (error) {
      console.error("Failed to save shipping address:", error);
      toast.error(error instanceof Error ? error.message : "Une erreur inconnue est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Adresse d'Expédition</CardTitle>
        <CardDescription>
          Cette adresse sera utilisée pour générer les étiquettes d'expédition lorsque vous vendez un article.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="name">Nom et Prénom</Label>
            <Input id="name" {...register("name")} placeholder="John Doe" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          
          <div className="md:col-span-2">
            <Label htmlFor="companyName">Société (Optionnel)</Label>
            <Input id="companyName" {...register("companyName")} placeholder="Ma Super Entreprise" />
            {errors.companyName && <p className="text-red-500 text-xs mt-1">{errors.companyName.message}</p>}
          </div>

          <div>
            <Label htmlFor="address">Adresse</Label>
            <Input id="address" {...register("address")} placeholder="123 Rue de la République" />
            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
          </div>

          <div>
            <Label htmlFor="houseNumber">Numéro</Label>
            <Input id="houseNumber" {...register("houseNumber")} placeholder="10" />
            {errors.houseNumber && <p className="text-red-500 text-xs mt-1">{errors.houseNumber.message}</p>}
          </div>
          
          <div>
            <Label htmlFor="city">Ville</Label>
            <Input id="city" {...register("city")} placeholder="Paris" />
            {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
          </div>

          <div>
            <Label htmlFor="postalCode">Code Postal</Label>
            <Input id="postalCode" {...register("postalCode")} placeholder="75001" />
            {errors.postalCode && <p className="text-red-500 text-xs mt-1">{errors.postalCode.message}</p>}
          </div>

          <div>
            <Label htmlFor="country">Code Pays</Label>
            <Input id="country" {...register("country")} placeholder="FR" />
            {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country.message}</p>}
          </div>

          <div>
            <Label htmlFor="telephone">Téléphone (Optionnel)</Label>
            <Input id="telephone" {...register("telephone")} placeholder="+33612345678" />
            {errors.telephone && <p className="text-red-500 text-xs mt-1">{errors.telephone.message}</p>}
          </div>

          <div className="md:col-span-2">
             <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Enregistrement..." : "Enregistrer l'adresse"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
