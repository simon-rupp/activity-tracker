"use client";

import { useMemo, useState } from "react";

type ExerciseOption = {
  id: number;
  name: string;
};

type LiftEntryDraft = {
  exerciseId: number;
  sets: number;
  reps: number;
  weightLbs: string;
};

type LiftFormProps = {
  exercises: ExerciseOption[];
  defaultDate: string;
  defaultTitle: string;
  defaultNotes: string;
  defaultEntries: LiftEntryDraft[];
  submitLabel: string;
  formAction: (formData: FormData) => void | Promise<void>;
  id?: number;
  returnTo?: string;
  errorMessage?: string;
};

function createEntry(exerciseId: number): LiftEntryDraft {
  return {
    exerciseId,
    sets: 3,
    reps: 5,
    weightLbs: "0.0",
  };
}

export function LiftForm({
  exercises,
  defaultDate,
  defaultTitle,
  defaultNotes,
  defaultEntries,
  submitLabel,
  formAction,
  id,
  returnTo,
  errorMessage,
}: LiftFormProps) {
  const [entries, setEntries] = useState<LiftEntryDraft[]>(
    defaultEntries.length > 0
      ? defaultEntries
      : [createEntry(exercises[0]?.id ?? 0)],
  );

  const entriesJson = useMemo(() => JSON.stringify(entries), [entries]);
  const hasExercises = exercises.length > 0;

  return (
    <form action={formAction} className="space-y-6">
      {id ? <input type="hidden" name="id" value={id} /> : null}
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm font-medium text-slate-700">Date</span>
          <input
            type="date"
            name="date"
            required
            defaultValue={defaultDate}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-slate-700">Title</span>
          <input
            type="text"
            name="title"
            required
            maxLength={120}
            defaultValue={defaultTitle}
            placeholder="Upper body, Long run, etc."
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-700">Notes</span>
        <textarea
          name="notes"
          defaultValue={defaultNotes}
          rows={3}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      {errorMessage ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <input type="hidden" name="entriesJson" value={entriesJson} />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Exercises</h2>
          <button
            type="button"
            disabled={!hasExercises}
            onClick={() =>
              setEntries((previous) => [
                ...previous,
                createEntry(exercises[0]?.id ?? 0),
              ])
            }
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add Exercise
          </button>
        </div>

        {!hasExercises ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Add at least one exercise in Settings before logging a lift.
          </p>
        ) : null}

        <div className="space-y-3">
          {entries.map((entry, index) => (
            <div
              key={index}
              className="grid gap-2 rounded-md border border-slate-200 p-3 md:grid-cols-5"
            >
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs font-medium uppercase text-slate-500">
                  Exercise
                </span>
                <select
                  value={entry.exerciseId}
                  onChange={(event) => {
                    const exerciseId = Number(event.target.value);
                    setEntries((previous) =>
                      previous.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, exerciseId } : item,
                      ),
                    );
                  }}
                  className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                >
                  {exercises.map((exercise) => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium uppercase text-slate-500">
                  Sets
                </span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={entry.sets}
                  onChange={(event) => {
                    const sets = Math.max(1, Number(event.target.value) || 1);
                    setEntries((previous) =>
                      previous.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, sets } : item,
                      ),
                    );
                  }}
                  className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium uppercase text-slate-500">
                  Reps
                </span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={entry.reps}
                  onChange={(event) => {
                    const reps = Math.max(1, Number(event.target.value) || 1);
                    setEntries((previous) =>
                      previous.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, reps } : item,
                      ),
                    );
                  }}
                  className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium uppercase text-slate-500">
                  Weight (lbs)
                </span>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={entry.weightLbs}
                    onChange={(event) => {
                      const weightLbs = event.target.value;
                      setEntries((previous) =>
                        previous.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, weightLbs } : item,
                        ),
                      );
                    }}
                    className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                  />

                  <button
                    type="button"
                    disabled={entries.length === 1}
                    onClick={() => {
                      setEntries((previous) =>
                        previous.filter((_, itemIndex) => itemIndex !== index),
                      );
                    }}
                    className="rounded-md border border-red-200 px-2 py-2 text-xs font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </label>
            </div>
          ))}
        </div>
      </section>

      <button
        type="submit"
        disabled={!hasExercises}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {submitLabel}
      </button>
    </form>
  );
}
