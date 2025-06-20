import { z } from 'zod';

export const feedbackSchema = z.object({
  feedbackType: z.string().min(1, "Le type de feedback est requis."),
  message: z.string().min(10, "Le message doit contenir au moins 10 caractères."),
  user: z.string().optional(), // L'ID de l'utilisateur, sera ajouté côté serveur
});

export type TFeedback = z.infer<typeof feedbackSchema>; 