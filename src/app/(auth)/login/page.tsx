"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type AuthFormState } from "@/actions/auth";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    loginAction,
    undefined
  );
  const lynkUrl = process.env.NEXT_PUBLIC_LYNK_URL;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Masuk</h2>
        <p className="text-xs text-slate-500 mt-1">
          Akses dashboard perencanaan pernikahan Anda
        </p>
      </div>

      <form action={formAction} className="space-y-4">
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
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
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
          {pending ? "Memproses..." : "Masuk"}
        </button>
      </form>

      <p className="text-xs text-slate-500 text-center">
        Belum punya akun?{" "}
        <Link href="/register" className="text-rose-600 font-semibold hover:underline">
          Daftar di sini
        </Link>
      </p>

      {lynkUrl && (
        <p className="text-xs text-slate-500 text-center">
          Belum beli akses?{" "}
          <a
            href={lynkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-rose-600 font-semibold hover:underline"
          >
            Beli selamanya di Lynk.id ↗
          </a>
        </p>
      )}
    </div>
  );
}
