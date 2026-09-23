"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type AuthFormState } from "@/actions/auth";

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    registerAction,
    undefined
  );
  const lynkUrl = process.env.NEXT_PUBLIC_LYNK_URL;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Buat Akun</h2>
        <p className="text-xs text-slate-500 mt-1">
          Akses selamanya — daftar dengan email yang sama saat membeli di Lynk.id
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-xs font-medium text-slate-700 mb-1">
            Nama Lengkap
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            minLength={2}
            className="w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:ring-rose-500 focus:border-rose-500"
            placeholder="Budi & Siti"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-xs font-medium text-slate-700 mb-1">
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
          <p className="text-[11px] text-slate-400 mt-1">
            Harus sama dengan email yang dipakai membeli akses di Lynk.id
          </p>
        </div>
        <div>
          <label htmlFor="password" className="block text-xs font-medium text-slate-700 mb-1">
            Password (min. 8 karakter)
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
          {pending ? "Membuat akun..." : "Daftar & Mulai"}
        </button>
      </form>

      {lynkUrl && (
        <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3 text-center space-y-1">
          <p className="text-xs text-slate-600">
            Belum punya akses? Sekali bayar, pakai selamanya.
          </p>
          <a
            href={lynkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs font-semibold text-rose-600 hover:underline"
          >
            Beli di Lynk.id ↗
          </a>
        </div>
      )}

      <p className="text-xs text-slate-500 text-center">
        Sudah punya akun?{" "}
        <Link href="/login" className="text-rose-600 font-semibold hover:underline">
          Masuk
        </Link>
      </p>
    </div>
  );
}
