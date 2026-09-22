import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-amber-50 px-4">
      <div className="max-w-md w-full text-center space-y-6 py-12">
        <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-serif text-3xl font-bold border border-rose-200 mx-auto">
          <i className="fa-solid fa-heart" />
        </div>
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
      </div>
    </main>
  );
}
