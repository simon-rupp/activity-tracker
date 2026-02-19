import { notFound } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth";
import { formatDuration, formatMilesFromHundredths } from "@/lib/format";
import { prisma } from "@/lib/prisma";

import { updateRunAction } from "@/app/(protected)/runs/actions";

type EditRunPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function EditRunPage({
  params,
  searchParams,
}: EditRunPageProps) {
  const user = await requireCurrentUser();
  const routeParams = await params;
  const query = await searchParams;

  const id = Number(routeParams.id);
  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const run = await prisma.runSession.findFirst({
    where: {
      id,
      userId: user.id,
    },
  });

  if (!run) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Edit Run</h1>
        <p className="text-sm text-slate-600">Update this run entry.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <form action={updateRunAction} className="space-y-4">
          <input type="hidden" name="id" value={run.id} />
          <input type="hidden" name="returnTo" value={`/runs/${run.id}/edit`} />

          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Date</span>
              <input
                type="date"
                name="date"
                defaultValue={run.date}
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">
                Distance (miles)
              </span>
              <input
                type="number"
                name="distanceMiles"
                min={0}
                step={0.01}
                required
                defaultValue={formatMilesFromHundredths(run.distanceHundredths)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Duration</span>
              <input
                type="text"
                name="duration"
                required
                defaultValue={formatDuration(run.durationSeconds)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Notes</span>
            <textarea
              name="notes"
              rows={3}
              defaultValue={run.notes ?? ""}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          {query.error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Please correct the form values and try again.
            </p>
          ) : null}

          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Update Run
          </button>
        </form>
      </div>
    </section>
  );
}
