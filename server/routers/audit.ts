import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { z } from "zod";
import { auditLogs, users } from "../../drizzle/schema";
import * as db from "../db";
import { adminProcedure, router } from "../_core/trpc";

export const auditRouter = router({
  list: adminProcedure.input(z.object({ page: z.number().int().min(1).default(1), pageSize: z.number().int().min(5).max(100).default(25), search: z.string().trim().max(120).optional() })).query(async ({ input }) => {
    const database = await db.getDb();
    if (!database) return { items: [], total: 0 };
    const where = input.search ? or(like(auditLogs.action, `%${input.search}%`), like(auditLogs.resourceType, `%${input.search}%`), like(users.name, `%${input.search}%`), like(users.email, `%${input.search}%`)) : undefined;
    const [items, count] = await Promise.all([
      database.select({ log: auditLogs, actorName: users.name, actorEmail: users.email }).from(auditLogs).leftJoin(users, eq(auditLogs.actorUserId, users.id)).where(where).orderBy(desc(auditLogs.createdAt)).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
      database.select({ count: sql<number>`count(*)` }).from(auditLogs).leftJoin(users, eq(auditLogs.actorUserId, users.id)).where(where),
    ]);
    return { items, total: Number(count[0]?.count ?? 0) };
  }),
});

