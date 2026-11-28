import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { client } from "@/src/lib/supabase";

const policySchema = z.object({
  policy_id: z.literal("global"),
  minimum_supported_version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/)
    .nullable(),
  minimum_version_critical: z.boolean(),
  minimum_version_message: z.string().max(240).nullable(),
  feature_flags: z.record(z.string(), z.boolean()),
  updated_at: z.string(),
});

export type ReleasePolicy = z.infer<typeof policySchema>;

export const releasePolicyQueryKey = ["public-release-policy"] as const;

export function useReleasePolicy() {
  return useQuery({
    queryKey: releasePolicyQueryKey,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
    queryFn: async ({ signal }) => {
      const request = client()
        .from("app_release_policy")
        .select(
          "policy_id,minimum_supported_version,minimum_version_critical,minimum_version_message,feature_flags,updated_at",
        )
        .eq("policy_id", "global")
        .maybeSingle();
      if (signal && "abortSignal" in request) {
        (
          request as unknown as { abortSignal: (value: AbortSignal) => unknown }
        ).abortSignal(signal);
      }
      const { data, error } = await request;
      if (error) throw new Error(error.message);
      if (!data) throw new Error("RELEASE_POLICY_MISSING");
      return policySchema.parse(data);
    },
  });
}

export function isVersionBelow(current: string, minimum: string) {
  const parse = (value: string) => {
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value);
    return match ? match.slice(1).map(Number) : null;
  };
  const actual = parse(current);
  const required = parse(minimum);
  if (!actual || !required) return false;
  for (let index = 0; index < 3; index++) {
    if (actual[index] !== required[index])
      return actual[index] < required[index];
  }
  return false;
}
