import { client } from "@/src/lib/supabase";
import {
  vehicleRecordSchema,
  vehicleSchema,
  type Vehicle,
  type VehicleInput,
} from "./schema";
export async function listVehicles(): Promise<Vehicle[]> {
  const { data, error } = await client().rpc("list_my_vehicles");
  if (error) throw error;
  return vehicleRecordSchema.array().parse(data ?? []);
}
export async function saveVehicle(
  input: VehicleInput,
  operation: string,
  id?: string,
  expected?: string,
) {
  const value = vehicleSchema.parse(input);
  const { data, error } = await client().rpc("save_vehicle", {
    p_data: value,
    p_operation: operation,
    p_id: id ?? null,
    p_expected: expected ?? null,
  });
  if (error) throw error;
  return data as string;
}
export async function archiveVehicle(id: string, archived: boolean) {
  const { error } = await client().rpc("archive_vehicle", {
    p_vehicle: id,
    p_archived: archived,
  });
  if (error) throw error;
}
