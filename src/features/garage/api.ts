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
  const { data, error } = await client().rpc("list_my_vehicles");
  if (error) throw new Error(error.message);
  return vehicleRecordSchema.array().parse(data ?? []);
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
  if (typeof data !== "string" || !data) throw new Error("SAVE_NOT_CONFIRMED");
  return data;
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
