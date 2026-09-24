import { and, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { z } from "zod";
import {
  attendanceAnomalies,
  attendanceRecords,
  copilotConversations,
  copilotMessages,
  departments,
  employees,
  leaveBalances,
  leaveRequests
} from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "../_core/env";
import { invokeLLM, type Tool } from "../_core/llm";
import type { AppRole } from "../_core/trpc";
import { getDepartmentCoverage } from "./analytics";
import { todayIso } from "./common";
import { deliverToRole } from "./notifications";
import { detectAttendanceSignals, type AttendanceSignal } from "./anomalyRules";

const getCopilotModel = () => ENV.llmModel;

type Actor = { id: number; role: AppRole; name: string | null; email: string | null };
type CopilotToolResult = { name: string; data: unknown };

// ---------------------------------------------------------------------------
// Date range parser with natural-language support
// ---------------------------------------------------------------------------
export function parseDateRange(input?: Record<string, unknown>): { startDate: string; endDate: string; label: string } {
  const todayStr = todayIso();
  const today = new Date(`${todayStr}T00:00:00.000Z`);

  const rawStart = typeof input?.startDate === "string" ? input.startDate.trim() : "";
  const rawEnd = typeof input?.endDate === "string" ? input.endDate.trim() : "";
  const periodStr = typeof input?.period === "string" ? input.period.toLowerCase().trim() : "";
  const dateRangeStr = typeof input?.dateRange === "string" ? input.dateRange.toLowerCase().trim() : "";
  const text = `${periodStr} ${dateRangeStr}`.trim();

  // 1. Explicit YYYY-MM-DD dates passed in parameters
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawStart) && /^\d{4}-\d{2}-\d{2}$/.test(rawEnd)) {
    return { startDate: rawStart, endDate: rawEnd, label: `${rawStart} to ${rawEnd}` };
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawStart)) {
    return { startDate: rawStart, endDate: todayStr, label: `${rawStart} to ${todayStr}` };
  }

  // 2. Natural language phrases
  if (text.includes("last month") || text.includes("previous month")) {
    const year = today.getUTCMonth() === 0 ? today.getUTCFullYear() - 1 : today.getUTCFullYear();
    const monthIdx = today.getUTCMonth() === 0 ? 11 : today.getUTCMonth() - 1;
    const monthStr = String(monthIdx + 1).padStart(2, "0");
    const lastDayNum = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${year}-${monthStr}-${String(lastDayNum).padStart(2, "0")}`;
    return { startDate, endDate, label: `Last Month (${startDate} to ${endDate})` };
  }

  if (text.includes("last 30 days") || text.includes("30 days")) {
    const start30 = new Date(today);
    start30.setUTCDate(start30.getUTCDate() - 29);
    const startDate = todayIso(start30);
    return { startDate, endDate: todayStr, label: `Last 30 Days (${startDate} to ${todayStr})` };
  }

  if (text.includes("this week")) {
    const dayOfWeek = today.getUTCDay();
    const distToMon = (dayOfWeek + 6) % 7;
    const mon = new Date(today);
    mon.setUTCDate(mon.getUTCDate() - distToMon);
    const startDate = todayIso(mon);
    return { startDate, endDate: todayStr, label: `This Week (${startDate} to ${todayStr})` };
  }

  // Handle month names e.g. "September", "September 2026", "2026-09"
  const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const monthMatch = text.match(/(january|february|march|april|may|june|july|august|september|october|november|december)/i);
  if (monthMatch) {
    const mIdx = monthNames.indexOf(monthMatch[1].toLowerCase());
    const yearMatch = text.match(/\b(20\d{2})\b/);
    const yr = yearMatch ? Number(yearMatch[1]) : today.getUTCFullYear();
    const mStr = String(mIdx + 1).padStart(2, "0");
    const lastDay = new Date(Date.UTC(yr, mIdx + 1, 0)).getUTCDate();
    const startDate = `${yr}-${mStr}-01`;
    const endDate = `${yr}-${mStr}-${String(lastDay).padStart(2, "0")}`;
    const capitalizedMonth = monthMatch[1].charAt(0).toUpperCase() + monthMatch[1].slice(1).toLowerCase();
    return { startDate, endDate, label: `${capitalizedMonth} ${yr} (${startDate} to ${endDate})` };
  }

  const yyyyMmMatch = text.match(/\b(20\d{2})-(0[1-9]|1[0-2])\b/);
  if (yyyyMmMatch) {
    const yr = Number(yyyyMmMatch[1]);
    const mIdx = Number(yyyyMmMatch[2]) - 1;
    const mStr = yyyyMmMatch[2];
    const lastDay = new Date(Date.UTC(yr, mIdx + 1, 0)).getUTCDate();
    const startDate = `${yr}-${mStr}-01`;
    const endDate = `${yr}-${mStr}-${String(lastDay).padStart(2, "0")}`;
    return { startDate, endDate, label: `${startDate} to ${endDate}` };
  }

  // 3. Default: Current Month
  const year = today.getUTCFullYear();
  const monthStr = String(today.getUTCMonth() + 1).padStart(2, "0");
  const startDate = `${year}-${monthStr}-01`;
  return { startDate, endDate: todayStr, label: `Current Month (${startDate} to ${todayStr})` };
}

// ---------------------------------------------------------------------------
// Helper: Resolve Target Employee + Department Name
// ---------------------------------------------------------------------------
async function resolveTargetEmployee(actor: Actor, rawEmployeeId?: unknown): Promise<{ employee: typeof employees.$inferSelect | null; departmentName: string | null; error?: string }> {
  const database = await db.getDb();
  if (!database) return { employee: null, departmentName: null, error: "Database unavailable." };
  const isEmployee = actor.role === "employee";

  let emp: typeof employees.$inferSelect | undefined;

  if (isEmployee) {
    emp = await db.getEmployeeForUser(actor.id);
    if (!emp) return { employee: null, departmentName: null, error: "No employee profile found for your account." };
  } else {
    const numId = Number(rawEmployeeId);
    if (typeof rawEmployeeId === "number" || (typeof rawEmployeeId === "string" && !isNaN(numId) && numId > 0)) {
      emp = (await database.select().from(employees).where(eq(employees.id, numId)).limit(1))[0];
    }
    if (!emp) emp = await db.getEmployeeForUser(actor.id);
    if (!emp) emp = (await database.select().from(employees).where(eq(employees.status, "active")).limit(1))[0];
  }

  if (!emp) return { employee: null, departmentName: null, error: "Could not find a valid employee record." };

  let departmentName: string | null = null;
  if (emp.departmentId) {
    const dept = (await database.select({ name: departments.name }).from(departments).where(eq(departments.id, emp.departmentId)).limit(1))[0];
    if (dept) departmentName = dept.name;
  }

  return { employee: emp, departmentName };
}

// ---------------------------------------------------------------------------
// Tool Definitions (Function schemas matching requirements)
// ---------------------------------------------------------------------------
const tools: Tool[] = [
  {
    type: "function",
    function: {
      name: "get_employees",
      description: "List employees that the signed-in user is authorized to view.",
      parameters: {
        type: "object",
        properties: {
          search: { type: ["string", "null"], description: "Search query by name, email, or employee code." },
          limit: { type: ["integer", "null"], description: "Max items to return (1-20)." }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_attendance_rate",
      description: "Get attendance rate percentage, present days, late days, and absent days for an employee over a period.",
      parameters: {
        type: "object",
        properties: {
          employeeId: { type: ["integer", "null"], description: "Target employee ID. Restricted to self for Employee role." },
          startDate: { type: ["string", "null"], description: "Start date YYYY-MM-DD" },
          endDate: { type: ["string", "null"], description: "End date YYYY-MM-DD" },
          period: { type: ["string", "null"], description: "Natural period like 'this month', 'last month', 'September 2026'." }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_attendance_summary",
      description: "Get daily check-in/check-out history, late arrivals, absences, and work hours for an employee over a period.",
      parameters: {
        type: "object",
        properties: {
          employeeId: { type: ["integer", "null"], description: "Target employee ID. Restricted to self for Employee role." },
          startDate: { type: ["string", "null"], description: "Start date YYYY-MM-DD" },
          endDate: { type: ["string", "null"], description: "End date YYYY-MM-DD" },
          period: { type: ["string", "null"], description: "Natural period like 'this month', 'last month', 'September 2026'." }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_working_hours",
      description: "Get total working hours, recorded days, and average daily hours for an employee.",
      parameters: {
        type: "object",
        properties: {
          employeeId: { type: ["integer", "null"], description: "Target employee ID. Restricted to self for Employee role." },
          startDate: { type: ["string", "null"], description: "Start date YYYY-MM-DD" },
          endDate: { type: ["string", "null"], description: "End date YYYY-MM-DD" },
          period: { type: ["string", "null"], description: "Natural period like 'this month', 'last month'." }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_attendance_report",
      description: "Generate a complete employee attendance report containing rate, hours, late arrivals, absences, and daily log.",
      parameters: {
        type: "object",
        properties: {
          employeeId: { type: ["integer", "null"], description: "Target employee ID. Restricted to self for Employee role." },
          startDate: { type: ["string", "null"], description: "Start date YYYY-MM-DD" },
          endDate: { type: ["string", "null"], description: "End date YYYY-MM-DD" },
          period: { type: ["string", "null"], description: "Natural period like 'this month', 'last month'." }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_attendance_comparison",
      description: "Compare attendance rate, working hours, and late counts between two periods (e.g. this month vs last month).",
      parameters: {
        type: "object",
        properties: {
          employeeId: { type: ["integer", "null"], description: "Target employee ID. Restricted to self for Employee role." },
          currentPeriod: { type: ["string", "null"], description: "Current period description (e.g. 'this month')." },
          previousPeriod: { type: ["string", "null"], description: "Previous period description (e.g. 'last month')." }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_leave_requests",
      description: "Get leave requests for an employee filtered by status or date range.",
      parameters: {
        type: "object",
        properties: {
          employeeId: { type: ["integer", "null"], description: "Target employee ID. Restricted to self for Employee role." },
          status: { type: ["string", "null"], enum: ["pending", "approved", "rejected", "cancelled", null] },
          startDate: { type: ["string", "null"] },
          endDate: { type: ["string", "null"] },
          period: { type: ["string", "null"] }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_leave_balance",
      description: "Get allocated, used, and remaining leave balances for annual, sick, and unpaid leave.",
      parameters: {
        type: "object",
        properties: {
          employeeId: { type: ["integer", "null"], description: "Target employee ID. Restricted to self for Employee role." }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_leave_report",
      description: "Generate a complete leave report including balances and leave history.",
      parameters: {
        type: "object",
        properties: {
          employeeId: { type: ["integer", "null"], description: "Target employee ID. Restricted to self for Employee role." },
          startDate: { type: ["string", "null"] },
          endDate: { type: ["string", "null"] },
          period: { type: ["string", "null"] }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_department_coverage",
      description: "Get per-department attendance rates and active coverage percentages. Restricted to HR and Admin.",
      parameters: {
        type: "object",
        properties: {
          departmentId: { type: ["integer", "null"], description: "Optional specific department ID." },
          date: { type: ["string", "null"], description: "Target date YYYY-MM-DD" }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_workforce_report",
      description: "Generate a comprehensive monthly workforce report combining attendance, hours, leave balances, and anomalies.",
      parameters: {
        type: "object",
        properties: {
          employeeId: { type: ["integer", "null"], description: "Target employee ID. Restricted to self for Employee role." },
          startDate: { type: ["string", "null"] },
          endDate: { type: ["string", "null"] },
          period: { type: ["string", "null"] }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_department_stats",
      description: "Compare active employee coverage and current attendance by department. Restricted to HR and Admin.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_attendance_anomalies",
      description: "Get current attendance anomalies (e.g. repeated late arrivals, sudden absences).",
      parameters: {
        type: "object",
        properties: {
          severity: { type: ["string", "null"], enum: ["low", "medium", "high", "critical", null] }
        },
        additionalProperties: false
      }
    }
  }
];

// ---------------------------------------------------------------------------
// Core Tool Execution Engine
// ---------------------------------------------------------------------------
export async function executeCopilotTool(actor: Actor, name: string, rawArgs: Record<string, unknown>): Promise<CopilotToolResult> {
  const database = await db.getDb();
  if (!database) return { name, data: { error: "Database is unavailable." } };
  const isEmployee = actor.role === "employee";

  try {
    if (name === "get_employees") {
      const search = typeof rawArgs.search === "string" ? rawArgs.search : "";
      const limit = Math.min(Math.max(Number(rawArgs.limit) || 8, 1), 20);
      if (isEmployee) {
        const emp = await db.getEmployeeForUser(actor.id);
        return { name, data: emp ? [{ id: emp.id, name: `${emp.firstName} ${emp.lastName}`, employeeCode: emp.employeeCode, jobTitle: emp.jobTitle }] : [] };
      }
      const rows = await db.listEmployees({ page: 1, pageSize: limit, search: search || undefined });
      return { name, data: rows.items.map(row => ({ id: row.employee.id, name: `${row.employee.firstName} ${row.employee.lastName}`, department: row.departmentName, jobTitle: row.employee.jobTitle, status: row.employee.status })) };
    }

    if (name === "get_attendance_rate") {
      const target = await resolveTargetEmployee(actor, rawArgs.employeeId);
      if (target.error || !target.employee) return { name, data: { error: target.error || "Employee record not found." } };
      const range = parseDateRange(rawArgs);
      const rows = await database
        .select({ status: attendanceRecords.status, workDate: attendanceRecords.workDate })
        .from(attendanceRecords)
        .where(and(eq(attendanceRecords.employeeId, target.employee.id), gte(attendanceRecords.workDate, range.startDate), lte(attendanceRecords.workDate, range.endDate)));
      const totalDays = rows.length;
      const presentDays = rows.filter(r => ["present", "late", "half_day"].includes(r.status)).length;
      const lateDays = rows.filter(r => r.status === "late").length;
      const absentDays = rows.filter(r => r.status === "absent").length;
      const rate = totalDays > 0 ? Math.round((presentDays / totalDays) * 1000) / 10 : 0;
      return {
        name,
        data: {
          employeeId: target.employee.id,
          employeeName: `${target.employee.firstName} ${target.employee.lastName}`,
          departmentName: target.departmentName,
          month: range.startDate.slice(0, 7),
          periodLabel: range.label,
          startDate: range.startDate,
          endDate: range.endDate,
          totalRecordedDays: totalDays,
          presentDays,
          lateDays,
          absentDays,
          attendanceRatePercent: rate,
          formattedRate: `${rate}%`
        }
      };
    }

    if (name === "get_attendance_summary") {
      const target = await resolveTargetEmployee(actor, rawArgs.employeeId);
      if (target.error || !target.employee) return { name, data: { error: target.error || "Employee record not found." } };
      const range = parseDateRange(rawArgs);
      const rows = await database
        .select()
        .from(attendanceRecords)
        .where(and(eq(attendanceRecords.employeeId, target.employee.id), gte(attendanceRecords.workDate, range.startDate), lte(attendanceRecords.workDate, range.endDate)))
        .orderBy(desc(attendanceRecords.workDate))
        .limit(31);
      const totalWorkMinutes = rows.reduce((sum, r) => sum + (r.workMinutes || 0), 0);
      const totalWorkHours = Math.round((totalWorkMinutes / 60) * 10) / 10;
      const presentCount = rows.filter(r => ["present", "late", "half_day"].includes(r.status)).length;
      const lateCount = rows.filter(r => r.status === "late").length;
      const absentCount = rows.filter(r => r.status === "absent").length;
      return {
        name,
        data: {
          employeeId: target.employee.id,
          employeeName: `${target.employee.firstName} ${target.employee.lastName}`,
          departmentName: target.departmentName,
          periodLabel: range.label,
          startDate: range.startDate,
          endDate: range.endDate,
          recordCount: rows.length,
          presentCount,
          lateCount,
          absentCount,
          totalWorkHours,
          records: rows.map(r => ({
            workDate: r.workDate,
            status: r.status,
            checkInAt: r.checkInAt ? r.checkInAt.toISOString() : null,
            checkOutAt: r.checkOutAt ? r.checkOutAt.toISOString() : null,
            lateMinutes: r.lateMinutes,
            workMinutes: r.workMinutes
          }))
        }
      };
    }

    if (name === "get_working_hours") {
      const target = await resolveTargetEmployee(actor, rawArgs.employeeId);
      if (target.error || !target.employee) return { name, data: { error: target.error || "Employee record not found." } };
      const range = parseDateRange(rawArgs);
      const rows = await database
        .select({ workMinutes: attendanceRecords.workMinutes, workDate: attendanceRecords.workDate })
        .from(attendanceRecords)
        .where(and(eq(attendanceRecords.employeeId, target.employee.id), gte(attendanceRecords.workDate, range.startDate), lte(attendanceRecords.workDate, range.endDate)));
      const totalWorkMinutes = rows.reduce((sum, r) => sum + (r.workMinutes || 0), 0);
      const totalWorkHours = Math.round((totalWorkMinutes / 60) * 10) / 10;
      const recordedDays = rows.length;
      const avgHoursPerDay = recordedDays > 0 ? Math.round((totalWorkHours / recordedDays) * 10) / 10 : 0;
      return {
        name,
        data: {
          employeeId: target.employee.id,
          employeeName: `${target.employee.firstName} ${target.employee.lastName}`,
          departmentName: target.departmentName,
          month: range.startDate.slice(0, 7),
          periodLabel: range.label,
          startDate: range.startDate,
          endDate: range.endDate,
          recordedDays,
          totalWorkMinutes,
          totalWorkHours,
          formattedHours: `${totalWorkHours} hrs`,
          averageHoursPerDay: avgHoursPerDay
        }
      };
    }

    if (name === "get_attendance_report") {
      const target = await resolveTargetEmployee(actor, rawArgs.employeeId);
      if (target.error || !target.employee) return { name, data: { error: target.error || "Employee record not found." } };
      const range = parseDateRange(rawArgs);
      const rows = await database
        .select()
        .from(attendanceRecords)
        .where(and(eq(attendanceRecords.employeeId, target.employee.id), gte(attendanceRecords.workDate, range.startDate), lte(attendanceRecords.workDate, range.endDate)))
        .orderBy(desc(attendanceRecords.workDate));

      const totalDays = rows.length;
      const presentDays = rows.filter(r => ["present", "late", "half_day"].includes(r.status)).length;
      const lateDays = rows.filter(r => r.status === "late").length;
      const absentDays = rows.filter(r => r.status === "absent").length;
      const totalWorkMinutes = rows.reduce((sum, r) => sum + (r.workMinutes || 0), 0);
      const totalWorkHours = Math.round((totalWorkMinutes / 60) * 10) / 10;
      const rate = totalDays > 0 ? Math.round((presentDays / totalDays) * 1000) / 10 : 0;

      return {
        name,
        data: {
          reportTitle: "Employee Attendance Report",
          employee: {
            id: target.employee.id,
            name: `${target.employee.firstName} ${target.employee.lastName}`,
            code: target.employee.employeeCode,
            jobTitle: target.employee.jobTitle,
            department: target.departmentName
          },
          period: range.label,
          startDate: range.startDate,
          endDate: range.endDate,
          metrics: {
            attendanceRatePercent: rate,
            formattedRate: `${rate}%`,
            totalRecordedDays: totalDays,
            presentDays,
            lateDays,
            absentDays,
            totalWorkHours,
            formattedHours: `${totalWorkHours} hrs`
          },
          recentRecords: rows.slice(0, 15).map(r => ({
            date: r.workDate,
            status: r.status,
            workMinutes: r.workMinutes,
            lateMinutes: r.lateMinutes
          })),
          summary: `In ${range.label}, ${target.employee.firstName} ${target.employee.lastName} recorded an attendance rate of ${rate}% with ${totalWorkHours} working hours across ${totalDays} tracked workdays.`
        }
      };
    }

    if (name === "get_attendance_comparison") {
      const target = await resolveTargetEmployee(actor, rawArgs.employeeId);
      if (target.error || !target.employee) return { name, data: { error: target.error || "Employee record not found." } };

      const currArgs = typeof rawArgs.currentPeriod === "string" ? { period: rawArgs.currentPeriod } : {};
      const prevArgs = typeof rawArgs.previousPeriod === "string" ? { period: rawArgs.previousPeriod } : { period: "last month" };

      const currentRange = parseDateRange(currArgs);
      const previousRange = parseDateRange(prevArgs);

      const [currRows, prevRows] = await Promise.all([
        database.select().from(attendanceRecords).where(and(eq(attendanceRecords.employeeId, target.employee.id), gte(attendanceRecords.workDate, currentRange.startDate), lte(attendanceRecords.workDate, currentRange.endDate))),
        database.select().from(attendanceRecords).where(and(eq(attendanceRecords.employeeId, target.employee.id), gte(attendanceRecords.workDate, previousRange.startDate), lte(attendanceRecords.workDate, previousRange.endDate)))
      ]);

      const calc = (rows: typeof currRows) => {
        const totalDays = rows.length;
        const presentDays = rows.filter(r => ["present", "late", "half_day"].includes(r.status)).length;
        const lateDays = rows.filter(r => r.status === "late").length;
        const absentDays = rows.filter(r => r.status === "absent").length;
        const totalWorkMinutes = rows.reduce((sum, r) => sum + (r.workMinutes || 0), 0);
        const totalWorkHours = Math.round((totalWorkMinutes / 60) * 10) / 10;
        const rate = totalDays > 0 ? Math.round((presentDays / totalDays) * 1000) / 10 : 0;
        return { totalDays, presentDays, lateDays, absentDays, totalWorkHours, rate };
      };

      const curr = calc(currRows);
      const prev = calc(prevRows);

      const percentagePointsDiff = Math.round((curr.rate - prev.rate) * 10) / 10;
      const percentageGrowth = prev.rate > 0 ? Math.round(((curr.rate - prev.rate) / prev.rate) * 1000) / 10 : 0;
      const hoursDiff = Math.round((curr.totalWorkHours - prev.totalWorkHours) * 10) / 10;
      const lateDiff = curr.lateDays - prev.lateDays;

      const comparisonNarrative = curr.totalDays === 0 || prev.totalDays === 0
        ? "Insufficient historical data in one of the requested periods for complete comparison."
        : percentagePointsDiff > 0
        ? `Attendance rate improved by ${percentagePointsDiff} percentage points (from ${prev.rate}% in ${previousRange.label} to ${curr.rate}% in ${currentRange.label}).`
        : percentagePointsDiff < 0
        ? `Attendance rate dropped by ${Math.abs(percentagePointsDiff)} percentage points (from ${prev.rate}% in ${previousRange.label} to ${curr.rate}% in ${currentRange.label}).`
        : `Attendance rate remained identical at ${curr.rate}% across both comparison periods.`;

      return {
        name,
        data: {
          employeeId: target.employee.id,
          employeeName: `${target.employee.firstName} ${target.employee.lastName}`,
          currentPeriod: { label: currentRange.label, ...curr },
          previousPeriod: { label: previousRange.label, ...prev },
          comparison: {
            rateDifferencePercentagePoints: percentagePointsDiff,
            formattedPointsDiff: `${percentagePointsDiff > 0 ? "+" : ""}${percentagePointsDiff}% points`,
            percentageGrowth: `${percentageGrowth > 0 ? "+" : ""}${percentageGrowth}%`,
            hoursDifference: hoursDiff,
            lateDaysDifference: lateDiff,
            narrative: comparisonNarrative
          }
        }
      };
    }

    if (name === "get_leave_requests") {
      const target = await resolveTargetEmployee(actor, rawArgs.employeeId);
      if (target.error || !target.employee) return { name, data: { error: target.error || "Employee record not found." } };
      const range = parseDateRange(rawArgs);
      const clauses = [eq(leaveRequests.employeeId, target.employee.id)];
      if (rawArgs.status && ["pending", "approved", "rejected", "cancelled"].includes(String(rawArgs.status))) {
        clauses.push(eq(leaveRequests.status, String(rawArgs.status) as any));
      }
      const rows = await database.select().from(leaveRequests).where(and(...clauses)).orderBy(desc(leaveRequests.createdAt)).limit(20);
      return {
        name,
        data: {
          employeeId: target.employee.id,
          employeeName: `${target.employee.firstName} ${target.employee.lastName}`,
          periodLabel: range.label,
          requestsCount: rows.length,
          requests: rows.map(r => ({
            id: r.id,
            leaveType: r.leaveType,
            startDate: r.startDate,
            endDate: r.endDate,
            status: r.status,
            reason: r.reason,
            decisionReason: r.decisionReason
          }))
        }
      };
    }

    if (name === "get_leave_balance") {
      const target = await resolveTargetEmployee(actor, rawArgs.employeeId);
      if (target.error || !target.employee) return { name, data: { error: target.error || "Employee record not found." } };
      const rows = await database.select().from(leaveBalances).where(eq(leaveBalances.employeeId, target.employee.id));
      return {
        name,
        data: {
          employeeId: target.employee.id,
          employeeName: `${target.employee.firstName} ${target.employee.lastName}`,
          balances: rows.map(b => ({
            leaveType: b.leaveType,
            allocatedDays: b.allocatedDays,
            usedDays: b.usedDays,
            remainingDays: Math.max(b.allocatedDays - b.usedDays, 0)
          }))
        }
      };
    }

    if (name === "get_leave_report") {
      const target = await resolveTargetEmployee(actor, rawArgs.employeeId);
      if (target.error || !target.employee) return { name, data: { error: target.error || "Employee record not found." } };
      const range = parseDateRange(rawArgs);
      const [balances, requests] = await Promise.all([
        database.select().from(leaveBalances).where(eq(leaveBalances.employeeId, target.employee.id)),
        database.select().from(leaveRequests).where(eq(leaveRequests.employeeId, target.employee.id)).orderBy(desc(leaveRequests.createdAt)).limit(15)
      ]);

      const summaryBalances = balances.map(b => ({
        type: b.leaveType,
        allocated: b.allocatedDays,
        used: b.usedDays,
        remaining: Math.max(b.allocatedDays - b.usedDays, 0)
      }));

      const pendingCount = requests.filter(r => r.status === "pending").length;
      const approvedCount = requests.filter(r => r.status === "approved").length;

      return {
        name,
        data: {
          reportTitle: "Employee Leave & Balance Report",
          employee: {
            id: target.employee.id,
            name: `${target.employee.firstName} ${target.employee.lastName}`,
            code: target.employee.employeeCode,
            department: target.departmentName
          },
          period: range.label,
          balances: summaryBalances,
          metrics: {
            totalRequests: requests.length,
            pendingRequests: pendingCount,
            approvedRequests: approvedCount
          },
          recentRequests: requests.map(r => ({
            type: r.leaveType,
            startDate: r.startDate,
            endDate: r.endDate,
            status: r.status,
            reason: r.reason
          })),
          summary: `${target.employee.firstName} ${target.employee.lastName} has ${summaryBalances.map(b => `${b.remaining} ${b.type}`).join(", ")} leave days available.`
        }
      };
    }

    if (name === "get_department_coverage") {
      if (isEmployee) return { name, data: { error: "Department coverage data is restricted to HR and administrators." } };
      const targetDate = typeof rawArgs.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawArgs.date) ? rawArgs.date : todayIso();
      const rows = await getDepartmentCoverage(targetDate);
      return {
        name,
        data: {
          date: targetDate,
          departments: rows.map(r => {
            const activeEmployees = Number(r.employeeCount || 0);
            const presentToday = Number(r.presentCount || 0);
            const coveragePercent = activeEmployees > 0 ? Math.round((presentToday / activeEmployees) * 100) : 0;
            return {
              departmentId: r.id,
              department: r.name,
              activeEmployees,
              presentToday,
              coveragePercent,
              formattedCoverage: `${coveragePercent}%`
            };
          })
        }
      };
    }

    if (name === "get_workforce_report") {
      const target = await resolveTargetEmployee(actor, rawArgs.employeeId);
      if (target.error || !target.employee) return { name, data: { error: target.error || "Employee record not found." } };
      const range = parseDateRange(rawArgs);

      const [attRows, balances, requests, anomalies] = await Promise.all([
        database.select().from(attendanceRecords).where(and(eq(attendanceRecords.employeeId, target.employee.id), gte(attendanceRecords.workDate, range.startDate), lte(attendanceRecords.workDate, range.endDate))),
        database.select().from(leaveBalances).where(eq(leaveBalances.employeeId, target.employee.id)),
        database.select().from(leaveRequests).where(eq(leaveRequests.employeeId, target.employee.id)).orderBy(desc(leaveRequests.createdAt)).limit(5),
        database.select().from(attendanceAnomalies).where(and(eq(attendanceAnomalies.employeeId, target.employee.id), eq(attendanceAnomalies.status, "open")))
      ]);

      const totalDays = attRows.length;
      const presentDays = attRows.filter(r => ["present", "late", "half_day"].includes(r.status)).length;
      const lateDays = attRows.filter(r => r.status === "late").length;
      const absentDays = attRows.filter(r => r.status === "absent").length;
      const totalWorkMinutes = attRows.reduce((sum, r) => sum + (r.workMinutes || 0), 0);
      const totalWorkHours = Math.round((totalWorkMinutes / 60) * 10) / 10;
      const rate = totalDays > 0 ? Math.round((presentDays / totalDays) * 1000) / 10 : 0;

      return {
        name,
        data: {
          reportTitle: "Monthly Employee Workforce Report",
          employee: {
            id: target.employee.id,
            name: `${target.employee.firstName} ${target.employee.lastName}`,
            code: target.employee.employeeCode,
            jobTitle: target.employee.jobTitle,
            department: target.departmentName
          },
          period: range.label,
          attendance: {
            ratePercent: rate,
            formattedRate: `${rate}%`,
            recordedDays: totalDays,
            presentDays,
            lateDays,
            absentDays,
            totalWorkHours,
            formattedHours: `${totalWorkHours} hrs`
          },
          leaveBalances: balances.map(b => ({ type: b.leaveType, remaining: Math.max(b.allocatedDays - b.usedDays, 0), used: b.usedDays })),
          recentLeaves: requests.map(r => ({ type: r.leaveType, dates: `${r.startDate} to ${r.endDate}`, status: r.status })),
          openAnomaliesCount: anomalies.length,
          summary: `Comprehensive workforce summary for ${target.employee.firstName} ${target.employee.lastName} in ${range.label}: ${rate}% attendance rate, ${totalWorkHours} work hours, ${lateDays} late arrivals, ${anomalies.length} open anomalies.`
        }
      };
    }

    if (name === "get_department_stats") {
      if (isEmployee) return { name, data: { error: "Department statistics are restricted to HR and administrators." } };
      const today = todayIso();
      const rows = await database
        .select({
          name: departments.name,
          employeeCount: sql<number>`count(distinct ${employees.id})`,
          presentCount: sql<number>`sum(case when ${attendanceRecords.status} in ('present','late','half_day') then 1 else 0 end)`
        })
        .from(departments)
        .leftJoin(employees, and(eq(employees.departmentId, departments.id), eq(employees.status, "active")))
        .leftJoin(attendanceRecords, and(eq(attendanceRecords.employeeId, employees.id), eq(attendanceRecords.workDate, today)))
        .groupBy(departments.id);
      return { name, data: rows.map(row => ({ department: row.name, activeEmployees: Number(row.employeeCount), presentToday: Number(row.presentCount ?? 0) })) };
    }

    if (name === "get_attendance_anomalies") {
      const severity = ["low", "medium", "high", "critical"].includes(String(rawArgs.severity))
        ? (String(rawArgs.severity) as "low" | "medium" | "high" | "critical")
        : undefined;
      const clauses = [];
      if (severity) clauses.push(eq(attendanceAnomalies.severity, severity));
      if (isEmployee) {
        const emp = await db.getEmployeeForUser(actor.id);
        clauses.push(eq(attendanceAnomalies.employeeId, emp?.id ?? -1));
      }
      const rows = await database
        .select({ anomaly: attendanceAnomalies, employee: employees, departmentName: departments.name })
        .from(attendanceAnomalies)
        .leftJoin(employees, eq(attendanceAnomalies.employeeId, employees.id))
        .leftJoin(departments, eq(attendanceAnomalies.departmentId, departments.id))
        .where(clauses.length ? and(...clauses) : undefined)
        .orderBy(desc(attendanceAnomalies.detectedAt))
        .limit(20);
      return {
        name,
        data: rows.map(row => ({
          id: row.anomaly.id,
          employee: row.employee ? `${row.employee.firstName} ${row.employee.lastName}` : null,
          department: row.departmentName,
          severity: row.anomaly.severity,
          confidencePercent: row.anomaly.confidencePercent,
          explanation: row.anomaly.explanation,
          status: row.anomaly.status
        }))
      };
    }

    return { name, data: { error: "That tool is not available." } };
  } catch (err) {
    console.error(`[CopilotToolError] Tool '${name}' failed:`, err);
    return { name, data: { error: "Failed to query workforce database for this request." } };
  }
}

// ---------------------------------------------------------------------------
// Main Copilot Orchestration Handler
// ---------------------------------------------------------------------------
export async function runCopilot(actor: Actor, message: string, conversationId?: number) {
  const database = await db.getDb();
  if (!database) throw new Error("Database is unavailable.");

  // Resolve authenticated user employee details
  const employee = await db.getEmployeeForUser(actor.id);
  let departmentName = "N/A";
  if (employee?.departmentId) {
    const dept = (await database.select({ name: departments.name }).from(departments).where(eq(departments.id, employee.departmentId)).limit(1))[0];
    if (dept) departmentName = dept.name;
  }

  const isEmployee = actor.role === "employee";
  const userFullName = employee ? `${employee.firstName} ${employee.lastName}` : actor.name || "User";

  let conversation = conversationId ? (await database.select().from(copilotConversations).where(and(eq(copilotConversations.id, conversationId), eq(copilotConversations.userId, actor.id))).limit(1))[0] : undefined;
  if (!conversation) {
    const created = await database.insert(copilotConversations).values({ userId: actor.id, title: message.slice(0, 120) });
    const id = Number(created[0].insertId);
    conversation = (await database.select().from(copilotConversations).where(eq(copilotConversations.id, id)).limit(1))[0];
  }

  await database.insert(copilotMessages).values({ conversationId: conversation!.id, role: "user", content: message });

  const systemPrompt = `You are AttendAI Workforce Copilot, an intelligent AI workforce assistant.
You provide verified workforce insights, attendance metrics, leave information, and official workforce reports directly from the application database.

AUTHENTICATED USER CONTEXT:
- Signed-in User: ${userFullName}
- Email: ${actor.email || "N/A"}
- Role: ${actor.role}
- Linked Employee ID: ${employee ? employee.id : "N/A"}
- Employee Code: ${employee?.employeeCode || "N/A"}
- Job Title: ${employee?.jobTitle || "N/A"}
- Department: ${departmentName}
- Current Date: ${todayIso()}

STRICT PRIVACY & AUTHORIZATION RULES:
1. User role: "${actor.role}".
2. ${isEmployee
  ? `Since the signed-in user is an Employee, ALL personal questions (attendance, working hours, leave, reports) pertain strictly to their record (Employee ID: ${employee?.id}). NEVER ask the user for their Employee ID or claim you cannot access their profile.`
  : "As HR/Admin, you can query specific employees or department-wide statistics across the organization."}
3. Identity inquiries (e.g. "What is my name?", "What's my job title?") should be answered immediately using the Authenticated User Context.

EXECUTION & REPORTING DIRECTIVES:
1. ALWAYS execute requests directly by invoking the correct tool(s). DO NOT respond with meta-replies (e.g. "Sure, I can generate that...", "What date range do you want?") when defaults (e.g. current month) apply.
2. If the user asks for a report ("Generate my attendance report", "Generate my leave report", "Generate my monthly workforce report"), execute the tool immediately and format the response as a formal, structured Markdown report.
3. Use exact verified metrics from tool outputs. NEVER invent data, percentages, or names.
4. Structured Report Format:
   # [Report Title]
   **Employee:** [Name] ([Code] | [Job Title] | [Department])
   **Period:** [Period Label]

   ### Key Metrics
   - **Attendance Rate:** [Rate]%
   - **Working Hours:** [Hours] hrs
   - **Present Days:** [Count]
   - **Late Arrivals:** [Count]
   - **Absences:** [Count]

   ### Details / Breakdown
   ...

   ### Summary
   ...

5. For comparisons ("Compare this month with last month", "How much did my attendance improve?"), call \`get_attendance_comparison\` or query both periods to state percentage-point changes clearly.`;

  let choiceContent = "";
  const toolResults: CopilotToolResult[] = [];

  try {
    const first = await invokeLLM({
      model: getCopilotModel(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      tools,
      toolChoice: "auto",
      maxTokens: 1200
    });

    const choice = first.choices[0]?.message;
    const calls = choice?.tool_calls ?? [];
    choiceContent = typeof choice?.content === "string" ? choice.content : "";

    if (calls.length > 0) {
      for (const call of calls.slice(0, 5)) {
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(call.function.arguments || "{}"); } catch { args = {}; }
        try {
          const result = await executeCopilotTool(actor, call.function.name, args);
          toolResults.push(result);
        } catch (err) {
          console.error(`[Copilot] Error executing tool ${call.function.name}:`, err);
          toolResults.push({ name: call.function.name, data: { error: "Failed to execute database query for this tool." } });
        }
      }

      const evidence = toolResults
        .map(r => `Tool \`${r.name}\` returned:\n${JSON.stringify(r.data, null, 2)}`)
        .join("\n\n");

      const final = await invokeLLM({
        model: getCopilotModel(),
        messages: [
          { role: "system", content: `${systemPrompt}\n\nVERIFIED DATABASE TOOL EVIDENCE:\n${evidence}\n\nCompose a concise, practical, and well-structured Markdown response based ONLY on the evidence above.` },
          { role: "user", content: message }
        ],
        toolChoice: "none",
        maxTokens: 1200
      });

      const finalContent = final.choices[0]?.message.content;
      choiceContent = typeof finalContent === "string" ? finalContent : "I could not generate a response from the available database records.";
    }
  } catch (error) {
    console.error("[Copilot] LLM or Tool execution error:", error);
    choiceContent = "I encountered a server issue while processing your request. Please try again in a moment.";
  }

  if (!choiceContent) choiceContent = "I need a more specific workforce question to help.";

  await database.insert(copilotMessages).values({
    conversationId: conversation!.id,
    role: "assistant",
    content: choiceContent,
    toolName: toolResults.map(r => r.name).join(",") || null
  });

  await db.createAuditEvent({
    actorUserId: actor.id,
    action: "ai.copilot_asked",
    resourceType: "copilot_conversation",
    resourceId: conversation!.id,
    metadata: { toolCount: toolResults.length }
  });

  return {
    conversationId: conversation!.id,
    answer: choiceContent,
    toolsUsed: toolResults.map(r => r.name),
    evidence: toolResults
  };
}

