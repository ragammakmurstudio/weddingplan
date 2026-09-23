"use server";

import { hash } from "bcryptjs";
import { z } from "zod";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { db } from "@/lib/supabase";
import { auth, signIn, signOut } from "@/auth";
import { defaultWeddingState } from "@/lib/seed-data";
import type { WeddingState } from "@/lib/types";
import { revalidatePath } from "next/cache";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(80),
  email: z.string().trim().email("Email tidak valid").max(255),
  password: z.string().min(8, "Password minimal 8 karakter").max(128),
});

export type AuthFormState = { error?: string } | undefined;

async function pick<T>(
  p: PromiseLike<{ data: T | null; error: { message: string } | null }>
): Promise<T> {
  const r = await p;
  if (r.error) throw new Error(r.error.message);
  return (r.data ?? []) as T;
}

function must(r: { error: { message: string } | null }): void {
  if (r.error) throw new Error(r.error.message);
}

async function createWeddingWithSeed(userId: string) {
  const s = defaultWeddingState();
  const weddingId = crypto.randomUUID();
  const { error } = await db().from("Wedding").insert({
    id: weddingId,
    userId,
    dataVersion: s.dataVersion,
    weddingDate: s.weddingDate,
    akadTime: s.akadTime,
    resepsiTime: s.resepsiTime,
    weddingVenue: s.weddingVenue,
    weddingTheme: s.weddingTheme,
    totalBudget: s.totalBudget,
  });
  if (error) throw new Error(error.message);

  const results = await Promise.all([
    db().from("BrideSide").insert([
      { id: crypto.randomUUID(), weddingId, side: "CPP", ...s.brideData.cpp },
      { id: crypto.randomUUID(), weddingId, side: "CPW", ...s.brideData.cpw },
    ]),
    db()
      .from("BudgetItem")
      .insert(s.budgetList.map((b, i) => ({ ...b, weddingId, sortOrder: i }))),
    db().from("SeserahanItem").insert([
      ...s.maharItems.map((x, i) => ({
        id: x.id,
        weddingId,
        title: x.title,
        cost: x.cost,
        ready: x.ready,
        link: x.link ?? "",
        section: "mahar",
        sortOrder: i,
      })),
      ...s.seserahanCppToCpw.map((x, i) => ({
        id: x.id,
        weddingId,
        title: x.title,
        cost: x.cost,
        ready: x.ready,
        link: x.link ?? "",
        section: "cppToCpw",
        sortOrder: i,
      })),
      ...s.seserahanCpwToCpp.map((x, i) => ({
        id: x.id,
        weddingId,
        title: x.title,
        cost: x.cost,
        ready: x.ready,
        link: x.link ?? "",
        section: "cpwToCpp",
        sortOrder: i,
      })),
    ]),
    db()
      .from("Vendor")
      .insert(s.vendors.map((v, i) => ({ ...v, weddingId, sortOrder: i }))),
    db()
      .from("AdminDoc")
      .insert(s.adminDocs.map((d, i) => ({ ...d, weddingId, sortOrder: i }))),
    db()
      .from("Guest")
      .insert(s.guests.map((g, i) => ({ ...g, weddingId, sortOrder: i }))),
    db()
      .from("ChecklistItem")
      .insert(
        s.checklist.map((c, i) => ({ ...c, weddingId, sortOrder: i }))
      ),
    db()
      .from("RundownItem")
      .insert(
        s.rundownList.map((r, i) => ({ ...r, weddingId, sortOrder: i }))
      ),
    db()
      .from("CommitteeMember")
      .insert(
        s.committeeList.map((c, i) => ({ ...c, weddingId, sortOrder: i }))
      ),
  ]);
  for (const r of results) must(r);
}

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }

  const email = parsed.data.email.toLowerCase();
  const { data: existing } = await db()
    .from("User")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existing) {
    return { error: "Email sudah terdaftar" };
  }

  try {
    const userId = crypto.randomUUID();
    const { error: insertErr } = await db().from("User").insert({
      id: userId,
      name: parsed.data.name,
      email,
      passwordHash: await hash(parsed.data.password, 10),
    });
    if (insertErr) {
      if (insertErr.code === "23505") {
        return { error: "Email sudah terdaftar" };
      }
      throw new Error(insertErr.message);
    }
    await createWeddingWithSeed(userId);
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Gagal membuat akun. Coba lagi." };
    }
    throw error;
  }
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email dan password wajib diisi" };
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email atau password salah" };
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login");
  }
  return userId;
}

