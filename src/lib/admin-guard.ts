import { auth } from "@/auth";

/** Cek role admin dari session (server). */
export async function isAdminSession(): Promise<boolean> {
  const session = await auth();
  return session?.user?.role === "admin";
}
