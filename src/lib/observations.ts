import { z } from "zod";
export const meterObservationSchema = z.object({
  id: z.uuid(),
  reading_type: z.enum(["KM", "HOURS"]),
  value: z.coerce.number().nonnegative(),
  observed_at: z.string(),
});
