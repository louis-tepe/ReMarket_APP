import mongoose from 'mongoose';

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: { // Cache pour la connexion Mongoose
    conn: mongoose.Mongoose | null;
    promise: Promise<mongoose.Mongoose> | null;
  };
} 