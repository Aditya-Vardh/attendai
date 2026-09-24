import { describe, expect, it, vi } from "vitest";
import { executeCopilotTool } from "./intelligence";

// ---------------------------------------------------------------------------
// Module mocks — vi.mock is hoisted to the top of the file by Vitest, so
// ALL fixtures used inside the factory MUST be defined inside it.
// ---------------------------------------------------------------------------

vi.mock("../db", () => {
  const emp = {
    id: 42,
    userId: 3,
    firstName: "Rahul",
    lastName: "Sharma",
    email: "rahul@attendai.com",
    employeeCode: "ENG-RS-001",
    jobTitle: "Software Engineer",
    status: "active",
    departmentId: 1,
    workdayStartMinute: 540,
    joinedOn: "2025-01-01",
    middleName: null,
    phone: null,
    managerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Helper to create a chainable query builder that resolves when awaited.
  function createQueryChain(resolvedValue: unknown[]) {
    const builder: Record<string, unknown> = {};
    const handler: ProxyHandler<object> = {
      get(_t, prop: string | symbol) {
        if (prop === "then") {
          return (resolve: (v: unknown) => void) => resolve(resolvedValue);
        }
        if (prop === Symbol.iterator) return resolvedValue[Symbol.iterator].bind(resolvedValue);
        if (prop === "length") return resolvedValue.length;
        if (prop === "limit") {
          return (n: number) => createQueryChain(n === 1 ? [emp] : []);
        }
        if (prop === "groupBy") return () => createQueryChain([]);
        return () => createQueryChain(resolvedValue);
      },
    };
    return new Proxy(builder, handler);
  }

  const mockDatabase = {
    select: () => createQueryChain([]),
  };

  return {
    getDb: vi.fn().mockResolvedValue(mockDatabase),
    getEmployeeForUser: vi.fn().mockResolvedValue(emp),
    listEmployees: vi.fn().mockResolvedValue({ items: [] }),
  };
});

vi.mock("./analytics", () => ({
  getDepartmentCoverage: vi.fn().mockResolvedValue([
    { id: 1, name: "Engineering", employeeCount: 5, presentCount: 4 },
    { id: 2, name: "Human Resources", employeeCount: 3, presentCount: 2 },
  ]),
}));

// ---------------------------------------------------------------------------
// Actor fixtures (outside mocks — fine)
// ---------------------------------------------------------------------------
const employeeActor = {
  id: 3,
  role: "employee" as const,
  name: "Rahul Sharma",
  email: "rahul@attendai.com",
};

const adminActor = {
  id: 1,
  role: "admin" as const,
  name: "Alex Vance",
  email: "admin@attendai.com",
};

const hrActor = {
  id: 2,
  role: "hr_manager" as const,
  name: "Sarah Jenkins",
  email: "hr@attendai.com",
};

// ---------------------------------------------------------------------------
// RBAC guardrail tests
// ---------------------------------------------------------------------------
describe("executeCopilotTool — RBAC guardrails", () => {
  it("get_department_stats: denies employees with a clear error message", async () => {
    const result = await executeCopilotTool(employeeActor, "get_department_stats", {});
    expect(result.name).toBe("get_department_stats");
    const data = result.data as Record<string, unknown>;
    expect(data.error).toContain("restricted");
  });

  it("get_department_stats: permits HR and returns an array", async () => {
    const result = await executeCopilotTool(hrActor, "get_department_stats", {});
    expect(result.name).toBe("get_department_stats");
    expect(Array.isArray(result.data)).toBe(true);
  });

  it("get_department_coverage: denies employees with a clear error message", async () => {
    const result = await executeCopilotTool(employeeActor, "get_department_coverage", {});
    expect(result.name).toBe("get_department_coverage");
    const data = result.data as Record<string, unknown>;
    expect(data.error).toContain("restricted");
  });

  it("get_department_coverage: permits admin and returns correct structured coverage data", async () => {
    const result = await executeCopilotTool(adminActor, "get_department_coverage", {});
    expect(result.name).toBe("get_department_coverage");
    const data = result.data as Record<string, unknown>;
    expect(data.error).toBeUndefined();
    const depts = data.departments as Array<Record<string, unknown>>;
    expect(Array.isArray(depts)).toBe(true);
    expect(depts).toHaveLength(2);

    const eng = depts.find(d => d.department === "Engineering")!;
    expect(eng.activeEmployees).toBe(5);
    expect(eng.presentToday).toBe(4);
    expect(eng.coveragePercent).toBe(80);
    expect(eng.formattedCoverage).toBe("80%");

    const hr = depts.find(d => d.department === "Human Resources")!;
    expect(hr.coveragePercent).toBe(67); // Math.round(2/3*100) = 67
  });

  it("unknown tool name returns a friendly error", async () => {
    const result = await executeCopilotTool(employeeActor, "do_something_illegal", {});
    const data = result.data as Record<string, unknown>;
    expect(data.error).toContain("not available");
  });
});

// ---------------------------------------------------------------------------
// get_attendance_rate
// ---------------------------------------------------------------------------
describe("executeCopilotTool — get_attendance_rate", () => {
  it("returns structured rate data for employee (DB returns 0 records → 0% rate)", async () => {
    const result = await executeCopilotTool(employeeActor, "get_attendance_rate", {});
    expect(result.name).toBe("get_attendance_rate");
    const data = result.data as Record<string, unknown>;
    expect(data.error).toBeUndefined();
    expect(data.employeeName).toBe("Rahul Sharma");
    expect(data.employeeId).toBe(42);
    expect(typeof data.attendanceRatePercent).toBe("number");
    expect(data.attendanceRatePercent).toBeGreaterThanOrEqual(0);
    expect(data.formattedRate).toMatch(/^\d+(\.\d+)?%$/);
    expect(data.presentDays).toBeGreaterThanOrEqual(0);
    expect(data.lateDays).toBeGreaterThanOrEqual(0);
    expect(data.absentDays).toBeGreaterThanOrEqual(0);
    expect(String(data.month)).toMatch(/^\d{4}-\d{2}$/);
  });

  it("returns structured rate data for admin (defaults to own employee)", async () => {
    const result = await executeCopilotTool(adminActor, "get_attendance_rate", {});
    expect(result.name).toBe("get_attendance_rate");
    const data = result.data as Record<string, unknown>;
    expect(data.error).toBeUndefined();
    expect(typeof data.attendanceRatePercent).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// get_working_hours
// ---------------------------------------------------------------------------
describe("executeCopilotTool — get_working_hours", () => {
  it("returns structured hours data for employee (DB returns 0 records → 0 hrs)", async () => {
    const result = await executeCopilotTool(employeeActor, "get_working_hours", {});
    expect(result.name).toBe("get_working_hours");
    const data = result.data as Record<string, unknown>;
    expect(data.error).toBeUndefined();
    expect(data.employeeName).toBe("Rahul Sharma");
    expect(data.employeeId).toBe(42);
    expect(typeof data.totalWorkHours).toBe("number");
    expect(data.totalWorkHours).toBeGreaterThanOrEqual(0);
    expect(data.formattedHours).toMatch(/^[\d.]+ hrs$/);
    expect(String(data.month)).toMatch(/^\d{4}-\d{2}$/);
  });
});

// ---------------------------------------------------------------------------
// get_attendance_summary
// ---------------------------------------------------------------------------
describe("executeCopilotTool — get_attendance_summary", () => {
  it("returns structured summary with records array for employee actor", async () => {
    const result = await executeCopilotTool(employeeActor, "get_attendance_summary", {});
    expect(result.name).toBe("get_attendance_summary");
    const data = result.data as Record<string, unknown>;
    expect(data.error).toBeUndefined();
    expect(data.employeeName).toBe("Rahul Sharma");
    expect(data.employeeId).toBe(42);
    expect(typeof data.totalWorkHours).toBe("number");
    expect(Array.isArray(data.records)).toBe(true);
    expect(data.presentCount).toBeGreaterThanOrEqual(0);
    expect(data.lateCount).toBeGreaterThanOrEqual(0);
    expect(data.absentCount).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// Reports & Comparison Tools
// ---------------------------------------------------------------------------
describe("executeCopilotTool — Executive Reports & Comparisons", () => {
  it("get_attendance_report: returns complete structured attendance report payload", async () => {
    const result = await executeCopilotTool(employeeActor, "get_attendance_report", { period: "last month" });
    expect(result.name).toBe("get_attendance_report");
    const data = result.data as Record<string, unknown>;
    expect(data.error).toBeUndefined();
    expect(data.reportTitle).toBe("Employee Attendance Report");
    expect((data.employee as any).name).toBe("Rahul Sharma");
    expect(data.period).toContain("Last Month");
    expect(data.metrics).toBeDefined();
    expect(data.summary).toContain("Rahul Sharma");
  });

  it("get_attendance_comparison: returns structured comparison data between two periods", async () => {
    const result = await executeCopilotTool(employeeActor, "get_attendance_comparison", { currentPeriod: "this month", previousPeriod: "last month" });
    expect(result.name).toBe("get_attendance_comparison");
    const data = result.data as Record<string, unknown>;
    expect(data.error).toBeUndefined();
    expect(data.employeeName).toBe("Rahul Sharma");
    expect(data.comparison).toBeDefined();
    expect((data.comparison as any).narrative).toBeDefined();
  });

  it("get_leave_report: returns leave balances and recent requests", async () => {
    const result = await executeCopilotTool(employeeActor, "get_leave_report", {});
    expect(result.name).toBe("get_leave_report");
    const data = result.data as Record<string, unknown>;
    expect(data.error).toBeUndefined();
    expect(data.reportTitle).toBe("Employee Leave & Balance Report");
    expect(Array.isArray(data.balances)).toBe(true);
  });

  it("get_workforce_report: returns comprehensive monthly workforce report payload", async () => {
    const result = await executeCopilotTool(employeeActor, "get_workforce_report", { period: "this month" });
    expect(result.name).toBe("get_workforce_report");
    const data = result.data as Record<string, unknown>;
    expect(data.error).toBeUndefined();
    expect(data.reportTitle).toBe("Monthly Employee Workforce Report");
    expect(data.attendance).toBeDefined();
    expect(data.leaveBalances).toBeDefined();
  });
});

