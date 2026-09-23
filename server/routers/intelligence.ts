import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { attendanceAnomalies, departments, employees } from "../../drizzle/schema";
import * as db from "../db";
import { hrProcedure, protectedProcedure, router } from "../_core/trpc";
import { runCopilot, scanAndCreateAnomalies } from "../services/intelligence";

export const intelligenceRouter = router({
  copilot: router({
    ask: protectedProcedure.input(z.object({ message: z.string().trim().min(2).max(1600), conversationId: z.number().int().positive().optional() })).mutation(({ ctx, input }) => runCopilot(ctx.user, input.message, input.conversationId)),
  }),
  anomalies: router({
    list: protectedProcedure.input(z.object({ severity: z.enum(["low", "medium", "high", "critical"]).optional() })).query(async ({ ctx, input }) => {
      const database = await db.getDb(); if (!database) return [];
      const clauses = []; if (input.severity) clauses.push(eq(attendanceAnomalies.severity, input.severity));
      if (ctx.user.role === "employee") { const employee = await db.getEmployeeForUser(ctx.user.id); clauses.push(eq(attendanceAnomalies.employeeId, employee?.id ?? -1)); }
      return database.select({ anomaly: attendanceAnomalies, employee: employees, departmentName: departments.name }).from(attendanceAnomalies).leftJoin(employees, eq(attendanceAnomalies.employeeId, employees.id)).leftJoin(departments, eq(attendanceAnomalies.departmentId, departments.id)).where(clauses.length ? and(...clauses) : undefined).orderBy(desc(attendanceAnomalies.detectedAt));
    }),
    scan: hrProcedure.mutation(({ ctx }) => scanAndCreateAnomalies(ctx.user.id)),
    acknowledge: hrProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const database = await db.getDb(); if (!database) throw new Error("Database unavailable"); await database.update(attendanceAnomalies).set({ status: "acknowledged", acknowledgedAt: new Date() }).where(eq(attendanceAnomalies.id, input.id)); await db.createAuditEvent({ actorUserId: ctx.user.id, action: "anomaly.acknowledged", resourceType: "attendance_anomaly", resourceId: input.id }); return { success: true }; }),
  }),
});

