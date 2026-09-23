export function BrandCredit({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <p className="text-xs text-slate-400">
        Dibuat oleh{" "}
        <span className="font-semibold text-slate-500">Ruang Menuju Tenang</span>
      </p>
      <div className="flex items-center gap-5">
        <a
          href="https://www.instagram.com/ruangmenujutenang/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram Ruang Menuju Tenang"
          className="text-slate-400 hover:text-rose-600 transition text-base"
        >
          <i className="fa-brands fa-instagram" />
        </a>
        <a
          href="https://www.tiktok.com/@ruangmenujutenang"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="TikTok Ruang Menuju Tenang"
          className="text-slate-400 hover:text-rose-600 transition text-base"
        >
          <i className="fa-brands fa-tiktok" />
        </a>
      </div>
    </div>
  );
}
