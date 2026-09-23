import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { getAuth, clerkClient } from "@clerk/express";
import type { User } from "../../drizzle/schema";
import { users } from "../../drizzle/schema";
import * as db from "../db";
import { eq } from "drizzle-orm";
import { parse as parseCookie } from "cookie";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const auth = getAuth(opts.req);
    const clerkUserId = auth.userId;

    if (clerkUserId) {
      let dbUser = await db.getUserByClerkId(clerkUserId);
      if (!dbUser) {
        try {
          const clerkUser = await clerkClient.users.getUser(clerkUserId);
          const primaryEmail = clerkUser.emailAddresses.find(
            e => e.id === clerkUser.primaryEmailAddressId
          )?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress;
          const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || clerkUser.username || "AttendAI User";

          dbUser = await db.upsertClerkUser({
            clerkId: clerkUserId,
            email: primaryEmail,
            name: fullName,
          });
        } catch (err) {
          console.error("[Auth] Failed to fetch Clerk user details:", err);
          dbUser = await db.upsertClerkUser({
            clerkId: clerkUserId,
          });
        }
      }
      user = dbUser || null;
    } else {
      // Dev persona fallback for instant local testing
      const cookies = opts.req.headers.cookie ? parseCookie(opts.req.headers.cookie) : {};
      const devRole = cookies.attendai_dev_role || (opts.req.headers["x-dev-persona"] as string);
      if (devRole) {
        const dbInst = await db.getDb();
        if (dbInst) {
          const targetEmail = devRole === "admin" ? "admin@attendai.com" : devRole === "hr_manager" ? "hr@attendai.com" : "rahul@attendai.com";
          let userRow = (await dbInst.select().from(users).where(eq(users.email, targetEmail)).limit(1))[0];
          if (!userRow) {
            userRow = (await dbInst.select().from(users).where(eq(users.role, devRole as any)).limit(1))[0];
          }
          if (userRow) {
            await db.ensureEmployeeLink(userRow);
            user = userRow;
          }
        }
      }
    }
  } catch (error) {
    console.error("[Auth] Context creation auth error:", error);
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