const brideProfileSchema = z.object({
  fullName: z.string().max(200),
  nickname: z.string().max(80),
  father: z.string().max(200),
  mother: z.string().max(200),
  phone: z.string().max(40),
  address: z.string().max(500),
});

const idSchema = z.string().min(1).max(64);

const budgetItemSchema = z.object({
  id: idSchema,
  category: z.string().max(80),
  item: z.string().max(300),
  estimated: z.coerce.number().int().min(0),
  actual: z.coerce.number().int().min(0),
  status: z.string().max(40),
});

const seserahanItemSchema = z.object({
  id: idSchema,
  title: z.string().max(300),
  cost: z.coerce.number().int().min(0),
  ready: z.boolean(),
  link: z.string().max(500).optional().default(""),
});

const vendorSchema = z.object({
  id: idSchema,
  category: z.string().max(80),
  name: z.string().max(200),
  price: z.coerce.number().int().min(0),
  status: z.string().max(60),
  contact: z.string().max(40),
  notes: z.string().max(1000),
});

const adminDocSchema = z.object({
  id: idSchema,
  title: z.string().max(300),
  description: z.string().max(500),
  completed: z.boolean(),
});

const guestSchema = z.object({
  id: idSchema,
  name: z.string().max(200),
  side: z.string().max(10),
  category: z.string().max(80),
  pax: z.coerce.number().int().min(0).max(1000),
  sent: z.boolean(),
  status: z.string().max(40),
  isVip: z.boolean(),
});

const checklistSchema = z.object({
  id: idSchema,
  timeframe: z.string().max(80),
  task: z.string().max(300),
  done: z.boolean(),
});

const rundownSchema = z.object({
  id: idSchema,
  time: z.string().max(40),
  activity: z.string().max(300),
  pic: z.string().max(120),
});

const committeeSchema = z.object({
  id: idSchema,
  role: z.string().max(120),
  name: z.string().max(200),
  uniformGiven: z.boolean(),
});

const weddingStateSchema = z.object({
  dataVersion: z.coerce.number().int().min(1),
  weddingDate: z.string().max(40),
  akadTime: z.string().max(60),
  resepsiTime: z.string().max(60),
  weddingVenue: z.string().max(300),
  weddingTheme: z.string().max(200),
  totalBudget: z.coerce.number().int().min(0),
  brideData: z.object({
    cpp: brideProfileSchema,
    cpw: brideProfileSchema,
  }),
  budgetList: z.array(budgetItemSchema).max(500),
  maharItems: z.array(seserahanItemSchema).max(200),
  seserahanCppToCpw: z.array(seserahanItemSchema).max(200),
  seserahanCpwToCpp: z.array(seserahanItemSchema).max(200),
  vendors: z.array(vendorSchema).max(300),
  adminDocs: z.array(adminDocSchema).max(100),
  guests: z.array(guestSchema).max(5000),
  checklist: z.array(checklistSchema).max(200),
  rundownList: z.array(rundownSchema).max(200),
  committeeList: z.array(committeeSchema).max(200),
});

export type SaveResult = { ok: boolean; error?: string };

