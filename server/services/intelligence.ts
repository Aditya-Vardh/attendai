import { and, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { attendanceAnomalies, attendanceRecords, copilotConversations, copilotMessages, departments, employees, leaveRequests } from "../../drizzle/schema";
import * as db from "../db";
import { invokeLLM, type Tool } from "../_core/llm";
import type { AppRole } from "../_core/trpc";
import { todayIso } from "./common";
import { deliverToRole } from "./notifications";
import { detectAttendanceSignals, type AttendanceSignal } from "./anomalyRules";

const COPILOT_MODEL = "claude-haiku-4-5";
type Actor = { id: number; role: AppRole; name: string | null; email: string | null };
type CopilotToolResult = { name: string; data: unknown };

const tools: Tool[] = [
  { type: "function", function: { name: "get_employees", description: "List employees that the signed-in user is authorized to view.", parameters: { type: "object", properties: { search: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 20 } }, additionalProperties: false } } },
  { type: "function", function: { name: "get_attendance_stats", description: "Get role-scoped attendance totals and late-arrival statistics for a date range.", parameters: { type: "object", properties: { startDate: { type: "string" }, endDate: { type: "string" }, departmentId: { type: "integer" } }, additionalProperties: false } } },
  { type: "function", function: { name: "get_department_stats", description: "Compare active employee coverage and current attendance by department. Available to HR and administrators.", parameters: { type: "object", properties: {}, additionalProperties: false } } },
  { type: "function", function: { name: "get_leave_requests", description: "Get leave requests that the signed-in user is authorized to view.", parameters: { type: "object", properties: { status: { type: "string", enum: ["pending", "approved", "rejected", "cancelled"] } }, additionalProperties: false } } },
  { type: "function", function: { name: "get_attendance_anomalies", description: "Get current attendance anomalies that the signed-in user is authorized to view.", parameters: { type: "object", properties: { severity: { type: "string", enum: ["low", "medium", "high", "critical"] } }, additionalProperties: false } } },
];

function dateRange(args: Record<string, unknown>) {
  const endDate = typeof args.endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(args.endDate) ? args.endDate : todayIso();
  const start = new Date(`${endDate}T00:00:00.000Z`); start.setUTCDate(start.getUTCDate() - 29);
  const startDate = typeof args.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(args.startDate) ? args.startDate : todayIso(start);
  return { startDate, endDate };
}

async function getActorEmployee(actor: Actor) { return db.getEmployeeForUser(actor.id); }

export async function executeCopilotTool(actor: Actor, name: string, rawArgs: Record<string, unknown>): Promise<CopilotToolResult> {
  const database = await db.getDb();
  if (!database) return { name, data: { error: "Database is unavailable." } };
  const isEmployee = actor.role === "employee";
  if (name === "get_employees") {
    const search = typeof rawArgs.search === "string" ? rawArgs.search : "";
    const limit = Math.min(Math.max(Number(rawArgs.limit) || 8, 1), 20);
    if (isEmployee) { const employee = await getActorEmployee(actor); return { name, data: employee ? [{ id: employee.id, name: `${employee.firstName} ${employee.lastName}`, employeeCode: employee.employeeCode, jobTitle: employee.jobTitle }] : [] }; }
    const rows = await db.listEmployees({ page: 1, pageSize: limit, search: search || undefined });
    return { name, data: rows.items.map(row => ({ id: row.employee.id, name: `${row.employee.firstName} ${row.employee.lastName}`, department: row.departmentName, jobTitle: row.employee.jobTitle, status: row.employee.status })) };
  }
  if (name === "get_attendance_stats") {
    const range = dateRange(rawArgs); const clauses = [gte(attendanceRecords.workDate, range.startDate), lte(attendanceRecords.workDate, range.endDate)];
    if (isEmployee) { const employee = await getActorEmployee(actor); if (!employee) return { name, data: { ...range, recordCount: 0 } }; clauses.push(eq(attendanceRecords.employeeId, employee.id)); }
    else if (typeof rawArgs.departmentId === "number") {
      const departmentPeople = await database.select({ id: employees.id }).from(employees).where(eq(employees.departmentId, rawArgs.departmentId));
      if (!departmentPeople.length) return { name, data: { ...range, recordCount: 0 } }; clauses.push(inArray(attendanceRecords.employeeId, departmentPeople.map(person => person.id)));
    }
    const rows = await database.select({ status: attendanceRecords.status, workMinutes: attendanceRecords.workMinutes, lateMinutes: attendanceRecords.lateMinutes, workDate: attendanceRecords.workDate }).from(attendanceRecords).where(and(...clauses));
    return { name, data: { ...range, recordCount: rows.length, presentCount: rows.filter(row => ["present", "late", "half_day"].includes(row.status)).length, absentCount: rows.filter(row => row.status === "absent").length, lateCount: rows.filter(row => row.status === "late").length, totalWorkHours: Math.round((rows.reduce((sum, row) => sum + row.workMinutes, 0) / 60) * 10) / 10 } };
  }
  if (name === "get_department_stats") {
    if (isEmployee) return { name, data: { error: "Department comparison is restricted to HR and administrators." } };
    const today = todayIso();
    const rows = await database.select({ name: departments.name, employeeCount: sql<number>`count(distinct ${employees.id})`, presentCount: sql<number>`sum(case when ${attendanceRecords.status} in ('present','late','half_day') then 1 else 0 end)` }).from(departments).leftJoin(employees, and(eq(employees.departmentId, departments.id), eq(employees.status, "active"))).leftJoin(attendanceRecords, and(eq(attendanceRecords.employeeId, employees.id), eq(attendanceRecords.workDate, today))).groupBy(departments.id);
    return { name, data: rows.map(row => ({ department: row.name, activeEmployees: Number(row.employeeCount), presentToday: Number(row.presentCount ?? 0) })) };
  }
  if (name === "get_leave_requests") {
    const status = ["pending", "approved", "rejected", "cancelled"].includes(String(rawArgs.status)) ? String(rawArgs.status) as "pending" | "approved" | "rejected" | "cancelled" : undefined;
    const clauses = []; if (status) clauses.push(eq(leaveRequests.status, status)); if (isEmployee) { const employee = await getActorEmployee(actor); clauses.push(eq(leaveRequests.employeeId, employee?.id ?? -1)); }
    const rows = await database.select({ leave: leaveRequests, employee: employees }).from(leaveRequests).innerJoin(employees, eq(leaveRequests.employeeId, employees.id)).where(clauses.length ? and(...clauses) : undefined).orderBy(desc(leaveRequests.createdAt)).limit(20);
    return { name, data: rows.map(row => ({ employee: `${row.employee.firstName} ${row.employee.lastName}`, type: row.leave.leaveType, startDate: row.leave.startDate, endDate: row.leave.endDate, status: row.leave.status, reason: row.leave.reason })) };
  }
  if (name === "get_attendance_anomalies") {
    const severity = ["low", "medium", "high", "critical"].includes(String(rawArgs.severity)) ? String(rawArgs.severity) as "low" | "medium" | "high" | "critical" : undefined;
    const clauses = []; if (severity) clauses.push(eq(attendanceAnomalies.severity, severity)); if (isEmployee) { const employee = await getActorEmployee(actor); clauses.push(eq(attendanceAnomalies.employeeId, employee?.id ?? -1)); }
    const rows = await database.select({ anomaly: attendanceAnomalies, employee: employees, departmentName: departments.name }).from(attendanceAnomalies).leftJoin(employees, eq(attendanceAnomalies.employeeId, employees.id)).leftJoin(departments, eq(attendanceAnomalies.departmentId, departments.id)).where(clauses.length ? and(...clauses) : undefined).orderBy(desc(attendanceAnomalies.detectedAt)).limit(20);
    return { name, data: rows.map(row => ({ id: row.anomaly.id, employee: row.employee ? `${row.employee.firstName} ${row.employee.lastName}` : null, department: row.departmentName, severity: row.anomaly.severity, confidencePercent: row.anomaly.confidencePercent, explanation: row.anomaly.explanation, status: row.anomaly.status })) };
  }
  return { name, data: { error: "That tool is not available." } };
}

