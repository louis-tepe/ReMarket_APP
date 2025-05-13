import mongoose from 'mongoose';

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: { // Renommé pour plus de clarté et éviter les conflits
    conn: mongoose.Mongoose | null; // Type de l'instance mongoose
    promise: Promise<mongoose.Mongoose> | null;
  };
} 