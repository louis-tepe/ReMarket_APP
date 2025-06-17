import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Determine the environment and load the corresponding .env file
if (process.env.NODE_ENV === 'development') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.development') });
} else if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.production') });
}

const envSchema = z.object({
  MONGODB_URI: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  SENDCLOUD_PUBLIC_KEY: z.string().min(1),
  SENDCLOUD_SECRET_KEY: z.string().min(1),
});

/**
 * Loads and validates environment variables.
 * Using Zod for runtime validation to ensure all required variables are set.
 * @returns {z.infer<typeof envSchema>} The validated environment variables.
 * @throws {Error} If any environment variable is missing or invalid.
 */
export function loadEnv() {
  const env = {
    MONGODB_URI: process.env.MONGODB_URI,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    SENDCLOUD_PUBLIC_KEY: process.env.SENDCLOUD_PUBLIC_KEY,
    SENDCLOUD_SECRET_KEY: process.env.SENDCLOUD_SECRET_KEY,
  };

  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingKeys = error.issues
        .map(issue => issue.path.join('.'))
        .join(', ');
      throw new Error(`Missing or invalid environment variables: ${missingKeys}`);
    }
    throw error;
  }
}