import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { prisma } from "@/lib/prisma";

import {
  createExerciseAction,
  deleteExerciseAction,
  updateExerciseAction,
} from "@/app/(protected)/settings/exercises/actions";

type ExerciseSettingsPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  invalid: "Please provide a valid exercise name.",
  duplicate: "That exercise already exists.",
  in_use: "Cannot delete an exercise that is used in a lift.",
};

export default async function ExerciseSettingsPage({
  searchParams,
}: ExerciseSettingsPageProps) {
  const params = await searchParams;
  const errorMessage =
    params.error && params.error in errorMessages
      ? errorMessages[params.error]
      : null;

  const exercises = await prisma.exercise.findMany({
    orderBy: {
      name: "asc",
    },
    include: {
      _count: {
        select: {
          entries: true,
        },
      },
    },
  });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Exercise Settings</h1>
        <p className="text-sm text-slate-600">
          Add reusable exercises for quick lift entry.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <form action={createExerciseAction} className="flex flex-wrap gap-3">
          <input
            type="text"
            name="name"
            required
            placeholder="Add exercise"
            className="min-w-56 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Add Exercise
          </button>
        </form>
      </div>

      {errorMessage ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <div className="space-y-3">
        {exercises.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
            No exercises yet.
          </p>
        ) : null}

        {exercises.map((exercise) => (
          <div
            key={exercise.id}
            className="rounded-md border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div className="mb-2 text-xs font-medium uppercase text-slate-500">
              Used in {exercise._count.entries} lift entries
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <form action={updateExerciseAction} className="flex min-w-56 flex-1 gap-2">
                <input type="hidden" name="id" value={exercise.id} />
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={exercise.name}
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Save
                </button>
              </form>

              <form action={deleteExerciseAction}>
                <input type="hidden" name="id" value={exercise.id} />
                <ConfirmDeleteButton
                  className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                  message={`Delete "${exercise.name}" permanently?`}
                />
              </form>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
