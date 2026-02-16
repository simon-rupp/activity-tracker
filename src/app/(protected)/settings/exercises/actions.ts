"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseSessionId } from "@/lib/forms";
import { prisma } from "@/lib/prisma";

function getFormString(formData: FormData, fieldName: string): string | null {
  const raw = formData.get(fieldName);
  return typeof raw === "string" ? raw.trim() : null;
}

export async function createExerciseAction(formData: FormData) {
  const name = getFormString(formData, "name");

  if (!name) {
    redirect("/settings/exercises?error=invalid");
  }

  try {
    await prisma.exercise.create({
      data: { name },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirect("/settings/exercises?error=duplicate");
    }

    throw error;
  }

  revalidatePath("/settings/exercises");
  redirect("/settings/exercises");
}

export async function updateExerciseAction(formData: FormData) {
  const name = getFormString(formData, "name");

  let id: number;
  try {
    id = parseSessionId(formData);
  } catch {
    redirect("/settings/exercises?error=invalid");
  }

  if (!name) {
    redirect("/settings/exercises?error=invalid");
  }

  try {
    await prisma.exercise.update({
      where: { id },
      data: { name },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirect("/settings/exercises?error=duplicate");
    }

    throw error;
  }

  revalidatePath("/settings/exercises");
  redirect("/settings/exercises");
}

export async function deleteExerciseAction(formData: FormData) {
  let id: number;
  try {
    id = parseSessionId(formData);
  } catch {
    redirect("/settings/exercises?error=invalid");
  }

  try {
    await prisma.exercise.delete({
      where: { id },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      redirect("/settings/exercises?error=in_use");
    }

    throw error;
  }

  revalidatePath("/settings/exercises");
  redirect("/settings/exercises");
}
