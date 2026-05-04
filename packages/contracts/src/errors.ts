import { z } from "zod";

export const ApiErrorResponse = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).default({}),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponse>;

