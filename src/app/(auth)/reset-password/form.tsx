"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  performResetAction,
  type PasswordFormState,
} from "@/actions/password";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<PasswordFormState, FormData>(
    performResetAction,
    {}
  );

  if (!token) {
    return (
      <div className="space-y-4">
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          Link tidak valid — token tidak ditemukan.
        </p>
        <Link
          href="/lupa-password"
          className="block text-center text-xs font-semibold text-rose-600 hover:underline"
        >
          Minta link baru
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Buat Password Baru</h2>
        <p className="text-xs text-slate-500 mt-1">
          Link berlaku30 menit dan hanya bisa dipakai sekali
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <div>
          <label
            htmlFor="password"
            className="block text-xs font-medium text-slate-700 mb-1"
          >
            Password Baru (min.8 karakter)
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:ring-rose-500 focus:border-rose-500"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label
            htmlFor="confirm"
            className="block text-xs font-medium text-slate-700 mb-1"
          >
            Ulangi Password
          </label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:ring-rose-500 focus:border-rose-500"
            placeholder="••••••••"
          />
        </div>

        {state?.error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-rose-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-rose-700 transition disabled:opacity-60"
        >
          {pending ? "Menyimpan..." : "Simpan & Masuk"}
        </button>
      </form>

      <p className="text-xs text-slate-500 text-center">
        <Link href="/login" className="text-rose-600 font-semibold hover:underline">
          ← Kembali ke halaman Masuk
        </Link>
      </p>
    </div>
  );
}
