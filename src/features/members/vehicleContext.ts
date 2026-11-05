/** A vehicle-specific link must never fall back to a different active vehicle. */
export function resolveMemberVehicle<T extends { id: string }>(
  vehicleId: string | undefined,
  vehicles: readonly T[] | undefined,
  active: T | undefined,
): T | undefined {
  return vehicleId
    ? vehicles?.find((vehicle) => vehicle.id === vehicleId)
    : active;
}
