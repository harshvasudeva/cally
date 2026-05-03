import { NextResponse } from "next/server";

// Returns the social providers that have credentials configured in env.
// Shape mirrors NextAuth's getProviders() response so the existing UI works.
export async function GET() {
  const list: Array<[string, string, string, string]> = [
    ["google", "Google", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    ["github", "GitHub", "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
    ["discord", "Discord", "DISCORD_CLIENT_ID", "DISCORD_CLIENT_SECRET"],
    ["microsoft", "Microsoft", "MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"],
    ["apple", "Apple", "APPLE_CLIENT_ID", "APPLE_CLIENT_SECRET"],
    ["facebook", "Facebook", "FACEBOOK_CLIENT_ID", "FACEBOOK_CLIENT_SECRET"],
    ["twitter", "X (Twitter)", "TWITTER_CLIENT_ID", "TWITTER_CLIENT_SECRET"],
    ["linkedin", "LinkedIn", "LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
  ];

  const result: Record<string, { id: string; name: string }> = {};
  result["credentials"] = { id: "credentials", name: "Email & Password" };
  for (const [id, name, idEnv, secretEnv] of list) {
    if (process.env[idEnv] && process.env[secretEnv]) {
      result[id] = { id, name };
    }
  }
  return NextResponse.json(result);
}
