import { z } from "zod";

export const AvailabilitySlot = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  isActive: z.boolean().default(true),
});

export const ReplaceAvailabilityRequest = z.object({
  slots: z.array(AvailabilitySlot).max(100),
});

export type AvailabilitySlot = z.infer<typeof AvailabilitySlot>;
export type ReplaceAvailabilityRequest = z.infer<typeof ReplaceAvailabilityRequest>;

