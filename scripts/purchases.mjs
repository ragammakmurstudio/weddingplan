#!/usr/bin/env node
/**
 * Kelola entitlement akses selamanya (tabel Purchase).
 *
 *   node scripts/purchases.mjs --add pembeli@example.com "catatan"
 *   node scripts/purchases.mjs --list
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  let raw = "";
  try {
    raw = readFileSync(join(root, ".env"), "utf8");
  } catch {
    /* pakai env proses kalau .env tidak ada */
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnv();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum terisi di .env");
  process.exit(1);
}
const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const args = process.argv.slice(2);

async function add(email, note = "") {
  const norm = String(email).trim().toLowerCase();
  if (!norm.includes("@")) {
    console.error("Email tidak valid.");
    process.exit(1);
  }
  const { error } = await sb.from("Purchase").insert({
    id: randomUUID(),
    email: norm,
    refId: note || null,
    messageId: `manual-${randomUUID()}`,
  });
  if (error) {
    console.error("Gagal menambah pembelian:", error.message);
    process.exit(1);
  }
  console.log(`OK — akses untuk ${norm} aktif. Daftar pakai email itu.`);
}

async function list() {
  const { data, error } = await sb
    .from("Purchase")
    .select("email, refId, userId, createdAt")
    .order("createdAt", { ascending: false });
  if (error) {
    console.error("Gagal membaca data:", error.message);
    process.exit(1);
  }
  if (!data?.length) {
    console.log("Belum ada pembelian.");
    return;
  }
  for (const p of data) {
    const status = p.userId ? "dipakai" : "tersedia";
    const when = new Date(p.createdAt).toLocaleString("id-ID");
    console.log(
      `${(p.email ?? "-").padEnd(28)} | ${(p.refId ?? "-").padEnd(6)} | ${status} | ${when}`
    );
  }
}

if (args[0] === "--add" && args[1]) {
  await add(args[1], args[2]);
} else if (args[0] === "--list") {
  await list();
} else {
  console.log("Pemakaian:");
  console.log('  node scripts/purchases.mjs --add pembeli@example.com "catatan"');
  console.log("  node scripts/purchases.mjs --list");
  process.exit(1);
}
