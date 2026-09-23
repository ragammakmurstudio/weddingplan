"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  requestResetAction,
  type PasswordFormState,
} from "@/actions/password";

export default function LupaPasswordPage() {
  const [state, formAction, pending] = useActionState<PasswordFormState, FormData>(
    requestResetAction,
    {}
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Lupa Password</h2>
        <p className="text-xs text-slate-500 mt-1">
          Masukkan email akun kamu — link reset dikirim lewat email
        </p>
      </div>

      {state?.success ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3">
          <p className="text-xs text-emerald-700">{state.success}</p>
          <Link
            href="/login"
            className="inline-block mt-2 text-xs font-semibold text-rose-600 hover:underline"
          >
            ← Kembali ke halaman Masuk
          </Link>
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:ring-rose-500 focus:border-rose-500"
              placeholder="you@example.com"
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
            {pending ? "Mengirim..." : "Kirim Link Reset"}
          </button>
        </form>
      )}

      <p className="text-xs text-slate-500 text-center">
        Ingat password?{" "}
        <Link href="/login" className="text-rose-600 font-semibold hover:underline">
          Masuk
        </Link>
      </p>
    </div>
  );
}
