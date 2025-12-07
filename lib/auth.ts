/**
 * NextAuth.js configuration
 * Handles authentication with Google, GitHub, and Email providers
 */

import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import EmailProvider from 'next-auth/providers/email';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PostgresAdapter } from './postgres-adapter';
import { getUserByEmail, updateUserStripeCustomerId } from './db';
import { getOrCreateCustomer } from './stripe';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  adapter: PostgresAdapter(),

  providers: [
    // Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),

    // GitHub OAuth
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),

    // Email Magic Link
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),

    // Email/Password (optional - for users who prefer passwords)
    CredentialsProvider({
      id: 'credentials',
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await getUserByEmail(credentials.email);

        if (!user?.password_hash) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password_hash);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: '/sign-in',
    signOut: '/',
    error: '/sign-in',
    newUser: '/dashboard',
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in - add user data to token
      if (user) {
        token.id = user.id;

        // Fetch subscription data from database
        const dbUser = await getUserByEmail(user.email!);
        token.subscriptionTier = dbUser?.subscription_tier || 'free';
        token.subscriptionStatus = dbUser?.subscription_status || 'inactive';
      }

      // Handle session updates (e.g., after subscription change)
      if (trigger === 'update' && session) {
        token.subscriptionTier = session.subscriptionTier ?? token.subscriptionTier;
        token.subscriptionStatus = session.subscriptionStatus ?? token.subscriptionStatus;
      }

      return token;
    },

    async session({ session, token }) {
      // Add custom data to session
      session.user.id = token.id as string;
      session.user.subscriptionTier = (token.subscriptionTier as string) || 'free';
      session.user.subscriptionStatus = (token.subscriptionStatus as string) || 'inactive';

      return session;
    },

    async signIn() {
      // Allow sign in
      return true;
    },
  },

  events: {
    async createUser({ user }) {
      // Create Stripe customer when user signs up
      try {
        if (user.email) {
          const customer = await getOrCreateCustomer({
            email: user.email,
            name: user.name || undefined,
            userId: user.id!,
          });

          // Store Stripe customer ID in database
          await updateUserStripeCustomerId(user.id!, customer.id);

          console.log(`[Auth] Created Stripe customer ${customer.id} for user ${user.id}`);
        }
      } catch (error) {
        console.error('[Auth] Error creating Stripe customer:', error);
        // Don't fail sign up if Stripe fails
      }
    },
  },

  debug: process.env.NODE_ENV === 'development',
};

// Type augmentation for NextAuth
declare module 'next-auth' {
  interface User {
    subscriptionTier?: string;
    subscriptionStatus?: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      subscriptionTier: string;
      subscriptionStatus: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    subscriptionTier: string;
    subscriptionStatus: string;
  }
}
