"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type AuthFormState } from "@/actions/auth";

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    registerAction,
    undefined
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Buat Akun</h2>
        <p className="text-xs text-slate-500 mt-1">
          Satu akun = satu data wedding pribadi Anda
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

      <p className="text-xs text-slate-500 text-center">
        Sudah punya akun?{" "}
        <Link href="/login" className="text-rose-600 font-semibold hover:underline">
          Masuk
        </Link>
      </p>
    </div>
  );
}
