import { TRPCError } from "@trpc/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { departments, employees, leaveBalances, users } from "../../drizzle/schema";
import * as db from "../db";
import { adminProcedure, hrProcedure, protectedProcedure, router } from "../_core/trpc";
import { createAuditEvent, getEmployeeForUser, listDepartments, listEmployees } from "../db";
import { requireRecord } from "../services/common";

const dateInput = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD dates.");
const employeeInput = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(40).optional().nullable(),
  departmentId: z.number().int().positive().optional().nullable(),
  jobTitle: z.string().trim().min(2).max(120),
  joinedOn: dateInput,
  workdayStartMinute: z.number().int().min(0).max(1439).default(540),
});

function buildEmployeeCode(firstName: string, lastName: string) {
  const initials = `${firstName[0] ?? "E"}${lastName[0] ?? "A"}`.toUpperCase();
  return `${initials}-${Date.now().toString().slice(-6)}`;
}

export const organizationRouter = router({
  departments: router({
    list: protectedProcedure.query(() => listDepartments()),
    create: hrProcedure.input(z.object({ name: z.string().trim().min(2).max(120), code: z.string().trim().min(2).max(24).toUpperCase(), description: z.string().trim().max(1000).optional().nullable(), headEmployeeId: z.number().int().positive().optional().nullable() })).mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      const result = await database.insert(departments).values(input);
      await createAuditEvent({ actorUserId: ctx.user.id, action: "department.created", resourceType: "department", resourceId: result[0].insertId, metadata: { code: input.code } });
      return { id: Number(result[0].insertId) };
    }),
    update: hrProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(2).max(120), code: z.string().trim().min(2).max(24).toUpperCase(), description: z.string().trim().max(1000).optional().nullable(), headEmployeeId: z.number().int().positive().optional().nullable() })).mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      const { id, ...values } = input;
      await database.update(departments).set(values).where(eq(departments.id, id));
      await createAuditEvent({ actorUserId: ctx.user.id, action: "department.updated", resourceType: "department", resourceId: id });
      return { success: true };
    }),
    remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      const linked = await database.select({ count: sql<number>`count(*)` }).from(employees).where(eq(employees.departmentId, input.id));
      if (Number(linked[0]?.count ?? 0) > 0) throw new TRPCError({ code: "CONFLICT", message: "Move or deactivate employees before deleting this department." });
      await database.delete(departments).where(eq(departments.id, input.id));
      await createAuditEvent({ actorUserId: ctx.user.id, action: "department.deleted", resourceType: "department", resourceId: input.id });
      return { success: true };
    }),
  }),
  employees: router({
    list: hrProcedure.input(z.object({ page: z.number().int().min(1).default(1), pageSize: z.number().int().min(5).max(100).default(10), search: z.string().trim().max(120).optional(), departmentId: z.number().int().positive().optional(), status: z.enum(["active", "inactive"]).optional() })).query(({ input }) => listEmployees(input)),
    me: protectedProcedure.query(async ({ ctx }) => {
      const employee = await db.ensureEmployeeLink(ctx.user);
      return employee ?? null;
    }),
    get: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      const row = (await database.select({ employee: employees, departmentName: departments.name }).from(employees).leftJoin(departments, eq(employees.departmentId, departments.id)).where(eq(employees.id, input.id)).limit(1))[0];
      const employee = requireRecord(row, "Employee not found.");
      if (ctx.user.role === "employee" && employee.employee.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "You can only view your own employee profile." });
      const balances = await database.select().from(leaveBalances).where(eq(leaveBalances.employeeId, input.id));
      return { ...employee, balances };
    }),
    create: hrProcedure.input(employeeInput).mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      if (input.departmentId) requireRecord((await database.select().from(departments).where(eq(departments.id, input.departmentId)).limit(1))[0], "Department not found.");
      const matchedUser = (await database.select().from(users).where(eq(users.email, input.email)).limit(1))[0];
      const result = await database.insert(employees).values({ ...input, employeeCode: buildEmployeeCode(input.firstName, input.lastName), userId: matchedUser?.id ?? null });
      const employeeId = Number(result[0].insertId);
      await database.insert(leaveBalances).values([
        { employeeId, leaveType: "annual", allocatedDays: 20, usedDays: 0 },
        { employeeId, leaveType: "sick", allocatedDays: 10, usedDays: 0 },
        { employeeId, leaveType: "unpaid", allocatedDays: 0, usedDays: 0 },
      ]);
      await createAuditEvent({ actorUserId: ctx.user.id, action: "employee.created", resourceType: "employee", resourceId: employeeId, metadata: { email: input.email } });
      return { id: employeeId };
    }),
    update: hrProcedure.input(employeeInput.extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      const { id, ...values } = input;
      await database.update(employees).set(values).where(eq(employees.id, id));
      await createAuditEvent({ actorUserId: ctx.user.id, action: "employee.updated", resourceType: "employee", resourceId: id });
      return { success: true };
    }),
    setStatus: hrProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["active", "inactive"]) })).mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      await database.update(employees).set({ status: input.status }).where(eq(employees.id, input.id));
      await createAuditEvent({ actorUserId: ctx.user.id, action: `employee.${input.status}`, resourceType: "employee", resourceId: input.id });
      return { success: true };
    }),
    linkMyProfile: protectedProcedure.input(z.object({ employeeId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      const employee = requireRecord((await database.select().from(employees).where(eq(employees.id, input.employeeId)).limit(1))[0], "Employee not found.");
      if (ctx.user.role === "employee" && employee.email !== ctx.user.email) throw new TRPCError({ code: "FORBIDDEN", message: "An employee profile can only be linked to an account with the same email." });
      await database.update(employees).set({ userId: ctx.user.id }).where(eq(employees.id, input.employeeId));
      return { success: true };
    }),
  }),
  users: router({
    list: adminProcedure.query(async () => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      return database.select().from(users);
    }),
    updateRole: adminProcedure
      .input(
        z.object({
          userId: z.number().int().positive(),
          role: z.enum(["admin", "hr_manager", "employee"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
        await database.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
        await createAuditEvent({
          actorUserId: ctx.user.id,
          action: "user.role_updated",
          resourceType: "user",
          resourceId: input.userId,
          metadata: { newRole: input.role },
        });
        return { success: true };
      }),
  }),
});

