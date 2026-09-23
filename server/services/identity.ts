import type { User } from "../../drizzle/schema";
import { ensureEmployeeLink, getEmployeeForUser } from "../db";

/** Identity-domain adapter used by workforce procedures to resolve an authenticated actor's employee scope. */
export async function resolveEmployeeIdentity(user: User) {
  return (await getEmployeeForUser(user.id)) ?? (await ensureEmployeeLink(user));
}

