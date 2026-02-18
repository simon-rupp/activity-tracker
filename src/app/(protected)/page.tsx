import Link from "next/link";

import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import {
  formatDateString,
  getMonthBounds,
  isDateInMonth,
  isValidDateString,
  normalizeMonth,
  shiftMonth,
  todayDateString,
} from "@/lib/date";
import {
  formatDuration,
  formatMilesFromHundredths,
  formatWeightFromTenths,
} from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { resolveRequestTimeZone } from "@/lib/request-timezone";

import { deleteLiftAction } from "@/app/(protected)/lifts/actions";
import { deleteRunAction } from "@/app/(protected)/runs/actions";

type CalendarPageProps = {
  searchParams: Promise<{
    month?: string | string[];
    day?: string | string[];
    view?: string | string[];
  }>;
};

type DaySummary = {
  liftCount: number;
  runCount: number;
  milesHundredths: number;
  liftTitles: string[];
};

type MobileCalendarView = "3d" | "week" | "month";

function readParam(input: string | string[] | undefined): string | undefined {
  return Array.isArray(input) ? input[0] : input;
}

function parseMobileView(input: string | string[] | undefined): MobileCalendarView {
  const value = readParam(input);
  if (value === "week" || value === "month") {
    return value;
  }

  return "3d";
}

function buildCalendarHref(month: string, day: string, view: MobileCalendarView): string {
  const params = new URLSearchParams({
    month,
    day,
  });

  if (view !== "3d") {
    params.set("view", view);
  }

  return `/?${params.toString()}`;
}

function shiftDateString(date: string, deltaDays: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(year, month - 1, day + deltaDays);

  return formatDateString(
    shifted.getFullYear(),
    shifted.getMonth() + 1,
    shifted.getDate(),
  );
}

