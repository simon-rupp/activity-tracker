import Link from "next/link";

import { requireCurrentUser } from "@/lib/auth";
import { todayDateString } from "@/lib/date";
import { formatDuration, formatMilesFromHundredths } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { resolveRequestTimeZone } from "@/lib/request-timezone";

type SummaryPageProps = {
  searchParams: Promise<{
    range?: string | string[];
  }>;
};

type SummaryRange = "week" | "month" | "all";

function readParam(input: string | string[] | undefined): string | undefined {
  return Array.isArray(input) ? input[0] : input;
}

function parseRange(input: string | string[] | undefined): SummaryRange {
  const value = readParam(input);
  if (value === "month" || value === "all") {
    return value;
  }

  return "week";
}

function shiftDateString(date: string, deltaDays: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(year, month - 1, day + deltaDays);

  const shiftedYear = shifted.getFullYear();
  const shiftedMonth = `${shifted.getMonth() + 1}`.padStart(2, "0");
  const shiftedDay = `${shifted.getDate()}`.padStart(2, "0");

  return `${shiftedYear}-${shiftedMonth}-${shiftedDay}`;
}

function getRangeStart(range: SummaryRange, today: string): string | null {
  if (range === "all") {
    return null;
  }

  if (range === "month") {
    return shiftDateString(today, -29);
  }

  return shiftDateString(today, -6);
}

const rangeOptions: Array<{ value: SummaryRange; label: string }> = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "all", label: "All Time" },
];

export default async function SummaryPage({ searchParams }: SummaryPageProps) {
  const user = await requireCurrentUser();
  const { range: rangeParam } = await searchParams;
  const selectedRange = parseRange(rangeParam);
  const timeZone = await resolveRequestTimeZone();
  const today = todayDateString(timeZone);
  const rangeStart = getRangeStart(selectedRange, today);

  const [liftEntries, liftCount, runs] = await Promise.all([
    prisma.liftEntry.findMany({
      where: {
        liftSession: {
          userId: user.id,
          ...(rangeStart
            ? {
                date: {
                  gte: rangeStart,
                  lte: today,
                },
              }
            : {}),
        },
      },
      select: {
        sets: true,
        muscleGroups: {
          select: {
            muscleGroup: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.liftSession.count({
      where: {
        userId: user.id,
        ...(rangeStart
          ? {
              date: {
                gte: rangeStart,
                lte: today,
              },
            }
          : {}),
      },
    }),
    prisma.runSession.findMany({
      where: {
        userId: user.id,
        ...(rangeStart
          ? {
              date: {
                gte: rangeStart,
                lte: today,
              },
            }
          : {}),
      },
      select: {
        distanceHundredths: true,
        durationSeconds: true,
      },
    }),
  ]);

  const muscleTotals = new Map<number, { name: string; totalSets: number }>();

  for (const entry of liftEntries) {
    for (const muscleGroupRelation of entry.muscleGroups) {
      const muscleGroup = muscleGroupRelation.muscleGroup;
      const existing = muscleTotals.get(muscleGroup.id);

      if (existing) {
        existing.totalSets += entry.sets;
      } else {
        muscleTotals.set(muscleGroup.id, {
          name: muscleGroup.name,
          totalSets: entry.sets,
        });
      }
    }
  }

  const muscleRows = Array.from(muscleTotals.values()).sort((a, b) => {
    if (b.totalSets !== a.totalSets) {
      return b.totalSets - a.totalSets;
    }

    return a.name.localeCompare(b.name);
  });

  const runCount = runs.length;
  const totalRunDistanceHundredths = runs.reduce(
    (sum, run) => sum + run.distanceHundredths,
    0,
  );
  const totalRunDurationSeconds = runs.reduce((sum, run) => sum + run.durationSeconds, 0);

  const averageDistanceHundredths =
    runCount > 0 ? Math.round(totalRunDistanceHundredths / runCount) : 0;
  const averageDurationSeconds = runCount > 0 ? Math.round(totalRunDurationSeconds / runCount) : 0;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Summary</h1>
        <p className="text-sm text-slate-600">
          Totals for lift muscle groups and running in the selected timeframe.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {rangeOptions.map((option) => {
          const href = option.value === "week" ? "/summary" : `/summary?range=${option.value}`;
          const isSelected = option.value === selectedRange;

          return (
            <Link
              key={option.value}
              href={href}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                isSelected
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
              style={isSelected ? { color: "#ffffff" } : undefined}
            >
              {option.label}
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-medium text-slate-600">Lifts Completed</h2>
          <p className="mt-2 text-2xl font-bold text-slate-900">{liftCount}</p>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-medium text-slate-600">Total Miles</h2>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatMilesFromHundredths(totalRunDistanceHundredths)}
          </p>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-medium text-slate-600">Average Run Distance</h2>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatMilesFromHundredths(averageDistanceHundredths)} mi
          </p>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-medium text-slate-600">Average Run Duration</h2>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatDuration(averageDurationSeconds)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Across {runCount} run(s)</p>
        </article>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white">
        <header className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-slate-900">Muscle Group Sets</h2>
        </header>

        {muscleRows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-600">No lift sets found in this timeframe.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {muscleRows.map((row) => (
              <li key={row.name} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-medium text-slate-700">{row.name}</span>
                <span className="text-sm font-semibold text-slate-900">{row.totalSets} sets</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
