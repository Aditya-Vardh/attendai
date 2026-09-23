import { TRPCError } from "@trpc/server";

export const todayIso = (now = new Date()) => now.toISOString().slice(0, 10);

export function requireRecord<T>(value: T | undefined, message: string): T {
  if (!value) throw new TRPCError({ code: "NOT_FOUND", message });
  return value;
}

export function daysInclusive(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

export function displayEmployeeName(employee: { firstName: string; lastName: string }) {
  return `${employee.firstName} ${employee.lastName}`.trim();
}

