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
) {
  if (development)
    return observationSchema
      .array()
      .parse(await developmentReadings(vehicle, history));
  const permissions = await access(vehicle, false);
  if (!permissions["meters.read"]) throw new Error("PERMISSION_DENIED");
  let rows: z.infer<typeof observationSchema>[] = [];
  for (let offset = 0; ; offset += 250) {
    let request = client()
      .from("meter_readings")
      .select(
        "id,reading_type,value,observed_at,entered_at,source,status,is_reset",
      )
      .eq("vehicle_id", vehicle)
      .order("observed_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + 249);
    if (!history) request = request.eq("status", "ACTIVE");
    const { data, error } = await request;
    if (error) throw new Error(error.message);
    const page = observationSchema.array().parse(data);
    rows = rows.concat(page);
    if (page.length < 250) break;
  }
  return rows;
}
