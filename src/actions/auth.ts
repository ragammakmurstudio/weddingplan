"use server";

import { hash } from "bcryptjs";
import { z } from "zod";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
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

async function createWeddingWithSeed(userId: string) {
  const s = defaultWeddingState();
  await prisma.wedding.create({
    data: {
      userId,
      dataVersion: s.dataVersion,
      weddingDate: s.weddingDate,
      akadTime: s.akadTime,
      resepsiTime: s.resepsiTime,
      weddingVenue: s.weddingVenue,
      weddingTheme: s.weddingTheme,
      totalBudget: s.totalBudget,
      brideSides: {
        create: [
          { side: "CPP", ...s.brideData.cpp },
          { side: "CPW", ...s.brideData.cpw },
        ],
      },
      budgetItems: {
        create: s.budgetList.map((b, i) => ({ ...b, sortOrder: i })),
      },
      seserahanItems: {
        create: [
          ...s.maharItems.map((x, i) => ({
            id: x.id,
            title: x.title,
            cost: x.cost,
            ready: x.ready,
            link: x.link ?? "",
            section: "mahar",
            sortOrder: i,
          })),
          ...s.seserahanCppToCpw.map((x, i) => ({
            id: x.id,
            title: x.title,
            cost: x.cost,
            ready: x.ready,
            link: x.link ?? "",
            section: "cppToCpw",
            sortOrder: i,
          })),
          ...s.seserahanCpwToCpp.map((x, i) => ({
            id: x.id,
            title: x.title,
            cost: x.cost,
            ready: x.ready,
            link: x.link ?? "",
            section: "cpwToCpp",
            sortOrder: i,
          })),
        ],
      },
      vendors: { create: s.vendors.map((v, i) => ({ ...v, sortOrder: i })) },
      adminDocs: { create: s.adminDocs.map((d, i) => ({ ...d, sortOrder: i })) },
      guests: { create: s.guests.map((g, i) => ({ ...g, sortOrder: i })) },
      checklistItems: { create: s.checklist.map((c, i) => ({ ...c, sortOrder: i })) },
      rundownItems: { create: s.rundownList.map((r, i) => ({ ...r, sortOrder: i })) },
      committeeMembers: { create: s.committeeList.map((c, i) => ({ ...c, sortOrder: i })) },
    },
  });
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
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Email sudah terdaftar" };
  }

  try {
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        passwordHash: await hash(parsed.data.password, 10),
      },
    });
    await createWeddingWithSeed(user.id);
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
  const wedding = await prisma.wedding.findUnique({ where: { userId } });
  if (!wedding) return { ok: false, error: "Data pernikahan tidak ditemukan" };
  const wid = wedding.id;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.wedding.update({
        where: { id: wid },
        data: {
          dataVersion: data.dataVersion,
          weddingDate: data.weddingDate,
          akadTime: data.akadTime,
          resepsiTime: data.resepsiTime,
          weddingVenue: data.weddingVenue,
          weddingTheme: data.weddingTheme,
          totalBudget: data.totalBudget,
        },
      });

      await tx.brideSide.upsert({
        where: { weddingId_side: { weddingId: wid, side: "CPP" } },
        update: { ...data.brideData.cpp },
        create: { weddingId: wid, side: "CPP", ...data.brideData.cpp },
      });
      await tx.brideSide.upsert({
        where: { weddingId_side: { weddingId: wid, side: "CPW" } },
        update: { ...data.brideData.cpw },
        create: { weddingId: wid, side: "CPW", ...data.brideData.cpw },
      });

      const budgetExisting = await tx.budgetItem.findMany({ where: { weddingId: wid } });
      const budgetIds = new Set(data.budgetList.map((b) => b.id));
      const delBudget = budgetExisting.filter((b) => !budgetIds.has(b.id)).map((b) => b.id);
      if (delBudget.length) await tx.budgetItem.deleteMany({ where: { id: { in: delBudget } } });
      for (let i = 0; i < data.budgetList.length; i++) {
        const b = data.budgetList[i];
        await tx.budgetItem.upsert({
          where: { id: b.id },
          update: { category: b.category, item: b.item, estimated: b.estimated, actual: b.actual, status: b.status, sortOrder: i },
          create: { id: b.id, weddingId: wid, category: b.category, item: b.item, estimated: b.estimated, actual: b.actual, status: b.status, sortOrder: i },
        });
      }

      const sesAll = [
        ...data.maharItems.map((x, i) => ({ ...x, section: "mahar", sortOrder: i })),
        ...data.seserahanCppToCpw.map((x, i) => ({ ...x, section: "cppToCpw", sortOrder: i })),
        ...data.seserahanCpwToCpp.map((x, i) => ({ ...x, section: "cpwToCpp", sortOrder: i })),
      ];
      const sesExisting = await tx.seserahanItem.findMany({ where: { weddingId: wid } });
      const sesIds = new Set(sesAll.map((s) => s.id));
      const delSes = sesExisting.filter((s) => !sesIds.has(s.id)).map((s) => s.id);
      if (delSes.length) await tx.seserahanItem.deleteMany({ where: { id: { in: delSes } } });
      for (const s of sesAll) {
        await tx.seserahanItem.upsert({
          where: { id: s.id },
          update: { title: s.title, cost: s.cost, ready: s.ready, link: s.link ?? "", section: s.section, sortOrder: s.sortOrder },
          create: { id: s.id, weddingId: wid, title: s.title, cost: s.cost, ready: s.ready, link: s.link ?? "", section: s.section, sortOrder: s.sortOrder },
        });
      }

      const vExisting = await tx.vendor.findMany({ where: { weddingId: wid } });
      const vIds = new Set(data.vendors.map((v) => v.id));
      const delV = vExisting.filter((v) => !vIds.has(v.id)).map((v) => v.id);
      if (delV.length) await tx.vendor.deleteMany({ where: { id: { in: delV } } });
      for (let i = 0; i < data.vendors.length; i++) {
        const v = data.vendors[i];
        await tx.vendor.upsert({
          where: { id: v.id },
          update: { category: v.category, name: v.name, price: v.price, status: v.status, contact: v.contact, notes: v.notes, sortOrder: i },
          create: { id: v.id, weddingId: wid, category: v.category, name: v.name, price: v.price, status: v.status, contact: v.contact, notes: v.notes, sortOrder: i },
        });
      }

      const dExisting = await tx.adminDoc.findMany({ where: { weddingId: wid } });
      const dIds = new Set(data.adminDocs.map((d) => d.id));
      const delD = dExisting.filter((d) => !dIds.has(d.id)).map((d) => d.id);
      if (delD.length) await tx.adminDoc.deleteMany({ where: { id: { in: delD } } });
      for (let i = 0; i < data.adminDocs.length; i++) {
        const d = data.adminDocs[i];
        await tx.adminDoc.upsert({
          where: { id: d.id },
          update: { title: d.title, description: d.description, completed: d.completed, sortOrder: i },
          create: { id: d.id, weddingId: wid, title: d.title, description: d.description, completed: d.completed, sortOrder: i },
        });
      }

      const gExisting = await tx.guest.findMany({ where: { weddingId: wid } });
      const gIds = new Set(data.guests.map((g) => g.id));
      const delG = gExisting.filter((g) => !gIds.has(g.id)).map((g) => g.id);
      if (delG.length) await tx.guest.deleteMany({ where: { id: { in: delG } } });
      for (let i = 0; i < data.guests.length; i++) {
        const g = data.guests[i];
        await tx.guest.upsert({
          where: { id: g.id },
          update: { name: g.name, side: g.side, category: g.category, pax: g.pax, sent: g.sent, status: g.status, isVip: g.isVip, sortOrder: i },
          create: { id: g.id, weddingId: wid, name: g.name, side: g.side, category: g.category, pax: g.pax, sent: g.sent, status: g.status, isVip: g.isVip, sortOrder: i },
        });
      }

      const cExisting = await tx.checklistItem.findMany({ where: { weddingId: wid } });
      const cIds = new Set(data.checklist.map((c) => c.id));
      const delC = cExisting.filter((c) => !cIds.has(c.id)).map((c) => c.id);
      if (delC.length) await tx.checklistItem.deleteMany({ where: { id: { in: delC } } });
      for (let i = 0; i < data.checklist.length; i++) {
        const c = data.checklist[i];
        await tx.checklistItem.upsert({
          where: { id: c.id },
          update: { timeframe: c.timeframe, task: c.task, done: c.done, sortOrder: i },
          create: { id: c.id, weddingId: wid, timeframe: c.timeframe, task: c.task, done: c.done, sortOrder: i },
        });
      }

      const rExisting = await tx.rundownItem.findMany({ where: { weddingId: wid } });
      const rIds = new Set(data.rundownList.map((r) => r.id));
      const delR = rExisting.filter((r) => !rIds.has(r.id)).map((r) => r.id);
      if (delR.length) await tx.rundownItem.deleteMany({ where: { id: { in: delR } } });
      for (let i = 0; i < data.rundownList.length; i++) {
        const r = data.rundownList[i];
        await tx.rundownItem.upsert({
          where: { id: r.id },
          update: { time: r.time, activity: r.activity, pic: r.pic, sortOrder: i },
          create: { id: r.id, weddingId: wid, time: r.time, activity: r.activity, pic: r.pic, sortOrder: i },
        });
      }

      const mExisting = await tx.committeeMember.findMany({ where: { weddingId: wid } });
      const mIds = new Set(data.committeeList.map((m) => m.id));
      const delM = mExisting.filter((m) => !mIds.has(m.id)).map((m) => m.id);
      if (delM.length) await tx.committeeMember.deleteMany({ where: { id: { in: delM } } });
      for (let i = 0; i < data.committeeList.length; i++) {
        const m = data.committeeList[i];
        await tx.committeeMember.upsert({
          where: { id: m.id },
          update: { role: m.role, name: m.name, uniformGiven: m.uniformGiven, sortOrder: i },
          create: { id: m.id, weddingId: wid, role: m.role, name: m.name, uniformGiven: m.uniformGiven, sortOrder: i },
        });
      }
    });

    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    console.error("saveWeddingAction failed", err);
    return { ok: false, error: "Gagal menyimpan data ke server" };
  }
}

