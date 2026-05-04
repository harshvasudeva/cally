import { z } from "zod";

export const CreateBookingRequest = z.object({
  appointmentTypeId: z.string(),
  start: z.string().datetime(),
  end: z.string().datetime(),
  guestName: z.string().min(1).max(120),
  guestEmail: z.string().email(),
  guestPhone: z.string().max(50).optional(),
  guestNotes: z.string().max(2000).optional(),
});

export type CreateBookingRequest = z.infer<typeof CreateBookingRequest>;

