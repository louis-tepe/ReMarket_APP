import { z } from 'zod';

export const OfferCreationSchema = z.object({
  productModelId: z.coerce.number().positive({ message: "L'ID du modèle de produit doit être un nombre positif." }),
  images: z.array(z.string()).min(1, { message: "Au moins une image est requise." }),
  price: z.number().positive({ message: "Le prix doit être un nombre positif." }),
  condition: z.enum(['new', 'like-new', 'good', 'fair', 'poor'], {
    errorMap: () => ({ message: "La condition n'est pas valide." })
  }),
  description: z.string().optional(),
  kind: z.string().nonempty({ message: "Le type de produit ('kind') est requis." }),
  currency: z.string().optional().default('EUR'),
  stockQuantity: z.number().int().positive().optional().default(1),
}).passthrough(); // Autorise les champs non définis (champs dynamiques)

export type TNewOfferSchema = z.infer<typeof OfferCreationSchema>; 