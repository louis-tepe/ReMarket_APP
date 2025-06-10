    // lib/dbConnect.ts
    import mongoose from 'mongoose';
    import '@/lib/mongodb/models/BrandModel';
    import '@/lib/mongodb/models/CategoryModel';
    import '@/lib/mongodb/models/User';

    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
      throw new Error(
        'Veuillez définir la variable d\'environnement MONGODB_URI dans .env.local'
      );
    }

    /** Cache global de connexion pour éviter de recréer des connexions. */
    let cached = global.mongooseCache;

    if (!cached) {
      cached = global.mongooseCache = { conn: null, promise: null };
    }

    async function dbConnect() {
      if (cached.conn) {
        return cached.conn;
      }

      if (!cached.promise) {
        const opts = {
          bufferCommands: false,
        };
        // Tente la connexion et stocke la promesse.
        cached.promise = mongoose.connect(MONGODB_URI!, opts).catch(err => {
          // Réinitialise la promesse en cas d'erreur pour permettre une nouvelle tentative.
          cached.promise = null;
          throw err;
        });
      }

      try {
        // Attend la résolution de la promesse de connexion.
        cached.conn = await cached.promise;
      } catch (e) {
        // Si la connexion échoue, la promesse a déjà été réinitialisée.
        // Il suffit de propager l'erreur.
        throw e;
      }

      return cached.conn;
    }

    export default dbConnect;