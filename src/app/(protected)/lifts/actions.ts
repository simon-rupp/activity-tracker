"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { monthFromDateString } from "@/lib/date";
import { parseLiftPayload, parseSessionId } from "@/lib/forms";
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

export async function createLiftAction(formData: FormData) {
  let payload: ReturnType<typeof parseLiftPayload>;
  try {
    payload = parseLiftPayload(formData);
  } catch {
    redirect("/lifts/new?error=invalid");
  }

  await prisma.liftSession.create({
    data: {
      date: payload.date,
      title: payload.title,
      notes: payload.notes,
      entries: {
        create: payload.entries,
      },
    },
  });

  revalidatePath("/");
  redirect(`/?month=${monthFromDateString(payload.date)}&day=${payload.date}`);
}

export async function updateLiftAction(formData: FormData) {
  const returnTo = getFormString(formData, "returnTo") ?? "/lifts/new";
  let id: number;
  let payload: ReturnType<typeof parseLiftPayload>;

  try {
    id = parseSessionId(formData);
    payload = parseLiftPayload(formData);
  } catch {
    redirect(`${returnTo}?error=invalid`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.liftSession.update({
      where: { id },
      data: {
        date: payload.date,
        title: payload.title,
        notes: payload.notes,
      },
    });

    await tx.liftEntry.deleteMany({
      where: { liftSessionId: id },
    });

    await tx.liftEntry.createMany({
      data: payload.entries.map((entry) => ({
        liftSessionId: id,
        exerciseId: entry.exerciseId,
        sets: entry.sets,
        reps: entry.reps,
        weightTenths: entry.weightTenths,
        order: entry.order,
      })),
    });
  });

  revalidatePath("/");
  redirect(`/?month=${monthFromDateString(payload.date)}&day=${payload.date}`);
}

export async function deleteLiftAction(formData: FormData) {
  let id: number;
  try {
    id = parseSessionId(formData);
  } catch {
    redirect("/");
  }

  const currentSession = await prisma.liftSession.findUnique({
    where: { id },
    select: { date: true },
  });

  if (!currentSession) {
    redirect("/");
  }

  await prisma.liftSession.delete({
    where: { id },
  });

  revalidatePath("/");
  redirect(getCalendarRedirect(formData, currentSession.date));
}
