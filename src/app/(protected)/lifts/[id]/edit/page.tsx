import { notFound } from "next/navigation";

import { LiftForm } from "@/components/lift-form";
import { formatWeightFromTenths } from "@/lib/format";
import { prisma } from "@/lib/prisma";

import { updateLiftAction } from "@/app/(protected)/lifts/actions";

type EditLiftPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function EditLiftPage({
  params,
  searchParams,
}: EditLiftPageProps) {
  const routeParams = await params;
  const query = await searchParams;

  const id = Number(routeParams.id);
  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const [lift, exercises] = await Promise.all([
    prisma.liftSession.findUnique({
      where: { id },
      include: {
        entries: {
          orderBy: { order: "asc" },
          include: {
            exercise: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.exercise.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  if (!lift) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Edit Lift</h1>
        <p className="text-sm text-slate-600">Update this lift session.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <LiftForm
          id={lift.id}
          returnTo={`/lifts/${lift.id}/edit`}
          exercises={exercises}
          defaultDate={lift.date}
          defaultTitle={lift.title}
          defaultNotes={lift.notes ?? ""}
          defaultEntries={lift.entries.map((entry) => ({
            exerciseName: entry.exercise.name,
            sets: String(entry.sets),
            reps: String(entry.reps),
            weightLbs: formatWeightFromTenths(entry.weightTenths),
          }))}
          submitLabel="Update Lift"
          formAction={updateLiftAction}
          errorMessage={
            query.error ? "Please correct the form values and try again." : undefined
          }
        />
      </div>
    </section>
  );
}
