import { describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

function createMockContext(role: "employee" | "hr_manager" | "admin" = "employee"): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user-1",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("attendanceRouter structure", () => {
  it("exposes expected attendance procedures on appRouter", () => {
    const ctx = createMockContext("employee");
    const caller = appRouter.createCaller(ctx);
    expect(caller.attendance).toBeDefined();
    expect(caller.attendance.mineToday).toBeTypeOf("function");
    expect(caller.attendance.clockIn).toBeTypeOf("function");
    expect(caller.attendance.clockOut).toBeTypeOf("function");
    expect(caller.attendance.list).toBeTypeOf("function");
    expect(caller.attendance.correct).toBeTypeOf("function");
  });
});
