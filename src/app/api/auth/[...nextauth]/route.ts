import NextAuth from "next-auth";
import { authOptions } from "@/lib/authOptions";
// import { NextAuthOptions } from "next-auth";
// import { MongoDBAdapter } from "@auth/mongodb-adapter";
// import clientPromise from "@/lib/mongoClient"; // Adapter pour le chemin
// import CredentialsProvider from "next-auth/providers/credentials";
// import bcrypt from "bcryptjs";
// import User from "@/models/User"; // Assurez-vous que ce chemin est correct
// import dbConnect from "@/lib/db.Connect"; // Votre utilitaire de connexion Mongoose
// import GithubProvider from "next-auth/providers/github" // Example provider
// Importer votre modèle User de Mongoose et bcrypt pour le hachage de mot de passe
// import User from "@/models/User"; // Adaptez le chemin vers votre modèle User
// import bcrypt from "bcryptjs";

console.log("Initialisation de [..nextauth]/route.ts..."); // Log de débogage

const handler = NextAuth(authOptions);
console.log("Handler NextAuth créé."); // Log de débogage

export { handler as GET, handler as POST }; 