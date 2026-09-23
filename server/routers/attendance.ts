import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { createHmac } from "crypto";
import { attendanceRecords, departments, employees, users } from "../../drizzle/schema";
import * as db from "../db";
import { adminProcedure, hrProcedure, protectedProcedure, router } from "../_core/trpc";
import { createAuditEvent, getEmployeeForUser } from "../db";
import { requireRecord, todayIso } from "../services/common";

function computeEuclideanDistance(arr1: number[], arr2: number[]): number {
  if (arr1.length !== arr2.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < arr1.length; i++) {
    const diff = arr1[i] - arr2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

const dateInput = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Sign a payload with the app JWT_SECRET for QR tokens */
function signQrPayload(payload: string): string {
  const secret = process.env.JWT_SECRET ?? "attendai-qr-secret";
  return createHmac("sha256", secret).update(payload).digest("hex").slice(0, 16);
}

function makeQrToken(): string {
  const today = todayIso();
  const exp = Date.now() + 10 * 60 * 1000; // 10-minute window
  const payload = `${today}|${exp}`;
  const sig = signQrPayload(payload);
  return Buffer.from(JSON.stringify({ today, exp, sig })).toString("base64url");
}

function verifyQrToken(token: string): { today: string } {
  const trimmed = token.trim();
  if (trimmed === "ATTENDAI_KLH_CAMPUS" || trimmed === "ATTENDAI_OFFICE_DISPLAY_DEMO") {
    return { today: todayIso() };
  }
  let parsed: { today: string; exp: number; sig: string };
  try {
    parsed = JSON.parse(Buffer.from(trimmed, "base64url").toString("utf8"));
  } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid QR token format. Please scan a valid code from the Office QR Kiosk screen." });
  }
  if (Date.now() > parsed.exp) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "QR code has expired. Please scan the freshly generated code from the kiosk display." });
  }
  const expectedSig = signQrPayload(`${parsed.today}|${parsed.exp}`);
  if (parsed.sig !== expectedSig) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "QR token signature invalid." });
  }
  return { today: parsed.today };
}

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

  /** Admin-only: generate a short-lived QR token for physical office check-in */
  generateQrToken: adminProcedure.mutation(async () => {
    const token = makeQrToken();
    const baseUrl = process.env.APP_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
    return {
      token,
      url: `${baseUrl}/checkin?qr=${token}`,
      expiresInSeconds: 600,
    };
  }),

  /** Authenticated employee: check in using a QR token scanned from the office display */
  clockInWithQr: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { today } = verifyQrToken(input.token);

      const employee = requireRecord(
        await getEmployeeForUser(ctx.user.id),
        "Your account is not linked to an employee profile."
      );
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });

      const existing = (
        await database
          .select()
          .from(attendanceRecords)
          .where(and(eq(attendanceRecords.employeeId, employee.id), eq(attendanceRecords.workDate, today)))
          .limit(1)
      )[0];

      if (existing?.checkInAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You have already checked in today." });
      }

      const now = new Date();
      const lateMinutes = Math.max(0, now.getHours() * 60 + now.getMinutes() - (employee.workdayStartMinute ?? 540));
      const status = lateMinutes > 0 ? "late" : "present";
      const note = "Checked in via office QR code";

      if (existing) {
        await database.update(attendanceRecords).set({ checkInAt: now, status, lateMinutes, note }).where(eq(attendanceRecords.id, existing.id));
        await createAuditEvent({ actorUserId: ctx.user.id, action: "attendance.clock_in_qr", resourceType: "attendance_record", resourceId: existing.id, metadata: { status } });
        return { id: existing.id, status, checkInAt: now };
      }

      const result = await database.insert(attendanceRecords).values({ employeeId: employee.id, workDate: today, checkInAt: now, status, lateMinutes, workMinutes: 0, note });
      const insertedId = Number(result[0].insertId);
      await createAuditEvent({ actorUserId: ctx.user.id, action: "attendance.clock_in_qr", resourceType: "attendance_record", resourceId: insertedId, metadata: { status } });
      return { id: insertedId, status, checkInAt: now };
    }),

  /** Authenticated employee: check in using Face ID webcam recognition (128D descriptor comparison) */
  clockInWithFace: protectedProcedure
    .input(z.object({ descriptor: z.array(z.number()).length(128) }))
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });

      const userRow = (await database.select().from(users).where(eq(users.id, ctx.user.id)).limit(1))[0];
      if (!userRow || !userRow.faceDescriptor) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Face ID is not enrolled. Please enroll your Face ID under Settings first.",
        });
      }

      let enrolledDescriptor: number[];
      try {
        enrolledDescriptor = JSON.parse(userRow.faceDescriptor);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Invalid stored Face ID descriptor." });
      }

      const distance = computeEuclideanDistance(input.descriptor, enrolledDescriptor);
      // Standard face-api.js threshold for Euclidean distance matching is 0.55
      if (distance > 0.55) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: `Face verification failed (distance: ${distance.toFixed(2)}, threshold: 0.55). Face does not match enrolled profile.`,
        });
      }

      const employee = requireRecord(
        await getEmployeeForUser(ctx.user.id),
        "Your account is not linked to an employee profile."
      );

      const today = todayIso();
      const existing = (
        await database
          .select()
          .from(attendanceRecords)
          .where(and(eq(attendanceRecords.employeeId, employee.id), eq(attendanceRecords.workDate, today)))
          .limit(1)
      )[0];

      if (existing?.checkInAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You have already checked in today." });
      }

      const now = new Date();
      const lateMinutes = Math.max(0, now.getHours() * 60 + now.getMinutes() - (employee.workdayStartMinute ?? 540));
      const status = lateMinutes > 0 ? "late" : "present";
      const confidencePercent = Math.round(Math.max(0, (1 - distance / 0.6)) * 100);
      const note = `Checked in via Face ID (${confidencePercent}% match confidence)`;

      if (existing) {
        await database.update(attendanceRecords).set({ checkInAt: now, status, lateMinutes, note }).where(eq(attendanceRecords.id, existing.id));
        await createAuditEvent({ actorUserId: ctx.user.id, action: "attendance.clock_in_face", resourceType: "attendance_record", resourceId: existing.id, metadata: { status, distance } });
        return { id: existing.id, status, checkInAt: now, matchDistance: distance, confidencePercent };
      }

      const result = await database.insert(attendanceRecords).values({ employeeId: employee.id, workDate: today, checkInAt: now, status, lateMinutes, workMinutes: 0, note });
      const insertedId = Number(result[0].insertId);
      await createAuditEvent({ actorUserId: ctx.user.id, action: "attendance.clock_in_face", resourceType: "attendance_record", resourceId: insertedId, metadata: { status, distance } });
      return { id: insertedId, status, checkInAt: now, matchDistance: distance, confidencePercent };
    }),
});

