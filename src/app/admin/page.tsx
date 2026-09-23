import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/supabase";
import { AdminPanel, type AdminPurchase, type AdminStats, type AdminUser } from "@/components/admin/AdminPanel";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

function fmtShort(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * DAY).toISOString();
}

function buildStats(
  users: AdminUser[],
  counts: {
    totalUsers: number;
    purchasesUsed: number;
    purchasesAvailable: number;
    newUsers7d: number;
  }
): AdminStats {
  // Kumulatif user per hari (30 hari terakhir)
  const userDaily: { date: string; cumulative: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    end.setDate(end.getDate() - i);
    const cumulative = users.filter(
      (u) => new Date(u.createdAt).getTime() <= end.getTime()
    ).length;
    userDaily.push({ date: fmtShort(end), cumulative });
  }

  // User baru per minggu (8 minggu terakhir)
  const userWeekly: { label: string; count: number }[] = [];
  for (let w = 7; w >= 0; w--) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - w * 7 - 6);
    const end = new Date(start.getTime() + 7 * DAY);
    const count = users.filter((u) => {
      const t = new Date(u.createdAt).getTime();
      return t >= start.getTime() && t < end.getTime();
    }).length;
    userWeekly.push({ label: fmtShort(start), count });
  }

  return {
    totalUsers: counts.totalUsers,
    purchasesTotal: counts.purchasesUsed + counts.purchasesAvailable,
    purchasesUsed: counts.purchasesUsed,
    purchasesAvailable: counts.purchasesAvailable,
    newUsers7d: counts.newUsers7d,
    userWeekly,
    userDaily,
  };
}

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");

  const [usersRes, purchasesRes, totalUsers, usedCount, availCount, new7] =
    await Promise.all([
      db()
        .from("User")
        .select("id, email, name, role, createdAt")
        .order("createdAt", { ascending: false })
        .limit(500),
      db()
        .from("Purchase")
        .select("id, refId, email, userId, createdAt")
        .order("createdAt", { ascending: false })
        .limit(500),
      db()
        .from("User")
        .select("id", { count: "exact", head: true }),
      db()
        .from("Purchase")
        .select("id", { count: "exact", head: true })
        .not("userId", "is", null),
      db()
        .from("Purchase")
        .select("id", { count: "exact", head: true })
        .is("userId", null),
      db()
        .from("User")
        .select("id", { count: "exact", head: true })
        .gte("createdAt", isoDaysAgo(7)),
    ]);

  if (usersRes.error || purchasesRes.error) {
    throw new Error(
      usersRes.error?.message || purchasesRes.error?.message || "Gagal memuat data admin"
    );
  }

  const users = (usersRes.data ?? []) as AdminUser[];
  const purchases = (purchasesRes.data ?? []) as AdminPurchase[];

  const stats = buildStats(users, {
    totalUsers: totalUsers.count ?? users.length,
    purchasesUsed: usedCount.count ?? 0,
    purchasesAvailable: availCount.count ?? 0,
    newUsers7d: new7.count ?? 0,
  });

  return (
    <main className="min-h-screen bg-slate-50">
      <AdminPanel users={users} purchases={purchases} stats={stats} />
    </main>
  );
}
