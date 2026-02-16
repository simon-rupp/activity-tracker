import Link from "next/link";

import { LiftForm } from "@/components/lift-form";
import { isValidDateString, todayDateString } from "@/lib/date";
import { prisma } from "@/lib/prisma";

import { createLiftAction } from "@/app/(protected)/lifts/actions";

type NewLiftPageProps = {
  searchParams: Promise<{
    date?: string;
    error?: string;
  }>;
};

export default async function NewLiftPage({ searchParams }: NewLiftPageProps) {
  const params = await searchParams;
  const requestedDate =
    params.date && isValidDateString(params.date)
      ? params.date
      : todayDateString();

  const exercises = await prisma.exercise.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Log Lift</h1>
        <p className="text-sm text-slate-600">
          Add a lift session with exercises and set data.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <LiftForm
          exercises={exercises}
          defaultDate={requestedDate}
          defaultTitle=""
          defaultNotes=""
          defaultEntries={
            exercises.length > 0
              ? [
                  {
                    exerciseId: exercises[0].id,
                    sets: 3,
                    reps: 5,
                    weightLbs: "0.0",
                  },
                ]
              : []
          }
          submitLabel="Save Lift"
          formAction={createLiftAction}
          errorMessage={
            params.error ? "Please correct the form values and try again." : undefined
          }
        />
      </div>

      {exercises.length === 0 ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          No exercises found. Add one in{" "}
          <Link className="font-semibold underline" href="/settings/exercises">
            settings
          </Link>{" "}
          first.
        </p>
      ) : null}
    </section>
  );
}
