import { createHash, timingSafeEqual } from "crypto";
import { db } from "@/lib/supabase";

function asString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number") return String(value);
  return String(value);
}

export async function POST(req: Request): Promise<Response> {
  const raw = await req.text();

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const refId = asString(payload.refId ?? payload.ref_id);
  const amount = asString(
    payload.amount ?? payload.grandTotal ?? payload.grand_total
  );
  const messageId = asString(payload.message_id ?? payload.messageId);
  const email = asString(
    payload.email ?? payload.customerEmail ?? payload.buyerEmail
  )
    .trim()
    .toLowerCase();

  // Log payload mentah — dipakai untuk verifikasi field lynk.id (mis. email)
  console.log(
    "[lynk-webhook] terima:",
    JSON.stringify({ refId, amount, messageId, email, payload })
  );

  const secret = process.env.LYNK_MERCHANT_KEY;
  if (!secret) {
    console.error("[lynk-webhook] LYNK_MERCHANT_KEY belum di-set");
    return new Response("Webhook not configured", { status: 500 });
  }
  if (!refId || !amount || !messageId) {
    return new Response("Missing fields", { status: 400 });
  }

  const expected = createHash("sha256")
    .update(amount + refId + messageId + secret)
    .digest("hex");
  const received = asString(req.headers.get("x-lynk-signature")).trim();
  const expectedBuf = Buffer.from(expected, "utf8");
  const receivedBuf = Buffer.from(received, "utf8");
  if (
    expectedBuf.length !== receivedBuf.length ||
    !timingSafeEqual(expectedBuf, receivedBuf)
  ) {
    console.warn("[lynk-webhook] signature tidak cocok");
    return new Response("Invalid signature", { status: 401 });
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

  return Response.json({ ok: true });
}
