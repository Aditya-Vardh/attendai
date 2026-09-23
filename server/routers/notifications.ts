import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { notifications } from "../../drizzle/schema";
import * as db from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { createAuditEvent } from "../db";

export const notificationsRouter = router({
  list: protectedProcedure.input(z.object({ page: z.number().int().min(1).default(1), pageSize: z.number().int().min(5).max(100).default(20), unreadOnly: z.boolean().default(false) })).query(async ({ ctx, input }) => {
    const database = await db.getDb();
    if (!database) return { items: [], total: 0, unread: 0 };
    const where = input.unreadOnly ? and(eq(notifications.recipientUserId, ctx.user.id), isNull(notifications.readAt)) : eq(notifications.recipientUserId, ctx.user.id);
    const [items, total, unread] = await Promise.all([
      database.select().from(notifications).where(where).orderBy(desc(notifications.createdAt)).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
      database.select({ count: sql<number>`count(*)` }).from(notifications).where(where),
      database.select({ count: sql<number>`count(*)` }).from(notifications).where(and(eq(notifications.recipientUserId, ctx.user.id), isNull(notifications.readAt))),
    ]);
    return { items, total: Number(total[0]?.count ?? 0), unread: Number(unread[0]?.count ?? 0) };
  }),
  markRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const database = await db.getDb();
    if (!database) return { success: true };
    await database.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, input.id), eq(notifications.recipientUserId, ctx.user.id)));
    await createAuditEvent({ actorUserId: ctx.user.id, action: "notification.read", resourceType: "notification", resourceId: input.id });
    return { success: true };
  }),
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const database = await db.getDb();
    if (!database) return { success: true };
    await database.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.recipientUserId, ctx.user.id), isNull(notifications.readAt)));
    await createAuditEvent({ actorUserId: ctx.user.id, action: "notification.mark_all_read", resourceType: "notification" });
    return { success: true };
  }),
  remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const database = await db.getDb();
    if (!database) return { success: true };
    await database.delete(notifications).where(and(eq(notifications.id, input.id), eq(notifications.recipientUserId, ctx.user.id)));
    await createAuditEvent({ actorUserId: ctx.user.id, action: "notification.deleted", resourceType: "notification", resourceId: input.id });
    return { success: true };
  }),
});
