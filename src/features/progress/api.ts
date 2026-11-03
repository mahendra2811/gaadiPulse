import { publishDefinitionSchema } from "./schema";
import { t } from "@/src/lib/i18n";
import * as Crypto from "expo-crypto";
import { client } from "@/src/lib/supabase";
import {
  readDevelopment,
  writeDevelopment,
  requireDevelopment,
} from "@/src/features/development/repository";
import {
  progressDefinitionSchema,
  defaultDefinition,
  type ProgressDefinition,
  type FormVersion,
  validateAnswers,
} from "./schema";
import { listRecords, access } from "@/src/features/records/api";
import { type RecordEntry } from "@/src/features/records/schema";
export async function formVersions(
  vehicle: string,
  development: boolean,
): Promise<FormVersion[]> {
  if (development) {
    requireDevelopment();
    return (
      ((await readDevelopment(`forms.${vehicle}`)) as FormVersion[]) ?? [
        {
          id: vehicle,
          vehicle_id: vehicle,
          version: 1,
          definition: defaultDefinition,
          created_at: new Date().toISOString(),
          published: true,
        },
      ]
    );
  }
  const session = await client().auth.getSession();
  const user = session.data.session?.user.id;
  if (!user) throw new Error("NOT_AUTHENTICATED");
  await access(vehicle, false);
  const { data, error } = await client().rpc("read_form_versions", {
    p_vehicle: vehicle,
  });
  if (error) throw new Error(error.message);
  const records = (data ?? []).map((f: FormVersion) => ({
    ...f,
    definition: progressDefinitionSchema.parse(f.definition),
  }));
  return records;
}

export async function publishForm(
  vehicle: string,
  definition: ProgressDefinition,
  development: boolean,
) {
  const value = publishDefinitionSchema.parse(definition);
  if (!value.notes_visible && value.notes_required)
    throw new Error("INVALID_NOTES_POLICY");
  for (const field of value.fields)
    if (field.default_value !== null && field.default_value !== undefined)
      validateAnswers(
        [{ ...field, required: false }],
        { [field.id]: field.default_value },
        true,
      );
  if (development) {
    const forms = await formVersions(vehicle, true);
    const next = {
      id: Crypto.randomUUID(),
      vehicle_id: vehicle,
      version: Math.max(...forms.map((f) => f.version), 0) + 1,
      definition: value,
      published: true,
      created_at: new Date().toISOString(),
    };
    await writeDevelopment(`forms.${vehicle}`, [
      next,
      ...forms.map((f) => ({ ...f, published: false })),
    ]);
    return next.id;
  }
  const { data, error } = await client().rpc("publish_progress_form", {
    p_vehicle: vehicle,
    p_definition: value,
  });
  if (error) throw new Error(error.message);
  return String(data);
}
export async function reviewProgress(
  user: string,
  vehicle: string,
  entry: RecordEntry,
  decision: string,
  note: string,
  development: boolean,
) {
  if (!["APPROVED", "REJECTED", "CORRECTION_REQUESTED"].includes(decision))
    throw new Error(t("invalidData"));
  if (note.length > 3000 || (decision !== "APPROVED" && !note.trim()))
    throw new Error(t("reviewReason"));
  if (development) {
    const rows = await listRecords(user, vehicle, "progress", true);
    const current = rows.find((r) => r.id === entry.id);
    if (!current || current.revision !== entry.revision)
      throw new Error("CONFLICT");
    await writeDevelopment(
      `records.${vehicle}.progress`,
      rows.map((r) =>
        r.id === entry.id
          ? {
              ...r,
              status: decision,
              revision: r.revision + 1,
              updated_at: new Date().toISOString(),
              payload: {
                ...r.payload,
                review_note: note,
                reviewed_at: new Date().toISOString(),
              },
            }
          : r,
      ),
    );
    return;
  }
  const { error } = await client().rpc("review_progress", {
    p_vehicle: vehicle,
    p_id: entry.id,
    p_expected: entry.revision,
    p_decision: decision,
    p_note: note,
  });
  if (error) throw new Error(error.message);
}
