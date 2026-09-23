import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { attendanceRecords, departments, employees } from "../../drizzle/schema";
import * as db from "../db";
import { hrProcedure, protectedProcedure, router } from "../_core/trpc";
import { createAuditEvent, getEmployeeForUser } from "../db";
import { requireRecord, todayIso } from "../services/common";

const dateInput = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const attendanceRouter = router({
  mineToday: protectedProcedure.query(async ({ ctx }) => {
    const employee = await getEmployeeForUser(ctx.user.id);
    if (!employee) return null;
    const database = await db.getDb();
    if (!database) return null;
    const today = todayIso();
    const records = await database
      .select()
      .from(attendanceRecords)
      .where(and(eq(attendanceRecords.employeeId, employee.id), eq(attendanceRecords.workDate, today)))
      .limit(1);
    return records[0] ?? null;
  }),

  clockIn: protectedProcedure
    .input(z.object({ note: z.string().trim().max(500).optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      const employee = requireRecord(
        await getEmployeeForUser(ctx.user.id),
        "Your account is not linked to an employee profile."
      );
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });

      const today = todayIso();
      const existing = (
        await database
          .select()
          .from(attendanceRecords)
          .where(and(eq(attendanceRecords.employeeId, employee.id), eq(attendanceRecords.workDate, today)))
          .limit(1)
      )[0];

      if (existing && existing.checkInAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You have already checked in today." });
      }

      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const lateMinutes = Math.max(0, nowMinutes - (employee.workdayStartMinute ?? 540));
      const status = lateMinutes > 0 ? "late" : "present";

      if (existing) {
        await database
          .update(attendanceRecords)
          .set({
            checkInAt: now,
            status,
            lateMinutes,
            note: input?.note ?? existing.note,
          })
          .where(eq(attendanceRecords.id, existing.id));

        await createAuditEvent({
          actorUserId: ctx.user.id,
          action: "attendance.clock_in",
          resourceType: "attendance_record",
          resourceId: existing.id,
          metadata: { status, lateMinutes },
        });

        return { id: existing.id, status, checkInAt: now };
      } else {
        const result = await database.insert(attendanceRecords).values({
          employeeId: employee.id,
          workDate: today,
          checkInAt: now,
          status,
          lateMinutes,
          workMinutes: 0,
          note: input?.note,
        });
        const insertedId = Number(result[0].insertId);

        await createAuditEvent({
          actorUserId: ctx.user.id,
          action: "attendance.clock_in",
          resourceType: "attendance_record",
          resourceId: insertedId,
          metadata: { status, lateMinutes },
        });

        return { id: insertedId, status, checkInAt: now };
      }
    }),

  clockOut: protectedProcedure
    .input(z.object({ note: z.string().trim().max(500).optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      const employee = requireRecord(
        await getEmployeeForUser(ctx.user.id),
        "Your account is not linked to an employee profile."
      );
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });

      const today = todayIso();
      const record = (
        await database
          .select()
          .from(attendanceRecords)
          .where(and(eq(attendanceRecords.employeeId, employee.id), eq(attendanceRecords.workDate, today)))
          .limit(1)
      )[0];

      if (!record || !record.checkInAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You must check in before checking out." });
      }

      if (record.checkOutAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You have already checked out today." });
      }

      const now = new Date();
      const workMinutes = Math.max(
        0,
        Math.floor((now.getTime() - new Date(record.checkInAt).getTime()) / 60000)
      );

      await database
        .update(attendanceRecords)
        .set({
          checkOutAt: now,
          workMinutes,
          note: input?.note ?? record.note,
        })
        .where(eq(attendanceRecords.id, record.id));

      await createAuditEvent({
        actorUserId: ctx.user.id,
        action: "attendance.clock_out",
        resourceType: "attendance_record",
        resourceId: record.id,
        metadata: { workMinutes },
      });

      return { id: record.id, checkOutAt: now, workMinutes };
    }),

  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(10),
        status: z.enum(["present", "late", "absent", "half_day"]).optional(),
        date: dateInput.optional(),
        employeeId: z.number().int().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) return { items: [], total: 0 };

      const isEmployee = ctx.user.role === "employee";
      const personalEmployee = isEmployee ? await getEmployeeForUser(ctx.user.id) : undefined;

      const clauses = [];
      if (isEmployee && personalEmployee) {
        clauses.push(eq(attendanceRecords.employeeId, personalEmployee.id));
      } else if (input.employeeId) {
        clauses.push(eq(attendanceRecords.employeeId, input.employeeId));
      }

      if (input.status) clauses.push(eq(attendanceRecords.status, input.status));
      if (input.date) clauses.push(eq(attendanceRecords.workDate, input.date));

      const whereClause = clauses.length ? and(...clauses) : undefined;

      const [items, countResult] = await Promise.all([
        database
          .select({
            attendance: attendanceRecords,
            employee: employees,
            departmentName: departments.name,
          })
          .from(attendanceRecords)
          .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
          .leftJoin(departments, eq(employees.departmentId, departments.id))
          .where(whereClause)
          .orderBy(desc(attendanceRecords.workDate), desc(attendanceRecords.id))
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize),
        database
          .select({ count: sql<number>`count(*)` })
          .from(attendanceRecords)
          .where(whereClause),
      ]);

      return {
        items,
        total: Number(countResult[0]?.count ?? 0),
      };
    }),

  correct: hrProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: z.enum(["present", "late", "absent", "half_day"]).optional(),
        checkInAt: z.string().optional(),
        checkOutAt: z.string().optional(),
        note: z.string().trim().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });

      const record = requireRecord(
        (await database.select().from(attendanceRecords).where(eq(attendanceRecords.id, input.id)).limit(1))[0],
        "Attendance record not found."
      );

      const updateData: Partial<typeof attendanceRecords.$inferInsert> = {};
      if (input.status) updateData.status = input.status;
      if (input.note !== undefined) updateData.note = input.note;

      let checkIn = record.checkInAt ? new Date(record.checkInAt) : null;
      let checkOut = record.checkOutAt ? new Date(record.checkOutAt) : null;

      if (input.checkInAt) {
        checkIn = new Date(input.checkInAt);
        updateData.checkInAt = checkIn;
      }
      if (input.checkOutAt) {
        checkOut = new Date(input.checkOutAt);
        updateData.checkOutAt = checkOut;
      }

      if (checkIn && checkOut) {
        updateData.workMinutes = Math.max(0, Math.floor((checkOut.getTime() - checkIn.getTime()) / 60000));
      }

      await database.update(attendanceRecords).set(updateData).where(eq(attendanceRecords.id, input.id));

      await createAuditEvent({
        actorUserId: ctx.user.id,
        action: "attendance.corrected",
        resourceType: "attendance_record",
        resourceId: input.id,
        metadata: { updates: input },
      });

      return { success: true };
    }),
});
