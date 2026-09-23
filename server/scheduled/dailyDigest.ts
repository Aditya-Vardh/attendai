import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { scheduledJobs, users } from "../../drizzle/schema";
import { getDashboardMetrics, getDb, createAuditEvent } from "../db";
import { sdk } from "../_core/sdk";
import { deliverUserNotification } from "../services/notifications";
import { todayIso } from "../services/common";

export async function runDailyAttendanceDigest(req: Request, res: Response) {
  try {
    const cronUser = await sdk.authenticateRequest(req);
    if (!cronUser.isCron || !cronUser.taskUid) return res.status(403).json({ error: "cron-only" });
    const database = await getDb();
    if (!database) return res.status(503).json({ error: "database_unavailable" });
    const job = (await database.select().from(scheduledJobs).where(eq(scheduledJobs.taskUid, cronUser.taskUid)).limit(1))[0];
    if (!job || job.name !== "daily_attendance_digest") return res.json({ ok: true, skipped: "orphan" });
    const digestDate = todayIso();
    if (job.lastRunDate === digestDate) return res.json({ ok: true, skipped: "already_sent", digestDate });
    const admins = await database.select({ id: users.id, email: users.email }).from(users).where(eq(users.role, "admin"));
    const metrics = await getDashboardMetrics(digestDate);
    const body = `${metrics.presentToday} of ${metrics.totalEmployees} active employees recorded attendance today (${metrics.attendanceRate}%). ${metrics.lateToday} late arrivals and ${metrics.pendingLeaves} pending leave requests need attention.`;
    const deliveries = await Promise.all(admins.map(admin => deliverUserNotification({ recipientUserId: admin.id, recipientEmail: admin.email, type: "daily_attendance_digest", title: "AttendAI daily attendance digest", body, href: "/dashboard" })));
    await database.update(scheduledJobs).set({ lastRunDate: digestDate }).where(eq(scheduledJobs.id, job.id));
    await createAuditEvent({ action: "digest.daily_sent", resourceType: "notification", resourceId: cronUser.taskUid, metadata: { adminCount: admins.length, delivered: deliveries.filter(result => result.delivered).length } });
    return res.json({ ok: true, adminCount: admins.length, deliveryCount: deliveries.length });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "digest_failed", timestamp: new Date().toISOString() });
  }
}
