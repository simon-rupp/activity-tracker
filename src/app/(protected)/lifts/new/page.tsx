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
          defaultEntries={[
            {
              exerciseName: "",
              sets: "",
              reps: "",
              weightLbs: "",
            },
          ]}
          submitLabel="Save Lift"
          formAction={createLiftAction}
          errorMessage={
            params.error ? "Please correct the form values and try again." : undefined
          }
        />
      </div>
    </section>
  );
}