// ---------------------------------------------------------------------------
// Anomaly Scan Engine
// ---------------------------------------------------------------------------
type Candidate = AttendanceSignal;

export async function findAttendanceCandidates() {
  const database = await db.getDb(); if (!database) return [] as Candidate[];
  const start = new Date(); start.setUTCDate(start.getUTCDate() - 13); const startDate = todayIso(start);
  const records = await database.select({ attendance: attendanceRecords, employee: employees }).from(attendanceRecords).innerJoin(employees, eq(attendanceRecords.employeeId, employees.id)).where(and(gte(attendanceRecords.workDate, startDate), eq(employees.status, "active")));
  const grouped = new Map<number, typeof records>(); records.forEach(record => grouped.set(record.employee.id, [...(grouped.get(record.employee.id) ?? []), record]));
  const candidates: Candidate[] = [];
  grouped.forEach(rows => { const employee = rows[0].employee; candidates.push(...detectAttendanceSignals({ employeeId: employee.id, departmentId: employee.departmentId, employeeName: `${employee.firstName} ${employee.lastName}`, startDate, endDate: todayIso(), records: rows.map(row => ({ workDate: row.attendance.workDate, status: row.attendance.status, checkOutAt: row.attendance.checkOutAt, workMinutes: row.attendance.workMinutes })) })); });
  const today = todayIso();
  const activeEmployees = await database.select({ id: employees.id, departmentId: employees.departmentId }).from(employees).where(eq(employees.status, "active"));
  const departmentNames = await database.select({ id: departments.id, name: departments.name }).from(departments);
  const recordByEmployee = new Map(records.filter(row => row.attendance.workDate === today).map(row => [row.employee.id, row.attendance.status]));
  const membersByDepartment = new Map<number, number[]>();
  activeEmployees.forEach(employee => { if (employee.departmentId) membersByDepartment.set(employee.departmentId, [...(membersByDepartment.get(employee.departmentId) ?? []), employee.id]); });
  membersByDepartment.forEach((memberIds, departmentId) => {
    const presentCount = memberIds.filter(employeeId => ["present", "late", "half_day"].includes(recordByEmployee.get(employeeId) ?? "absent")).length;
    const coveragePercent = Math.round((presentCount / memberIds.length) * 100);
    if (memberIds.length >= 3 && coveragePercent < 80) {
      const name = departmentNames.find(department => department.id === departmentId)?.name ?? "Department";
      candidates.push({ employeeId: null, departmentId, employeeName: `${name} department`, ruleCode: "department_attendance_deviation", severity: coveragePercent < 60 ? "high" : "medium", confidencePercent: Math.min(95, 70 + (80 - coveragePercent)), evidence: { workDate: today, activeEmployeeCount: memberIds.length, presentCount, coveragePercent } });
    }
  });
  return candidates;
}