export async function resetWeddingAction(): Promise<void> {
  const userId = await requireUserId();
  const existing = await prisma.wedding.findUnique({ where: { userId } });
  if (!existing) return;

  await prisma.wedding.delete({ where: { userId } });
  await createWeddingWithSeed(userId);
  revalidatePath("/dashboard");
}

export async function getWeddingForUser(): Promise<WeddingState | null> {
  const userId = await requireUserId();
  const w = await prisma.wedding.findUnique({
    where: { userId },
    include: {
      brideSides: true,
      budgetItems: { orderBy: { sortOrder: "asc" } },
      seserahanItems: { orderBy: { sortOrder: "asc" } },
      vendors: { orderBy: { sortOrder: "asc" } },
      adminDocs: { orderBy: { sortOrder: "asc" } },
      guests: { orderBy: { sortOrder: "asc" } },
      checklistItems: { orderBy: { sortOrder: "asc" } },
      rundownItems: { orderBy: { sortOrder: "asc" } },
      committeeMembers: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!w) return null;

  const cpp = w.brideSides.find((b) => b.side === "CPP");
  const cpw = w.brideSides.find((b) => b.side === "CPW");
  const pickBride = (b?: { fullName: string; nickname: string; father: string; mother: string; phone: string; address: string }) => ({
    fullName: b?.fullName ?? "",
    nickname: b?.nickname ?? "",
    father: b?.father ?? "",
    mother: b?.mother ?? "",
    phone: b?.phone ?? "",
    address: b?.address ?? "",
  });

  const sesMahar = w.seserahanItems.filter((s) => s.section === "mahar");
  const sesCpp = w.seserahanItems.filter((s) => s.section === "cppToCpw");
  const sesCpw = w.seserahanItems.filter((s) => s.section === "cpwToCpp");

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
    budgetList: w.budgetItems.map((b) => ({ id: b.id, category: b.category, item: b.item, estimated: b.estimated, actual: b.actual, status: b.status })),
    maharItems: sesMahar.map((s) => ({ id: s.id, title: s.title, cost: s.cost, ready: s.ready, link: s.link })),
    seserahanCppToCpw: sesCpp.map((s) => ({ id: s.id, title: s.title, cost: s.cost, ready: s.ready, link: s.link })),
    seserahanCpwToCpp: sesCpw.map((s) => ({ id: s.id, title: s.title, cost: s.cost, ready: s.ready, link: s.link })),
    vendors: w.vendors.map((v) => ({ id: v.id, category: v.category, name: v.name, price: v.price, status: v.status, contact: v.contact, notes: v.notes })),
    adminDocs: w.adminDocs.map((d) => ({ id: d.id, title: d.title, description: d.description, completed: d.completed })),
    guests: w.guests.map((g) => ({ id: g.id, name: g.name, side: g.side, category: g.category, pax: g.pax, sent: g.sent, status: g.status, isVip: g.isVip })),
    checklist: w.checklistItems.map((c) => ({ id: c.id, timeframe: c.timeframe, task: c.task, done: c.done })),
    rundownList: w.rundownItems.map((r) => ({ id: r.id, time: r.time, activity: r.activity, pic: r.pic })),
    committeeList: w.committeeMembers.map((m) => ({ id: m.id, role: m.role, name: m.name, uniformGiven: m.uniformGiven })),
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
  if (state.vendors.length === 0) {
    state.vendors = seed.vendors;
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
