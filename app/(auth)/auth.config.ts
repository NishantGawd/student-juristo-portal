import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
    // Fixed: Routed new OAuth accounts directly into the CLAT cockpit workspace layout
    newUser: "/clat-exam?tab=dashboard",
  },
  providers: [
    // added later in auth.ts since it requires bcrypt which is only compatible with Node.js
  ],
  callbacks: {},
} satisfies NextAuthConfig;