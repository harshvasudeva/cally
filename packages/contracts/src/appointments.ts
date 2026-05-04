import { z } from "zod";

export const UpdateAppointmentRequest = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]).optional(),
  negotiationNote: z.string().max(2000).nullable().optional(),
});

export type UpdateAppointmentRequest = z.infer<typeof UpdateAppointmentRequest>;