export async function saveWeddingAction(input: WeddingState): Promise<SaveResult> {
  const userId = await requireUserId();
  const parsed = weddingStateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  const data = parsed.data;
  const { data: wedding } = await db()
    .from("Wedding")
    .select("id")
    .eq("userId", userId)
    .maybeSingle();
  if (!wedding) return { ok: false, error: "Data pernikahan tidak ditemukan" };
  const wid = wedding.id;

  try {
    const [
      sideRows,
      budgetRows,
      sesRows,
      vendorRows,
      docRows,
      guestRows,
      checkRows,
      rundownRows,
      committeeRows,
    ] = await Promise.all([
      pick(db().from("BrideSide").select("id, side").eq("weddingId", wid)),
      pick(db().from("BudgetItem").select("id").eq("weddingId", wid)),
      pick(db().from("SeserahanItem").select("id").eq("weddingId", wid)),
      pick(db().from("Vendor").select("id").eq("weddingId", wid)),
      pick(db().from("AdminDoc").select("id").eq("weddingId", wid)),
      pick(db().from("Guest").select("id").eq("weddingId", wid)),
      pick(db().from("ChecklistItem").select("id").eq("weddingId", wid)),
      pick(db().from("RundownItem").select("id").eq("weddingId", wid)),
      pick(db().from("CommitteeMember").select("id").eq("weddingId", wid)),
    ]);

    const sideIdBy = new Map(sideRows.map((r) => [r.side, r.id]));
    const existingIds = (rows: { id: string }[]) => new Set(rows.map((r) => r.id));

    const budgetIds = existingIds(budgetRows);
    const delBudget = [...budgetIds].filter(
      (id) => !data.budgetList.some((b) => b.id === id)
    );

    const sesAll = [
      ...data.maharItems.map((x, i) => ({ ...x, section: "mahar", sortOrder: i })),
      ...data.seserahanCppToCpw.map((x, i) => ({ ...x, section: "cppToCpw", sortOrder: i })),
      ...data.seserahanCpwToCpp.map((x, i) => ({ ...x, section: "cpwToCpp", sortOrder: i })),
    ];
    const sesIds = existingIds(sesRows);
    const delSes = [...sesIds].filter((id) => !sesAll.some((s) => s.id === id));

    const vendorIds = existingIds(vendorRows);
    const delVendor = [...vendorIds].filter(
      (id) => !data.vendors.some((v) => v.id === id)
    );

    const docIds = existingIds(docRows);
    const delDoc = [...docIds].filter(
      (id) => !data.adminDocs.some((d) => d.id === id)
    );

    const guestIds = existingIds(guestRows);
    const delGuest = [...guestIds].filter(
      (id) => !data.guests.some((g) => g.id === id)
    );

    const checkIds = existingIds(checkRows);
    const delCheck = [...checkIds].filter(
      (id) => !data.checklist.some((c) => c.id === id)
    );

    const rundownIds = existingIds(rundownRows);
    const delRundown = [...rundownIds].filter(
      (id) => !data.rundownList.some((r) => r.id === id)
    );

    const committeeIds = existingIds(committeeRows);
    const delCommittee = [...committeeIds].filter(
      (id) => !data.committeeList.some((m) => m.id === id)
    );

    const ops: PromiseLike<{ error: { message: string } | null }>[] = [
      db()
        .from("Wedding")
        .update({
          dataVersion: data.dataVersion,
          weddingDate: data.weddingDate,
          akadTime: data.akadTime,
          resepsiTime: data.resepsiTime,
          weddingVenue: data.weddingVenue,
          weddingTheme: data.weddingTheme,
          totalBudget: data.totalBudget,
        })
        .eq("id", wid),
      db().from("BrideSide").upsert(
        [
          {
            id: sideIdBy.get("CPP") ?? crypto.randomUUID(),
            weddingId: wid,
            side: "CPP",
            ...data.brideData.cpp,
          },
          {
            id: sideIdBy.get("CPW") ?? crypto.randomUUID(),
            weddingId: wid,
            side: "CPW",
            ...data.brideData.cpw,
          },
        ],
        { onConflict: "weddingId,side" }
      ),
    ];

    if (delBudget.length) {
      ops.push(db().from("BudgetItem").delete().in("id", delBudget));
    }
    ops.push(
      db()
        .from("BudgetItem")
        .upsert(
          data.budgetList.map((b, i) => ({
            ...b,
            weddingId: wid,
            sortOrder: i,
          })),
          { onConflict: "id" }
        )
    );

    if (delSes.length) {
      ops.push(db().from("SeserahanItem").delete().in("id", delSes));
    }
    ops.push(
      db()
        .from("SeserahanItem")
        .upsert(
          sesAll.map((s) => ({
            id: s.id,
            weddingId: wid,
            title: s.title,
            cost: s.cost,
            ready: s.ready,
            link: s.link ?? "",
            section: s.section,
            sortOrder: s.sortOrder,
          })),
          { onConflict: "id" }
        )
    );

    if (delVendor.length) {
      ops.push(db().from("Vendor").delete().in("id", delVendor));
    }
    ops.push(
      db()
        .from("Vendor")
        .upsert(
          data.vendors.map((v, i) => ({ ...v, weddingId: wid, sortOrder: i })),
          { onConflict: "id" }
        )
    );

    if (delDoc.length) {
      ops.push(db().from("AdminDoc").delete().in("id", delDoc));
    }
    ops.push(
      db()
        .from("AdminDoc")
        .upsert(
          data.adminDocs.map((d, i) => ({ ...d, weddingId: wid, sortOrder: i })),
          { onConflict: "id" }
        )
    );

    if (delGuest.length) {
      ops.push(db().from("Guest").delete().in("id", delGuest));
    }
    ops.push(
      db()
        .from("Guest")
        .upsert(
          data.guests.map((g, i) => ({ ...g, weddingId: wid, sortOrder: i })),
          { onConflict: "id" }
        )
    );

    if (delCheck.length) {
      ops.push(db().from("ChecklistItem").delete().in("id", delCheck));
    }
    ops.push(
      db()
        .from("ChecklistItem")
        .upsert(
          data.checklist.map((c, i) => ({ ...c, weddingId: wid, sortOrder: i })),
          { onConflict: "id" }
        )
    );

    if (delRundown.length) {
      ops.push(db().from("RundownItem").delete().in("id", delRundown));
    }
    ops.push(
      db()
        .from("RundownItem")
        .upsert(
          data.rundownList.map((r, i) => ({ ...r, weddingId: wid, sortOrder: i })),
          { onConflict: "id" }
        )
    );

    if (delCommittee.length) {
      ops.push(db().from("CommitteeMember").delete().in("id", delCommittee));
    }
    ops.push(
      db()
        .from("CommitteeMember")
        .upsert(
          data.committeeList.map((m, i) => ({
            ...m,
            weddingId: wid,
            sortOrder: i,
          })),
          { onConflict: "id" }
        )
    );

    const results = await Promise.all(ops);
    for (const r of results) must(r);

    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    console.error("saveWeddingAction failed", err);
    return { ok: false, error: "Gagal menyimpan data ke server" };
  }
}

