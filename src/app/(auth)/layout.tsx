import { BrandCredit } from "@/components/BrandCredit";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-rose-50 via-white to-amber-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <img
            src="/logo_rmt.svg"
            alt="Ruang Menuju Tenang"
            className="w-28 h-auto mx-auto mb-3"
          />
          <h1 className="font-cormorant text-3xl font-bold text-slate-800">NikahPlan</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8">
          {children}
        </div>
      </div>
      <div className="w-full max-w-md mt-6">
        <BrandCredit />
      </div>
    </main>
  );
}
