import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { employees, leaveBalances, leaveRequests } from "../../drizzle/schema";
import * as db from "../db";
import { hrProcedure, protectedProcedure, router } from "../_core/trpc";
import { createAuditEvent, getEmployeeForUser } from "../db";
import { daysInclusive, displayEmployeeName, requireRecord } from "../services/common";
import { deliverUserNotification } from "../services/notifications";

const dateInput = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const leaveRouter = router({
  balances: protectedProcedure.query(async ({ ctx }) => {
    const employee = requireRecord(await getEmployeeForUser(ctx.user.id), "Your account is not linked to an employee profile.");
    const database = await db.getDb();
    if (!database) return [];
    return database.select().from(leaveBalances).where(eq(leaveBalances.employeeId, employee.id));
  }),
  request: protectedProcedure.input(z.object({ leaveType: z.enum(["annual", "sick", "unpaid"]), startDate: dateInput, endDate: dateInput, reason: z.string().trim().min(8).max(2000) })).mutation(async ({ ctx, input }) => {
    if (input.endDate < input.startDate) throw new TRPCError({ code: "BAD_REQUEST", message: "The end date must be on or after the start date." });
    const employee = requireRecord(await getEmployeeForUser(ctx.user.id), "Your account is not linked to an employee profile.");
    const database = await db.getDb();
    if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
    const requestedDays = daysInclusive(input.startDate, input.endDate);
    const balance = (await database.select().from(leaveBalances).where(and(eq(leaveBalances.employeeId, employee.id), eq(leaveBalances.leaveType, input.leaveType))).limit(1))[0];
    if (input.leaveType !== "unpaid" && (!balance || balance.allocatedDays - balance.usedDays < requestedDays)) throw new TRPCError({ code: "BAD_REQUEST", message: "The requested leave exceeds your available balance." });
    const result = await database.insert(leaveRequests).values({ ...input, employeeId: employee.id });
    await createAuditEvent({ actorUserId: ctx.user.id, action: "leave.requested", resourceType: "leave_request", resourceId: result[0].insertId, metadata: { requestedDays } });
    return { id: Number(result[0].insertId), requestedDays };
  }),
  list: protectedProcedure.input(z.object({ page: z.number().int().min(1).default(1), pageSize: z.number().int().min(5).max(100).default(10), status: z.enum(["pending", "approved", "rejected", "cancelled"]).optional() })).query(async ({ ctx, input }) => {
    const database = await db.getDb();
    if (!database) return { items: [], total: 0 };
    const employee = ctx.user.role === "employee" ? requireRecord(await getEmployeeForUser(ctx.user.id), "Your account is not linked to an employee profile.") : undefined;
    const clauses = [];
    if (employee) clauses.push(eq(leaveRequests.employeeId, employee.id));
    if (input.status) clauses.push(eq(leaveRequests.status, input.status));
    const where = clauses.length ? and(...clauses) : undefined;
    const [items, count] = await Promise.all([
      database.select({ request: leaveRequests, employee: employees }).from(leaveRequests).innerJoin(employees, eq(leaveRequests.employeeId, employees.id)).where(where).orderBy(desc(leaveRequests.createdAt)).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
      database.select({ count: sql<number>`count(*)` }).from(leaveRequests).where(where),
    ]);
    return { items, total: Number(count[0]?.count ?? 0) };
  }),
  decide: hrProcedure.input(z.object({ id: z.number().int().positive(), decision: z.enum(["approved", "rejected"]), reason: z.string().trim().min(3).max(1000) })).mutation(async ({ ctx, input }) => {
    const database = await db.getDb();
    if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
    const request = requireRecord((await database.select().from(leaveRequests).where(eq(leaveRequests.id, input.id)).limit(1))[0], "Leave request not found.");
    if (request.status !== "pending") throw new TRPCError({ code: "CONFLICT", message: "Only pending requests can be reviewed." });
    const employee = requireRecord((await database.select().from(employees).where(eq(employees.id, request.employeeId)).limit(1))[0], "Employee not found.");
    const days = daysInclusive(request.startDate, request.endDate);
    await database.update(leaveRequests).set({ status: input.decision, decisionReason: input.reason, reviewedByUserId: ctx.user.id, reviewedAt: new Date() }).where(eq(leaveRequests.id, input.id));
    if (input.decision === "approved" && request.leaveType !== "unpaid") await database.update(leaveBalances).set({ usedDays: sql`${leaveBalances.usedDays} + ${days}` }).where(and(eq(leaveBalances.employeeId, request.employeeId), eq(leaveBalances.leaveType, request.leaveType)));
    if (employee.userId) await deliverUserNotification({ recipientUserId: employee.userId, recipientEmail: employee.email, type: `leave_${input.decision}`, title: `Leave request ${input.decision}`, body: `Your ${request.leaveType} leave request for ${request.startDate} to ${request.endDate} was ${input.decision}. ${input.reason}`, href: "/leave" });
    await createAuditEvent({ actorUserId: ctx.user.id, action: `leave.${input.decision}`, resourceType: "leave_request", resourceId: input.id, metadata: { employee: displayEmployeeName(employee), days } });
    return { success: true };
  }),
  cancel: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const employee = requireRecord(await getEmployeeForUser(ctx.user.id), "Your account is not linked to an employee profile.");
    const database = await db.getDb();
    if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
    const request = requireRecord((await database.select().from(leaveRequests).where(eq(leaveRequests.id, input.id)).limit(1))[0], "Leave request not found.");
    if (request.employeeId !== employee.id || request.status !== "pending") throw new TRPCError({ code: "FORBIDDEN", message: "Only your pending leave requests can be cancelled." });
    await database.update(leaveRequests).set({ status: "cancelled" }).where(eq(leaveRequests.id, input.id));
    return { success: true };
  }),
});