function getDaySummary(summaryMap: Map<string, DaySummary>, date: string): DaySummary {
  const existing = summaryMap.get(date);
  if (existing) {
    return existing;
  }

  const next: DaySummary = {
    liftCount: 0,
    runCount: 0,
    milesHundredths: 0,
    liftTitles: [],
  };

  summaryMap.set(date, next);
  return next;
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const params = await searchParams;
  const requestTimeZone = await resolveRequestTimeZone();
  const today = todayDateString(requestTimeZone);
  const month = normalizeMonth(readParam(params.month), today);
  const dayFromQuery = readParam(params.day);
  const mobileView = parseMobileView(params.view);
  const { start, end, firstWeekday, daysInMonth } = getMonthBounds(month);
  const fallbackSelectedDay = isDateInMonth(today, month) ? today : start;
  const selectedDay =
    dayFromQuery && isValidDateString(dayFromQuery) && isDateInMonth(dayFromQuery, month)
      ? dayFromQuery
      : fallbackSelectedDay;
  const [year, monthNumber] = month.split("-").map(Number);
  const selectedDayNumber = Number(selectedDay.slice(8, 10));
  const monthLabel = new Date(year, monthNumber - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
  const previousMonthHref = buildCalendarHref(shiftMonth(month, -1), selectedDay, mobileView);
  const nextMonthHref = buildCalendarHref(shiftMonth(month, 1), selectedDay, mobileView);
  const mobileWindowSize = mobileView === "week" ? 7 : 3;
  const maxMobileWindowStart = Math.max(1, daysInMonth - mobileWindowSize + 1);
  const mobileWindowStartDay = Math.min(
    Math.max(selectedDayNumber - Math.floor(mobileWindowSize / 2), 1),
    maxMobileWindowStart,
  );
  const mobileWindowDates =
    mobileView === "month"
      ? []
      : Array.from({ length: mobileWindowSize }, (_, index) => {
          const dayNumber = mobileWindowStartDay + index;
          const date = formatDateString(year, monthNumber, dayNumber);
          return {
            date,
            dayNumber,
            weekday: new Date(year, monthNumber - 1, dayNumber).toLocaleDateString("en-US", {
              weekday: "short",
            }),
          };
        });
  const previousMobileWindowDay = shiftDateString(selectedDay, -mobileWindowSize);
  const nextMobileWindowDay = shiftDateString(selectedDay, mobileWindowSize);
  const previousMobileWindowHref = buildCalendarHref(
    previousMobileWindowDay.slice(0, 7),
    previousMobileWindowDay,
    mobileView,
  );
  const nextMobileWindowHref = buildCalendarHref(
    nextMobileWindowDay.slice(0, 7),
    nextMobileWindowDay,
    mobileView,
  );
  const isWeekMobileView = mobileView === "week";

  const [lifts, runs] = await Promise.all([
    prisma.liftSession.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
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
    prisma.runSession.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const summaryMap = new Map<string, DaySummary>();

  for (const lift of lifts) {
    const summary = getDaySummary(summaryMap, lift.date);
    summary.liftCount += 1;

    if (summary.liftTitles.length < 2) {
      summary.liftTitles.push(lift.title);
    }
  }

  for (const run of runs) {
    const summary = getDaySummary(summaryMap, run.date);
    summary.runCount += 1;
    summary.milesHundredths += run.distanceHundredths;
  }

  const cells: Array<{ date: string | null; day: number | null }> = [];
  for (let offset = 0; offset < firstWeekday; offset += 1) {
    cells.push({ date: null, day: null });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      date: formatDateString(year, monthNumber, day),
      day,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ date: null, day: null });
  }

  const selectedLifts = lifts.filter((lift) => lift.date === selectedDay);
  const selectedRuns = runs.filter((run) => run.date === selectedDay);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
          <p className="text-sm text-slate-600">
            Review lifts and runs by date.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/lifts/new?date=${selectedDay}`}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            + Lift
          </Link>
          <Link
            href={`/runs/new?date=${selectedDay}`}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            + Run
          </Link>
        </div>
      </div>

      <div className="flex gap-2 rounded-lg border border-slate-200 bg-white p-1 md:hidden">
        {[
          { value: "3d" as const, label: "3 Days" },
          { value: "week" as const, label: "Week" },
          { value: "month" as const, label: "Month" },
        ].map((option) => (
          <Link
            key={option.value}
            href={buildCalendarHref(month, selectedDay, option.value)}
            className={`flex-1 rounded-md px-2 py-2 text-center text-sm font-medium ${
              mobileView === option.value
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
            style={mobileView === option.value ? { color: "#ffffff" } : undefined}
          >
            {option.label}
          </Link>
        ))}
      </div>

      {mobileView !== "month" ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:hidden">
          <div className="flex items-center justify-between gap-2">
            <Link
              href={previousMobileWindowHref}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Prev
            </Link>

            <h2 className="text-sm font-semibold text-slate-900">{monthLabel}</h2>

            <Link
              href={nextMobileWindowHref}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Next
            </Link>
          </div>

          <div className="pb-1">
            <div className={`grid ${isWeekMobileView ? "grid-cols-7 gap-1" : "grid-cols-3 gap-2"}`}>
              {mobileWindowDates.map((mobileDate) => {
                const summary = summaryMap.get(mobileDate.date);
                const isSelected = mobileDate.date === selectedDay;
                const weekdayLabel = isWeekMobileView
                  ? mobileDate.weekday.slice(0, 1)
                  : mobileDate.weekday;

                return (
                  <Link
                    key={mobileDate.date}
                    href={buildCalendarHref(month, mobileDate.date, mobileView)}
                    className={`rounded-md border ${
                      isWeekMobileView ? "min-h-28 p-1.5" : "min-h-40 p-2"
                    } ${
                      isSelected
                        ? "border-slate-900 bg-slate-100"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className={`border-b border-slate-200 ${isWeekMobileView ? "pb-0.5" : "pb-1"}`}>
                      <p
                        className={`font-semibold uppercase tracking-wide text-slate-500 ${
                          isWeekMobileView ? "text-[9px]" : "text-[11px]"
                        }`}
                      >
                        {weekdayLabel}
                      </p>
                      <p
                        className={`font-bold leading-none text-slate-900 ${
                          isWeekMobileView ? "text-sm" : "text-lg"
                        }`}
                      >
                        {mobileDate.dayNumber}
                      </p>
                    </div>

                    {isWeekMobileView ? (
                      <div className="mt-1 space-y-0.5 text-[9px] text-slate-600">
                        {summary ? (
                          <>
                            {summary.liftCount > 0 ? (
                              <p className="font-medium text-slate-700">L{summary.liftCount}</p>
                            ) : null}
                            {summary.runCount > 0 ? (
                              <p className="font-medium text-slate-700">R{summary.runCount}</p>
                            ) : null}
                            {summary.liftCount === 0 && summary.runCount === 0 ? (
                              <p className="text-slate-400">-</p>
                            ) : null}
                          </>
                        ) : (
                          <p className="text-slate-400">-</p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                        {summary ? (
                          <>
                            {summary.liftCount > 0 ? <p>Lifts: {summary.liftCount}</p> : null}
                            {summary.runCount > 0 ? <p>Runs: {summary.runCount}</p> : null}
                            {summary.milesHundredths > 0 ? (
                              <p>{formatMilesFromHundredths(summary.milesHundredths)} mi</p>
                            ) : null}
                            {summary.liftTitles[0] ? (
                              <p className="truncate font-medium">{summary.liftTitles[0]}</p>
                            ) : null}
                          </>
                        ) : (
                          <p className="text-slate-400">No activity</p>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${
          mobileView === "month" ? "block" : "hidden"
        } md:block`}
      >
        <div className="mb-3 flex items-center justify-between">
          <Link
            href={previousMonthHref}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Prev
          </Link>

          <h2 className="text-base font-semibold text-slate-900">{monthLabel}</h2>

          <Link
            href={nextMonthHref}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Next
          </Link>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
            <div key={dayName}>{dayName}</div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-2">
          {cells.map((cell, index) => {
            if (!cell.date || !cell.day) {
              return (
                <div
                  key={`empty-${index}`}
                  className="min-h-24 rounded-md border border-transparent bg-slate-50"
                />
              );
            }

            const summary = summaryMap.get(cell.date);
            const isSelected = cell.date === selectedDay;

            return (
              <Link
                key={cell.date}
                href={buildCalendarHref(month, cell.date, mobileView)}
                className={`min-h-24 rounded-md border p-2 text-left transition ${
                  isSelected
                    ? "border-slate-900 bg-slate-100"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <p className="text-xs font-semibold text-slate-800">{cell.day}</p>

                {summary ? (
                  <div className="mt-1 space-y-0.5 text-[11px] text-slate-600">
                    {summary.liftCount > 0 ? (
                      <p>Lifts: {summary.liftCount}</p>
                    ) : null}
                    {summary.runCount > 0 ? (
                      <p>Runs: {summary.runCount}</p>
                    ) : null}
                    {summary.milesHundredths > 0 ? (
                      <p>{formatMilesFromHundredths(summary.milesHundredths)} mi</p>
                    ) : null}
                    {summary.liftTitles[0] ? (
                      <p className="truncate font-medium">{summary.liftTitles[0]}</p>
                    ) : null}
                  </div>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">{selectedDay}</h2>

        <div className="space-y-3">
          {selectedLifts.map((lift) => (
            <article
              key={`lift-${lift.id}`}
              className="rounded-md border border-slate-200 p-3"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-900">{lift.title}</h3>
                <div className="flex gap-2">
                  <Link
                    href={`/lifts/${lift.id}/edit`}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Edit
                  </Link>
                  <form action={deleteLiftAction}>
                    <input type="hidden" name="id" value={lift.id} />
                    <input type="hidden" name="redirectMonth" value={month} />
                    <input type="hidden" name="redirectDay" value={selectedDay} />
                    <input type="hidden" name="redirectView" value={mobileView} />
                    <ConfirmDeleteButton
                      label="Delete"
                      className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                      message="Delete this lift permanently?"
                    />
                  </form>
                </div>
              </div>

              {lift.notes ? (
                <p className="mb-2 text-sm text-slate-600">{lift.notes}</p>
              ) : null}

              <div className="overflow-x-auto">
                <table className="w-full min-w-[360px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                      <th className="py-1">Exercise</th>
                      <th className="py-1">Sets</th>
                      <th className="py-1">Reps</th>
                      <th className="py-1">Weight (lbs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lift.entries.map((entry) => (
                      <tr key={entry.id} className="border-b border-slate-100">
                        <td className="py-1 text-slate-800">{entry.exercise.name}</td>
                        <td className="py-1 text-slate-800">{entry.sets}</td>
                        <td className="py-1 text-slate-800">{entry.reps}</td>
                        <td className="py-1 text-slate-800">
                          {formatWeightFromTenths(entry.weightTenths)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}

          {selectedRuns.map((run) => (
            <article
              key={`run-${run.id}`}
              className="rounded-md border border-slate-200 p-3"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-900">
                  Run {formatMilesFromHundredths(run.distanceHundredths)} mi in{" "}
                  {formatDuration(run.durationSeconds)}
                </h3>
                <div className="flex gap-2">
                  <Link
                    href={`/runs/${run.id}/edit`}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Edit
                  </Link>
                  <form action={deleteRunAction}>
                    <input type="hidden" name="id" value={run.id} />
                    <input type="hidden" name="redirectMonth" value={month} />
                    <input type="hidden" name="redirectDay" value={selectedDay} />
                    <input type="hidden" name="redirectView" value={mobileView} />
                    <ConfirmDeleteButton
                      label="Delete"
                      className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                      message="Delete this run permanently?"
                    />
                  </form>
                </div>
              </div>

              {run.notes ? <p className="text-sm text-slate-600">{run.notes}</p> : null}
            </article>
          ))}

          {selectedLifts.length === 0 && selectedRuns.length === 0 ? (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              No entries for this date.
            </p>
          ) : null}
        </div>
      </section>
    </section>
  );
}
