import { z } from "zod";
import { client } from "@/src/lib/supabase";
import { developmentReadings } from "@/src/features/development/repository";
import { access } from "@/src/features/records/api";
export const observationSchema = z.object({
  id: z.string(),
  reading_type: z.enum(["KM", "HOURS"]),
  value: z.coerce.number().nonnegative(),
  observed_at: z.string(),
  entered_at: z.string().optional(),
  source: z.string().optional(),
  status: z.string().optional(),
  is_reset: z.boolean().optional(),
});
export async function observations(
  user: string,
  vehicle: string,
  development: boolean,
  history = false,
  offset = 0,
  limit = 30,
  signal?: AbortSignal,
) {
  if (development)
    return observationSchema
      .array()
      .parse(await developmentReadings(vehicle, history))
      .slice(offset, offset + limit);
  const permissions = await access(vehicle, false);
  if (!permissions["meters.read"]) throw new Error("PERMISSION_DENIED");
  let request = client()
    .from("meter_readings")
    .select(
      "id,reading_type,value,observed_at,entered_at,source,status,is_reset",
    )
    .eq("vehicle_id", vehicle)
    .order("observed_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + Math.max(1, Math.min(limit, 100)) - 1);
  if (signal && "abortSignal" in request) request = request.abortSignal(signal);
  if (!history) request = request.eq("status", "ACTIVE");
  const { data, error } = await request;
  if (error) throw new Error(error.message);
  return observationSchema.array().parse(data);
}
