"use client";

import { createAuthClient } from "better-auth/react";
import {
  organizationClient,
  twoFactorClient,
} from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL:
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"),
  plugins: [organizationClient(), twoFactorClient()],
});

export const { signIn, signOut, signUp, useSession, getSession } = authClient;
