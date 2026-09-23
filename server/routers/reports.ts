import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { attendanceAnomalies, attendanceRecords, departments, employees, leaveRequests, reports } from "../../drizzle/schema";
import * as db from "../db";
import { hrProcedure, router } from "../_core/trpc";
import { createAuditEvent } from "../db";

const filters = z.object({ startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), departmentId: z.number().int().positive().optional() });

export const reportsRouter = router({
  generate: hrProcedure.input(z.object({ reportType: z.enum(["daily_attendance", "monthly_attendance", "employee_attendance", "department", "leave", "absence", "anomaly"]), filters })).mutation(async ({ ctx, input }) => {
    const database = await db.getDb();
    if (!database) throw new Error("Database unavailable");
    const clauses = [];
    if (input.filters.startDate) clauses.push(gte(attendanceRecords.workDate, input.filters.startDate));
    if (input.filters.endDate) clauses.push(lte(attendanceRecords.workDate, input.filters.endDate));
    if (input.filters.departmentId) clauses.push(eq(employees.departmentId, input.filters.departmentId));
    const attendanceRows = await database.select({ attendance: attendanceRecords, employee: employees, departmentName: departments.name }).from(attendanceRecords).innerJoin(employees, eq(attendanceRecords.employeeId, employees.id)).leftJoin(departments, eq(employees.departmentId, departments.id)).where(clauses.length ? and(...clauses) : undefined).orderBy(asc(attendanceRecords.workDate));
    let dataKind: "attendance" | "leave" | "anomaly" | "department" = "attendance";
    let rows: unknown[] = attendanceRows;
    let summary = { totalRecords: attendanceRows.length, presentRecords: attendanceRows.filter(row => ["present", "late", "half_day"].includes(row.attendance.status)).length, lateRecords: attendanceRows.filter(row => row.attendance.status === "late").length, absentRecords: attendanceRows.filter(row => row.attendance.status === "absent").length, generatedAt: new Date().toISOString() };
    if (input.reportType === "leave") {
      const leaveRows = await database.select({ leave: leaveRequests, employee: employees, departmentName: departments.name }).from(leaveRequests).innerJoin(employees, eq(leaveRequests.employeeId, employees.id)).leftJoin(departments, eq(employees.departmentId, departments.id)).orderBy(asc(leaveRequests.startDate));
      dataKind = "leave"; rows = leaveRows; summary = { totalRecords: leaveRows.length, presentRecords: leaveRows.filter(row => row.leave.status === "approved").length, lateRecords: leaveRows.filter(row => row.leave.status === "pending").length, absentRecords: leaveRows.filter(row => row.leave.status === "rejected").length, generatedAt: new Date().toISOString() };
    }
    if (input.reportType === "absence") {
      const absenceRows = attendanceRows.filter(row => row.attendance.status === "absent");
      rows = absenceRows; summary = { totalRecords: absenceRows.length, presentRecords: 0, lateRecords: 0, absentRecords: absenceRows.length, generatedAt: new Date().toISOString() };
    }
    if (input.reportType === "department") {
      const departmentRows = await database.select({ department: departments, employeeCount: sql<number>`count(distinct ${employees.id})`, attendanceCount: sql<number>`count(${attendanceRecords.id})`, presentCount: sql<number>`sum(case when ${attendanceRecords.status} in ('present','late','half_day') then 1 else 0 end)` }).from(departments).leftJoin(employees, and(eq(employees.departmentId, departments.id), eq(employees.status, "active"))).leftJoin(attendanceRecords, eq(attendanceRecords.employeeId, employees.id)).groupBy(departments.id).orderBy(asc(departments.name));
      dataKind = "department"; rows = departmentRows; summary = { totalRecords: departmentRows.length, presentRecords: departmentRows.reduce((total, row) => total + Number(row.presentCount ?? 0), 0), lateRecords: 0, absentRecords: 0, generatedAt: new Date().toISOString() };
    }
    if (input.reportType === "anomaly") {
      const anomalyRows = await database.select({ anomaly: attendanceAnomalies, employee: employees, departmentName: departments.name }).from(attendanceAnomalies).leftJoin(employees, eq(attendanceAnomalies.employeeId, employees.id)).leftJoin(departments, eq(attendanceAnomalies.departmentId, departments.id)).orderBy(sql`${attendanceAnomalies.detectedAt} desc`);
      dataKind = "anomaly"; rows = anomalyRows; summary = { totalRecords: anomalyRows.length, presentRecords: anomalyRows.filter(row => row.anomaly.status === "open").length, lateRecords: anomalyRows.filter(row => row.anomaly.severity === "high" || row.anomaly.severity === "critical").length, absentRecords: anomalyRows.filter(row => row.anomaly.status === "resolved").length, generatedAt: new Date().toISOString() };
    }
    const stored = await database.insert(reports).values({ generatedByUserId: ctx.user.id, reportType: input.reportType, filtersJson: JSON.stringify(input.filters), summaryJson: JSON.stringify(summary) });
    await createAuditEvent({ actorUserId: ctx.user.id, action: "report.generated", resourceType: "report", resourceId: stored[0].insertId, metadata: { reportType: input.reportType, totalRecords: summary.totalRecords } });
    return { reportId: Number(stored[0].insertId), summary, rows, dataKind };
  }),
  list: hrProcedure.input(z.object({ page: z.number().int().min(1).default(1), pageSize: z.number().int().min(5).max(100).default(20) })).query(async ({ input }) => {
    const database = await db.getDb();
    if (!database) return { items: [], total: 0 };
    const [items, count] = await Promise.all([database.select().from(reports).orderBy(sql`${reports.createdAt} desc`).limit(input.pageSize).offset((input.page - 1) * input.pageSize), database.select({ count: sql<number>`count(*)` }).from(reports)]);
    return { items, total: Number(count[0]?.count ?? 0) };
  }),
});
