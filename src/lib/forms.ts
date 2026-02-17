import { z } from "zod";

import { isValidDateString } from "@/lib/date";
import { parseDurationInput } from "@/lib/format";

const liftEntrySchema = z.object({
  exerciseName: z.string(),
  sets: z.coerce.number().int().positive(),
  reps: z.coerce.number().int().positive(),
  weightLbs: z.union([z.string(), z.number()]),
});

const liftEntriesSchema = z.array(liftEntrySchema).min(1);

function getFormString(formData: FormData, fieldName: string): string {
  const raw = formData.get(fieldName);
  if (typeof raw !== "string") {
    throw new Error(`Missing field: ${fieldName}`);
  }

  return raw.trim();
}

function parseWeightTenths(raw: string | number): number {
  const normalized = String(raw).trim();
  if (!/^\d+(\.\d)?$/.test(normalized)) {
    throw new Error("Weight must use 1 decimal precision at most.");
  }

  return Math.round(Number(normalized) * 10);
}

function normalizeExerciseName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function parseDistanceHundredths(raw: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
    throw new Error("Distance must use 2 decimal precision at most.");
  }

  return Math.round(Number(raw) * 100);
}

export function parseSessionId(formData: FormData): number {
  const id = Number(getFormString(formData, "id"));
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid ID.");
  }

  return id;
}

export function parseDate(formData: FormData): string {
  const date = getFormString(formData, "date");
  if (!isValidDateString(date)) {
    throw new Error("Invalid date.");
  }

  return date;
}

export function parseLiftPayload(formData: FormData): {
  date: string;
  title: string;
  notes: string | null;
  entries: Array<{
    exerciseName: string;
    sets: number;
    reps: number;
    weightTenths: number;
    order: number;
  }>;
} {
  const date = parseDate(formData);
  const title = getFormString(formData, "title");
  const notes = getFormString(formData, "notes");
  const entriesJson = getFormString(formData, "entriesJson");

  if (!title) {
    throw new Error("Title is required.");
  }

  let parsedEntriesInput: unknown;
  try {
    parsedEntriesInput = JSON.parse(entriesJson);
  } catch {
    throw new Error("Invalid exercise entries.");
  }

  const parsedEntries = liftEntriesSchema.parse(parsedEntriesInput).map((entry, index) => {
    const exerciseName = normalizeExerciseName(entry.exerciseName);
    if (!exerciseName) {
      throw new Error("Exercise name is required.");
    }

    return {
      exerciseName,
      sets: entry.sets,
      reps: entry.reps,
      weightTenths: parseWeightTenths(entry.weightLbs),
      order: index,
    };
  });

  return {
    date,
    title,
    notes: notes || null,
    entries: parsedEntries,
  };
}

export function parseRunPayload(formData: FormData): {
  date: string;
  distanceHundredths: number;
  durationSeconds: number;
  notes: string | null;
} {
  const date = parseDate(formData);
  const distanceRaw = getFormString(formData, "distanceMiles");
  const durationRaw = getFormString(formData, "duration");
  const notes = getFormString(formData, "notes");

  const distanceHundredths = parseDistanceHundredths(distanceRaw);
  const durationSeconds = parseDurationInput(durationRaw);

  if (durationSeconds === null) {
    throw new Error("Duration must be mm:ss or hh:mm:ss.");
  }

  return {
    date,
    distanceHundredths,
    durationSeconds,
    notes: notes || null,
  };
}
