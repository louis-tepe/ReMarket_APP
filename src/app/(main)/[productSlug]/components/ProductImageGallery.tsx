import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ZoomIn } from 'lucide-react';

interface ProductImageGalleryProps {
    productTitle: string;
    standardImageUrls: string[];
}

/**
 * Displays a gallery of product images.
 * It features a main selected image and a list of thumbnails to switch between images.
 * Images can be zoomed in a dialog.
 * Handles cases with single, multiple, or no images.
 */
export default function ProductImageGallery({ productTitle, standardImageUrls }: ProductImageGalleryProps) {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Automatically select the first image if available, or clear if not.
    useEffect(() => {
        if (standardImageUrls.length > 0) {
            // If there's no selected image yet OR the current selected image is no longer in the list
            if (!selectedImage || !standardImageUrls.includes(selectedImage)) {
                setSelectedImage(standardImageUrls[0]);
            }
        } else {
            setSelectedImage(null); // No images, clear selection
        }
    }, [standardImageUrls, selectedImage]);


    return (
        <div className="sticky top-24 self-start">
            {selectedImage && (
                <Dialog>
                    <DialogTrigger asChild>
                        <div className="aspect-square w-full bg-muted rounded-lg overflow-hidden cursor-zoom-in relative group">
                            <Image
                                src={selectedImage}
                                alt={`Image principale de ${productTitle}`}
                                fill
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                className="object-contain group-hover:scale-105 transition-transform duration-300"
                                priority={true}
                            />
                            <div className="absolute bottom-2 right-2 bg-black/50 text-white p-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                <ZoomIn className="h-5 w-5" />
                            </div>
                        </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[80vh]">
                        <DialogHeader>
                            <DialogTitle>{productTitle}</DialogTitle>
                        </DialogHeader>
                        <div className="relative aspect-square w-full h-auto">
                            <Image
                                src={selectedImage}
                                alt={`Image agrandie de ${productTitle}`}
                                fill
                                sizes="(max-width: 1024px) 90vw, 800px"
                                className="object-contain"
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            )}
            {standardImageUrls.length > 1 && (
                <div className="mt-4 grid grid-cols-4 gap-2">
                    {standardImageUrls.map((url, index) => (
                        <button
                            key={index}
                            onClick={() => setSelectedImage(url)}
                            className={`aspect-square w-full bg-muted rounded overflow-hidden border-2 ${selectedImage === url ? 'border-primary' : 'border-transparent'} hover:border-primary/50 transition-all`}
                        >
                            <Image src={url} alt={`Miniature ${index + 1} de ${productTitle}`} width={100} height={100} className="object-contain h-full w-full" />
                        </button>
                    ))}
                </div>
            )}
            {standardImageUrls.length === 0 && !selectedImage && (
                <div className="aspect-square w-full bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">Aucune image disponible</p>
                </div>
            )}
        </div>
    );
} 