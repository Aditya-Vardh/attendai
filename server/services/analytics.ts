import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { attendanceRecords, departments, employees } from "../../drizzle/schema";
import { getDb } from "../db";

export async function getAttendanceTrend(input: { startDate: string; endDate: string; employeeId?: number }) {
  const database = await getDb();
  if (!database) return [];
  const clauses = [gte(attendanceRecords.workDate, input.startDate), lte(attendanceRecords.workDate, input.endDate)];
  if (input.employeeId) clauses.push(eq(attendanceRecords.employeeId, input.employeeId));
  return database.select({ date: attendanceRecords.workDate, status: attendanceRecords.status, count: sql<number>`count(*)` }).from(attendanceRecords).where(and(...clauses)).groupBy(attendanceRecords.workDate, attendanceRecords.status).orderBy(asc(attendanceRecords.workDate));
}

export async function getDepartmentCoverage(workDate: string) {
  const database = await getDb();
  if (!database) return [];
  return database.select({ id: departments.id, name: departments.name, employeeCount: sql<number>`count(distinct ${employees.id})`, presentCount: sql<number>`sum(case when ${attendanceRecords.status} in ('present','late','half_day') then 1 else 0 end)` }).from(departments).leftJoin(employees, and(eq(employees.departmentId, departments.id), eq(employees.status, "active"))).leftJoin(attendanceRecords, and(eq(attendanceRecords.employeeId, employees.id), eq(attendanceRecords.workDate, workDate))).groupBy(departments.id).orderBy(asc(departments.name));
}

