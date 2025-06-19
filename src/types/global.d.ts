import mongoose from 'mongoose';

// This ensures that the mongoose cache is stored on the global object
// in development, avoiding issues with HMR (Hot Module Replacement).
declare global {
  var mongooseCache: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
} 