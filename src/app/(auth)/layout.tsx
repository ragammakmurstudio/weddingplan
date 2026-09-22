export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-amber-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 text-xl font-bold border border-rose-200 mx-auto mb-3">
            <i className="fa-solid fa-heart" />
          </div>
          <h1 className="font-cormorant text-3xl font-bold text-slate-800">NikahPlan</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8">
          {children}
        </div>
      </div>
    </main>
  );
}
