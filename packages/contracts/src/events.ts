import { z } from "zod";

export const CreateEventRequest = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4000).nullable().optional(),
  start: z.string().datetime(),
  end: z.string().datetime(),
  allDay: z.boolean().default(false),
  color: z.string().max(32).optional(),
  category: z.string().max(80).nullable().optional(),
  location: z.string().max(300).nullable().optional(),
  recurrence: z.string().max(1000).nullable().optional(),
});

export const UpdateEventRequest = CreateEventRequest.partial();

export type CreateEventRequest = z.infer<typeof CreateEventRequest>;
export type UpdateEventRequest = z.infer<typeof UpdateEventRequest>;

