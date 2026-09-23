"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  deleteUserAction,
  grantPurchaseAction,
  resetPasswordAction,
  revokePurchaseAction,
  sendResetLinkAction,
  type AdminActionResult,
} from "@/actions/admin";

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
};

export type AdminPurchase = {
  id: string;
  email: string | null;
  refId: string | null;
  userId: string | null;
  createdAt: string;
};

export type AdminStats = {
  totalUsers: number;
  purchasesTotal: number;
  purchasesUsed: number;
  purchasesAvailable: number;
  newUsers7d: number;
  userWeekly: { label: string; count: number }[];
  userDaily: { date: string; cumulative: number }[];
};

const ROSE = "#e11d48";
const SLATE = "#cbd5e1";

type ModalState =
  | { type: "resetPw"; user: AdminUser }
  | { type: "delete"; user: AdminUser }
  | null;

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      {children}
    </div>
  );
}

function Modal({
  title,
  children,
  footer,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-slate-800">{title}</h3>
        {children}
        <div className="flex justify-end gap-2 pt-1">{footer}</div>
      </div>
    </div>
  );
}

export function AdminPanel({
  users,
  purchases,
  stats,
}: {
  users: AdminUser[];
  purchases: AdminPurchase[];
  stats: AdminStats;
}) {
  const router = useRouter();
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [grantEmail, setGrantEmail] = useState("");
  const [grantNote, setGrantNote] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  async function run(p: Promise<AdminActionResult>, refresh = true) {
    setBusy(true);
    try {
      const res = await p;
      if (res.error) setToast({ ok: false, msg: res.error });
      else {
        setToast({ ok: true, msg: res.success || "Berhasil" });
        setModal(null);
        if (refresh) router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  const pieData = [
    { name: "Terpakai", value: stats.purchasesUsed },
    { name: "Tersedia", value: stats.purchasesAvailable },
  ].filter((d) => d.value > 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-xl text-sm font-semibold text-white shadow-lg ${
            toast.ok ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Admin Panel</h1>
          <p className="text-xs text-slate-500">
            Monitoring member, akses, dan statistik NikahPlan
          </p>
        </div>
        <a
          href="/dashboard"
          className="text-xs font-semibold text-rose-600 hover:underline"
        >
          ← Dashboard
        </a>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total User", value: stats.totalUsers },
          {
            label: "Pembelian terpakai",
            value: `${stats.purchasesUsed}/${stats.purchasesTotal}`,
          },
          {
            label: "Akses tersedia",
            value: stats.purchasesAvailable,
          },
          { label: "User baru (7 hari)", value: stats.newUsers7d },
        ].map((s) => (
          <Card key={s.label}>
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              {s.value}
            </p>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm font-semibold text-slate-700 mb-3">
            Status Pembelian
          </p>
          {pieData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-slate-400">
              Belum ada data
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    <Cell fill={ROSE} />
                    <Cell fill={SLATE} />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="flex gap-4 justify-center text-[11px] text-slate-500">
            <span>
              <span
                className="inline-block w-2 h-2 rounded-full mr-1"
                style={{ background: ROSE }}
              />
              Terpakai ({stats.purchasesUsed})
            </span>
            <span>
              <span
                className="inline-block w-2 h-2 rounded-full mr-1"
                style={{ background: SLATE }}
              />
              Tersedia ({stats.purchasesAvailable})
            </span>
          </div>
        </Card>

        <Card>
          <p className="text-sm font-semibold text-slate-700 mb-3">
            User Baru / Minggu
          </p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.userWeekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
                <Tooltip />
                <Bar dataKey="count" fill={ROSE} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <p className="text-sm font-semibold text-slate-700 mb-3">
            Total User (kumulatif30 hari)
          </p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.userDaily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9 }}
                  interval={6}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke={ROSE}
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Tabel user */}
      <Card>
        <p className="text-sm font-semibold text-slate-700 mb-3">
          User ({users.length})
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Nama</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Daftar</th>
                <th className="py-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-slate-50 text-slate-600"
                >
                  <td className="py-2.5 pr-3 font-medium">{u.email}</td>
                  <td className="py-2.5 pr-3">{u.name || "—"}</td>
                  <td className="py-2.5 pr-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        u.role === "admin"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">{fmtDate(u.createdAt)}</td>
                  <td className="py-2.5">
                    <div className="flex gap-2">
                      <button
                        onClick={() => void run(sendResetLinkAction(u.id), false)}
                        disabled={busy}
                        className="text-[11px] font-semibold text-sky-600 hover:underline disabled:opacity-50"
                      >
                        Kirim link reset
                      </button>
                      <button
                        onClick={() => {
                          setPw("");
                          setModal({ type: "resetPw", user: u });
                        }}
                        className="text-[11px] font-semibold text-amber-600 hover:underline"
                      >
                        Reset PW
                      </button>
                      <button
                        onClick={() => setModal({ type: "delete", user: u })}
                        className="text-[11px] font-semibold text-red-600 hover:underline"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    Belum ada user
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Tabel purchase + form tambah */}
      <Card>
        <p className="text-sm font-semibold text-slate-700 mb-3">
          Pembelian / Akses ({purchases.length})
        </p>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            type="email"
            value={grantEmail}
            onChange={(e) => setGrantEmail(e.target.value)}
            placeholder="email@pembeli.com"
            className="flex-1 rounded-xl border border-slate-200 p-2.5 text-xs"
          />
          <input
            value={grantNote}
            onChange={(e) => setGrantNote(e.target.value)}
            placeholder="catatan (opsional)"
            className="sm:w-48 rounded-xl border border-slate-200 p-2.5 text-xs"
          />
          <button
            onClick={() => void run(grantPurchaseAction(grantEmail, grantNote))}
            disabled={busy || !grantEmail}
            className="px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-50"
          >
            + Tambah Akses
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Ref / Catatan</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Tanggal</th>
                <th className="py-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-50 text-slate-600"
                >
                  <td className="py-2.5 pr-3 font-medium">
                    {p.email || "—"}
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-[10px]">
                    {p.refId || "—"}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        p.userId
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {p.userId ? "terpakai" : "tersedia"}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">{fmtDate(p.createdAt)}</td>
                  <td className="py-2.5">
                    {p.userId ? (
                      <span className="text-slate-300 text-[11px]">
                        pakai hapus akun
                      </span>
                    ) : (
                      <button
                        onClick={() => void run(revokePurchaseAction(p.id))}
                        disabled={busy}
                        className="text-[11px] font-semibold text-red-600 hover:underline disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {purchases.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    Belum ada pembelian
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal reset password */}
      {modal?.type === "resetPw" && (
        <Modal
          title={`Reset password — ${modal.user.email}`}
          onClose={() => setModal(null)}
          footer={
            <>
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={() =>
                  void run(resetPasswordAction(modal.user.id, pw), false)
                }
                disabled={busy || pw.length < 8}
                className="px-4 py-2 text-xs font-semibold bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-50"
              >
                Simpan Password
              </button>
            </>
          }
        >
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Password baru (min.8 karakter)"
            className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
          />
          <p className="text-[11px] text-slate-400">
            Atau pakai &quot;Kirim link reset&quot; kalau user mau set sendiri.
          </p>
        </Modal>
      )}

      {/* Modal hapus akun */}
      {modal?.type === "delete" && (
        <Modal
          title="Hapus akun permanen?"
          onClose={() => setModal(null)}
          footer={
            <>
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={() => void run(deleteUserAction(modal.user.id))}
                disabled={busy}
                className="px-4 py-2 text-xs font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50"
              >
                Ya, Hapus Permanen
              </button>
            </>
          }
        >
          <p className="text-xs text-slate-500 leading-relaxed">
            <strong className="text-red-600">{modal.user.email}</strong> beserta
            SELURUH data wedding-nya akan dihapus permanen. Kalau masih ada
            akses purchase-nya, statusnya kembali jadi{" "}
            <em>tersedia</em>.
          </p>
        </Modal>
      )}
    </div>
  );
}
