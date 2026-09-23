import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

export const APP_ROLES = ["admin", "hr_manager", "employee"] as const;
export type AppRole = (typeof APP_ROLES)[number];

const t = initTRPC.context<TrpcContext>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in is required to access AttendAI." });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const protectedProcedure = t.procedure.use(requireUser);

export function roleProcedure(...allowedRoles: AppRole[]) {
  return protectedProcedure.use(
    t.middleware(async ({ ctx, next }) => {
      const user = ctx.user;
      if (!user || !allowedRoles.includes(user.role as AppRole)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Your AttendAI role does not have permission to perform this action.",
        });
      }
      return next({ ctx: { ...ctx, user } });
    }),
  );
}

export const adminProcedure = roleProcedure("admin");
export const hrProcedure = roleProcedure("admin", "hr_manager");
