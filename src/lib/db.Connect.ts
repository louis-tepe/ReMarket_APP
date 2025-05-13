    // lib/dbConnect.ts
    import mongoose from 'mongoose';

    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
      throw new Error(
        'Veuillez définir la variable d\'environnement MONGODB_URI dans .env.local'
      );
    }

    /**
     * Cache global de connexion.
     * Évite de recréer des connexions à chaque appel de fonction Next.js en mode développement.
     * En production, les fonctions serverless peuvent s'exécuter dans des contextes différents.
     */
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
          bufferCommands: false, // Désactive la mise en mémoire tampon des commandes si la connexion est perdue
        };

        cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongooseInstance) => {
          return mongooseInstance;
        });
      }

      try {
        cached.conn = await cached.promise;
      } catch (e) {
        cached.promise = null;
        throw e;
      }

      return cached.conn;
    }

    export default dbConnect;