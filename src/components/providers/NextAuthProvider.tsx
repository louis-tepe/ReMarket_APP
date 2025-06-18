'use client';

import { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import React from 'react';

type NextAuthProviderProps = {
    children: React.ReactNode;
    session?: Session | null;
};

/**
 * Provides the NextAuth session context to the application.
 * This is a Client Component that wraps its children with SessionProvider.
 */
export default function NextAuthProvider({ children, session }: NextAuthProviderProps) {
    return <SessionProvider session={session}>{children}</SessionProvider>;
} 