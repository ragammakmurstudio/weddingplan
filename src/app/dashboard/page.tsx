import { auth } from "@/auth";
import { getWeddingForUser } from "@/actions/auth";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const initial = await getWeddingForUser();
  if (!initial) redirect("/login");

  return (
    <DashboardClient
      initial={initial}
      userEmail={session.user.email ?? ""}
      userName={session.user.name ?? ""}
    />
  );
}
