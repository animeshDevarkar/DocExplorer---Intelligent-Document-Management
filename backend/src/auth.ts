import "dotenv/config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3001",
  trustedOrigins: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL, "http://localhost:3000"] : ["http://localhost:3000"],
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
