"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type {
  BudgetItem,
  ChecklistItem,
  SeserahanItem,
  SeserahanSection,
  TabId,
  Vendor,
  WeddingState,
} from "@/lib/types";
import { isKuaStep } from "@/lib/types";
import { formatDate, formatRupiah, getVendorBadgeClass, newId } from "@/lib/utils";
import { logoutAction, resetWeddingAction, saveWeddingAction } from "@/actions/auth";
import { BrandCredit } from "@/components/BrandCredit";

const TABS: { id: TabId; name: string; icon: string }[] = [
  { id: "dashboard", name: "Dashboard Overview", icon: "fa-solid fa-chart-pie" },
  { id: "mempelai", name: "Data Mempelai", icon: "fa-solid fa-user-gear" },
  { id: "budget", name: "Budget & Tabungan", icon: "fa-solid fa-wallet" },
  { id: "seserahan", name: "Seserahan & Mahar", icon: "fa-solid fa-gift" },
  { id: "vendors", name: "Vendor & Venue", icon: "fa-solid fa-store" },
  { id: "administrasi", name: "Administrasi KUA", icon: "fa-solid fa-file-contract" },
  { id: "undangan", name: "Daftar Undangan", icon: "fa-solid fa-envelope-open-text" },
  { id: "timeline", name: "Timeline Checklist", icon: "fa-solid fa-list-check" },
  { id: "rundown", name: "Rundown & Panitia", icon: "fa-solid fa-clipboard-list" },
];

const VENDOR_CATEGORIES = [
  "Venue",
  "Catering",
  "Dekorasi",
  "MUA",
  "Foto & Video",
  "Entertainment",
  "Undangan & Souvenir",
  "Lainnya",
];

/** Input harga inline: tampil format Rp saat diam, angka mentah saat diedit. */
function PriceCellInput({
  value,
  onCommit,
  label,
}: {
  value: number;
  onCommit: (n: number) => void;
  label: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={label}
      value={focused ? (value ? String(value) : "") : formatRupiah(value)}
      placeholder="0"
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => onCommit(Number(e.target.value.replace(/\D/g, "")) || 0)}
      className="w-36 text-right bg-transparent border border-transparent hover:border-slate-200 focus:border-rose-300 focus:ring-1 focus:ring-rose-500 rounded-lg px-2 py-1 text-xs sm:text-sm"
    />
  );
}

type Props = {
  initial: WeddingState;
  userEmail: string;
  userName: string;
};

let clockListeners: Array<() => void> = [];
let clockTimer: ReturnType<typeof setInterval> | null = null;
let clockValue = 0;

function ensureClock() {
  if (clockTimer) return;
  clockValue = Date.now();
  clockTimer = setInterval(() => {
    clockValue = Date.now();
    clockListeners.forEach((l) => l());
  }, 60_000);
}

function subscribeClock(cb: () => void) {
  ensureClock();
  clockListeners.push(cb);
  return () => {
    clockListeners = clockListeners.filter((l) => l !== cb);
  };
}

function getSnapshotClock() {
  ensureClock();
  return clockValue;
}

function Modal({
  open,
  title,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
        <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
        {children}
        <div className="flex justify-end space-x-2 pt-2">
          {footer}
        </div>
      </div>
    </div>
  );
}

