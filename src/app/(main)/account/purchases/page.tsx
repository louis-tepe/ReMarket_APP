'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { IOrder } from '@/lib/mongodb/models/OrderModel';
import { IProductBase } from '@/lib/mongodb/models/SellerProduct';
import { IScrapedProduct } from '@/lib/mongodb/models/ScrapingProduct';
import { IUser } from '@/lib/mongodb/models/User';
import { Types } from 'mongoose';

type PopulatedOffer = Omit<IProductBase, 'productModel' | 'seller'> & {
  productModel: Pick<IScrapedProduct, 'product'>;
};

type PopulatedItem = {
  offer: PopulatedOffer;
  seller: Pick<IUser, 'name'>;
  quantity: number;
  priceAtPurchase: number;
};

type PopulatedOrder = Omit<IOrder, 'items' | 'buyer'> & {
  _id: Types.ObjectId;
  items: PopulatedItem[];
};

const PurchasesPage = () => {
  const { data: session } = useSession();
  const [purchases, setPurchases] = useState<PopulatedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPurchases = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/purchases?userId=${session.user.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch purchases.');
      }
      const data = await response.json();
      setPurchases(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  if (loading) {
    return (
      <div className='container mx-auto p-4'>
        <h1 className='text-3xl font-bold mb-6'>Mes Achats</h1>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {[...Array(3)].map((_, i) => (
            <Card key={i} className='animate-pulse'>
              <CardHeader>
                <div className='h-6 bg-gray-200 rounded w-3/4'></div>
                <div className='h-4 bg-gray-200 rounded w-1/2 mt-2'></div>
              </CardHeader>
              <CardContent>
                <div className='h-48 bg-gray-200 rounded-md mb-4'></div>
                <div className='h-4 bg-gray-200 rounded w-1/4'></div>
                <div className='h-4 bg-gray-200 rounded w-1/3 mt-2'></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='container mx-auto p-4'>
        <h1 className='text-3xl font-bold mb-6'>Mes Achats</h1>
        <p className='text-red-500'>Erreur: {error}</p>
      </div>
    );
  }

  return (
    <div className='container mx-auto p-4'>
      <h1 className='text-3xl font-bold mb-6'>Mes Achats</h1>
      {purchases.length > 0 ? (
        <div className='space-y-8'>
          {purchases.map((order) => (
            <Card key={order._id.toString()} className='overflow-hidden'>
               <CardHeader className='bg-gray-50 dark:bg-gray-800'>
                 <div className='flex justify-between items-center'>
                    <div>
                        <CardTitle className='text-lg'>Commande du {format(new Date(order.createdAt), "d MMMM yyyy 'à' HH:mm", { locale: fr })}</CardTitle>
                        <p className='text-sm text-gray-500'>Total : {(order.totalAmount).toFixed(2)}€ - Statut : <Badge>{order.status}</Badge></p>
                    </div>
                    <span className='text-xs text-gray-400'>ID: {order._id.toString()}</span>
                 </div>
              </CardHeader>
              <CardContent className='p-4'>
                <div className='space-y-4'>
                  {order.items.map((item, index) => {
                    const product = item.offer.productModel?.product;
                    if (!product) return <div key={index}>Information produit indisponible.</div>;
                    
                    return (
                        <div key={index} className='flex items-center gap-4'>
                            <Image
                            src={product.images?.[0] || '/images/placeholder-product.webp'}
                            alt={product.title}
                            width={80}
                            height={80}
                            className='rounded-md object-cover'
                            />
                            <div className='flex-grow'>
                                <p className='font-semibold'>{product.title}</p>
                                <p className='text-sm text-gray-600'>Vendu par : {item.seller?.name || 'Vendeur inconnu'}</p>
                                <p className='text-sm text-gray-500'>État : <Badge variant="outline">{item.offer.condition}</Badge></p>
                            </div>
                            <div className='text-right'>
                                <p className='font-semibold'>{(item.priceAtPurchase).toFixed(2)}€</p>
                                <p className='text-sm text-gray-500'>x{item.quantity}</p>
                            </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p>Vous n'avez encore effectué aucun achat.</p>
      )}
    </div>
  );
};

export default PurchasesPage;
