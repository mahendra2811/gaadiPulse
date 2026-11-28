import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const eventNames = new Set([
  "first_open",
  "onboarding_started",
  "onboarding_completed",
  "vehicle_created",
  "fuel_created",
  "expense_created",
  "feature_opened",
  "grant_resolved",
  "app_foreground",
  "form_started",
  "form_completed",
  "startup_ready",
  "api_health",
]);
const features = new Set([
  "home",
  "garage",
  "fuel",
  "expenses",
  "meters",
  "insights",
  "reports",
  "reminders",
  "notifications",
  "settings",
  "maintenance",
  "members",
]);
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const version = /^\d{1,3}\.\d{1,3}\.\d{1,3}(?:[-+][a-zA-Z0-9.-]{1,20})?$/;
const eventFields = new Set([
  "eventId",
  "installationId",
  "name",
  "appVersion",
  "platform",
  "locale",
  "role",
  "feature",
  "durationMs",
  "requestCount",
  "failureCount",
  "p95DurationMs",
]);

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: cors });
}

function integer(value: unknown, min: number, max: number) {
  return (
    Number.isInteger(value) && Number(value) >= min && Number(value) <= max
  );
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST")
    return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 4096) return json({ error: "PAYLOAD_TOO_LARGE" }, 413);
  let body: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > 4096) return json({ error: "PAYLOAD_TOO_LARGE" }, 413);
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return json({ error: "INVALID_PAYLOAD" }, 400);
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ error: "INVALID_PAYLOAD" }, 400);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey)
    return json({ error: "ANALYTICS_NOT_CONFIGURED" }, 503);
  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (body.action === "revoke") {
    if (
      Object.keys(body).some(
        (key) => !["action", "installationId"].includes(key),
      )
    )
      return json({ error: "INVALID_PAYLOAD" }, 400);
    if (!uuid.test(String(body.installationId ?? "")))
      return json({ error: "INVALID_INSTALLATION" }, 400);
    const { error } = await admin.rpc("delete_app_analytics_install", {
      p_installation_id: body.installationId,
    });
    if (error) return json({ error: "ANALYTICS_DELETE_FAILED" }, 503);
    return new Response(null, { status: 204, headers: cors });
  }

  if (body.action !== "track" || !body.event || typeof body.event !== "object")
    return json({ error: "INVALID_ACTION" }, 400);
  if (Object.keys(body).some((key) => !["action", "event"].includes(key)))
    return json({ error: "INVALID_PAYLOAD" }, 400);
  const event = body.event as Record<string, unknown>;
  if (
    Object.keys(event).some((key) => !eventFields.has(key)) ||
    !uuid.test(String(event.eventId ?? "")) ||
    !uuid.test(String(event.installationId ?? "")) ||
    typeof event.name !== "string" ||
    !eventNames.has(event.name) ||
    typeof event.appVersion !== "string" ||
    !version.test(event.appVersion) ||
    !["android", "ios", "web"].includes(String(event.platform)) ||
    !["en-IN", "hi-IN", "other"].includes(String(event.locale)) ||
    (event.role != null && !["OWNER", "PILOT"].includes(String(event.role))) ||
    (event.feature != null && !features.has(String(event.feature)))
  )
    return json({ error: "INVALID_EVENT" }, 400);

  if (
    event.name === "api_health" &&
    (!integer(event.requestCount, 1, 100) ||
      !integer(event.failureCount, 0, 100) ||
      Number(event.failureCount) > Number(event.requestCount) ||
      !integer(event.p95DurationMs, 0, 120000))
  )
    return json({ error: "INVALID_API_METRIC" }, 400);
  if (event.durationMs != null && !integer(event.durationMs, 0, 300000))
    return json({ error: "INVALID_DURATION" }, 400);
  if (
    ["feature_opened", "form_started", "form_completed"].includes(
      String(event.name),
    ) &&
    (typeof event.feature !== "string" || !features.has(event.feature))
  )
    return json({ error: "FEATURE_REQUIRED" }, 400);
  if (
    event.name === "grant_resolved" &&
    !["OWNER", "PILOT"].includes(String(event.role))
  )
    return json({ error: "ROLE_REQUIRED" }, 400);

  const { data, error } = await admin.rpc("record_app_analytics", {
    p_event_id: event.eventId,
    p_installation_id: event.installationId,
    p_event_name: event.name,
    p_app_version: event.appVersion,
    p_platform: event.platform,
    p_locale: event.locale,
    p_role: event.role ?? null,
    p_feature: event.feature ?? null,
    p_duration_ms: event.durationMs ?? null,
    p_request_count: event.requestCount ?? null,
    p_failure_count: event.failureCount ?? null,
    p_p95_duration_ms: event.p95DurationMs ?? null,
  });
  if (error) return json({ error: "ANALYTICS_WRITE_FAILED" }, 503);
  if (!data) return json({ error: "ANALYTICS_RATE_LIMITED" }, 429);
  return new Response(null, { status: 202, headers: cors });
});
