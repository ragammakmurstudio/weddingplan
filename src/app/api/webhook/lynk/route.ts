import { createHash, timingSafeEqual } from "crypto";
import { db } from "@/lib/supabase";

function asString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number") return String(value);
  return String(value);
}

// Bentuk asli lynk.id bertingkat (event → data → message_data).
// Fallback top-level disimpan kalau suatu saat lynk.id mengubah kontrak.
type LynkPayload = {
  event?: string;
  data?: {
    message_action?: string;
    message_id?: string;
    message_data?: {
      refId?: string;
      customer?: { email?: string | null };
      totals?: { grandTotal?: number | string };
    };
  };
  refId?: string;
  amount?: string | number;
  grandTotal?: string | number;
  message_id?: string;
  email?: string;
};

export async function POST(req: Request): Promise<Response> {
  const raw = await req.text();

  let payload: LynkPayload;
  try {
    payload = JSON.parse(raw) as LynkPayload;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const md = payload.data?.message_data;
  const refId = asString(md?.refId ?? payload.refId);
  const amount = asString(
    md?.totals?.grandTotal ?? payload.amount ?? payload.grandTotal
  );
  const messageId = asString(payload.data?.message_id ?? payload.message_id);
  const email = asString(md?.customer?.email ?? payload.email)
    .trim()
    .toLowerCase();
  const event = asString(payload.event);
  const action = asString(payload.data?.message_action);

  console.log(
    "[lynk-webhook] terima:",
    JSON.stringify({ event, action, refId, amount, messageId, email })
  );

  const secret = process.env.LYNK_MERCHANT_KEY;
  if (!secret) {
    console.error("[lynk-webhook] LYNK_MERCHANT_KEY belum di-set");
    return new Response("Webhook not configured", { status: 500 });
  }
  if (!refId || !amount || !messageId) {
    console.warn(
      "[lynk-webhook] field kosong:",
      JSON.stringify({ refId, amount, messageId })
    );
    return new Response("Missing fields", { status: 400 });
  }

  const expected = createHash("sha256")
    .update(amount + refId + messageId + secret)
    .digest("hex");
  const received = asString(req.headers.get("x-lynk-signature")).trim();
  const expectedBuf = Buffer.from(expected, "utf8");
  const receivedBuf = Buffer.from(received, "utf8");
  const sigOk =
    expectedBuf.length === receivedBuf.length &&
    timingSafeEqual(expectedBuf, receivedBuf);
  console.log(
    "[lynk-webhook] signature:",
    sigOk ? "cocok" : "TIDAK cocok",
    `amount="${amount}"`
  );
  if (!sigOk) {
    return new Response("Invalid signature", { status: 401 });
  }

  if (event && event !== "payment.received") {
    console.log("[lynk-webhook] event diabaikan:", event);
    return Response.json({ ok: true, ignored: event });
  }
  if (action && action !== "SUCCESS") {
    console.log("[lynk-webhook] message_action diabaikan:", action);
    return Response.json({ ok: true, ignored: action });
  }

  const { error } = await db().from("Purchase").upsert(
    {
      id: crypto.randomUUID(),
      refId,
      email: email || null,
      amount,
      messageId,
    },
    { onConflict: "messageId", ignoreDuplicates: true }
  );
  if (error) {
    console.error("[lynk-webhook] insert gagal:", error.message);
    return new Response("DB error", { status: 500 });
  }

  console.log(
    "[lynk-webhook] tersimpan:",
    messageId,
    email || "(tanpa email)"
  );
  return Response.json({ ok: true });
}
