import { createClient } from "npm:@supabase/supabase-js@2.118.0";

type Delivery = {
  delivery_id: string;
  notification_id: string;
  device_id: string;
  push_token: string;
  locale: "en" | "hi";
  title: string;
  body: string;
  route_data: Record<string, unknown>;
  attempt_count: number;
};
type Receipt = { delivery_id: string; ticket_id: string };
const expoEndpoint = "https://exp.host/--/api/v2/push";

function secretMatches(actual: string, expected: string) {
  const encoder = new TextEncoder();
  return crypto.subtle.digest("SHA-256", encoder.encode(actual)).then((a) =>
    crypto.subtle.digest("SHA-256", encoder.encode(expected)).then((b) => {
      const left = new Uint8Array(a);
      const right = new Uint8Array(b);
      let difference = left.length ^ right.length;
      for (let i = 0; i < Math.min(left.length, right.length); i++)
        difference |= left[i] ^ right[i];
      return difference === 0;
    }),
  );
}

function retrySeconds(attempt: number) {
  return Math.min(60 * 2 ** Math.max(0, attempt - 1), 3600);
}

Deno.serve(async (request) => {
  if (request.method !== "POST")
    return new Response("Method not allowed", { status: 405 });
  const expected = Deno.env.get("NOTIFICATION_WORKER_SECRET");
  const actual = request.headers.get("x-worker-secret") ?? "";
  if (!expected || !(await secretMatches(actual, expected)))
    return new Response("Unauthorized", { status: 401 });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey)
    return Response.json(
      { error: "Worker backend is not configured" },
      { status: 500 },
    );
  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: enqueueError } = await admin.rpc(
    "enqueue_due_reminder_notifications",
    { p_now: new Date().toISOString() },
  );
  if (enqueueError)
    return Response.json(
      { error: "Could not enqueue reminder notifications" },
      { status: 500 },
    );

  let sent = 0;
  let failed = 0;
  let retried = 0;
  const { data: deliveries, error: claimError } = await admin.rpc(
    "claim_notification_deliveries",
    { p_limit: 100 },
  );
  if (claimError)
    return Response.json(
      { error: "Could not claim push deliveries" },
      { status: 500 },
    );

  const batch = (deliveries ?? []) as Delivery[];
  if (batch.length) {
    try {
      const response = await fetch(`${expoEndpoint}/send`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          batch.map((item) => ({
            to: item.push_token,
            title: item.title,
            body: item.body,
            sound: "default",
            priority: "default",
            channelId: "reminders",
            data: {
              ...item.route_data,
              notification_id: item.notification_id,
            },
          })),
        ),
      });
      const result = (await response.json()) as {
        data?: Array<{
          status?: string;
          id?: string;
          message?: string;
          details?: { error?: string };
        }>;
      };
      if (!response.ok || !Array.isArray(result.data))
        throw new Error(`EXPO_HTTP_${response.status}`);

      for (const [index, item] of batch.entries()) {
        const ticket = result.data[index];
        const code =
          ticket?.details?.error ??
          (ticket?.status === "error" ? "EXPO_ERROR" : null);
        const message = ticket?.message ?? code;
        let outcome: string;
        if (ticket?.status === "ok" && ticket.id) {
          outcome = "SENT";
          sent++;
        } else if (code === "DeviceNotRegistered") {
          outcome = "INVALID_TOKEN";
          failed++;
        } else if (
          /Rate|TooMany|Internal|Unavailable|Server|Network/i.test(String(code))
        ) {
          outcome = "RETRY";
          retried++;
        } else {
          outcome = "FAILED";
          failed++;
        }
        const { error } = await admin.rpc("record_notification_delivery", {
          p_delivery: item.delivery_id,
          p_outcome: outcome,
          p_provider_code: code,
          p_ticket_id: ticket?.id ?? null,
          p_error: message,
          p_retry_seconds: retrySeconds(item.attempt_count),
        });
        if (error) failed++;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "EXPO_NETWORK_ERROR";
      await Promise.all(
        batch.map((item) =>
          admin.rpc("record_notification_delivery", {
            p_delivery: item.delivery_id,
            p_outcome: "RETRY",
            p_provider_code: "EXPO_NETWORK_ERROR",
            p_error: message,
            p_retry_seconds: retrySeconds(item.attempt_count),
          }),
        ),
      );
      retried += batch.length;
    }
  }

  let receiptsChecked = 0;
  const { data: receipts, error: receiptClaimError } = await admin.rpc(
    "claim_notification_receipts",
    { p_limit: 100 },
  );
  if (!receiptClaimError && Array.isArray(receipts) && receipts.length) {
    const items = receipts as Receipt[];
    try {
      const response = await fetch(`${expoEndpoint}/getReceipts`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: items.map((item) => item.ticket_id) }),
      });
      const result = (await response.json()) as {
        data?: Record<
          string,
          { status?: string; message?: string; details?: { error?: string } }
        >;
      };
      if (!response.ok || !result.data)
        throw new Error(`EXPO_RECEIPT_HTTP_${response.status}`);
      for (const item of items) {
        const receipt = result.data[item.ticket_id];
        const code = receipt?.details?.error ?? null;
        const outcome = !receipt
          ? "PENDING"
          : receipt.status === "ok"
            ? "OK"
            : code === "DeviceNotRegistered"
              ? "INVALID_TOKEN"
              : "FAILED";
        await admin.rpc("record_notification_receipt", {
          p_delivery: item.delivery_id,
          p_outcome: outcome,
          p_provider_code: code,
          p_error: receipt?.message ?? null,
        });
        if (receipt) receiptsChecked++;
      }
    } catch {
      await Promise.all(
        items.map((item) =>
          admin.rpc("record_notification_receipt", {
            p_delivery: item.delivery_id,
            p_outcome: "PENDING",
            p_provider_code: "EXPO_RECEIPT_UNAVAILABLE",
          }),
        ),
      );
    }
  }
  return Response.json({
    enqueued: true,
    claimed: batch.length,
    sent,
    failed,
    retried,
    receiptsChecked,
  });
});
