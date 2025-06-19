'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { IShippingAddress } from '@/lib/mongodb/models/User';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import Link from 'next/link';

interface AddressSelectorProps {
  onSelectAddress: (addressId: string | null) => void;
}

async function fetchUserAddresses(userId: string): Promise<IShippingAddress[]> {
  const response = await fetch(`/api/user/address?userId=${userId}`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to fetch addresses.');
  }
  return response.json();
}

const AddressSelector = ({ onSelectAddress }: AddressSelectorProps) => {
  const { data: session } = useSession();
  const [addresses, setAddresses] = useState<IShippingAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAddresses = async () => {
      if (session?.user?.id) {
        setIsLoading(true);
        try {
          const userAddresses = await fetchUserAddresses(session.user.id);
          setAddresses(userAddresses);
          if (userAddresses.length > 0) {
            // Auto-select the first address
            const firstAddressId = userAddresses[0]._id.toString();
            setSelectedAddress(firstAddressId);
            onSelectAddress(firstAddressId);
          } else {
            onSelectAddress(null);
          }
        } catch (error) {
          toast.error("Impossible de charger les adresses.");
          console.error(error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadAddresses();
  }, [session, onSelectAddress]);

  const handleSelect = (addressId: string) => {
    setSelectedAddress(addressId);
    onSelectAddress(addressId);
  };

  if (isLoading) {
    return (
        <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
        </div>
    );
  }

  if (addresses.length === 0) {
    return (
        <div className="text-sm text-center p-4 border rounded-md bg-yellow-50 border-yellow-200">
            <p className="text-yellow-800">Aucune adresse de livraison trouvée.</p>
            <p>
                <Link href="/account/settings" className="font-semibold text-primary hover:underline">
                    Veuillez en ajouter une dans votre profil
                </Link>
                {' '}pour continuer.
            </p>
        </div>
    );
  }

  return (
    <RadioGroup value={selectedAddress || ''} onValueChange={handleSelect}>
      <div className="space-y-2">
        {addresses.map((address) => (
          <Label key={address._id.toString()} htmlFor={address._id.toString()} className="block">
            <Card className="hover:border-primary cursor-pointer">
              <CardContent className="flex items-center space-x-4 p-4">
                <RadioGroupItem value={address._id.toString()} id={address._id.toString()} />
                <div className="text-sm">
                  <p className="font-semibold">{address.name}</p>
                  <p>{address.address}, {address.houseNumber}</p>
                  <p>{address.postalCode} {address.city}, {address.country}</p>
                </div>
              </CardContent>
            </Card>
          </Label>
        ))}
      </div>
    </RadioGroup>
  );
};

export default AddressSelector; 