"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth";
import { monthFromDateString } from "@/lib/date";
import { parseLiftPayload, parseSessionId } from "@/lib/forms";
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

function normalizeExerciseName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeMuscleGroupName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function nameKey(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

async function resolveLiftEntries(
  tx: Prisma.TransactionClient,
  userId: number,
  entries: ReturnType<typeof parseLiftPayload>["entries"],
): Promise<
  Array<{
    exerciseId: number;
    muscleGroupIds: number[];
    sets: number;
    reps: number;
    weightTenths: number;
    order: number;
  }>
> {
  const existingExercises = await tx.exercise.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
    },
  });

  const exerciseIdsByKey = new Map<string, number>();
  for (const exercise of existingExercises) {
    exerciseIdsByKey.set(nameKey(exercise.name), exercise.id);
  }

  const resolvedEntries: Array<{
    exerciseId: number;
    muscleGroupIds: number[];
    sets: number;
    reps: number;
    weightTenths: number;
    order: number;
  }> = [];


  const existingMuscleGroups = await tx.muscleGroup.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
    },
  });

  const muscleGroupIdsByKey = new Map<string, number>();
  for (const muscleGroup of existingMuscleGroups) {
    muscleGroupIdsByKey.set(nameKey(muscleGroup.name), muscleGroup.id);
  }

  for (const entry of entries) {
    const normalizedName = normalizeExerciseName(entry.exerciseName);
    const key = nameKey(normalizedName);
    let exerciseId = exerciseIdsByKey.get(key);

    if (!exerciseId) {
      const exercise = await tx.exercise.upsert({
        where: {
          userId_name: {
            userId,
            name: normalizedName,
          },
        },
        create: {
          userId,
          name: normalizedName,
        },
        update: {},
        select: { id: true, name: true },
      });

      exerciseId = exercise.id;
      exerciseIdsByKey.set(key, exerciseId);
    }

    const muscleGroupIds: number[] = [];
    for (const muscleGroupName of entry.muscleGroups) {
      const normalizedMuscleGroupName = normalizeMuscleGroupName(muscleGroupName);
      const muscleGroupKey = nameKey(normalizedMuscleGroupName);
      let muscleGroupId = muscleGroupIdsByKey.get(muscleGroupKey);

      if (!muscleGroupId) {
        const muscleGroup = await tx.muscleGroup.upsert({
          where: {
            userId_name: {
              userId,
              name: normalizedMuscleGroupName,
            },
          },
          create: {
            userId,
            name: normalizedMuscleGroupName,
          },
          update: {},
          select: { id: true },
        });

        muscleGroupId = muscleGroup.id;
        muscleGroupIdsByKey.set(muscleGroupKey, muscleGroupId);
      }

      if (!muscleGroupIds.includes(muscleGroupId)) {
        muscleGroupIds.push(muscleGroupId);
      }
    }

    resolvedEntries.push({
      exerciseId,
      muscleGroupIds,
      sets: entry.sets,
      reps: entry.reps,
      weightTenths: entry.weightTenths,
      order: entry.order,
    });
  }

  return resolvedEntries;
}

export async function createLiftAction(formData: FormData) {
  const user = await requireCurrentUser();
  let payload: ReturnType<typeof parseLiftPayload>;
  try {
    payload = parseLiftPayload(formData);
  } catch {
    redirect("/lifts/new?error=invalid");
  }

  await prisma.$transaction(async (tx) => {
    const resolvedEntries = await resolveLiftEntries(tx, user.id, payload.entries);

    const liftSession = await tx.liftSession.create({
      data: {
        userId: user.id,
        date: payload.date,
        title: payload.title,
        notes: payload.notes,
      },
    });

    for (const entry of resolvedEntries) {
      const liftEntry = await tx.liftEntry.create({
        data: {
          liftSessionId: liftSession.id,
          exerciseId: entry.exerciseId,
          sets: entry.sets,
          reps: entry.reps,
          weightTenths: entry.weightTenths,
          order: entry.order,
        },
        select: { id: true },
      });

      if (entry.muscleGroupIds.length > 0) {
        await tx.liftEntryMuscleGroup.createMany({
          data: entry.muscleGroupIds.map((muscleGroupId) => ({
            liftEntryId: liftEntry.id,
            muscleGroupId,
          })),
        });
      }
    }
  });

  revalidatePath("/");
  redirect(`/?month=${monthFromDateString(payload.date)}&day=${payload.date}`);
}

export async function updateLiftAction(formData: FormData) {
  const user = await requireCurrentUser();
  const returnTo = getFormString(formData, "returnTo") ?? "/lifts/new";
  let id: number;
  let payload: ReturnType<typeof parseLiftPayload>;

  try {
    id = parseSessionId(formData);
    payload = parseLiftPayload(formData);
  } catch {
    redirect(`${returnTo}?error=invalid`);
  }

  const didUpdate = await prisma.$transaction(async (tx) => {
    const resolvedEntries = await resolveLiftEntries(tx, user.id, payload.entries);

    const updateResult = await tx.liftSession.updateMany({
      where: {
        id,
        userId: user.id,
      },
      data: {
        date: payload.date,
        title: payload.title,
        notes: payload.notes,
      },
    });

    if (updateResult.count === 0) {
      return false;
    }

    await tx.liftEntry.deleteMany({
      where: { liftSessionId: id },
    });

    for (const entry of resolvedEntries) {
      const liftEntry = await tx.liftEntry.create({
        data: {
          liftSessionId: id,
          exerciseId: entry.exerciseId,
          sets: entry.sets,
          reps: entry.reps,
          weightTenths: entry.weightTenths,
          order: entry.order,
        },
        select: { id: true },
      });

      if (entry.muscleGroupIds.length > 0) {
        await tx.liftEntryMuscleGroup.createMany({
          data: entry.muscleGroupIds.map((muscleGroupId) => ({
            liftEntryId: liftEntry.id,
            muscleGroupId,
          })),
        });
      }
    }

    return true;
  });

  if (!didUpdate) {
    redirect("/");
  }

  revalidatePath("/");
  redirect(`/?month=${monthFromDateString(payload.date)}&day=${payload.date}`);
}

export async function deleteLiftAction(formData: FormData) {
  const user = await requireCurrentUser();
  let id: number;
  try {
    id = parseSessionId(formData);
  } catch {
    redirect("/");
  }

  const currentSession = await prisma.liftSession.findFirst({
    where: {
      id,
      userId: user.id,
    },
    select: { date: true },
  });

  if (!currentSession) {
    redirect("/");
  }

  await prisma.liftSession.deleteMany({
    where: {
      id,
      userId: user.id,
    },
  });

  revalidatePath("/");
  redirect(getCalendarRedirect(formData, currentSession.date));
}
