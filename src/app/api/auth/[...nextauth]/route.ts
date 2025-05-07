import NextAuth, { NextAuthOptions } from "next-auth";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongoClient"; // Adapter pour le chemin
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import User from "@/models/User"; // Assurez-vous que ce chemin est correct
import dbConnect from "@/lib/db.Connect"; // Votre utilitaire de connexion Mongoose
// import GithubProvider from "next-auth/providers/github" // Example provider
// Importer votre modèle User de Mongoose et bcrypt pour le hachage de mot de passe
// import User from "@/models/User"; // Adaptez le chemin vers votre modèle User
// import bcrypt from "bcryptjs";

console.log("Initialisation de [..nextauth]/route.ts..."); // Log de débogage

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "exemple@email.com" },
        password: { label: "Mot de passe", type: "password" }
      },
      async authorize(credentials, req) {
        console.log("Début de la fonction authorize", credentials); // Log de débogage
        if (!credentials?.email || !credentials?.password) {
          console.error("Email ou mot de passe manquant");
          throw new Error("Veuillez fournir un email et un mot de passe.");
        }

        try {
          await dbConnect();
          console.log("Connexion DB établie dans authorize");
        } catch (error) {
          console.error("Erreur de connexion DB dans authorize:", error);
          throw new Error("Erreur de serveur lors de la connexion à la base de données.");
        }

        const user = await User.findOne({ email: credentials.email }).select("+password");
        console.log("Utilisateur trouvé:", user ? user.email : "aucun"); // Log de débogage


        if (!user) {
          // Aucun utilisateur trouvé avec cet email
          // Pour des raisons de sécurité, ne pas spécifier si c\'est l\'email ou le mot de passe qui est incorrect
          console.error("Utilisateur non trouvé pour email:", credentials.email);
          throw new Error("Identifiants invalides.");
        }

        // Le modèle User doit avoir un champ password
        if (!user.password) {
            console.error("L'utilisateur n'a pas de mot de passe configuré:", user.email);
            throw new Error("L\\\'utilisateur n\\\'a pas de mot de passe configuré.");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        console.log("Résultat de la comparaison de mot de passe pour", user.email, ":", isValid); // Log de débogage


        if (!isValid) {
          // Mot de passe incorrect
          console.error("Mot de passe invalide pour:", user.email);
          throw new Error("Identifiants invalides.");
        }

        // Retourne l\'objet utilisateur si les identifiants sont valides
        // Assurez-vous que l\'objet retourné est sérialisable et ne contient que les infos nécessaires
        const userData = {
          id: user._id.toString(),
          email: user.email,
          name: user.name, // Assurez-vous que votre modèle User a un champ name ou adaptez
          // role: user.role, // Exemple si vous avez un champ role
        };
        console.log("Autorisation réussie pour:", user.email, "Données utilisateur:", userData);
        return userData;
      }
    }),
    // Example for GitHub:
    // GithubProvider({
    //   clientId: process.env.GITHUB_ID as string,
    //   clientSecret: process.env.GITHUB_SECRET as string,
    // }),
  ],
  session: {
    strategy: "jwt", // JWT est souvent préféré pour la flexibilité, mais \"database\" est aussi une option avec un adaptateur
  },
  // secret: process.env.NEXTAUTH_SECRET, // Déjà géré par la variable d\'environnement NEXTAUTH_SECRET
  pages: {
    signIn: "/auth/connexion", // Spécifiez votre page de connexion personnalisée
    // error: \'/auth/error\', // Page pour afficher les erreurs d\'authentification (ex: échec de connexion)
    // signOut: \'/auth/deconnexion\',\n    // newUser: \'/auth/inscription\' // (Optionnel) Redirige les nouveaux utilisateurs ici après leur première connexion OAuth
  },
  callbacks: {
    async jwt({ token, user, account }) {
      console.log("Callback JWT appelé. Token:", token, "User:", user, "Account:", account); // Log de débogage
      // `user` est passé ici lors de la connexion (après authorize ou OAuth)
      if (account && user) {
        // Pour une connexion Credentials, `user` est l\'objet retourné par `authorize`
        // Pour OAuth, `account` et `profile` sont disponibles
        return {
          ...token,
          id: user.id,
          // name: user.name, // user.name est déjà dans le token par défaut via la session standard
          // accessToken: account.access_token, // Exemple pour OAuth
          // refreshToken: account.refresh_token, // Exemple pour OAuth
          // role: (user as any).role, // Ajoutez d\'autres propriétés si nécessaire
        };
      }
      return token;
    },
    async session({ session, token }) {
      console.log("Callback Session appelé. Session:", session, "Token:", token); // Log de débogage
      // `token` contient les données du JWT (enrichi par le callback jwt)
      // `session.user` est l\'objet utilisateur qui sera exposé au client
      if (token && session.user) {
        (session.user as any).id = token.id as string;
        // (session.user as any).name = token.name as string; // Déjà géré par NextAuth si le token a `name`
        // (session.user as any).role = token.role as string; // Exemple
      }
      return session;
    },
  },
  // Vous pourriez avoir besoin de logger les erreurs plus en détail en développement
  debug: process.env.NODE_ENV === 'development', // Activer le mode debug de NextAuth
};

console.log("authOptions configurées:", authOptions.providers.length, "fournisseur(s)"); // Log de débogage

const handler = NextAuth(authOptions);
console.log("Handler NextAuth créé."); // Log de débogage

export { handler as GET, handler as POST }; 