async function explainCandidate(candidate: Candidate) {
  const response = await invokeLLM({ model: getCopilotModel(), messages: [{ role: "system", content: "You are AttendAI's HR anomaly explainer. Return plain text only: a concise, factual natural-language explanation based only on the supplied structured attendance evidence. Do not use Markdown, diagnose health, speculate on personal causes, or recommend disciplinary action." }, { role: "user", content: JSON.stringify(candidate) }], maxTokens: 280 });
  const content = response.choices[0]?.message.content;
  const text = typeof content === "string" ? content : Array.isArray(content) ? content.filter(part => part.type === "text").map(part => part.text).join("\n") : "";
  if (!text.trim()) throw new Error("The AI explanation was empty.");
  return text.trim();
}

export async function scanAndCreateAnomalies(actorUserId: number) {
  const database = await db.getDb(); if (!database) throw new Error("Database is unavailable.");
  const candidates = await findAttendanceCandidates(); const created: Array<{ id: number; candidate: Candidate; explanation: string }> = [];
  for (const candidate of candidates) {
    const scopeClause = candidate.employeeId ? eq(attendanceAnomalies.employeeId, candidate.employeeId) : eq(attendanceAnomalies.departmentId, candidate.departmentId!);
    const duplicate = (await database.select({ id: attendanceAnomalies.id }).from(attendanceAnomalies).where(and(scopeClause, eq(attendanceAnomalies.ruleCode, candidate.ruleCode), eq(attendanceAnomalies.status, "open"))).limit(1))[0];
    if (duplicate) continue;
    const explanation = await explainCandidate(candidate);
    const inserted = await database.insert(attendanceAnomalies).values({ employeeId: candidate.employeeId, departmentId: candidate.departmentId, ruleCode: candidate.ruleCode, severity: candidate.severity, confidencePercent: candidate.confidencePercent, evidenceJson: JSON.stringify(candidate.evidence), explanation });
    const id = Number(inserted[0].insertId); created.push({ id, candidate, explanation });
    await deliverToRole("hr_manager", { type: "ai_anomaly_detected", title: `Attendance signal: ${candidate.employeeName}`, body: explanation, href: "/intelligence" });
    await deliverToRole("admin", { type: "ai_anomaly_detected", title: `Attendance signal: ${candidate.employeeName}`, body: explanation, href: "/intelligence" });
  }
  await db.createAuditEvent({ actorUserId, action: "ai.anomaly_scan_completed", resourceType: "attendance_anomaly", resourceId: null, metadata: { candidates: candidates.length, created: created.length } });
  return created;
}
