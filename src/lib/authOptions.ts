import type { NextAuthOptions } from "next-auth";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongoClient";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import User, { IUser } from "@/models/User";
import dbConnect from "@/lib/db.Connect";

// Type pour éviter `any` dans le callback session
type SessionUserWithId = { id?: string; email?: string | null; name?: string | null; image?: string | null };

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "exemple@email.com" },
        password: { label: "Mot de passe", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Veuillez fournir un email et un mot de passe.");
        }
        try {
          await dbConnect();
        } catch {
          throw new Error("Erreur de serveur lors de la connexion à la base de données.");
        }
        const user: IUser | null = await User.findOne({ email: credentials.email }).select("+password");
        if (!user || !user.password) {
          throw new Error("Identifiants invalides.");
        }
        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error("Identifiants invalides.");
        }
        return { id: user._id.toString(), email: user.email, name: user.name };
      }
    })
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/auth/connexion" },
  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user) {
        return { ...token, id: user.id };
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as SessionUserWithId).id = token.id as string;
      }
      return session;
    }
  },
  debug: process.env.NODE_ENV === "development"
}; 