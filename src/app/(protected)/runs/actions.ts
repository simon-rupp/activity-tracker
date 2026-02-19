"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth";
import { monthFromDateString } from "@/lib/date";
import { parseRunPayload, parseSessionId } from "@/lib/forms";
import { prisma } from "@/lib/prisma";

function getFormString(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" ? value : null;
}

function getCalendarView(value: string | null): "3d" | "week" | "month" | null {
  if (value === "3d" || value === "week" || value === "month") {
    return value;
  }

  return null;
}

function getCalendarRedirect(formData: FormData, fallbackDate: string): string {
  const month = getFormString(formData, "redirectMonth");
  const day = getFormString(formData, "redirectDay");
  const view = getCalendarView(getFormString(formData, "redirectView"));

  const safeMonth = month && /^\d{4}-\d{2}$/.test(month) ? month : monthFromDateString(fallbackDate);
  const safeDay = day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : fallbackDate;

  const params = new URLSearchParams({
    month: safeMonth,
    day: safeDay,
  });

  if (view) {
    params.set("view", view);
  }

  return `/?${params.toString()}`;
}

export async function createRunAction(formData: FormData) {
  const user = await requireCurrentUser();
  let payload: ReturnType<typeof parseRunPayload>;
  try {
    payload = parseRunPayload(formData);
  } catch {
    redirect("/runs/new?error=invalid");
  }

  await prisma.runSession.create({
    data: {
      userId: user.id,
      ...payload,
    },
  });

  revalidatePath("/");
  redirect(`/?month=${monthFromDateString(payload.date)}&day=${payload.date}`);
}

export async function updateRunAction(formData: FormData) {
  const user = await requireCurrentUser();
  const returnTo = getFormString(formData, "returnTo") ?? "/runs/new";
  let id: number;
  let payload: ReturnType<typeof parseRunPayload>;

  try {
    id = parseSessionId(formData);
    payload = parseRunPayload(formData);
  } catch {
    redirect(`${returnTo}?error=invalid`);
  }

  const result = await prisma.runSession.updateMany({
    where: {
      id,
      userId: user.id,
    },
    data: payload,
  });

  if (result.count === 0) {
    redirect("/");
  }

  revalidatePath("/");
  redirect(`/?month=${monthFromDateString(payload.date)}&day=${payload.date}`);
}

export async function deleteRunAction(formData: FormData) {
  const user = await requireCurrentUser();
  let id: number;
  try {
    id = parseSessionId(formData);
  } catch {
    redirect("/");
  }

  const currentSession = await prisma.runSession.findFirst({
    where: {
      id,
      userId: user.id,
    },
    select: { date: true },
  });

  if (!currentSession) {
    redirect("/");
  }

  await prisma.runSession.deleteMany({
    where: {
      id,
      userId: user.id,
    },
  });

  revalidatePath("/");
  redirect(getCalendarRedirect(formData, currentSession.date));
}
