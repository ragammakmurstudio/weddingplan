-- ============================================================
-- NikahPlan — skema database Supabase
-- Pakai: Dashboard Supabase → SQL Editor → New query
--        → paste seluruh isi file ini → klik Run
-- ============================================================

-- ---------- User ----------
create table if not exists "User" (
  "id"           text primary key,
  "email"        text not null unique,
  "name"         text,
  "passwordHash" text not null,
  "createdAt"    timestamptz not null default now()
);

-- ---------- Wedding (root, 1-1 User) ----------
create table if not exists "Wedding" (
  "id"           text primary key,
  "userId"       text not null unique references "User" ("id") on delete cascade,
  "dataVersion"  integer not null default 1,
  "weddingDate"  text not null default '2027-06-20',
  "akadTime"     text not null default '08:00 WIB',
  "resepsiTime"  text not null default '11:00 - 14:00 WIB',
  "weddingVenue" text not null default '',
  "weddingTheme" text not null default '',
  "totalBudget"  integer not null default 0
);
create index if not exists "Wedding_userId_idx" on "Wedding" ("userId");

-- ---------- Data mempelai (tepat 2 baris: CPP & CPW) ----------
create table if not exists "BrideSide" (
  "id"        text primary key,
  "weddingId" text not null references "Wedding" ("id") on delete cascade,
  "side"      text not null,
  "fullName"  text not null default '',
  "nickname"  text not null default '',
  "father"    text not null default '',
  "mother"    text not null default '',
  "phone"     text not null default '',
  "address"   text not null default '',
  unique ("weddingId", "side")
);
create index if not exists "BrideSide_weddingId_idx" on "BrideSide" ("weddingId");

-- ---------- Budget ----------
create table if not exists "BudgetItem" (
  "id"        text primary key,
  "weddingId" text not null references "Wedding" ("id") on delete cascade,
  "category"  text not null,
  "item"      text not null,
  "estimated" integer not null default 0,
  "actual"    integer not null default 0,
  "status"    text not null default 'Belum',
  "sortOrder" integer not null default 0
);
create index if not exists "BudgetItem_weddingId_idx" on "BudgetItem" ("weddingId");

-- ---------- Seserahan & Mahar ----------
create table if not exists "SeserahanItem" (
  "id"        text primary key,
  "weddingId" text not null references "Wedding" ("id") on delete cascade,
  "section"   text not null,
  "title"     text not null,
  "cost"      integer not null default 0,
  "ready"     boolean not null default false,
  "link"      text not null default '',
  "sortOrder" integer not null default 0
);
create index if not exists "SeserahanItem_weddingId_idx" on "SeserahanItem" ("weddingId");

-- ---------- Vendor & Venue ----------
create table if not exists "Vendor" (
  "id"        text primary key,
  "weddingId" text not null references "Wedding" ("id") on delete cascade,
  "category"  text not null,
  "name"      text not null,
  "price"     integer not null default 0,
  "status"    text not null default 'Survey / Pitching',
  "contact"   text not null default '',
  "notes"     text not null default '',
  "sortOrder" integer not null default 0
);
create index if not exists "Vendor_weddingId_idx" on "Vendor" ("weddingId");

-- ---------- Administrasi KUA ----------
create table if not exists "AdminDoc" (
  "id"          text primary key,
  "weddingId"   text not null references "Wedding" ("id") on delete cascade,
  "title"       text not null,
  "description" text not null default '',
  "completed"   boolean not null default false,
  "sortOrder"   integer not null default 0
);
create index if not exists "AdminDoc_weddingId_idx" on "AdminDoc" ("weddingId");

-- ---------- Daftar Undangan ----------
create table if not exists "Guest" (
  "id"        text primary key,
  "weddingId" text not null references "Wedding" ("id") on delete cascade,
  "name"      text not null,
  "side"      text not null,
  "category"  text not null,
  "pax"       integer not null default 1,
  "sent"      boolean not null default false,
  "status"    text not null default 'Belum Konfirmasi',
  "isVip"     boolean not null default false,
  "sortOrder" integer not null default 0
);
create index if not exists "Guest_weddingId_idx" on "Guest" ("weddingId");

