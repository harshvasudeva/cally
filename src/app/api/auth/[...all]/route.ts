import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Mounts better-auth on /api/auth/* (e.g. /api/auth/sign-in/email,
// /api/auth/get-session, /api/auth/sign-up/email, etc.)
export const { GET, POST } = toNextJsHandler(auth);