export async function runCopilot(actor: Actor, message: string, conversationId?: number) {
  const database = await db.getDb(); if (!database) throw new Error("Database is unavailable.");
  let conversation = conversationId ? (await database.select().from(copilotConversations).where(and(eq(copilotConversations.id, conversationId), eq(copilotConversations.userId, actor.id))).limit(1))[0] : undefined;
  if (!conversation) { const created = await database.insert(copilotConversations).values({ userId: actor.id, title: message.slice(0, 120) }); const id = Number(created[0].insertId); conversation = (await database.select().from(copilotConversations).where(eq(copilotConversations.id, id)).limit(1))[0]; }
  await database.insert(copilotMessages).values({ conversationId: conversation!.id, role: "user", content: message });
  const system = `You are AttendAI Workforce Copilot. You answer only from approved AttendAI tools, clearly identify the scope of data, preserve employee privacy, and never invent records. The signed-in user's role is ${actor.role}. You are read-only: do not claim to execute changes, approvals, deletions, or notifications. For sensitive actions, explain that an authorized user must use the confirmed workflow in the application.`;
  const first = await invokeLLM({ model: COPILOT_MODEL, messages: [{ role: "system", content: system }, { role: "user", content: message }], tools, toolChoice: "auto", maxTokens: 1000 });
  const choice = first.choices[0]?.message; const calls = choice?.tool_calls ?? [];
  let answer = typeof choice?.content === "string" ? choice.content : ""; const toolResults: CopilotToolResult[] = [];
  if (calls.length) {
    for (const call of calls.slice(0, 3)) {
      let args: Record<string, unknown> = {}; try { args = JSON.parse(call.function.arguments || "{}"); } catch { args = {}; }
      toolResults.push(await executeCopilotTool(actor, call.function.name, args));
    }
    const evidence = toolResults.map(result => `Tool ${result.name} returned:\n${JSON.stringify(result.data)}`).join("\n\n");
    const final = await invokeLLM({ model: COPILOT_MODEL, messages: [{ role: "system", content: `${system}\nCompose a concise, practical answer based only on the following tool results. If data is empty, say so plainly.\n\n${evidence}` }, { role: "user", content: message }], toolChoice: "none", maxTokens: 1000 });
    answer = typeof final.choices[0]?.message.content === "string" ? final.choices[0].message.content : "I could not compose a response from the available workforce data.";
  }
  if (!answer) answer = "I need a more specific workforce question to help.";
  await database.insert(copilotMessages).values({ conversationId: conversation!.id, role: "assistant", content: answer, toolName: toolResults.map(result => result.name).join(",") || null });
  await db.createAuditEvent({ actorUserId: actor.id, action: "ai.copilot_asked", resourceType: "copilot_conversation", resourceId: conversation!.id, metadata: { toolCount: toolResults.length } });
  return { conversationId: conversation!.id, answer, toolsUsed: toolResults.map(result => result.name), evidence: toolResults };
}

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
  const response = await invokeLLM({ model: COPILOT_MODEL, messages: [{ role: "system", content: "You are AttendAI's HR anomaly explainer. Return plain text only: a concise, factual natural-language explanation based only on the supplied structured attendance evidence. Do not use Markdown, diagnose health, speculate on personal causes, or recommend disciplinary action." }, { role: "user", content: JSON.stringify(candidate) }], maxTokens: 280 });
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
