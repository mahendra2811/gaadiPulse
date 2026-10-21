import { readLocal, writeLocal } from "@/src/lib/localStore";
import {
  listDevelopmentVehicles,
  saveDevelopmentVehicle,
  archiveDevelopmentVehicle,
} from "@/src/features/development/repository";
import { client } from "@/src/lib/supabase";
import {
  vehicleRecordSchema,
  vehicleSchema,
  type Vehicle,
  type VehicleInput,
} from "./schema";
export async function listVehicles(development = false): Promise<Vehicle[]> {
  if (development) return listDevelopmentVehicles();
  const session = await client().auth.getSession();
  const user = session.data.session?.user.id;
  if (!user) throw new Error("NOT_AUTHENTICATED");
  const key = `user.${user}.garage`;
  try {
    const { data, error } = await client().rpc("list_my_vehicles");
    if (error) throw new Error(error.message);
    const records = vehicleRecordSchema.array().parse(data ?? []);
    await writeLocal(key, { records, expires: Date.now() + 3600000 });
    return records;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const cached = (await readLocal(key)) as {
      records: Vehicle[];
      expires: number;
    } | null;
    if (
      /network|fetch|offline|connection|timeout/i.test(message) &&
      cached &&
      cached.expires > Date.now()
    )
      return vehicleRecordSchema.array().parse(cached.records);
    throw error;
  }
}
export async function saveVehicle(
  input: VehicleInput,
  operation: string,
  id?: string,
  expected?: string,
  development = false,
) {
  if (development)
    return saveDevelopmentVehicle(input, operation, id, expected);
  const value = vehicleSchema.parse(input);
  const { data, error } = await client().rpc("save_vehicle", {
    p_data: value,
    p_operation: operation,
    p_id: id ?? null,
    p_expected: expected ?? null,
  });
  if (error) throw new Error(error.message);
  return data as string;
}
export async function archiveVehicle(
  id: string,
  archived: boolean,
  development = false,
) {
  if (development) return archiveDevelopmentVehicle(id, archived);
  const { error } = await client().rpc("archive_vehicle", {
    p_vehicle: id,
    p_archived: archived,
  });
  if (error) throw new Error(error.message);
}
