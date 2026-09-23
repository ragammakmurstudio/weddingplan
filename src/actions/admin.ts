"use server";

import { hash } from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/supabase";
import {
  appUrl,
  createResetToken,
  invalidateUserTokens,
} from "@/lib/reset";
import { sendPasswordResetEmail } from "@/lib/mailer";

export type AdminActionResult = { error?: string; success?: string };

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") return null;
  return session;
}

const passwordSchema = z.string().min(8, "Password minimal8 karakter");

export async function resetPasswordAction(
  userId: string,
  newPassword: string
): Promise<AdminActionResult> {
  const session = await requireAdmin();
  if (!session) return { error: "Akses ditolak" };

  const parsed = passwordSchema.safeParse(newPassword);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await db()
    .from("User")
    .update({ passwordHash: await hash(parsed.data, 10) })
    .eq("id", userId);
  if (error) return { error: "Gagal reset password: " + error.message };

  await invalidateUserTokens(userId);
  return { success: "Password berhasil direset" };
}

export async function deleteUserAction(
  userId: string
): Promise<AdminActionResult> {
  const session = await requireAdmin();
  if (!session) return { error: "Akses ditolak" };
  if (session.user.id === userId) {
    return { error: "Tidak bisa menghapus akun sendiri" };
  }

  const { error } = await db().from("User").delete().eq("id", userId);
  if (error) return { error: "Gagal menghapus: " + error.message };
  return { success: "Akun dihapus permanen (data wedding ikut terhapus)" };
}

export async function grantPurchaseAction(
  emailRaw: string,
  note?: string
): Promise<AdminActionResult> {
  const session = await requireAdmin();
  if (!session) return { error: "Akses ditolak" };

  const email = emailRaw.trim().toLowerCase();
  if (!z.string().email().safeParse(email).success) {
    return { error: "Email tidak valid" };
  }

  const { data: existing } = await db()
    .from("Purchase")
    .select("id")
    .eq("email", email)
    .is("userId", null)
    .limit(1)
    .maybeSingle();
  if (existing) return { error: "Email ini sudah punya akses tersedia" };

  const { error } = await db().from("Purchase").insert({
    id: crypto.randomUUID(),
    email,
    refId: note?.trim() || "manual-admin",
    messageId: `manual-${crypto.randomUUID()}`,
  });
  if (error) return { error: "Gagal menambah: " + error.message };
  return { success: `Akses untuk ${email} aktif` };
}

export async function revokePurchaseAction(
  purchaseId: string
): Promise<AdminActionResult> {
  const session = await requireAdmin();
  if (!session) return { error: "Akses ditolak" };

  const { data: row } = await db()
    .from("Purchase")
    .select("id, userId")
    .eq("id", purchaseId)
    .maybeSingle();
  if (!row) return { error: "Data tidak ditemukan" };
  if (row.userId) {
    return { error: "Sudah terpakai — cabut akses lewat hapus akun" };
  }

  const { error } = await db()
    .from("Purchase")
    .delete()
    .eq("id", purchaseId);
  if (error) return { error: "Gagal mencabut: " + error.message };
  return { success: "Akses dicabut — email ini tidak bisa daftar lagi" };
}

export async function sendResetLinkAction(
  userId: string
): Promise<AdminActionResult> {
  const session = await requireAdmin();
  if (!session) return { error: "Akses ditolak" };

  const { data: user } = await db()
    .from("User")
    .select("id, email")
    .eq("id", userId)
    .maybeSingle();
  if (!user) return { error: "User tidak ditemukan" };

  try {
    const plain = await createResetToken(userId);
    await sendPasswordResetEmail(
      user.email,
      `${appUrl()}/reset-password?token=${plain}`
    );
    return { success: `Link reset dikirim ke ${user.email}` };
  } catch (err) {
    console.error("[admin] kirim link reset gagal:", err);
    return { error: "Gagal kirim email — cek konfigurasi SMTP" };
  }
}