-- ---------- Timeline Checklist ----------
create table if not exists "ChecklistItem" (
  "id"        text primary key,
  "weddingId" text not null references "Wedding" ("id") on delete cascade,
  "timeframe" text not null,
  "task"      text not null,
  "done"      boolean not null default false,
  "sortOrder" integer not null default 0
);
create index if not exists "ChecklistItem_weddingId_idx" on "ChecklistItem" ("weddingId");

-- ---------- Rundown ----------
create table if not exists "RundownItem" (
  "id"        text primary key,
  "weddingId" text not null references "Wedding" ("id") on delete cascade,
  "time"      text not null,
  "activity"  text not null,
  "pic"       text not null,
  "sortOrder" integer not null default 0
);
create index if not exists "RundownItem_weddingId_idx" on "RundownItem" ("weddingId");

-- ---------- Panitia ----------
create table if not exists "CommitteeMember" (
  "id"           text primary key,
  "weddingId"    text not null references "Wedding" ("id") on delete cascade,
  "role"         text not null,
  "name"         text not null,
  "uniformGiven" boolean not null default false,
  "sortOrder"    integer not null default 0
);
create index if not exists "CommitteeMember_weddingId_idx" on "CommitteeMember" ("weddingId");

-- ---------- Keamanan ----------
-- RLS aktif tanpa policy = client anon/key publik TIDAK bisa akses apa pun.
-- Aplikasi Next.js memakai service_role key (server-side) yang bypass RLS.
alter table "User"           enable row level security;
alter table "Wedding"        enable row level security;
alter table "BrideSide"      enable row level security;
alter table "BudgetItem"     enable row level security;
alter table "SeserahanItem"  enable row level security;
alter table "Vendor"         enable row level security;
alter table "AdminDoc"       enable row level security;
alter table "Guest"          enable row level security;
alter table "ChecklistItem"  enable row level security;
alter table "RundownItem"    enable row level security;
alter table "CommitteeMember" enable row level security;
alter table "Purchase"       enable row level security;

-- ---------- Purchase (akses sekali bayar via lynk.id) ----------
-- Diisi oleh webhook /api/webhook/lynk (atau script scripts/purchases.mjs).
-- Baris dengan "userId" null = entitlement belum dipakai → saat register,
-- email pembeli dicocokkan & baris diklaim (userId diisi).
create table if not exists "Purchase" (
  "id"         text primary key,
  "refId"      text,
  "email"      text,
  "amount"     text,
  "messageId"  text not null unique,
  "userId"     text references "User" ("id") on delete set null,
  "createdAt"  timestamptz not null default now()
);
create index if not exists "Purchase_email_idx" on "Purchase" ("email");

-- ---------- Role admin ----------
-- Default 'user'; set email owner jadi 'admin' via:
--   node scripts/purchases.mjs --make-admin email@kamu.com
alter table "User" add column if not exists "role" text not null default 'user';

-- ---------- Token reset password (link via email,30 menit, sekali pakai) ----------
create table if not exists "PasswordResetToken" (
  "id"        text primary key,
  "userId"    text not null references "User" ("id") on delete cascade,
  "tokenHash" text not null,
  "expiresAt" timestamptz not null,
  "usedAt"    timestamptz,
  "createdAt" timestamptz not null default now()
);
create index if not exists "PasswordResetToken_userId_idx" on "PasswordResetToken" ("userId");
alter table "PasswordResetToken" enable row level security;

-- ---------- AdminDoc: checkbox per pihak (CPP/CPW) + status proses KUA ----------
-- Dipakai tab "Administrasi & Surat": tiap dokumen punya centang CPP & CPW,
-- plus 2 baris proses (Daftar ke KUA / Bimbingan) dengan status Belum|Proses|Selesai.
alter table "AdminDoc" add column if not exists "doneCpp" boolean not null default false;
alter table "AdminDoc" add column if not exists "doneCpw" boolean not null default false;
alter table "AdminDoc" add column if not exists "status" text;
