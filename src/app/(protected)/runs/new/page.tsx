import { isValidDateString, todayDateString } from "@/lib/date";

import { createRunAction } from "@/app/(protected)/runs/actions";

type NewRunPageProps = {
  searchParams: Promise<{
    date?: string;
    error?: string;
  }>;
};

export default async function NewRunPage({ searchParams }: NewRunPageProps) {
  const params = await searchParams;
  const requestedDate =
    params.date && isValidDateString(params.date)
      ? params.date
      : todayDateString();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Log Run</h1>
        <p className="text-sm text-slate-600">
          Enter distance in miles and time as mm:ss or hh:mm:ss.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <form action={createRunAction} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Date</span>
              <input
                type="date"
                name="date"
                defaultValue={requestedDate}
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
                placeholder="3.10"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Duration</span>
              <input
                type="text"
                name="duration"
                required
                placeholder="25:30"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Notes</span>
            <textarea
              name="notes"
              rows={3}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          {params.error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Please correct the form values and try again.
            </p>
          ) : null}

          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Save Run
          </button>
        </form>
      </div>
    </section>
  );
}
