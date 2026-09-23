#!/usr/bin/env node
/**
 * Kelola entitlement akses selamanya (tabel Purchase).
 *
 *   node scripts/purchases.mjs --add pembeli@example.com "catatan"
 *   node scripts/purchases.mjs --list
 *   node scripts/purchases.mjs --list-users
 *   node scripts/purchases.mjs --make-admin owner@example.com
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

async function listUsers() {
  const { data, error } = await sb
    .from("User")
    .select("email, name, role, createdAt")
    .order("createdAt", { ascending: false });
  if (error) {
    console.error("Gagal membaca user:", error.message);
    process.exit(1);
  }
  if (!data?.length) {
    console.log("Belum ada user.");
    return;
  }
  for (const u of data) {
    const when = new Date(u.createdAt).toLocaleString("id-ID");
    console.log(
      `${(u.email ?? "-").padEnd(28)} | ${(u.role ?? "-").padEnd(5)} | ${(u.name ?? "-").padEnd(16)} | ${when}`
    );
  }
}

async function makeAdmin(email) {
  const norm = String(email).trim().toLowerCase();
  const { data, error } = await sb
    .from("User")
    .update({ role: "admin" })
    .eq("email", norm)
    .select("email, role");
  if (error) {
    console.error("Gagal set role:", error.message);
    process.exit(1);
  }
  if (!data?.length) {
    console.error(`User ${norm} tidak ditemukan — daftar dulu dengan email itu.`);
    process.exit(1);
  }
  console.log(`OK — ${norm} sekarang role=admin. Login ulang supaya session ter-update.`);
}

if (args[0] === "--add" && args[1]) {
  await add(args[1], args[2]);
} else if (args[0] === "--list") {
  await list();
} else if (args[0] === "--list-users") {
  await listUsers();
} else if (args[0] === "--make-admin" && args[1]) {
  await makeAdmin(args[1]);
} else {
  console.log("Pemakaian:");
  console.log('  node scripts/purchases.mjs --add pembeli@example.com "catatan"');
  console.log("  node scripts/purchases.mjs --list");
  console.log("  node scripts/purchases.mjs --list-users");
  console.log("  node scripts/purchases.mjs --make-admin owner@example.com");
  process.exit(1);
}