export function DashboardClient({ initial, userEmail, userName }: Props) {
  const [state, setState] = useState<WeddingState>(initial);
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [toastMsg, setToastMsg] = useState("");
  const [guestFilter, setGuestFilter] = useState<"ALL" | "CPP" | "CPW">("ALL");
  const [guestSearch, setGuestSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [showSeserahanModal, setShowSeserahanModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const [budgetForm, setBudgetForm] = useState<BudgetItem>({
    id: "",
    category: "Venue & Catering",
    item: "",
    estimated: 0,
    actual: 0,
    status: "Belum",
  });
  const [guestForm, setGuestForm] = useState({
    name: "",
    side: "CPP",
    category: "Sahabat / Teman",
    pax: 2,
    isVip: false,
  });
  const [vendorForm, setVendorForm] = useState<Vendor>({
    id: "",
    category: "Venue",
    name: "",
    price: 0,
    status: "Survey / Pitching",
    contact: "",
    notes: "",
  });
  const [timelineForm, setTimelineForm] = useState<ChecklistItem>({
    id: "",
    timeframe: "H-12 s/d H-9 Bulan",
    task: "",
    done: false,
  });
  const [seserahanForm, setSeserahanForm] = useState<SeserahanItem & { section: SeserahanSection }>({
    id: "",
    title: "",
    cost: 0,
    ready: false,
    link: "",
    section: "mahar",
  });

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(""), 3000);
  }, []);

  const persist = useCallback(
    async (data: WeddingState, silent = true) => {
      setSaving(true);
      const res = await saveWeddingAction(data);
      setSaving(false);
      if (!res.ok) {
        showToast(res.error ?? "Gagal menyimpan");
      } else if (!silent) {
        showToast("Data berhasil disimpan!");
      }
    },
    [showToast]
  );

  const update = useCallback(
    (patch: Partial<WeddingState> | ((s: WeddingState) => WeddingState), silent = true) => {
      setState((prev) => {
        const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          void persist(next, silent);
        }, 700);
        return next;
      });
    },
    [persist]
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const nowMs = useSyncExternalStore(
    subscribeClock,
    getSnapshotClock,
    () => 0
  );

  const daysRemaining = useMemo(() => {
    const target = new Date(state.weddingDate);
    const diff = target.getTime() - nowMs;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [state.weddingDate, nowMs]);

  const totalExpenses = state.budgetList.reduce((sum, b) => sum + (b.actual || 0), 0);
  const totalMaharCost = state.maharItems.reduce((sum, m) => sum + (m.cost || 0), 0);
  const confirmedVendorsCount = state.vendors.filter((v) => v.status === "Deal").length;
  const kuaDocs = state.adminDocs.filter((d) => !isKuaStep(d));
  const completedDocsCount = kuaDocs.filter((d) => d.doneCpp && d.doneCpw).length;
  const finalVendors = state.vendors.filter((v) => v.status === "Deal");
  const candidateVendors = state.vendors.filter((v) => v.status !== "Deal");
  const vendorCategories = [
    ...VENDOR_CATEGORIES,
    ...new Set(
      state.vendors
        .map((v) => v.category)
        .filter((c) => !VENDOR_CATEGORIES.includes(c))
    ),
  ];
  const openVendorModal = (category = "Venue") => {
    setVendorForm({
      id: "",
      category,
      name: "",
      price: 0,
      status: "Survey / Pitching",
      contact: "",
      notes: "",
    });
    setShowVendorModal(true);
  };
  const editVendor = (v: Vendor) => {
    setVendorForm(v);
    setShowVendorModal(true);
  };
  const deleteVendor = (id: string) =>
    update((s) => ({
      ...s,
      vendors: s.vendors.filter((x) => x.id !== id),
    }));
  const pendingChecklist = state.checklist.filter((c) => !c.done);
  const overallProgress = Math.round(
    (state.checklist.filter((c) => c.done).length / (state.checklist.length || 1)) * 100
  );

  const filteredGuests = state.guests.filter((g) => {
    const matchSide = guestFilter === "ALL" || g.side === guestFilter;
    const matchSearch = g.name.toLowerCase().includes(guestSearch.toLowerCase());
    return matchSide && matchSearch;
  });

  const guestStats = (() => {
    const cpp = state.guests.filter((g) => g.side === "CPP").length;
    const cpw = state.guests.filter((g) => g.side === "CPW").length;
    const total = state.guests.length || 1;
    const attending = state.guests
      .filter((g) => g.status === "Hadir")
      .reduce((sum, g) => sum + g.pax, 0);
    return {
      cpp,
      cpw,
      cppPct: Math.round((cpp / total) * 100),
      cpwPct: Math.round((cpw / total) * 100),
      attending,
    };
  })();

  const groupedChecklist = state.checklist.reduce(
    (groups, item) => {
      (groups[item.timeframe] ||= []).push(item);
      return groups;
    },
    {} as Record<string, ChecklistItem[]>
  );

  const resetData = async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    try {
      const fresh = await resetWeddingAction();
      setShowResetModal(false);
      if (fresh) {
        setState(fresh);
        showToast("Data berhasil direset ke setelan demo!");
      } else {
        showToast("Data pernikahan tidak ditemukan.");
      }
    } catch {
      showToast("Gagal mereset data. Coba lagi.");
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white border-b border-rose-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center space-x-3 min-w-0">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              aria-label="Buka menu navigasi"
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0"
            >
              <i className="fa-solid fa-bars text-lg" />
            </button>
            <img
              src="/logo_rmt.svg"
              alt="NikahPlan"
              className="w-10 shrink-0 h-auto"
            />
            <div className="min-w-0">
              <h1 className="font-cormorant text-2xl font-bold text-slate-800 leading-tight truncate">
                {state.brideData.cpp.nickname || "Pengantin Pria"} &{" "}
                {state.brideData.cpw.nickname || "Pengantin Wanita"}
              </h1>
              <p className="text-xs text-slate-500 font-medium truncate">
                <i className="fa-regular fa-calendar-check mr-1 text-rose-500" />
                {formatDate(state.weddingDate)} |{" "}
                {state.weddingVenue || "Lokasi Belum Ditentukan"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-rose-50 px-4 py-2 rounded-xl border border-rose-100">
            <i className="fa-solid fa-hourglass-half text-rose-500 animate-pulse" />
            <div className="text-xs sm:text-sm font-semibold text-slate-700">
              <span className="text-rose-600 font-bold text-base">{daysRemaining}</span> Hari Menuju
              Akad &amp; Resepsi
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span
              className={`text-[10px] font-semibold px-2 py-1 rounded-md ${
                saving ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {saving ? "Menyimpan..." : "Tersimpan"}
            </span>
            <span className="hidden sm:inline text-xs text-slate-500 max-w-[140px] truncate">
              {userName || userEmail}
            </span>
            <button
              onClick={() => setShowResetModal(true)}
              title="Reset Data Demo"
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-sm transition"
            >
              <i className="fa-solid fa-rotate-right" />
            </button>
            <form action={logoutAction}>
              <button
                type="submit"
                title="Keluar"
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-sm transition"
              >
                <i className="fa-solid fa-right-from-bracket" />
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Mobile / tablet: drawer hamburger */}
      {navOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setNavOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Menu Navigasi
              </p>
              <button
                type="button"
                onClick={() => setNavOpen(false)}
                aria-label="Tutup menu"
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setNavOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                    activeTab === tab.id
                      ? "bg-rose-600 text-white shadow-md shadow-rose-200 font-semibold"
                      : "text-slate-600 hover:bg-rose-50 hover:text-rose-700"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <i
                      className={`${tab.icon} w-5 text-center ${
                        activeTab === tab.id ? "text-white" : "text-rose-500"
                      }`}
                    />
                    <span>{tab.name}</span>
                  </div>
                </button>
              ))}
            </nav>
            <div className="p-3 border-t border-slate-100">
              <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
                <span className="text-slate-500">Progress Persiapan</span>
                <span className="text-rose-600 font-bold">{overallProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-rose-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          </aside>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-grow w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside className="hidden lg:block lg:col-span-3 space-y-1">
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 sticky top-20">
            <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Menu Navigasi
            </p>
            <nav className="space-y-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                    activeTab === tab.id
                      ? "bg-rose-600 text-white shadow-md shadow-rose-200 font-semibold"
                      : "text-slate-600 hover:bg-rose-50 hover:text-rose-700"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <i
                      className={`${tab.icon} w-5 text-center ${
                        activeTab === tab.id ? "text-white" : "text-rose-500"
                      }`}
                    />
                    <span>{tab.name}</span>
                  </div>
                </button>
              ))}
            </nav>

            <div className="mt-6 pt-4 border-t border-slate-100 px-3">
              <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
                <span className="text-slate-500">Progress Persiapan</span>
                <span className="text-rose-600 font-bold">{overallProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-rose-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          </div>
        </aside>

        <main className="lg:col-span-9 space-y-6">
          {activeTab === "dashboard" && (
            <section className="space-y-6">
              <div className="bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10 space-y-2">
                  <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
                    Rencana Pernikahan
                  </span>
                  <h2 className="text-3xl font-cormorant font-bold">
                    Selamat Datang di Portal Planning Pernikahan!
                  </h2>
                  <p className="text-rose-100 text-sm max-w-xl">
                    Kelola seluruh keperluan nikah mulai dari estimasi budget, berkas administrasi
                    KUA, vendor, hingga list tamu undangan secara terorganisir.
                  </p>
                </div>
                <i className="fa-solid fa-hands-holding-heart absolute -bottom-6 -right-6 text-white/10 text-9xl" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                    <i className="fa-solid fa-wallet text-xl" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Sisa Budget</p>
                    <p className="text-lg font-bold text-slate-800">
                      {formatRupiah(state.totalBudget - totalExpenses)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Dari total {formatRupiah(state.totalBudget)}
                    </p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <i className="fa-solid fa-users text-xl" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Total Tamu / Pax</p>
                    <p className="text-lg font-bold text-slate-800">
                      {state.guests.length} Tamu (
                      {state.guests.reduce((s, g) => s + (g.pax || 1), 0)} Pax)
                    </p>
                    <p className="text-[10px] text-slate-400">
                      CPP: {guestStats.cpp} | CPW: {guestStats.cpw}
                    </p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                    <i className="fa-solid fa-handshake text-xl" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Vendor Deal</p>
                    <p className="text-lg font-bold text-slate-800">
                      {confirmedVendorsCount} / {state.vendors.length}
                    </p>
                    <p className="text-[10px] text-slate-400">Vendor telah terkonfirmasi</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                    <i className="fa-solid fa-file-shield text-xl" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Berkas KUA</p>
                    <p className="text-lg font-bold text-slate-800">
                      {completedDocsCount} / {kuaDocs.length}
                    </p>
                    <p className="text-[10px] text-slate-400">Dokumen administrasi siap</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <i className="fa-solid fa-list-check text-rose-500" /> Tugas Terdekat
                    </h3>
                    <button
                      onClick={() => setActiveTab("timeline")}
                      className="text-xs text-rose-600 hover:underline font-semibold"
                    >
                      Lihat Semua
                    </button>
                  </div>
                  <ul className="space-y-2.5">
                    {pendingChecklist.slice(0, 4).map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between text-xs sm:text-sm p-2.5 bg-slate-50 rounded-xl border border-slate-100"
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={item.done}
                            onChange={() =>
                              update((s) => ({
                                ...s,
                                checklist: s.checklist.map((c) =>
                                  c.id === item.id ? { ...c, done: !c.done } : c
                                ),
                              }))
                            }
                            className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                          />
                          <span className="text-slate-700">{item.task}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                          {item.timeframe}
                        </span>
                      </li>
                    ))}
                    {pendingChecklist.length === 0 && (
                      <li className="text-xs text-slate-400 text-center py-4">
                        Semua tugas timeline telah selesai! 🎉
                      </li>
                    )}
                  </ul>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <i className="fa-solid fa-store text-amber-500" /> Status Vendor Utama
                    </h3>
                    <button
                      onClick={() => setActiveTab("vendors")}
                      className="text-xs text-rose-600 hover:underline font-semibold"
                    >
                      Kelola Vendor
                    </button>
                  </div>
                  <div className="space-y-3">
                    {state.vendors.slice(0, 4).map((v) => (
                      <div
                        key={v.id}
                        className="flex justify-between items-center text-xs sm:text-sm p-2 bg-slate-50 rounded-xl"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          <span className="font-medium text-slate-700">{v.category}</span>
                          <span className="text-slate-400">({v.name || "Belum dipilih"})</span>
                        </div>
                        <span
                          className={`${getVendorBadgeClass(v.status)} text-[10px] px-2 py-0.5 rounded-full font-bold`}
                        >
                          {v.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === "mempelai" && (
            <section className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Data Pasangan Mempelai</h2>
                    <p className="text-xs text-slate-500">
                      Informasi detail calon pengantin pria, wanita, dan acara pernikahan
                    </p>
                  </div>
                  <button
                    onClick={() => update(state, false)}
                    className="bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-rose-700 transition"
                  >
                    <i className="fa-solid fa-floppy-disk mr-1" /> Simpan
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(["cpp", "cpw"] as const).map((side) => (
                    <div
                      key={side}
                      className="bg-rose-50/50 p-5 rounded-2xl border border-rose-100 space-y-4"
                    >
                      <div className="flex items-center space-x-2 text-rose-700 font-bold border-b border-rose-200/60 pb-2">
                        <i
                          className={`fa-solid ${side === "cpp" ? "fa-mars" : "fa-venus"} text-lg`}
                        />
                        <h3 className="font-cormorant text-xl">
                          {side === "cpp"
                            ? "Calon Pengantin Pria (CPP)"
                            : "Calon Pengantin Wanita (CPW)"}
                        </h3>
                      </div>
                      <div className="space-y-3 text-xs sm:text-sm">
                        {(
                          [
                            ["fullName", "Nama Lengkap & Gelar"],
                            ["nickname", "Nama Panggilan"],
                            ["father", "Nama Ayah Kandung"],
                            ["mother", "Nama Ibu Kandung"],
                            ["phone", "Kontak WhatsApp / HP"],
                          ] as const
                        ).map(([field, label]) => (
                          <div key={field}>
                            <label className="block font-medium text-slate-700 mb-1">{label}</label>
                            <input
                              type="text"
                              value={state.brideData[side][field]}
                              onChange={(e) =>
                                update((s) => ({
                                  ...s,
                                  brideData: {
                                    ...s.brideData,
                                    [side]: { ...s.brideData[side], [field]: e.target.value },
                                  },
                                }))
                              }
                              className="w-full rounded-xl border-slate-200 p-2.5 text-xs focus:ring-rose-500 focus:border-rose-500 border"
                            />
                          </div>
                        ))}
                        <div>
                          <label className="block font-medium text-slate-700 mb-1">
                            Alamat Domisili
                          </label>
                          <textarea
                            rows={2}
                            value={state.brideData[side].address}
                            onChange={(e) =>
                              update((s) => ({
                                ...s,
                                brideData: {
                                  ...s.brideData,
                                  [side]: { ...s.brideData[side], address: e.target.value },
                                },
                              }))
                            }
                            className="w-full rounded-xl border-slate-200 p-2.5 text-xs border focus:ring-rose-500 focus:border-rose-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-amber-50/40 p-5 rounded-2xl border border-amber-100 space-y-4">
                  <h3 className="font-cormorant text-xl font-bold text-amber-800 border-b border-amber-200 pb-2">
                    Informasi Waktu &amp; Lokasi Acara
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Tanggal Pernikahan
                      </label>
                      <input
                        type="date"
                        value={state.weddingDate}
                        onChange={(e) => update({ weddingDate: e.target.value })}
                        className="w-full rounded-xl border-slate-200 p-2.5 text-xs border"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Waktu Akad Nikah
                      </label>
                      <input
                        type="text"
                        value={state.akadTime}
                        onChange={(e) => update({ akadTime: e.target.value })}
                        placeholder="e.g. 08:00 WIB"
                        className="w-full rounded-xl border-slate-200 p-2.5 text-xs border"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Waktu Resepsi
                      </label>
                      <input
                        type="text"
                        value={state.resepsiTime}
                        onChange={(e) => update({ resepsiTime: e.target.value })}
                        placeholder="e.g. 11:00 - 13:00 WIB"
                        className="w-full rounded-xl border-slate-200 p-2.5 text-xs border"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-medium text-slate-700 mb-1">
                        Nama Venue / Gedung / Lokasi
                      </label>
                      <input
                        type="text"
                        value={state.weddingVenue}
                        onChange={(e) => update({ weddingVenue: e.target.value })}
                        className="w-full rounded-xl border-slate-200 p-2.5 text-xs border"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Tema / Dresscode
                      </label>
                      <input
                        type="text"
                        value={state.weddingTheme}
                        onChange={(e) => update({ weddingTheme: e.target.value })}
                        placeholder="e.g. Traditional Modern / Gold White"
                        className="w-full rounded-xl border-slate-200 p-2.5 text-xs border"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === "budget" && (
            <section className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Target Budget &amp; Tabungan</h2>
                    <p className="text-xs text-slate-500">
                      Monitor akumulasi tabungan vs estimasi total pengeluaran
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setBudgetForm({
                        id: "",
                        category: "Venue & Catering",
                        item: "",
                        estimated: 0,
                        actual: 0,
                        status: "Belum",
                      });
                      setShowBudgetModal(true);
                    }}
                    className="bg-rose-600 text-white px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-rose-700 transition"
                  >
                    <i className="fa-solid fa-plus mr-1" /> Tambah Pos Pengeluaran
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-500 font-medium">
                      Target Total Budget
                    </span>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-slate-400 font-bold">Rp</span>
                      <input
                        type="number"
                        value={state.totalBudget}
                        onChange={(e) => update({ totalBudget: Number(e.target.value) || 0 })}
                        className="text-xl font-bold text-slate-800 bg-transparent border-b border-dashed border-slate-400 focus:outline-none w-full"
                      />
                    </div>
                  </div>
                  <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100">
                    <span className="text-xs text-rose-600 font-medium">
                      Total Realisasi Pengeluaran
                    </span>
                    <p className="text-xl font-bold text-rose-700 mt-1">
                      {formatRupiah(totalExpenses)}
                    </p>
                  </div>
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                    <span className="text-xs text-emerald-600 font-medium">
                      Sisa Saldo Budget
                    </span>
                    <p className="text-xl font-bold text-emerald-700 mt-1">
                      {formatRupiah(state.totalBudget - totalExpenses)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 text-sm">
                    Rincian Pos Anggaran Pernikahan
                  </h3>
                  <span className="text-xs text-slate-400">{state.budgetList.length} Pos</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-100">
                        <th className="p-3">Kategori</th>
                        <th className="p-3">Item Keperluan</th>
                        <th className="p-3">Estimasi (Rp)</th>
                        <th className="p-3">Realisasi (Rp)</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {state.budgetList.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-rose-600">{item.category}</td>
                          <td className="p-3 font-medium">{item.item}</td>
                          <td className="p-3">{formatRupiah(item.estimated)}</td>
                          <td className="p-3 font-semibold">{formatRupiah(item.actual)}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.status === "Lunas"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : item.status === "DP"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-rose-100 text-rose-700"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-2">
                            <button
                              onClick={() => {
                                setBudgetForm(item);
                                setShowBudgetModal(true);
                              }}
                              className="text-slate-400 hover:text-rose-600"
                            >
                              <i className="fa-solid fa-pen" />
                            </button>
                            <button
                              onClick={() =>
                                update((s) => ({
                                  ...s,
                                  budgetList: s.budgetList.filter((b) => b.id !== item.id),
                                }))
                              }
                              className="text-slate-400 hover:text-red-600"
                            >
                              <i className="fa-solid fa-trash" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {activeTab === "seserahan" && (
            <section className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">
                      Daftar Mahar &amp; Hantaran Seserahan
                    </h2>
                    <p className="text-xs text-slate-500">
                      Checklist barang mahar akad nikah dan hantaran seserahan balasan
                    </p>
                  </div>
                </div>

                <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-cormorant text-2xl font-bold text-amber-900 flex items-center gap-2">
                      <i className="fa-solid fa-gem text-amber-600" /> Detail Mahar Utama
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                        Total Estimasi: {formatRupiah(totalMaharCost)}
                      </span>
                      <button
                        onClick={() => {
                          setSeserahanForm({
                            id: "",
                            title: "",
                            cost: 0,
                            ready: false,
                            link: "",
                            section: "mahar",
                          });
                          setShowSeserahanModal(true);
                        }}
                        className="bg-amber-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-amber-700 transition"
                      >
                        <i className="fa-solid fa-plus mr-1" /> Tambah
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {state.maharItems.map((m) => (
                      <div
                        key={m.id}
                        className="bg-white p-3 rounded-xl border border-amber-100 flex justify-between items-center text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-800">{m.title}</p>
                          <p className="text-slate-500">{formatRupiah(m.cost)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <span
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                              m.ready ? "text-emerald-600 bg-emerald-50" : "text-slate-400 bg-slate-50"
                            }`}
                          >
                            {m.ready ? "Siap" : "Belum"}
                          </span>
                          <button
                            onClick={() => {
                              setSeserahanForm({ ...m, section: "mahar", link: m.link ?? "" });
                              setShowSeserahanModal(true);
                            }}
                            className="text-slate-400 hover:text-blue-600 ml-1"
                          >
                            <i className="fa-solid fa-pen" />
                          </button>
                          <button
                            onClick={() =>
                              update((s) => ({
                                ...s,
                                maharItems: s.maharItems.filter((x) => x.id !== m.id),
                              }))
                            }
                            className="text-slate-400 hover:text-red-600 ml-1"
                          >
                            <i className="fa-solid fa-trash" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(
                    [
                      ["seserahanCppToCpw", "cppToCpw", "Seserahan Pria ke Wanita (CPP ➔ CPW)", "fa-rose-500", "text-rose-600"],
                      ["seserahanCpwToCpp", "cpwToCpp", "Seserahan Balasan (CPW ➔ CPP)", "fa-blue-500", "text-blue-600"],
                    ] as const
                  ).map(([key, section, title, icon, color]) => (
                    <div key={key} className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                          <i className={`fa-solid fa-box-open ${icon}`} /> {title}
                        </h3>
                        <button
                          onClick={() => {
                            setSeserahanForm({
                              id: "",
                              title: "",
                              cost: 0,
                              ready: false,
                              link: "",
                              section,
                            });
                            setShowSeserahanModal(true);
                          }}
                          className={`${color} hover:opacity-80 text-xs font-semibold`}
                        >
                          <i className="fa-solid fa-plus mr-1" /> Tambah
                        </button>
                      </div>
                      <div className="space-y-2">
                        {state[key].map((item) => (
                          <div
                            key={item.id}
                            className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center text-xs"
                          >
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={item.ready}
                                onChange={() =>
                                  update((s) => ({
                                    ...s,
                                    [key]: s[key].map((x) =>
                                      x.id === item.id ? { ...x, ready: !x.ready } : x
                                    ),
                                  }))
                                }
                                className="rounded text-rose-600"
                              />
                              <span
                                className={
                                  item.ready
                                    ? "line-through text-slate-400"
                                    : "text-slate-700 font-medium"
                                }
                              >
                                {item.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 font-semibold">
                                {formatRupiah(item.cost)}
                              </span>
                              <button
                                onClick={() => {
                                  setSeserahanForm({ ...item, section, link: item.link ?? "" });
                                  setShowSeserahanModal(true);
                                }}
                                className="text-slate-400 hover:text-blue-600"
                              >
                                <i className="fa-solid fa-pen" />
                              </button>
                              <button
                                onClick={() =>
                                  update((s) => ({
                                    ...s,
                                    [key]: s[key].filter((x) => x.id !== item.id),
                                  }))
                                }
                                className="text-slate-400 hover:text-red-600"
                              >
                                <i className="fa-solid fa-trash" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {activeTab === "vendors" && (
            <section className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Vendor &amp; Venue Pernikahan</h2>
                    <p className="text-xs text-slate-500">
                      Riset pembanding dan keputusan final vendor deal
                    </p>
                  </div>
                </div>

                {/* Vendor Final — card per kategori, selalu tampil */}
                <div className="space-y-3">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm sm:text-base">
                      <i className="fa-solid fa-crown text-amber-500" /> Vendor Final
                    </h3>
                    <p className="text-xs text-slate-500">
                      Vendor berstatus Deal per kategori — pilihan utama pernikahanmu
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {vendorCategories.map((cat) => {
                      const deals = finalVendors.filter((v) => v.category === cat);
                      return (
                        <div
                          key={cat}
                          className={`rounded-2xl border p-4 space-y-3 ${
                            deals.length
                              ? "bg-white border-rose-100 shadow-sm"
                              : "bg-slate-50/60 border-dashed border-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
                              {cat}
                            </span>
                            <button
                              onClick={() => openVendorModal(cat)}
                              aria-label={`Tambah vendor ${cat}`}
                              className="w-6 h-6 rounded-full bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                          {deals.length === 0 ? (
                            <div className="py-5 text-center">
                              <p className="text-xs text-slate-400">Belum ada vendor final</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {deals.map((v) => (
                                <div
                                  key={v.id}
                                  className="bg-slate-50/80 rounded-xl border border-slate-100 p-3 space-y-2"
                                >
                                  <div className="flex justify-between items-start gap-2">
                                    <h4 className="font-bold text-slate-800 text-sm leading-snug">
                                      {v.name}
                                    </h4>
                                    <span
                                      className={`${getVendorBadgeClass(v.status)} text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0`}
                                    >
                                      {v.status}
                                    </span>
                                  </div>
                                  {v.notes && (
                                    <p className="text-[11px] text-slate-500 line-clamp-2">
                                      {v.notes}
                                    </p>
                                  )}
                                  <p className="text-xs font-bold text-slate-800">
                                    {formatRupiah(v.price)}
                                  </p>
                                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                                    {v.contact ? (
                                      <a
                                        href={`https://wa.me/${v.contact}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-emerald-600 hover:text-emerald-700 font-bold"
                                      >
                                        <i className="fa-brands fa-whatsapp mr-1" /> Kontak
                                      </a>
                                    ) : (
                                      <span className="text-slate-300">—</span>
                                    )}
                                    <div className="space-x-2">
                                      <button
                                        onClick={() => editVendor(v)}
                                        className="text-slate-400 hover:text-blue-600"
                                        aria-label="Edit vendor"
                                      >
                                        <i className="fa-solid fa-pen" />
                                      </button>
                                      <button
                                        onClick={() => deleteVendor(v.id)}
                                        className="text-slate-400 hover:text-red-600"
                                        aria-label="Hapus vendor"
                                      >
                                        <i className="fa-solid fa-trash" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Kandidat — list baris vendor non-Deal */}
                <div className="space-y-3">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm sm:text-base">
                      <i className="fa-solid fa-clipboard-check text-slate-400" /> Kandidat Vendor
                    </h3>
                    <p className="text-xs text-slate-500">
                      Klik kolom Status untuk ubah langsung — pindah ke Deal otomatis naik ke Vendor Final
                    </p>
                  </div>
                  {candidateVendors.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-5">
                      Belum ada kandidat — vendor non-Deal akan tampil di sini
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse min-w-[560px] text-xs sm:text-sm">
                        <thead>
                          <tr>
                            <th className="bg-slate-100 text-slate-600 text-left px-4 py-2.5 font-bold rounded-tl-xl">
                              Nama Vendor
                            </th>
                            <th className="bg-slate-100 text-slate-600 text-left px-4 py-2.5 font-bold">
                              Kategori
                            </th>
                            <th className="bg-slate-100 text-slate-600 text-right px-4 py-2.5 font-bold">
                              Harga
                            </th>
                            <th className="bg-slate-100 text-slate-600 text-left px-4 py-2.5 font-bold">
                              Status
                            </th>
                            <th className="bg-slate-100 text-slate-600 text-right px-4 py-2.5 font-bold rounded-tr-xl">
                              Aksi
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {candidateVendors.map((v, i) => (
                            <tr
                              key={v.id}
                              className={i % 2 === 0 ? "bg-rose-50/50" : "bg-white"}
                            >
                              <td className="px-4 py-3 border-b border-slate-100 font-semibold text-slate-800">
                                {v.name}
                              </td>
                              <td className="px-4 py-3 border-b border-slate-100 text-slate-600">
                                {v.category}
                              </td>
                              <td className="px-4 py-3 border-b border-slate-100 text-slate-700 text-right">
                                <PriceCellInput
                                  value={v.price}
                                  label={`Harga — ${v.name}`}
                                  onCommit={(n) =>
                                    update((s) => ({
                                      ...s,
                                      vendors: s.vendors.map((x) =>
                                        x.id === v.id
                                          ? { ...x, price: n }
                                          : x
                                      ),
                                    }))
                                  }
                                />
                              </td>
                              <td className="px-4 py-3 border-b border-slate-100">
                                <select
                                  aria-label={`Status — ${v.name}`}
                                  value={v.status}
                                  onChange={(e) =>
                                    update((s) => ({
                                      ...s,
                                      vendors: s.vendors.map((x) =>
                                        x.id === v.id
                                          ? { ...x, status: e.target.value }
                                          : x
                                      ),
                                    }))
                                  }
                                  className={`${getVendorBadgeClass(
                                    v.status
                                  )} text-[10px] px-2 py-1 pr-6 rounded-full font-bold cursor-pointer focus:ring-2 focus:ring-rose-500`}
                                >
                                  <option>Survey / Pitching</option>
                                  <option>Deal</option>
                                  <option>Batal</option>
                                </select>
                              </td>
                              <td className="px-4 py-3 border-b border-slate-100 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-3">
                                  <button
                                    onClick={() => editVendor(v)}
                                    className="text-slate-400 hover:text-blue-600"
                                    aria-label="Edit vendor"
                                  >
                                    <i className="fa-solid fa-pen" />
                                  </button>
                                  <button
                                    onClick={() => deleteVendor(v.id)}
                                    className="text-slate-400 hover:text-red-600"
                                    aria-label="Hapus vendor"
                                  >
                                    <i className="fa-solid fa-trash" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {activeTab === "administrasi" && (
            <section className="space-y-6">
              <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-xl font-bold text-slate-800">
                    Administrasi &amp; Surat Persyaratan Nikah (KUA)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Kelengkapan dokumen resmi persyaratan pendaftaran nikah di KUA / Catatan Sipil
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[480px]">
                    <thead>
                      <tr>
                        <th className="bg-rose-600 text-white text-left px-4 py-3 rounded-tl-xl text-xs sm:text-sm font-bold">
                          Administrasi Persiapan Menikah
                        </th>
                        <th className="bg-rose-600 text-white px-4 py-3 text-xs sm:text-sm font-bold w-20">
                          CPP
                        </th>
                        <th className="bg-rose-600 text-white px-4 py-3 rounded-tr-xl text-xs sm:text-sm font-bold w-20">
                          CPW
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.adminDocs
                        .filter((doc) => !isKuaStep(doc))
                        .map((doc, i) => (
                          <tr
                            key={doc.id}
                            className={
                              i % 2 === 0 ? "bg-rose-50/70" : "bg-white"
                            }
                          >
                            <td className="px-4 py-3 text-xs sm:text-sm text-slate-700 border-b border-rose-100">
                              {doc.title}
                            </td>
                            <td className="px-4 py-3 border-b border-rose-100 text-center">
                              <input
                                type="checkbox"
                                aria-label={`CPP — ${doc.title}`}
                                checked={doc.doneCpp}
                                onChange={() =>
                                  update((s) => ({
                                    ...s,
                                    adminDocs: s.adminDocs.map((d) =>
                                      d.id === doc.id
                                        ? { ...d, doneCpp: !d.doneCpp }
                                        : d
                                    ),
                                  }))
                                }
                                className="rounded text-rose-600 w-4 h-4 focus:ring-rose-500 align-middle"
                              />
                            </td>
                            <td className="px-4 py-3 border-b border-rose-100 text-center">
                              <input
                                type="checkbox"
                                aria-label={`CPW — ${doc.title}`}
                                checked={doc.doneCpw}
                                onChange={() =>
                                  update((s) => ({
                                    ...s,
                                    adminDocs: s.adminDocs.map((d) =>
                                      d.id === doc.id
                                        ? { ...d, doneCpw: !d.doneCpw }
                                        : d
                                    ),
                                  }))
                                }
                                className="rounded text-rose-600 w-4 h-4 focus:ring-rose-500 align-middle"
                              />
                            </td>
                          </tr>
                        ))}
                      {state.adminDocs
                        .filter((doc) => isKuaStep(doc))
                        .map((doc, i, arr) => (
                          <tr
                            key={doc.id}
                            className={
                              i === arr.length - 1
                                ? "bg-rose-50/70"
                                : "bg-white"
                            }
                          >
                            <td className="px-4 py-3 text-xs sm:text-sm font-semibold text-slate-700 border-b border-rose-100">
                              {doc.title}
                            </td>
                            <td
                              colSpan={2}
                              className="px-4 py-3 border-b border-rose-100"
                            >
                              <select
                                aria-label={doc.title}
                                value={doc.status ?? "Belum"}
                                onChange={(e) =>
                                  update((s) => ({
                                    ...s,
                                    adminDocs: s.adminDocs.map((d) =>
                                      d.id === doc.id
                                        ? { ...d, status: e.target.value }
                                        : d
                                    ),
                                  }))
                                }
                                className="w-full sm:w-56 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-700 focus:ring-rose-500 focus:border-rose-500"
                              >
                                <option value="Belum">Belum</option>
                                <option value="Proses">Proses</option>
                                <option value="Selesai">Selesai</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-slate-400">
                  Progres: {completedDocsCount} / {kuaDocs.length} dokumen
                  lengkap (CPP &amp; CPW tercentang)
                </p>
              </div>
            </section>
          )}

          {activeTab === "undangan" && (
            <section className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Daftar Tamu Undangan</h2>
                    <p className="text-xs text-slate-500">
                      Kelola kuota tamu CPP &amp; CPW, konfirmasi RSVP, serta kategori VIP
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setGuestForm({
                        name: "",
                        side: "CPP",
                        category: "Sahabat / Teman",
                        pax: 2,
                        isVip: false,
                      });
                      setShowGuestModal(true);
                    }}
                    className="bg-rose-600 text-white px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-rose-700 transition"
                  >
                    <i className="fa-solid fa-plus mr-1" /> Tambah Undangan
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-100">
                    <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                      <span>Tamu Pihak CPP</span>
                      <span>
                        {guestStats.cpp} Undangan ({guestStats.cppPct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-rose-600 h-2" style={{ width: `${guestStats.cppPct}%` }} />
                    </div>
                  </div>
                  <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100">
                    <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                      <span>Tamu Pihak CPW</span>
                      <span>
                        {guestStats.cpw} Undangan ({guestStats.cpwPct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-2" style={{ width: `${guestStats.cpwPct}%` }} />
                    </div>
                  </div>
                  <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100">
                    <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                      <span>Konfirmasi Hadir</span>
                      <span>{guestStats.attending} Tamu</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-2"
                        style={{
                          width: `${(guestStats.attending / (state.guests.length || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-2">
                  <div className="flex items-center space-x-2">
                    {(["ALL", "CPP", "CPW"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setGuestFilter(f)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                          guestFilter === f
                            ? "bg-rose-600 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {f === "ALL" ? "Semua" : f}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={guestSearch}
                    onChange={(e) => setGuestSearch(e.target.value)}
                    placeholder="Cari nama tamu..."
                    className="rounded-xl border-slate-200 px-3 py-1 text-xs border"
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-100">
                        <th className="p-3">Nama Tamu</th>
                        <th className="p-3">Pihak</th>
                        <th className="p-3">Kategori</th>
                        <th className="p-3">Pax</th>
                        <th className="p-3">Status Undangan</th>
                        <th className="p-3">RSVP</th>
                        <th className="p-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredGuests.map((g) => (
                        <tr key={g.id} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-800">
                            {g.name}
                            {g.isVip && (
                              <span className="ml-1 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                VIP
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span
                              className={
                                g.side === "CPP"
                                  ? "text-rose-600 font-bold"
                                  : "text-blue-600 font-bold"
                              }
                            >
                              {g.side}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500">{g.category}</td>
                          <td className="p-3 font-bold">{g.pax} Pax</td>
                          <td className="p-3">
                            <button
                              onClick={() =>
                                update((s) => ({
                                  ...s,
                                  guests: s.guests.map((x) =>
                                    x.id === g.id ? { ...x, sent: !x.sent } : x
                                  ),
                                }))
                              }
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                g.sent
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {g.sent ? "Terkirim" : "Belum"}
                            </button>
                          </td>
                          <td className="p-3">
                            <select
                              value={g.status}
                              onChange={(e) =>
                                update((s) => ({
                                  ...s,
                                  guests: s.guests.map((x) =>
                                    x.id === g.id ? { ...x, status: e.target.value } : x
                                  ),
                                }))
                              }
                              className="text-xs rounded-lg border-slate-200 py-1 border"
                            >
                              <option value="Hadir">Hadir</option>
                              <option value="Belum Konfirmasi">Belum Konfirmasi</option>
                              <option value="Ragu">Ragu-ragu</option>
                              <option value="Tidak Hadir">Tidak Hadir</option>
                            </select>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() =>
                                update((s) => ({
                                  ...s,
                                  guests: s.guests.filter((x) => x.id !== g.id),
                                }))
                              }
                              className="text-slate-400 hover:text-red-600"
                            >
                              <i className="fa-solid fa-trash" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {activeTab === "timeline" && (
            <section className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">
                      Timeline Checklist Persiapan Nikah
                    </h2>
                    <p className="text-xs text-slate-500">
                      Panduan urutan tugas ideal dari H-12 Bulan sampai H-1 Hari Pernikahan
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setTimelineForm({
                        id: "",
                        timeframe: "H-12 s/d H-9 Bulan",
                        task: "",
                        done: false,
                      });
                      setShowTimelineModal(true);
                    }}
                    className="bg-rose-600 text-white px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-rose-700 transition"
                  >
                    <i className="fa-solid fa-plus mr-1" /> Tambah Timeline
                  </button>
                </div>
                <div className="space-y-6">
                  {Object.entries(groupedChecklist).map(([period, group]) => (
                    <div key={period} className="space-y-3">
                      <h3 className="font-cormorant text-xl font-bold text-rose-700 border-b border-rose-100 pb-1 flex items-center gap-2">
                        <i className="fa-solid fa-clock text-rose-500 text-sm" /> {period}
                      </h3>
                      <div className="grid grid-cols-1 gap-2">
                        {group.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between hover:bg-slate-100/80 transition gap-2"
                          >
                            <div className="flex items-center space-x-2">
                              <label className="flex items-center space-x-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={item.done}
                                  onChange={() =>
                                    update((s) => ({
                                      ...s,
                                      checklist: s.checklist.map((c) =>
                                        c.id === item.id ? { ...c, done: !c.done } : c
                                      ),
                                    }))
                                  }
                                  className="rounded text-rose-600 w-4 h-4 focus:ring-rose-500"
                                />
                                <span
                                  className={`text-xs sm:text-sm ${
                                    item.done
                                      ? "line-through text-slate-400"
                                      : "text-slate-700 font-medium"
                                  }`}
                                >
                                  {item.task}
                                </span>
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                                  item.done
                                    ? "text-emerald-600 bg-emerald-50"
                                    : "text-slate-400 bg-slate-100"
                                }`}
                              >
                                {item.done ? "Selesai" : "Pending"}
                              </span>
                              <button
                                onClick={() => {
                                  setTimelineForm(item);
                                  setShowTimelineModal(true);
                                }}
                                className="text-slate-400 hover:text-blue-600 text-xs"
                              >
                                <i className="fa-solid fa-pen" />
                              </button>
                              <button
                                onClick={() =>
                                  update((s) => ({
                                    ...s,
                                    checklist: s.checklist.filter((c) => c.id !== item.id),
                                  }))
                                }
                                className="text-slate-400 hover:text-red-600 text-xs"
                              >
                                <i className="fa-solid fa-trash" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {activeTab === "rundown" && (
            <section className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Rundown Acara Hari-H</h2>
                    <p className="text-xs text-slate-500">
                      Jadwal urutan susunan acara akad &amp; resepsi
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      update((s) => ({
                        ...s,
                        rundownList: [
                          ...s.rundownList,
                          { id: newId(), time: "12:00 WIB", activity: "Acara Baru", pic: "WO" },
                        ],
                      }))
                    }
                    className="bg-rose-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold"
                  >
                    <i className="fa-solid fa-plus mr-1" /> Tambah Acara
                  </button>
                </div>
                <div className="space-y-2">
                  {state.rundownList.map((r) => (
                    <div
                      key={r.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-12 gap-2 items-center text-xs"
                    >
                      <input
                        type="text"
                        value={r.time}
                        onChange={(e) =>
                          update((s) => ({
                            ...s,
                            rundownList: s.rundownList.map((x) =>
                              x.id === r.id ? { ...x, time: e.target.value } : x
                            ),
                          }))
                        }
                        placeholder="Waktu (08:00)"
                        className="col-span-3 sm:col-span-2 rounded-lg border-slate-200 text-xs font-bold border p-2"
                      />
                      <input
                        type="text"
                        value={r.activity}
                        onChange={(e) =>
                          update((s) => ({
                            ...s,
                            rundownList: s.rundownList.map((x) =>
                              x.id === r.id ? { ...x, activity: e.target.value } : x
                            ),
                          }))
                        }
                        placeholder="Nama Kegiatan"
                        className="col-span-5 sm:col-span-6 rounded-lg border-slate-200 text-xs border p-2"
                      />
                      <input
                        type="text"
                        value={r.pic}
                        onChange={(e) =>
                          update((s) => ({
                            ...s,
                            rundownList: s.rundownList.map((x) =>
                              x.id === r.id ? { ...x, pic: e.target.value } : x
                            ),
                          }))
                        }
                        placeholder="PIC / Penanggungjawab"
                        className="col-span-3 sm:col-span-3 rounded-lg border-slate-200 text-xs border p-2"
                      />
                      <button
                        onClick={() =>
                          update((s) => ({
                            ...s,
                            rundownList: s.rundownList.filter((x) => x.id !== r.id),
                          }))
                        }
                        className="col-span-1 text-slate-400 hover:text-red-600 text-right"
                      >
                        <i className="fa-solid fa-xmark" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-xl font-bold text-slate-800">
                    Susunan Panitia Keluarga &amp; Seragam
                  </h2>
                  <p className="text-xs text-slate-500">
                    Daftar petugas penerima tamu, saksi, dan pembagian seragam
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {state.committeeList.map((p) => (
                    <div
                      key={p.id}
                      className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-rose-700 text-xs">{p.role}</span>
                        <input
                          type="checkbox"
                          checked={p.uniformGiven}
                          onChange={() =>
                            update((s) => ({
                              ...s,
                              committeeList: s.committeeList.map((x) =>
                                x.id === p.id ? { ...x, uniformGiven: !x.uniformGiven } : x
                              ),
                            }))
                          }
                          className="rounded text-rose-600"
                        />
                      </div>
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) =>
                          update((s) => ({
                            ...s,
                            committeeList: s.committeeList.map((x) =>
                              x.id === p.id ? { ...x, name: e.target.value } : x
                            ),
                          }))
                        }
                        className="w-full rounded-lg border-slate-200 text-xs border p-2"
                        placeholder="Nama Petugas / Panitia"
                      />
                      <p className="text-[10px] text-slate-400">
                        Status Seragam:{" "}
                        {p.uniformGiven ? "Kain/Seragam Sudah Diberikan" : "Belum Diserahkan"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      <footer className="border-t border-slate-100 bg-white py-5 mt-auto">
        <BrandCredit />
      </footer>

      <Modal
        open={showBudgetModal}
        title="Tambah / Edit Pos Budget"
        
        footer={
          <>
            <button
              onClick={() => setShowBudgetModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl"
            >
              Batal
            </button>
            <button
              onClick={() => {
                if (!budgetForm.item) return;
                update((s) => {
                  if (budgetForm.id) {
                    return {
                      ...s,
                      budgetList: s.budgetList.map((b) =>
                        b.id === budgetForm.id ? { ...budgetForm } : b
                      ),
                    };
                  }
                  return { ...s, budgetList: [...s.budgetList, { ...budgetForm, id: newId() }] };
                }, false);
                setShowBudgetModal(false);
                showToast("Pos budget berhasil diperbarui!");
              }}
              className="px-4 py-2 text-xs font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-700"
            >
              Simpan
            </button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-medium mb-1">Kategori</label>
            <select
              value={budgetForm.category}
              onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })}
              className="w-full rounded-xl border-slate-200 p-2.5 border"
            >
              <option>Venue & Catering</option>
              <option>Dekorasi</option>
              <option>Attire & MUA</option>
              <option>Dokumentasi</option>
              <option>Undangan & Souvenir</option>
              <option>Entertainment & Sound</option>
              <option>Lainnya</option>
            </select>
          </div>
          <div>
            <label className="block font-medium mb-1">Nama Item</label>
            <input
              type="text"
              value={budgetForm.item}
              onChange={(e) => setBudgetForm({ ...budgetForm, item: e.target.value })}
              className="w-full rounded-xl border-slate-200 p-2.5 border"
              placeholder="Nama pos, mis. Sewa Ballroom & Catering 500 Pax"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Estimasi Biaya (Rp)</label>
            <input
              type="number"
              value={budgetForm.estimated}
              onChange={(e) =>
                setBudgetForm({ ...budgetForm, estimated: Number(e.target.value) || 0 })
              }
              className="w-full rounded-xl border-slate-200 p-2.5 border"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Realisasi / Biaya Aktual (Rp)</label>
            <input
              type="number"
              value={budgetForm.actual}
              onChange={(e) => setBudgetForm({ ...budgetForm, actual: Number(e.target.value) || 0 })}
              className="w-full rounded-xl border-slate-200 p-2.5 border"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Status Pembayaran</label>
            <select
              value={budgetForm.status}
              onChange={(e) => setBudgetForm({ ...budgetForm, status: e.target.value })}
              className="w-full rounded-xl border-slate-200 p-2.5 border"
            >
              <option value="Belum">Belum Bayar</option>
              <option value="DP">DP (Uang Muka)</option>
              <option value="Lunas">Lunas</option>
            </select>
          </div>
        </div>
      </Modal>

      <Modal
        open={showGuestModal}
        title="Tambah Tamu Undangan"
        
        footer={
          <>
            <button
              onClick={() => setShowGuestModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl"
            >
              Batal
            </button>
            <button
              onClick={() => {
                if (!guestForm.name) return;
                update(
                  (s) => ({
                    ...s,
                    guests: [
                      ...s.guests,
                      {
                        ...guestForm,
                        id: newId(),
                        sent: false,
                        status: "Belum Konfirmasi",
                      },
                    ],
                  }),
                  false
                );
                setShowGuestModal(false);
                showToast("Tamu undangan ditambahkan!");
              }}
              className="px-4 py-2 text-xs font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-700"
            >
              Simpan Tamu
            </button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-medium mb-1">Nama Tamu / Tamu Keluarga</label>
            <input
              type="text"
              value={guestForm.name}
              onChange={(e) => setGuestForm({ ...guestForm, name: e.target.value })}
              className="w-full rounded-xl border-slate-200 p-2.5 border"
              placeholder="Nama tamu, mis. Bpk. Dr. H. Subroto & Istri"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Pihak Pengantin</label>
            <select
              value={guestForm.side}
              onChange={(e) => setGuestForm({ ...guestForm, side: e.target.value })}
              className="w-full rounded-xl border-slate-200 p-2.5 border"
            >
              <option value="CPP">CPP (Pria)</option>
              <option value="CPW">CPW (Wanita)</option>
            </select>
          </div>
          <div>
            <label className="block font-medium mb-1">Kategori Tamu</label>
            <select
              value={guestForm.category}
              onChange={(e) => setGuestForm({ ...guestForm, category: e.target.value })}
              className="w-full rounded-xl border-slate-200 p-2.5 border"
            >
              <option>Keluarga Inti</option>
              <option>Keluarga Besar</option>
              <option>Sahabat / Teman</option>
              <option>Rekan Kerja</option>
              <option>VIP / Tokoh</option>
            </select>
          </div>
          <div>
            <label className="block font-medium mb-1">Jumlah Pax (Orang)</label>
            <input
              type="number"
              min={1}
              value={guestForm.pax}
              onChange={(e) => setGuestForm({ ...guestForm, pax: Number(e.target.value) || 1 })}
              className="w-full rounded-xl border-slate-200 p-2.5 border"
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={guestForm.isVip}
              onChange={(e) => setGuestForm({ ...guestForm, isVip: e.target.checked })}
              className="rounded text-rose-600"
            />
            <label className="font-medium text-slate-700">Tandai Sebagai Tamu VIP</label>
          </div>
        </div>
      </Modal>

      <Modal
        open={showVendorModal}
        title={`${vendorForm.id ? "Edit" : "Tambah"} Vendor / Venue`}
        
        footer={
          <>
            <button
              onClick={() => setShowVendorModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl"
            >
              Batal
            </button>
            <button
              onClick={() => {
                if (!vendorForm.name) return;
                update((s) => {
                  if (vendorForm.id) {
                    return {
                      ...s,
                      vendors: s.vendors.map((v) => (v.id === vendorForm.id ? { ...vendorForm } : v)),
                    };
                  }
                  return { ...s, vendors: [...s.vendors, { ...vendorForm, id: newId() }] };
                }, false);
                setShowVendorModal(false);
                showToast("Vendor berhasil disimpan!");
              }}
              className="px-4 py-2 text-xs font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-700"
            >
              Simpan Vendor
            </button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-medium mb-1">Nama Vendor / Venue</label>
            <input
              type="text"
              value={vendorForm.name}
              onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
              className="w-full rounded-xl border-slate-200 p-2.5 border"
              placeholder="Nama vendor, mis. Hotel Mulia"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Kategori</label>
            <select
              value={vendorForm.category}
              onChange={(e) => setVendorForm({ ...vendorForm, category: e.target.value })}
              className="w-full rounded-xl border-slate-200 p-2.5 border"
            >
              <option>Venue</option>
              <option>Catering</option>
              <option>Dekorasi</option>
              <option>MUA</option>
              <option>Foto & Video</option>
              <option>Entertainment</option>
              <option>Undangan & Souvenir</option>
              <option>Lainnya</option>
            </select>
          </div>
          <div>
            <label className="block font-medium mb-1">Harga Penawaran (Rp)</label>
            <input
              type="number"
              value={vendorForm.price}
              onChange={(e) => setVendorForm({ ...vendorForm, price: Number(e.target.value) || 0 })}
              className="w-full rounded-xl border-slate-200 p-2.5 border"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Status</label>
            <select
              value={vendorForm.status}
              onChange={(e) => setVendorForm({ ...vendorForm, status: e.target.value })}
              className="w-full rounded-xl border-slate-200 p-2.5 border"
            >
              <option>Survey / Pitching</option>
              <option>Deal</option>
              <option>Batal</option>
            </select>
          </div>
          <div>
            <label className="block font-medium mb-1">Nomor WhatsApp (opsional)</label>
            <input
              type="text"
              value={vendorForm.contact}
              onChange={(e) => setVendorForm({ ...vendorForm, contact: e.target.value })}
              className="w-full rounded-xl border-slate-200 p-2.5 border"
              placeholder="62812xxxxxxx"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Catatan (opsional)</label>
            <textarea
              rows={2}
              value={vendorForm.notes}
              onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })}
              className="w-full rounded-xl border-slate-200 p-2.5 border"
              placeholder="Catatan tentang vendor..."
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={showTimelineModal}
        title={`${timelineForm.id ? "Edit" : "Tambah"} Timeline`}
        
        footer={
          <>
            <button
              onClick={() => setShowTimelineModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl"
            >
              Batal
            </button>
            <button
              onClick={() => {
                if (!timelineForm.task) return;
                update((s) => {
                  if (timelineForm.id) {
                    return {
                      ...s,
                      checklist: s.checklist.map((c) =>
                        c.id === timelineForm.id ? { ...timelineForm } : c
                      ),
                    };
                  }
                  return {
                    ...s,
                    checklist: [...s.checklist, { ...timelineForm, id: newId(), done: false }],
                  };
                }, false);
                setShowTimelineModal(false);
                showToast("Timeline berhasil disimpan!");
              }}
              className="px-4 py-2 text-xs font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-700"
            >
              Simpan
            </button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-medium mb-1">Nama Tugas</label>
            <input
              type="text"
              value={timelineForm.task}
              onChange={(e) => setTimelineForm({ ...timelineForm, task: e.target.value })}
              className="w-full rounded-xl border-slate-200 p-2.5 border"
              placeholder="Nama tugas, mis. Cetak & Distribusi Undangan"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Periode Waktu</label>
            <select
              value={timelineForm.timeframe}
              onChange={(e) => setTimelineForm({ ...timelineForm, timeframe: e.target.value })}
              className="w-full rounded-xl border-slate-200 p-2.5 border"
            >
              <option>H-12 s/d H-9 Bulan</option>
              <option>H-8 s/d H-6 Bulan</option>
              <option>H-5 s/d H-3 Bulan</option>
              <option>H-2 s/d H-1 Bulan</option>
              <option>H-1 Minggu s/d H-1 Hari</option>
            </select>
          </div>
        </div>
      </Modal>

      <Modal
        open={showSeserahanModal}
        title={`${seserahanForm.id ? "Edit" : "Tambah"} ${
          seserahanForm.section === "mahar" ? "Mahar" : "Seserahan"
        }`}
        
        footer={
          <>
            <button
              onClick={() => setShowSeserahanModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl"
            >
              Batal
            </button>
            <button
              onClick={() => {
                if (!seserahanForm.title) return;
                const section = seserahanForm.section;
                const key =
                  section === "mahar"
                    ? "maharItems"
                    : section === "cppToCpw"
                      ? "seserahanCppToCpw"
                      : "seserahanCpwToCpp";
                update((s) => {
                  const list = s[key] as SeserahanItem[];
                  const payload: SeserahanItem = {
                    id: seserahanForm.id || newId(),
                    title: seserahanForm.title,
                    cost: seserahanForm.cost,
                    ready: seserahanForm.ready,
                    link: seserahanForm.link || "",
                  };
                  if (seserahanForm.id) {
                    return {
                      ...s,
                      [key]: list.map((x) => (x.id === seserahanForm.id ? payload : x)),
                    };
                  }
                  return { ...s, [key]: [...list, payload] };
                }, false);
                setShowSeserahanModal(false);
                showToast("Item berhasil disimpan!");
              }}
              className="px-4 py-2 text-xs font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-700"
            >
              Simpan
            </button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-medium mb-1">Nama Item</label>
            <input
              type="text"
              value={seserahanForm.title}
              onChange={(e) => setSeserahanForm({ ...seserahanForm, title: e.target.value })}
              className="w-full rounded-xl border-slate-200 p-2.5 border"
              placeholder="Nama item mahar, mis. Logam Mulia Antam 10 Gram"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Estimasi Harga (Rp)</label>
            <input
              type="number"
              value={seserahanForm.cost}
              onChange={(e) =>
                setSeserahanForm({ ...seserahanForm, cost: Number(e.target.value) || 0 })
              }
              className="w-full rounded-xl border-slate-200 p-2.5 border"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Link Marketplace (opsional)</label>
            <input
              type="url"
              value={seserahanForm.link ?? ""}
              onChange={(e) => setSeserahanForm({ ...seserahanForm, link: e.target.value })}
              className="w-full rounded-xl border-slate-200 p-2.5 border"
              placeholder="https://tokopedia.com/..."
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={seserahanForm.ready}
              onChange={(e) => setSeserahanForm({ ...seserahanForm, ready: e.target.checked })}
              className="rounded text-rose-600"
            />
            <label className="font-medium text-slate-700">Sudah Siap / Dikirim</label>
          </div>
        </div>
      </Modal>

      <Modal
        open={showResetModal}
        title="Reset Data ke Setelan Demo?"
        footer={
          <>
            <button
              onClick={() => setShowResetModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl"
            >
              Batal
            </button>
            <button
              onClick={() => void resetData()}
              className="px-4 py-2 text-xs font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700"
            >
              Ya, Reset Data
            </button>
          </>
        }
      >
        <p className="text-xs text-slate-500 leading-relaxed">
          Seluruh data pernikahan (budget, mempelai, tamu, vendor, checklist, rundown, dll.)
          akan dihapus dan diganti kembali dengan data demo standar. Tindakan ini tidak bisa
          dibatalkan.
        </p>
      </Modal>

      {toastMsg && (
        <div className="fixed bottom-5 right-5 bg-slate-800 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-medium flex items-center space-x-2 z-50 animate-bounce">
          <i className="fa-solid fa-circle-check text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
