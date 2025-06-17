import { z } from 'zod';

export const SignUpSchema = z.object({
  name: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères." }).optional().or(z.literal('')),
  email: z.string().email({ message: "Veuillez saisir une adresse email valide." }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères." }),
});

export type TSignUpSchema = z.infer<typeof SignUpSchema>; 