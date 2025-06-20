'use client';

import { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { IShippingAddress } from '@/lib/mongodb/models/User';
import { PlusCircle, Edit } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const addressSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(2, "Le nom complet est requis"),
  companyName: z.string().optional(),
  address: z.string().min(5, "L'adresse est requise"),
  houseNumber: z.string().min(1, "Le numéro de rue est requis"),
  city: z.string().min(2, "La ville est requise"),
  postalCode: z.string().min(4, "Le code postal est requis"),
  country: z.string().length(2, "Le code pays doit faire 2 caractères (ex: FR)"),
  telephone: z.string().min(10, "Le numéro de téléphone est requis (au moins 10 chiffres)"),
});

type ShippingAddressFormData = z.infer<typeof addressSchema>;

function AddressForm({ currentAddress, onSave, onCancel }: {
  currentAddress: Partial<ShippingAddressFormData>;
  onSave: (data: ShippingAddressFormData) => Promise<void>;
  onCancel: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<ShippingAddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: currentAddress,
  });

  const onSubmit: SubmitHandler<ShippingAddressFormData> = async (data) => {
    setIsLoading(true);
    await onSave(data);
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 border rounded-lg">
      <div className="md:col-span-2">
        <Label htmlFor="name">Nom et Prénom</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
      </div>
      
      <div className="md:col-span-2">
        <Label htmlFor="companyName">Société (Optionnel)</Label>
        <Input id="companyName" {...register("companyName")} />
        {errors.companyName && <p className="text-red-500 text-xs mt-1">{errors.companyName.message}</p>}
      </div>

      <div>
        <Label htmlFor="address">Adresse</Label>
        <Input id="address" {...register("address")} />
        {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
      </div>

      <div>
        <Label htmlFor="houseNumber">Numéro</Label>
        <Input id="houseNumber" {...register("houseNumber")} />
        {errors.houseNumber && <p className="text-red-500 text-xs mt-1">{errors.houseNumber.message}</p>}
      </div>
      
      <div>
        <Label htmlFor="city">Ville</Label>
        <Input id="city" {...register("city")} />
        {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
      </div>

      <div>
        <Label htmlFor="postalCode">Code Postal</Label>
        <Input id="postalCode" {...register("postalCode")} />
        {errors.postalCode && <p className="text-red-500 text-xs mt-1">{errors.postalCode.message}</p>}
      </div>

      <div>
        <Label htmlFor="country">Code Pays</Label>
        <Input id="country" {...register("country")} />
        {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country.message}</p>}
      </div>

      <div>
        <Label htmlFor="telephone">Téléphone</Label>
        <Input id="telephone" {...register("telephone")} />
        {errors.telephone && <p className="text-red-500 text-xs mt-1">{errors.telephone.message}</p>}
      </div>
      
       <div className="md:col-span-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Annuler</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}


export default function ShippingAddressManager() {
  const { data: session, update } = useSession();
  const [addresses, setAddresses] = useState<IShippingAddress[]>(session?.user?.shippingAddresses || []);
  const [editingAddress, setEditingAddress] = useState<IShippingAddress | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isLoading, setIsLoading] = useState(!session?.user?.shippingAddresses);

  useEffect(() => {
    async function fetchAddresses() {
        if (session?.user?.id && !session.user.shippingAddresses) {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/user/address?userId=${session.user.id}`);
                if (!res.ok) throw new Error("Failed to fetch addresses");
                const data = await res.json();
                setAddresses(data);
                await update({ shippingAddresses: data });
            } catch {
                toast.error("Impossible de charger les adresses.");
            } finally {
                setIsLoading(false);
            }
        } else if (session?.user?.shippingAddresses) {
            setAddresses(session.user.shippingAddresses);
            setIsLoading(false);
        }
    }
    fetchAddresses();
  }, [session, update]);

  const handleSave = async (data: ShippingAddressFormData) => {
    toast.info("Mise à jour de l'adresse en cours...");
    try {
      const response = await fetch('/api/user/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de la mise à jour.");
      }
      
      const result = await response.json();
      setAddresses(result.addresses);
      await update({ shippingAddresses: result.addresses }); // Met à jour la session
      toast.success("Adresse enregistrée !");
      setEditingAddress(null);
      setIsAddingNew(false);

    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur inconnue est survenue.");
    }
  };

  const handleAddNew = () => {
    setEditingAddress(null);
    setIsAddingNew(true);
  };
  
  const handleEdit = (address: IShippingAddress) => {
    setIsAddingNew(false);
    setEditingAddress(address);
  };
  
  const handleCancel = () => {
    setEditingAddress(null);
    setIsAddingNew(false);
  };
  
  const preparedCurrentAddress = editingAddress 
    ? { ...editingAddress, _id: editingAddress._id.toString() } 
    : { country: 'FR' };

  if (isLoading) {
      return (
          <Card className="mt-6">
              <CardHeader>
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-2/3 mt-2" />
              </CardHeader>
              <CardContent className='space-y-4'>
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
              </CardContent>
          </Card>
      )
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Adresses d'Expédition</CardTitle>
        <CardDescription>
          Gérez vos adresses pour les livraisons et l'expédition de vos ventes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          {addresses.map((address) => (
            <div key={address._id.toString()} className="flex justify-between items-center p-4 border rounded-lg">
              <div>
                <p className='font-semibold'>{address.name}</p>
                <p className='text-sm text-muted-foreground'>{address.address}, {address.postalCode} {address.city}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleEdit(address)}>
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-4">
          {!isAddingNew && !editingAddress && (
             <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une adresse
             </Button>
          )}

          {(isAddingNew || editingAddress) && (
            <AddressForm
              currentAddress={preparedCurrentAddress}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
