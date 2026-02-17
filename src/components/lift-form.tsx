"use client";

import { useMemo, useState } from "react";

type ExerciseOption = {
  id: number;
  name: string;
};

type LiftEntryDraft = {
  exerciseName: string;
  sets: string;
  reps: string;
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

function createEntry(exerciseName = ""): LiftEntryDraft {
  return {
    exerciseName,
    sets: "",
    reps: "",
    weightLbs: "",
  };
}

function normalizeExerciseName(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function getSuggestionNames(inputValue: string, exerciseNames: string[]): string[] {
  const normalizedInput = normalizeExerciseName(inputValue);

  const matches = normalizedInput
    ? exerciseNames.filter((name) =>
        normalizeExerciseName(name).includes(normalizedInput),
      )
    : exerciseNames;

  return matches.slice(0, 8);
}

function isPositiveInteger(value: string): boolean {
  return /^\d+$/.test(value) && Number(value) > 0;
}

function isWeightFormatValid(value: string): boolean {
  return /^\d+(\.\d)?$/.test(value);
}

function getLiftValidationMessage(entries: LiftEntryDraft[]): string | null {
  for (const entry of entries) {
    if (!entry.exerciseName.trim()) {
      return "Each exercise row needs an exercise name.";
    }

    if (!isPositiveInteger(entry.sets)) {
      return "Sets must be whole numbers greater than 0.";
    }

    if (!isPositiveInteger(entry.reps)) {
      return "Reps must be whole numbers greater than 0.";
    }

    if (!isWeightFormatValid(entry.weightLbs)) {
      return "Weight must be numeric (example: 135 or 135.5).";
    }
  }

  return null;
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
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number | null>(
    null,
  );
  const [entries, setEntries] = useState<LiftEntryDraft[]>(
    defaultEntries.length > 0
      ? defaultEntries
      : [createEntry()],
  );
  const exerciseNames = useMemo(
    () =>
      Array.from(
        new Set(
          exercises
            .map((exercise) => exercise.name.trim())
            .filter((name) => name.length > 0),
        ),
      ),
    [exercises],
  );
  const clientValidationMessage = useMemo(
    () => getLiftValidationMessage(entries),
    [entries],
  );
  const entriesJson = useMemo(() => JSON.stringify(entries), [entries]);

  function updateEntry(index: number, updates: Partial<LiftEntryDraft>) {
    setEntries((previous) =>
      previous.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...updates } : item,
      ),
    );
  }

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

      {clientValidationMessage ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {clientValidationMessage}
        </p>
      ) : null}

      <input type="hidden" name="entriesJson" value={entriesJson} />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Exercises</h2>
          <button
            type="button"
            onClick={() =>
              setEntries((previous) => [
                ...previous,
                createEntry(),
              ])
            }
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Add Exercise
          </button>
        </div>

        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Type an exercise name or pick an existing one from suggestions.
          New names are saved automatically.
        </p>

        <div className="space-y-3">
          {entries.map((entry, index) => {
            const suggestionNames = getSuggestionNames(entry.exerciseName, exerciseNames);
            const showSuggestions =
              activeSuggestionIndex === index && suggestionNames.length > 0;

            return (
              <div
                key={index}
                className="grid gap-2 rounded-md border border-slate-200 p-3 md:grid-cols-5"
              >
                <label className="space-y-1 md:col-span-2">
                  <span className="text-xs font-medium uppercase text-slate-500">
                    Exercise
                  </span>
                  <div className="relative">
                    <input
                      type="text"
                      value={entry.exerciseName}
                      onFocus={() => setActiveSuggestionIndex(index)}
                      onBlur={() => {
                        window.setTimeout(() => {
                          setActiveSuggestionIndex((current) =>
                            current === index ? null : current,
                          );
                        }, 100);
                      }}
                      onChange={(event) => {
                        updateEntry(index, { exerciseName: event.target.value });
                      }}
                      placeholder="Bench Press"
                      className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                    />

                    {showSuggestions ? (
                      <div className="absolute z-10 mt-1 max-h-44 w-full overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                        {suggestionNames.map((name) => (
                          <button
                            key={name}
                            type="button"
                            onMouseDown={(event) => {
                              event.preventDefault();
                            }}
                            onClick={() => {
                              updateEntry(index, { exerciseName: name });
                              setActiveSuggestionIndex(null);
                            }}
                            className="block w-full rounded px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-medium uppercase text-slate-500">
                    Sets
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={entry.sets}
                    onChange={(event) => {
                      updateEntry(index, { sets: event.target.value });
                    }}
                    placeholder="3"
                    className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-medium uppercase text-slate-500">
                    Reps
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={entry.reps}
                    onChange={(event) => {
                      updateEntry(index, { reps: event.target.value });
                    }}
                    placeholder="8"
                    className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-medium uppercase text-slate-500">
                    Weight (lbs)
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={entry.weightLbs}
                      onChange={(event) => {
                        updateEntry(index, { weightLbs: event.target.value });
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
            );
          })}
        </div>
      </section>

      <button
        type="submit"
        disabled={Boolean(clientValidationMessage)}
        aria-disabled={Boolean(clientValidationMessage)}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {submitLabel}
      </button>
    </form>
  );
}
