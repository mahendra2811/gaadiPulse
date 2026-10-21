/** Maintained from migrations while Supabase CLI is unavailable. Regenerate after deployment:
 * supabase gen types typescript --local > src/types/database.generated.ts
 * Domain boundaries additionally parse rows with Zod before rendering.
 */
export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json | undefined };
type Table<Row, Insert = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: [];
};
export type LedgerRow = {
  id: string;
  vehicle_id: string;
  created_by: string;
  revision: number;
  status: string;
  payload: { [key: string]: Json };
  client_operation_id: string;
  created_at: string;
  updated_at: string;
};
export type MeterRow = {
  id: string;
  vehicle_id: string;
  reading_type: "KM" | "HOURS";
  value: number;
  observed_at: string;
  entered_at: string;
  source: "MANUAL" | "FUEL" | "EXPENSE" | "PROGRESS";
  created_by: string;
  linked_entity_type: string | null;
  linked_entity_id: string | null;
  is_reset: boolean;
  status: "ACTIVE" | "CORRECTED";
  notes: string;
};
export type VehicleRow = {
  id: string;
  created_by: string;
  nickname: string;
  registration_number: string | null;
  category:
    | "two_wheeler"
    | "four_wheeler"
    | "commercial"
    | "agricultural"
    | "heavy_machinery";
  subtype: string;
  brand: string;
  model: string;
  variant: string | null;
  model_year: number | null;
  energy_type: string;
  meter_mode: "KM" | "HOURS" | "BOTH";
  default_meter_unit: string;
  timezone: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};
export type Database = {
  public: {
    Tables: {
      profiles: Table<{
        id: string;
        display_name: string;
        email: string | null;
        locale: "en";
        theme: "light" | "dark" | "system";
        timezone: string;
        created_at: string;
        updated_at: string;
      }>;
      vehicles: Table<VehicleRow>;
      vehicle_members: Table<{
        vehicle_id: string;
        user_id: string;
        role: "OWNER" | "PILOT";
        is_primary_admin: boolean;
        status: "ACTIVE" | "REVOKED";
        permission_overrides: Json;
        joined_at: string;
        created_by: string;
      }>;
      vehicle_access_grants: Table<{
        id: string;
        vehicle_id: string;
        normalized_email: string;
        desired_role: "OWNER" | "PILOT";
        permission_overrides: Json;
        granted_by: string;
        status: "UNRESOLVED" | "RESOLVED" | "REVOKED";
        resolved_user_id: string | null;
        created_at: string;
        revoked_at: string | null;
      }>;
      vehicle_settings: Table<{
        vehicle_id: string;
        pilot_permissions: Json;
        progress_policy: Json;
      }>;
      meter_readings: Table<MeterRow>;
      fuel_logs: Table<LedgerRow & { amount_paise: number; quantity: number }>;
      expenses: Table<LedgerRow & { amount_paise: number }>;
      meter_events: Table<LedgerRow>;
      reminders: Table<LedgerRow>;
      documents: Table<LedgerRow>;
      daily_progress: Table<LedgerRow>;
      expense_items: Table<{
        id: string;
        expense_id: string;
        title: string;
        amount_paise: number;
      }>;
      maintenance_records: Table<{
        id: string;
        vehicle_id: string;
        expense_id: string;
        details: Json;
      }>;
      expense_categories: Table<{
        id: string;
        vehicle_id: string;
        label: string;
      }>;
      progress_form_versions: Table<{
        id: string;
        vehicle_id: string;
        version: number;
        definition: Json;
        published: boolean;
        created_by: string;
        created_at: string;
      }>;
      progress_attachments: Table<{
        id: string;
        progress_id: string;
        vehicle_id: string;
        file_path: null;
      }>;
      audit_events: Table<{
        id: number;
        vehicle_id: string;
        actor_id: string | null;
        action: string;
        context: Json;
        created_at: string;
      }>;
      operation_receipts: Table<{
        operation_id: string;
        user_id: string;
        vehicle_id: string;
        created_at: string;
      }>;
      record_operation_receipts: Table<{
        operation_id: string;
        user_id: string;
        vehicle_id: string;
        kind: string;
        entity_id: string;
        payload_hash: string;
        created_at: string;
      }>;
      account_deletion_requests: Table<{
        user_id: string;
        requested_at: string;
        completed_at: string | null;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      vehicle_access: { Args: { p_vehicle: string }; Returns: Json };
      save_record: {
        Args: {
          p_kind: string;
          p_vehicle: string;
          p_payload: Json;
          p_operation: string;
          p_id?: string | null;
          p_expected?: number | null;
          p_status?: string;
        };
        Returns: string;
      };
      submit_progress: {
        Args: {
          p_vehicle: string;
          p_payload: Json;
          p_operation: string;
          p_id?: string | null;
          p_expected?: number | null;
        };
        Returns: string;
      };
      publish_progress_form: {
        Args: { p_vehicle: string; p_definition: Json };
        Returns: string;
      };
      review_progress: {
        Args: {
          p_vehicle: string;
          p_id: string;
          p_expected: number;
          p_decision: string;
          p_note: string;
        };
        Returns: undefined;
      };
      read_progress_records: {
        Args: { p_vehicle: string; p_offset?: number; p_limit?: number };
        Returns: LedgerRow[];
      };
      read_form_versions: {
        Args: { p_vehicle: string };
        Returns: Database["public"]["Tables"]["progress_form_versions"]["Row"][];
      };
      latest_meter_readings: {
        Args: { p_vehicle: string };
        Returns: MeterRow[];
      };
      resolve_my_access_grants: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      grant_vehicle_access: {
        Args: {
          p_vehicle: string;
          p_email: string;
          p_role: string;
          p_permissions?: Json;
        };
        Returns: undefined;
      };
      set_vehicle_membership: {
        Args: {
          p_vehicle: string;
          p_user: string;
          p_role: string;
          p_status?: string;
          p_permissions?: Json;
        };
        Returns: undefined;
      };
      revoke_vehicle_access: {
        Args: { p_vehicle: string; p_grant: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
