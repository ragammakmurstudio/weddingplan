import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/supabase";

const EXPIRY_MINUTES = 30;

export function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export function hashToken(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}

/** Buat token reset (disimpan hanya hash-nya), kembalikan versi plain utk URL. */
export async function createResetToken(userId: string): Promise<string> {
  const plain = randomBytes(32).toString("hex");
  const { error } = await db().from("PasswordResetToken").insert({
    id: crypto.randomUUID(),
    userId,
    tokenHash: hashToken(plain),
    expiresAt: new Date(
      Date.now() + EXPIRY_MINUTES * 60 * 1000
    ).toISOString(),
  });
  if (error) throw new Error(error.message);
  return plain;
}

/**
 * Validasi token → tandai terpakai (atomik) → kembalikan userId,
 * atau null kalau tidak valid / kedaluwarsa / sudah dipakai.
 */
export async function consumeResetToken(
  plain: string
): Promise<string | null> {
  if (!plain) return null;
  const { data } = await db()
    .from("PasswordResetToken")
    .select("id, userId, expiresAt, usedAt")
    .eq("tokenHash", hashToken(plain))
    .maybeSingle();
  if (!data || data.usedAt) return null;
  if (new Date(data.expiresAt).getTime() <= Date.now()) return null;

  const { error } = await db()
    .from("PasswordResetToken")
    .update({ usedAt: new Date().toISOString() })
    .eq("id", data.id)
    .is("usedAt", null);
  if (error) return null;
  return data.userId;
}

/** Cabut semua token reset aktif milik user (mis. setelah password diganti). */
export async function invalidateUserTokens(userId: string): Promise<void> {
  await db()
    .from("PasswordResetToken")
    .update({ usedAt: new Date().toISOString() })
    .eq("userId", userId)
    .is("usedAt", null);
}
