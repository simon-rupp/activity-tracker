"use server";

import { Prisma } from "@prisma/client";
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

function normalizeExerciseName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function exerciseKey(value: string): string {
  return normalizeExerciseName(value).toLocaleLowerCase();
}

async function resolveLiftEntries(
  tx: Prisma.TransactionClient,
  entries: ReturnType<typeof parseLiftPayload>["entries"],
): Promise<
  Array<{
    exerciseId: number;
    sets: number;
    reps: number;
    weightTenths: number;
    order: number;
  }>
> {
  const existingExercises = await tx.exercise.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  const exerciseIdsByKey = new Map<string, number>();
  for (const exercise of existingExercises) {
    exerciseIdsByKey.set(exerciseKey(exercise.name), exercise.id);
  }

  const resolvedEntries: Array<{
    exerciseId: number;
    sets: number;
    reps: number;
    weightTenths: number;
    order: number;
  }> = [];

  for (const entry of entries) {
    const normalizedName = normalizeExerciseName(entry.exerciseName);
    const key = exerciseKey(normalizedName);
    let exerciseId = exerciseIdsByKey.get(key);

    if (!exerciseId) {
      const exercise = await tx.exercise.upsert({
        where: { name: normalizedName },
        create: { name: normalizedName },
        update: {},
        select: { id: true, name: true },
      });

      exerciseId = exercise.id;
      exerciseIdsByKey.set(key, exerciseId);
    }

    resolvedEntries.push({
      exerciseId,
      sets: entry.sets,
      reps: entry.reps,
      weightTenths: entry.weightTenths,
      order: entry.order,
    });
  }

  return resolvedEntries;
}

export async function createLiftAction(formData: FormData) {
  let payload: ReturnType<typeof parseLiftPayload>;
  try {
    payload = parseLiftPayload(formData);
  } catch {
    redirect("/lifts/new?error=invalid");
  }

  await prisma.$transaction(async (tx) => {
    const resolvedEntries = await resolveLiftEntries(tx, payload.entries);

    const liftSession = await tx.liftSession.create({
      data: {
        date: payload.date,
        title: payload.title,
        notes: payload.notes,
      },
    });

    await tx.liftEntry.createMany({
      data: resolvedEntries.map((entry) => ({
        liftSessionId: liftSession.id,
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
    const resolvedEntries = await resolveLiftEntries(tx, payload.entries);

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
      data: resolvedEntries.map((entry) => ({
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
