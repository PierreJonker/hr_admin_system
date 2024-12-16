import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import NextAuthOptions from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcrypt";
import "next-auth/jwt";
import { db } from "~/server/db";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: User & {
      id: string;
      firstname: string;
      lastname: string;
      role: string;
    };
  }

  interface User {
    role: string;
    firstname: string;
    lastname: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    firstname: string;
    lastname: string;
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    CredentialsProvider({
      // The name to display on the sign-in form (e.g. "Sign in with...")
      name: "Credentials",
      credentials: {
        email: {
          label: "email",
          type: "text",
          placeholder: "jsmith@gmail.com",
        },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Check to see if email or password is there
        if (!credentials?.email || !credentials?.password) {
          throw new TRPCError({
            message: "Please provide an email and password",
            code: "BAD_REQUEST",
          });
        }

        // Check to see if user exists
        const user = await db.user.findUnique({
          where: {
            email: credentials?.email as string,
          },
        });

        // If no user was found
        if (!user) {
          throw new TRPCError({ message: "No user found", code: "NOT_FOUND" });
        }

        // Check to see if password matches
        const passwordsMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        // If password does not match
        if (!passwordsMatch) {
          throw new TRPCError({
            message: "Incorrect password",
            code: "FORBIDDEN",
          });
        }

        // Return user data with `id` as a string
        return {
          firstname: user.firstName,
          lastname: user.lastName,
          role: user.role,
          email: user.email,
          id: String(user.id), // Ensure `id` is converted to a string
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.firstname = token.firstname;
        session.user.lastname = token.lastname;
        session.user.role = token.role;
        session.user.image = token.picture;
      }
      return session;
    },
    async jwt({ token }) {
      const dbUser = await db.user.findUnique({
        where: {
          email: token.email!,
        },
      });

      if (dbUser) {
        token.id = String(dbUser.id); // Ensure id is a string
        token.firstname = dbUser.firstName;
        token.lastname = dbUser.lastName;
        token.role = dbUser.role;
      }

      return token;
    },
  },
} satisfies NextAuthConfig;
