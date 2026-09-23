import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { attendanceRecords, departments, employees, leaveRequests } from "../../drizzle/schema";
import * as db from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { getDashboardMetrics } from "../db";
import { todayIso } from "../services/common";
import { getAttendanceTrend, getDepartmentCoverage } from "../services/analytics";

export const dashboardRouter = router({
  overview: protectedProcedure.query(async ({ ctx }) => getDashboardMetrics(todayIso(), ctx.user)),
  trend: protectedProcedure.input(z.object({ days: z.number().int().min(7).max(90).default(14) })).query(async ({ ctx, input }) => {
    const database = await db.getDb();
    if (!database) return [];
    const endDate = todayIso();
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - (input.days - 1));
    const startDate = todayIso(start);
    const personal = ctx.user.role === "employee" ? await db.getEmployeeForUser(ctx.user.id) : undefined;
    const clauses = [gte(attendanceRecords.workDate, startDate), lte(attendanceRecords.workDate, endDate)];
    if (personal) clauses.push(eq(attendanceRecords.employeeId, personal.id));
    const rows = await getAttendanceTrend({ startDate, endDate, employeeId: personal?.id });
    const byDate = new Map<string, { date: string; present: number; late: number; absent: number; halfDay: number }>();
    for (let index = 0; index < input.days; index++) {
      const current = new Date(`${startDate}T00:00:00.000Z`);
      current.setUTCDate(current.getUTCDate() + index);
      const date = todayIso(current);
      byDate.set(date, { date, present: 0, late: 0, absent: 0, halfDay: 0 });
    }
    rows.forEach(row => {
      const target = byDate.get(row.date);
      if (!target) return;
      if (row.status === "present") target.present = Number(row.count);
      if (row.status === "late") target.late = Number(row.count);
      if (row.status === "absent") target.absent = Number(row.count);
      if (row.status === "half_day") target.halfDay = Number(row.count);
    });
    return Array.from(byDate.values());
  }),
  departmentSummary: protectedProcedure.query(async ({ ctx }) => {
    const database = await db.getDb();
    if (!database || ctx.user.role === "employee") return [];
    const today = todayIso();
    return getDepartmentCoverage(today);
  }),
  activity: protectedProcedure.query(async ({ ctx }) => {
    const database = await db.getDb();
    if (!database) return [];
    if (ctx.user.role === "employee") {
      const employee = await db.getEmployeeForUser(ctx.user.id);
      if (!employee) return [];
      return database.select().from(leaveRequests).where(eq(leaveRequests.employeeId, employee.id)).orderBy(sql`${leaveRequests.updatedAt} desc`).limit(5);
    }
    return database.select({ id: leaveRequests.id, status: leaveRequests.status, createdAt: leaveRequests.createdAt, firstName: employees.firstName, lastName: employees.lastName, leaveType: leaveRequests.leaveType }).from(leaveRequests).innerJoin(employees, eq(leaveRequests.employeeId, employees.id)).orderBy(sql`${leaveRequests.createdAt} desc`).limit(5);
  }),
});
