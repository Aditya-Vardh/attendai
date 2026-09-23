import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { users } from "../drizzle/schema";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { attendanceRouter } from "./routers/attendance";
import { dashboardRouter } from "./routers/dashboard";
import { leaveRouter } from "./routers/leave";
import { notificationsRouter } from "./routers/notifications";
import { organizationRouter } from "./routers/organization";
import { reportsRouter } from "./routers/reports";
import { auditRouter } from "./routers/audit";
import { searchRouter } from "./routers/search";
import { intelligenceRouter } from "./routers/intelligence";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    devLogin: publicProcedure
      .input(z.object({ role: z.enum(["admin", "hr_manager", "employee"]) }))
      .mutation(async ({ ctx, input }) => {
        const dbInst = await db.getDb();
        if (!dbInst) throw new Error("Database unavailable");

        const targetEmail = input.role === "admin" ? "admin@attendai.com" : input.role === "hr_manager" ? "hr@attendai.com" : "rahul@attendai.com";
        let userRow = (await dbInst.select().from(users).where(eq(users.email, targetEmail)).limit(1))[0];

        if (!userRow) {
          userRow = (await dbInst.select().from(users).where(eq(users.role, input.role)).limit(1))[0];
        }

        if (!userRow) {
          const openId = `dev_${input.role}_${Date.now()}`;
          await db.upsertUser({
            openId,
            name: input.role === "admin" ? "Alex Vance" : input.role === "hr_manager" ? "Sarah Jenkins" : "Rahul Sharma",
            email: targetEmail,
            loginMethod: "email",
            role: input.role,
            lastSignedIn: new Date(),
          });
          userRow = (await db.getUserByOpenId(openId))!;
        }

        await db.ensureEmployeeLink(userRow);

        const sessionToken = await sdk.createSessionToken(userRow.openId || String(userRow.id), {
          name: userRow.name || "AttendAI User",
          expiresInMs: ONE_YEAR_MS,
        });

        ctx.res.cookie("attendai_dev_role", input.role, {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 30 * 24 * 60 * 60 * 1000,
        });

        return {
          success: true,
          user: userRow,
        };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie("attendai_dev_role", { path: "/" });
      return {
        success: true,
      } as const;
    }),
    enrollFace: protectedProcedure
      .input(
        z.object({
          consent: z.boolean(),
          descriptor: z.array(z.number()).length(128),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!input.consent) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Biometric consent is required to enroll Face ID." });
        }
        const dbInst = await db.getDb();
        if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        await dbInst
          .update(users)
          .set({
            faceDescriptor: JSON.stringify(input.descriptor),
            faceConsentGiven: true,
            faceEnrolledAt: new Date(),
          })
          .where(eq(users.id, ctx.user.id));

        return { success: true };
      }),
    deleteFace: protectedProcedure.mutation(async ({ ctx }) => {
      const dbInst = await db.getDb();
      if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await dbInst
        .update(users)
        .set({
          faceDescriptor: null,
          faceConsentGiven: false,
          faceEnrolledAt: null,
        })
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    }),
  }),
  organization: organizationRouter,
  attendance: attendanceRouter,
  leave: leaveRouter,
  dashboard: dashboardRouter,
  notifications: notificationsRouter,
  reports: reportsRouter,
  audit: auditRouter,
  search: searchRouter,
  intelligence: intelligenceRouter,
});

export type AppRouter = typeof appRouter;
