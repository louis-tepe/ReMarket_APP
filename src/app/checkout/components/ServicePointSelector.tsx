'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface ServicePoint {
  id: number;
  name: string;
  street: string;
  house_number: string;
  postal_code: string;
  city: string;
}

interface ServicePointSelectorProps {
  onSelectPoint: (point: ServicePoint | null) => void;
}

export default function ServicePointSelector({ onSelectPoint }: ServicePointSelectorProps) {
  const [postalCode, setPostalCode] = useState('');
  const [country] = useState('FR'); // Default to France
  const [servicePoints, setServicePoints] = useState<ServicePoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!postalCode) {
      toast.error('Veuillez entrer un code postal.');
      return;
    }
    setIsLoading(true);
    setServicePoints([]);
    onSelectPoint(null);
    try {
      const response = await fetch(`/api/shipping/service-points?country=${country}&postalCode=${postalCode}`);
      if (!response.ok) throw new Error('Failed to fetch service points.');
      const data: ServicePoint[] = await response.json();
      if(data.length === 0) {
        toast.info("Aucun point relais trouvé pour ce code postal.");
      }
      setServicePoints(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (pointId: string) => {
    const point = servicePoints.find(p => p.id === parseInt(pointId, 10)) || null;
    onSelectPoint(point);
  };

  return (
    <div>
      <div className="flex w-full max-w-sm items-center space-x-2">
        <Input
          type="text"
          placeholder="Votre code postal..."
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
        />
        <Button onClick={handleSearch} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Rechercher
        </Button>
      </div>

      {servicePoints.length > 0 && (
        <RadioGroup onValueChange={handleSelect} className="mt-4 space-y-2">
          {servicePoints.map((point) => (
            <Card key={point.id}>
              <CardContent className="p-4 flex items-center">
                <RadioGroupItem value={String(point.id)} id={String(point.id)} />
                <Label htmlFor={String(point.id)} className="ml-4 font-normal">
                  <p className="font-semibold">{point.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {point.street} {point.house_number}, {point.postal_code} {point.city}
                  </p>
                </Label>
              </CardContent>
            </Card>
          ))}
        </RadioGroup>
      )}
    </div>
  );
}
