import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@docexplorer/database";
import { jwt } from "better-auth/plugins";

const prisma = new PrismaClient();

export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_FRONTEND_URL || 
           process.env.BETTER_AUTH_URL || 
           (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
           (process.env.NODE_ENV === 'production' ? "https://docexplorer.vercel.app" : "http://localhost:3000"),
  trustedOrigins: [
    process.env.NEXT_PUBLIC_FRONTEND_URL, 
    process.env.BETTER_AUTH_URL, 
    process.env.RENDER_EXTERNAL_URL, 
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    "http://localhost:3000", 
    "https://docexplorer.site",
    "https://docexplorer.vercel.app"
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
  plugins: [
    jwt({
        jwt: {
            expirationTime: "7d",
        }
    })
  ],
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
