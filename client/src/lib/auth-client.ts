"use client";

import { createAuthClient } from "better-auth/react";
import {
  organizationClient,
  twoFactorClient,
} from "better-auth/client/plugins";
import { getBackendUrl } from "./backend-url";

export const authClient = createAuthClient({
  baseURL: getBackendUrl(),
  plugins: [organizationClient(), twoFactorClient()],
});

export const { signIn, signOut, signUp, useSession, getSession } = authClient;
