import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig ,
  } from "next-auth";
  import NextAuthOptions from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcrypt";
import 'next-auth/jwt'
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

      // ...other properties
      role: string;

    };
  }

  interface User {
    // ...other properties
    role: string;
    firstname: string;
    lastname: string;

  }
}

declare module "next-auth/jwt" {
  interface JWT {
    // ...other properties
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
      // The name to display on the sign in form (e.g. "Sign in with...")
      name: "Credentials",
      // credentials is used to generate a form on the sign in page.
      // You can specify which fields should be submitted, by adding keys to the credentials object.
      // e.g. domain, username, password, 2FA token, etc.
      // You can pass any HTML attribute to the <input> tag through the object.
      credentials: {
        email: {
          label: "email",
          type: "text",
          placeholder: "jsmith@gmail.com",
        },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // check to see if email or password is there
        if (!credentials?.email || !credentials?.password) {
          throw new TRPCError({
            message: "Please provide a email and password",
            code: "BAD_REQUEST",
          });
        }

        // check to see if user exists
         const user = await db.user.findUnique({
          where: {
            email: credentials?.email as string,
          },
        });

        // if no user was found
        if (!user) {
          throw new TRPCError({ message: "No user found", code: "NOT_FOUND" });
        }

        // check to see if password matches
        const passwordsMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        // if password does not match
        if (!passwordsMatch) {
          throw new TRPCError({
            message: "Incorrect password",
            code: "FORBIDDEN",
          });
        }

        return {
          firstname: user.firstName,
          lastname: user.lastName,
          role:user.role,
          email:user.email,
          id:user.email,
        };
      },
    }),
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    session({ session, token }) {
      // eslint-enable
      if (token) {
        session.user.id = token.id;
        session.user.firstname = token.firstname;
        session.user.lastname = token.lastname;
        session.user.role = token.role;
        session.user.image = token.picture;
      }

      return session;
    },
    async jwt({ token, user }) {
      // eslint-disable
      const dbUser = await db.user.findUnique({
        where: {
          /*eslint-disable-next-line*/
          email: token.email!,
        },
      });
      // eslint-enable
      if (!dbUser) {
       return token
      }

      return token;
    },
  },
  
} satisfies NextAuthConfig;
