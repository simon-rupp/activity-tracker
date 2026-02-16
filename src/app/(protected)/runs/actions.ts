"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { monthFromDateString } from "@/lib/date";
import { parseRunPayload, parseSessionId } from "@/lib/forms";
import { prisma } from "@/lib/prisma";

function getFormString(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" ? value : null;
}

function getCalendarRedirect(formData: FormData, fallbackDate: string): string {
  const month = getFormString(formData, "redirectMonth");
  const day = getFormString(formData, "redirectDay");

  const safeMonth = month && /^\d{4}-\d{2}$/.test(month) ? month : monthFromDateString(fallbackDate);
  const safeDay = day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : fallbackDate;

  return `/?month=${safeMonth}&day=${safeDay}`;
}

export async function createRunAction(formData: FormData) {
  let payload: ReturnType<typeof parseRunPayload>;
  try {
    payload = parseRunPayload(formData);
  } catch {
    redirect("/runs/new?error=invalid");
  }

  await prisma.runSession.create({
    data: payload,
  });

  revalidatePath("/");
  redirect(`/?month=${monthFromDateString(payload.date)}&day=${payload.date}`);
}

export async function updateRunAction(formData: FormData) {
  const returnTo = getFormString(formData, "returnTo") ?? "/runs/new";
  let id: number;
  let payload: ReturnType<typeof parseRunPayload>;

  try {
    id = parseSessionId(formData);
    payload = parseRunPayload(formData);
  } catch {
    redirect(`${returnTo}?error=invalid`);
  }

  await prisma.runSession.update({
    where: { id },
    data: payload,
  });

  revalidatePath("/");
  redirect(`/?month=${monthFromDateString(payload.date)}&day=${payload.date}`);
}

export async function deleteRunAction(formData: FormData) {
  let id: number;
  try {
    id = parseSessionId(formData);
  } catch {
    redirect("/");
  }

  const currentSession = await prisma.runSession.findUnique({
    where: { id },
    select: { date: true },
  });

  if (!currentSession) {
    redirect("/");
  }

  await prisma.runSession.delete({
    where: { id },
  });

  revalidatePath("/");
  redirect(getCalendarRedirect(formData, currentSession.date));
}
