import NextAuth, { DefaultSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prismaDB from "./lib/prisma";
import { User, UserRole } from "@prisma/client";
import authConfig from "./auth.config";

const adminEmails = [
  "rg5353070@gmail.com",
  "destiny@darkalphacapital.com",
  "daigbe@darkalphacapital.com",
  "daigbe@gmail.com",
  "ayan@darkalphacapital.com",
];

declare module "next-auth" {
  interface Session {
    user: {
      role: UserRole;
      isOAuth: boolean;
    } & DefaultSession["user"];
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prismaDB),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  events: {
    //this event is only triggered when we use an OAuth provider
    async linkAccount({ user }) {
      await prismaDB.user.update({
        where: {
          id: user.id,
        },
        data: {
          emailVerified: new Date(),
        },
      });
    },
  },

  callbacks: {
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }

      if (token.role && session.user) {
        session.user.role = token.role as UserRole;
      }

      if (token.image && session.user) {
        session.user.image = token.image as string;
      }

      return session;
    },
    async jwt({ token, user, account }) {
      console.log("in jwt callback", { token, user, account });

      if (!token.sub) return token;

      if (token) {
        const userRole = determineRole(token.email!);
        token.role = userRole;
      }

      const existingUser = await prismaDB.user.findUnique({
        where: {
          id: token.sub,
        },
      });

      if (!existingUser) return token;

      token.image = existingUser.image;
      token.id = existingUser.id;

      return token;
    },
  },
  ...authConfig,
});

// Example implementation of determineRole function
function determineRole(userEmail: string) {
  // Access user properties like email, name, etc.
  if (adminEmails.includes(userEmail)) {
    return UserRole.ADMIN;
  } else {
    return UserRole.USER;
  }
}
