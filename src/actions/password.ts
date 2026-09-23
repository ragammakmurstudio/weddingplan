"use server";

import { hash } from "bcryptjs";
import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { appUrl, consumeResetToken, createResetToken } from "@/lib/reset";
import { sendPasswordResetEmail } from "@/lib/mailer";

export type PasswordFormState = { error?: string; success?: string };

/**
 * Alur publik "lupa password" — selalu tampilkan pesan sukses yang sama
 * agar tidak bocor info email terdaftar atau tidak.
 */
export async function requestResetAction(
  _prev: PasswordFormState,
  formData: FormData
): Promise<PasswordFormState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const generic: PasswordFormState = {
    success:
      "Jika email terdaftar, link reset sudah dikirim. Cek inbox & folder spam.",
  };
  if (!z.string().email().safeParse(email).success) return generic;

  try {
    const { data: user } = await db()
      .from("User")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();
    if (user) {
      const plain = await createResetToken(user.id);
      await sendPasswordResetEmail(
        user.email,
        `${appUrl()}/reset-password?token=${plain}`
      );
    }
  } catch (err) {
    console.error("[request-reset] gagal:", err);
  }
  return generic;
}

const resetSchema = z.object({
  token: z.string().min(1, "Token tidak valid"),
  password: z.string().min(8, "Password minimal8 karakter"),
  confirm: z.string(),
});

export async function performResetAction(
  _prev: PasswordFormState,
  formData: FormData
): Promise<PasswordFormState> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  if (parsed.data.password !== parsed.data.confirm) {
    return { error: "Password dan konfirmasi tidak sama" };
  }

  const userId = await consumeResetToken(parsed.data.token);
  if (!userId) {
    return {
      error: "Link tidak valid atau sudah kedaluwarsa. Minta link baru.",
    };
  }

  const { error } = await db()
    .from("User")
    .update({ passwordHash: await hash(parsed.data.password, 10) })
    .eq("id", userId);
  if (error) {
    return { error: "Gagal menyimpan password. Coba lagi." };
  }

  redirect("/login");
}
