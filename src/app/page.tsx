import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";
import { BrandCredit } from "@/components/BrandCredit";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-amber-50 px-4">
      <div className="max-w-md w-full text-center space-y-6 py-12">
        <img
          src="/logo_rmt.svg"
          alt="Ruang Menuju Tenang"
          className="w-36 h-auto mx-auto"
        />
        <h1 className="font-cormorant text-4xl font-bold text-slate-800">NikahPlan</h1>
        <p className="text-slate-500 text-sm">
          Portal perencanaan pernikahan all-in-one: budget, vendor, tamu, administrasi KUA, dan
          timeline — dalam satu akun pribadi.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/register"
            className="bg-rose-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-rose-700 transition"
          >
            Daftar Gratis
          </Link>
          <Link
            href="/login"
            className="bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-xl text-sm font-semibold hover:bg-slate-50 transition"
          >
            Masuk
          </Link>
        </div>
        <BrandCredit className="pt-6 border-t border-rose-100" />
      </div>
    </main>
  );
}
