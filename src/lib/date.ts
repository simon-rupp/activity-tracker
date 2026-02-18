export function padDatePart(value: number): string {
  return value.toString().padStart(2, "0");
}

export function formatDateString(year: number, month: number, day: number): string {
  return `${year}-${padDatePart(month)}-${padDatePart(day)}`;
}

function getDatePartsInTimeZone(date: Date, timeZone: string): {
  year: number;
  month: number;
  day: number;
} | null {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const parts = formatter.formatToParts(date);
    const year = Number(parts.find((part) => part.type === "year")?.value);
    const month = Number(parts.find((part) => part.type === "month")?.value);
    const day = Number(parts.find((part) => part.type === "day")?.value);

    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
      return null;
    }

    return { year, month, day };
  } catch {
    return null;
  }
}

export function todayDateString(timeZone?: string): string {
  const now = new Date();
  if (timeZone) {
    const dateParts = getDatePartsInTimeZone(now, timeZone);
    if (dateParts) {
      return formatDateString(dateParts.year, dateParts.month, dateParts.day);
    }
  }

  return formatDateString(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

export function monthFromDateString(date: string): string {
  return date.slice(0, 7);
}

export function normalizeMonth(
  month: string | undefined,
  fallbackDate: string = todayDateString(),
): string {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return monthFromDateString(fallbackDate);
  }

  const [year, monthNumber] = month.split("-").map(Number);
  if (monthNumber < 1 || monthNumber > 12) {
    return monthFromDateString(fallbackDate);
  }

  return `${year}-${padDatePart(monthNumber)}`;
}

export function getMonthBounds(month: string): {
  start: string;
  end: string;
  daysInMonth: number;
  firstWeekday: number;
} {
  const [year, monthNumber] = normalizeMonth(month).split("-").map(Number);
  const firstDay = new Date(year, monthNumber - 1, 1);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const lastDay = new Date(year, monthNumber - 1, daysInMonth);

  return {
    start: formatDateString(firstDay.getFullYear(), firstDay.getMonth() + 1, firstDay.getDate()),
    end: formatDateString(lastDay.getFullYear(), lastDay.getMonth() + 1, lastDay.getDate()),
    daysInMonth,
    firstWeekday: firstDay.getDay(),
  };
}

export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = normalizeMonth(month).split("-").map(Number);
  const shifted = new Date(year, monthNumber - 1 + delta, 1);
  return `${shifted.getFullYear()}-${padDatePart(shifted.getMonth() + 1)}`;
}

export function isDateInMonth(date: string, month: string): boolean {
  return date.startsWith(`${normalizeMonth(month)}-`);
}
