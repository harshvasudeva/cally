import { z } from "zod";

export const CalendarProvider = z.enum(["google", "microsoft", "apple_caldav", "generic_caldav"]);

export const CalendarAccountDTO = z.object({
  id: z.string(),
  provider: CalendarProvider,
  email: z.string().email(),
  displayName: z.string().nullable().optional(),
  syncStatus: z.string(),
  lastSyncAt: z.string().datetime().nullable().optional(),
});

export type CalendarProvider = z.infer<typeof CalendarProvider>;
export type CalendarAccountDTO = z.infer<typeof CalendarAccountDTO>;

