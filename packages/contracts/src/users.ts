import { z } from "zod";

export const UpdateUserProfileRequest = z.object({
  name: z.string().min(1).max(120).optional(),
  slug: z.string().min(3).max(80).regex(/^[a-z0-9-]+$/).optional(),
  timezone: z.string().min(1).max(80).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  country: z.string().max(80).nullable().optional(),
  notificationPrefs: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateUserProfileRequest = z.infer<typeof UpdateUserProfileRequest>;

