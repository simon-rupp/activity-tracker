import Link from "next/link";

import { LiftForm } from "@/components/lift-form";
import { requireCurrentUser } from "@/lib/auth";
import { isValidDateString, todayDateString } from "@/lib/date";
import { formatWeightFromTenths } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { resolveRequestTimeZone } from "@/lib/request-timezone";

import { createLiftAction } from "@/app/(protected)/lifts/actions";

type NewLiftPageProps = {
  searchParams: Promise<{
    date?: string;
    error?: string;
    templateId?: string;
  }>;
};

type LiftTemplateListItem = {
  id: number;
  title: string;
  date: string;
};

function parseTemplateId(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function buildTemplateHref(templateId: number, date: string): string {
  const params = new URLSearchParams({
    templateId: String(templateId),
    date,
  });

  return `/lifts/new?${params.toString()}`;
}

export default async function NewLiftPage({ searchParams }: NewLiftPageProps) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  const requestTimeZone = await resolveRequestTimeZone();
  const requestedDate =
    params.date && isValidDateString(params.date)
      ? params.date
      : todayDateString(requestTimeZone);
  const requestedTemplateId = parseTemplateId(params.templateId);

  const [exercises, muscleGroups, savedTemplates, recentTemplates, templateLift] =
    await Promise.all([
      prisma.exercise.findMany({
        where: { userId: user.id },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
        },
      }),
      prisma.muscleGroup.findMany({
        where: { userId: user.id },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
        },
      }),
      prisma.savedLift.findMany({
        where: {
          userId: user.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 12,
        select: {
          liftSession: {
            select: {
              id: true,
              title: true,
              date: true,
            },
          },
        },
      }),
      prisma.liftSession.findMany({
        where: {
          userId: user.id,
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 20,
        select: {
          id: true,
          title: true,
          date: true,
        },
      }),
      requestedTemplateId
        ? prisma.liftSession.findFirst({
            where: {
              id: requestedTemplateId,
              userId: user.id,
            },
            include: {
              entries: {
                orderBy: {
                  order: "asc",
                },
                include: {
                  exercise: {
                    select: {
                      name: true,
                    },
                  },
                  muscleGroups: {
                    include: {
                      muscleGroup: {
                        select: {
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          })
        : Promise.resolve(null),
    ]);

  const goToTemplates: LiftTemplateListItem[] = savedTemplates.map((savedLift) => ({
    id: savedLift.liftSession.id,
    title: savedLift.liftSession.title,
    date: savedLift.liftSession.date,
  }));

  const savedTemplateIds = new Set(goToTemplates.map((template) => template.id));
  const recentTemplatesWithoutGoTo: LiftTemplateListItem[] = recentTemplates.filter(
    (liftSession) => !savedTemplateIds.has(liftSession.id),
  );

  const defaultEntries =
    templateLift && templateLift.entries.length > 0
      ? templateLift.entries.map((entry) => ({
          exerciseName: entry.exercise.name,
          muscleGroups: entry.muscleGroups.map((muscleGroup) => muscleGroup.muscleGroup.name),
          muscleGroupInput: "",
          sets: String(entry.sets),
          reps: String(entry.reps),
          weightLbs: formatWeightFromTenths(entry.weightTenths),
        }))
      : [
          {
            exerciseName: "",
            muscleGroups: [],
            muscleGroupInput: "",
            sets: "",
            reps: "",
            weightLbs: "",
          },
        ];

  const templateNotice =
    requestedTemplateId && !templateLift
      ? "Selected template was not found."
      : templateLift
        ? `Prefilled from "${templateLift.title}" (${templateLift.date}).`
        : null;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Log Lift</h1>
        <p className="text-sm text-slate-600">
          Add a lift session with exercises and set data.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Reuse Previous Lift</h2>
            <p className="text-sm text-slate-600">
              Pick a previous lift to prefill title and exercise rows. Notes are not copied.
            </p>
          </div>

          {goToTemplates.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Go-To Lifts
              </h3>
              <div className="flex flex-wrap gap-2">
                {goToTemplates.map((template) => {
                  const isActive = templateLift?.id === template.id;

                  return (
                    <Link
                      key={`go-to-${template.id}`}
                      href={buildTemplateHref(template.id, requestedDate)}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                        isActive
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                      style={isActive ? { color: "#ffffff" } : undefined}
                    >
                      {template.title} ({template.date})
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}

          {recentTemplatesWithoutGoTo.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Recent Lifts
              </h3>
              <div className="flex flex-wrap gap-2">
                {recentTemplatesWithoutGoTo.map((template) => {
                  const isActive = templateLift?.id === template.id;

                  return (
                    <Link
                      key={`recent-${template.id}`}
                      href={buildTemplateHref(template.id, requestedDate)}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                        isActive
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                      style={isActive ? { color: "#ffffff" } : undefined}
                    >
                      {template.title} ({template.date})
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}

          {goToTemplates.length === 0 && recentTemplatesWithoutGoTo.length === 0 ? (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              No previous lifts yet. Log your first lift to create reusable history.
            </p>
          ) : null}

          <p className="text-xs text-slate-500">
            Tip: you can also click Reuse on any lift card in the calendar.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {templateNotice ? (
          <p className="mb-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {templateNotice}
          </p>
        ) : null}

        <LiftForm
          exercises={exercises}
          muscleGroups={muscleGroups}
          defaultDate={requestedDate}
          defaultTitle={templateLift?.title ?? ""}
          defaultNotes=""
          defaultEntries={defaultEntries}
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
