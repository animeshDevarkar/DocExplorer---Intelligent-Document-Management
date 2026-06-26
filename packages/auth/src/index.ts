import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@docexplorer/database";

const prisma = new PrismaClient();

export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_FRONTEND_URL || process.env.BETTER_AUTH_URL || (process.env.NODE_ENV === 'production' ? "https://docexplorer.site" : "http://localhost:3000"),
  trustedOrigins: [
    process.env.NEXT_PUBLIC_FRONTEND_URL, 
    process.env.BETTER_AUTH_URL, 
    process.env.RENDER_EXTERNAL_URL, 
    "http://localhost:3000", 
    "https://docexplorer.site"
  ].filter(Boolean) as string[],
  advanced: {
    crossSubDomainCookies: {
      enabled: true
    },
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      maxAge: 604800
    }
  },
  session: {
    strategy: "jwt",
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  user: {
    fields: {
      image: "avatarUrl",
      emailVerified: "emailVerified"
    }
  },
  emailAndPassword: {
    enabled: true,
  }
});