export async function resetWeddingAction(): Promise<WeddingState | null> {
  const userId = await requireUserId();
  const { data: existing, error: findErr } = await db()
    .from("Wedding")
    .select("id")
    .eq("userId", userId)
    .maybeSingle();
  if (findErr) throw new Error(findErr.message);
  if (!existing) return null;

  const { error: delErr } = await db()
    .from("Wedding")
    .delete()
    .eq("id", existing.id);
  if (delErr) throw new Error(delErr.message);
  await createWeddingWithSeed(userId);
  revalidatePath("/dashboard");
  return getWeddingForUser();
}

export async function getWeddingForUser(): Promise<WeddingState | null> {
  const userId = await requireUserId();
  const { data: w, error: wErr } = await db()
    .from("Wedding")
    .select("*")
    .eq("userId", userId)
    .maybeSingle();
  if (wErr) throw new Error(wErr.message);
  if (!w) return null;
  const wid = w.id;

  const [
    brideSides,
    budgetItems,
    seserahanItems,
    vendors,
    adminDocs,
    guests,
    checklistItems,
    rundownItems,
    committeeMembers,
  ] = await Promise.all([
    pick(db().from("BrideSide").select("*").eq("weddingId", wid)),
    pick(
      db()
        .from("BudgetItem")
        .select("*")
        .eq("weddingId", wid)
        .order("sortOrder")
    ),
    pick(
      db()
        .from("SeserahanItem")
        .select("*")
        .eq("weddingId", wid)
        .order("sortOrder")
    ),
    pick(
      db().from("Vendor").select("*").eq("weddingId", wid).order("sortOrder")
    ),
    pick(
      db().from("AdminDoc").select("*").eq("weddingId", wid).order("sortOrder")
    ),
    pick(
      db().from("Guest").select("*").eq("weddingId", wid).order("sortOrder")
    ),
    pick(
      db()
        .from("ChecklistItem")
        .select("*")
        .eq("weddingId", wid)
        .order("sortOrder")
    ),
    pick(
      db()
        .from("RundownItem")
        .select("*")
        .eq("weddingId", wid)
        .order("sortOrder")
    ),
    pick(
      db()
        .from("CommitteeMember")
        .select("*")
        .eq("weddingId", wid)
        .order("sortOrder")
    ),
  ]);

  const cpp = brideSides.find((b: { side: string }) => b.side === "CPP");
  const cpw = brideSides.find((b: { side: string }) => b.side === "CPW");
  const pickBride = (b?: { fullName: string; nickname: string; father: string; mother: string; phone: string; address: string }) => ({
    fullName: b?.fullName ?? "",
    nickname: b?.nickname ?? "",
    father: b?.father ?? "",
    mother: b?.mother ?? "",
    phone: b?.phone ?? "",
    address: b?.address ?? "",
  });

  const seed = defaultWeddingState();
  let needsBackfill = false;

  const state: WeddingState = {
    dataVersion: w.dataVersion,
    weddingDate: w.weddingDate,
    akadTime: w.akadTime,
    resepsiTime: w.resepsiTime,
    weddingVenue: w.weddingVenue,
    weddingTheme: w.weddingTheme,
    totalBudget: w.totalBudget,
    brideData: { cpp: pickBride(cpp), cpw: pickBride(cpw) },
    budgetList: budgetItems.map((b) => ({ id: b.id, category: b.category, item: b.item, estimated: b.estimated, actual: b.actual, status: b.status })),
    maharItems: seserahanItems.filter((s) => s.section === "mahar").map((s) => ({ id: s.id, title: s.title, cost: s.cost, ready: s.ready, link: s.link })),
    seserahanCppToCpw: seserahanItems.filter((s) => s.section === "cppToCpw").map((s) => ({ id: s.id, title: s.title, cost: s.cost, ready: s.ready, link: s.link })),
    seserahanCpwToCpp: seserahanItems.filter((s) => s.section === "cpwToCpp").map((s) => ({ id: s.id, title: s.title, cost: s.cost, ready: s.ready, link: s.link })),
    vendors: vendors.map((v) => ({ id: v.id, category: v.category, name: v.name, price: v.price, status: v.status, contact: v.contact, notes: v.notes })),
    adminDocs: adminDocs.map((d) => ({ id: d.id, title: d.title, description: d.description, completed: d.completed })),
    guests: guests.map((g) => ({ id: g.id, name: g.name, side: g.side, category: g.category, pax: g.pax, sent: g.sent, status: g.status, isVip: g.isVip })),
    checklist: checklistItems.map((c) => ({ id: c.id, timeframe: c.timeframe, task: c.task, done: c.done })),
    rundownList: rundownItems.map((r) => ({ id: r.id, time: r.time, activity: r.activity, pic: r.pic })),
    committeeList: committeeMembers.map((m) => ({ id: m.id, role: m.role, name: m.name, uniformGiven: m.uniformGiven })),
  };

  if (state.maharItems.length === 0) {
    state.maharItems = seed.maharItems;
    needsBackfill = true;
  }
  if (state.seserahanCppToCpw.length === 0) {
    state.seserahanCppToCpw = seed.seserahanCppToCpw;
    needsBackfill = true;
  }
  if (state.seserahanCpwToCpp.length === 0) {
    state.seserahanCpwToCpp = seed.seserahanCpwToCpp;
    needsBackfill = true;
  }
  if (state.adminDocs.length === 0) {
    state.adminDocs = seed.adminDocs;
    needsBackfill = true;
  }
  if (state.checklist.length === 0) {
    state.checklist = seed.checklist;
    needsBackfill = true;
  }
  if (state.rundownList.length === 0) {
    state.rundownList = seed.rundownList;
    needsBackfill = true;
  }
  if (state.committeeList.length === 0) {
    state.committeeList = seed.committeeList;
    needsBackfill = true;
  }

  if (needsBackfill) {
    const result = await saveWeddingAction(state);
    if (!result.ok) {
      console.error("backfill failed", result.error);
    } else {
      revalidatePath("/dashboard");
    }
  }

  return state;
}
