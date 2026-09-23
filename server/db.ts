import { and, asc, desc, eq, gte, like, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  attendanceAnomalies,
  attendanceRecords,
  auditLogs,
  copilotConversations,
  copilotMessages,
  departments,
  employees,
  leaveBalances,
  leaveRequests,
  notifications,
  reports,
  type InsertUser,
  type User,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to initialize:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  for (const key of ["name", "email", "loginMethod"] as const) {
    if (user[key] !== undefined) {
      values[key] = user[key] ?? null;
      updateSet[key] = user[key] ?? null;
    }
  }
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "employee");
  updateSet.role = values.role;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
}

export async function getEmployeeForUser(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(employees).where(eq(employees.userId, userId)).limit(1))[0];
}

export async function ensureEmployeeLink(user: User) {
  const db = await getDb();
  if (!db || !user.email) return undefined;
  const employee = (await db.select().from(employees).where(eq(employees.email, user.email)).limit(1))[0];
  if (employee && !employee.userId) {
    await db.update(employees).set({ userId: user.id }).where(eq(employees.id, employee.id));
    return { ...employee, userId: user.id };
  }
  return employee;
}

export async function createAuditEvent(input: {
  actorUserId?: number | null;
  action: string;
  resourceType: string;
  resourceId?: string | number | null;
  status?: string;
  metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values({
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId === undefined || input.resourceId === null ? null : String(input.resourceId),
    status: input.status ?? "success",
    metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
  });
}

export async function createInAppNotification(input: {
  recipientUserId: number;
  type: string;
  title: string;
  body: string;
  href?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values({ ...input, channel: "in_app", deliveryStatus: "sent" });
}

export async function listEmployees(input: {
  page: number;
  pageSize: number;
  search?: string;
  departmentId?: number;
  status?: "active" | "inactive";
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const clauses = [];
  if (input.search) {
    const term = `%${input.search}%`;
    clauses.push(or(like(employees.firstName, term), like(employees.lastName, term), like(employees.email, term), like(employees.employeeCode, term))!);
  }
  if (input.departmentId) clauses.push(eq(employees.departmentId, input.departmentId));
  if (input.status) clauses.push(eq(employees.status, input.status));
  const where = clauses.length ? and(...clauses) : undefined;
  const [items, count] = await Promise.all([
    db.select({ employee: employees, departmentName: departments.name }).from(employees).leftJoin(departments, eq(employees.departmentId, departments.id)).where(where).orderBy(asc(employees.firstName), asc(employees.lastName)).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
    db.select({ count: sql<number>`count(*)` }).from(employees).where(where),
  ]);
  return { items, total: Number(count[0]?.count ?? 0) };
}

export async function listDepartments() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ department: departments, employeeCount: sql<number>`count(${employees.id})`, headEmployeeName: sql<string | null>`(select concat(${employees.firstName}, ' ', ${employees.lastName}) from ${employees} where ${employees.id} = ${departments.headEmployeeId})` }).from(departments).leftJoin(employees, and(eq(employees.departmentId, departments.id), eq(employees.status, "active"))).groupBy(departments.id).orderBy(asc(departments.name));
  return rows.map(row => ({ ...row, employeeCount: Number(row.employeeCount) }));
}

export async function getAttendanceWithEmployee(input: { page: number; pageSize: number; startDate?: string; endDate?: string; employeeId?: number; departmentId?: number; status?: "present" | "late" | "absent" | "half_day" }) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const clauses = [];
  if (input.startDate) clauses.push(gte(attendanceRecords.workDate, input.startDate));
  if (input.endDate) clauses.push(lte(attendanceRecords.workDate, input.endDate));
  if (input.employeeId) clauses.push(eq(attendanceRecords.employeeId, input.employeeId));
  if (input.departmentId) clauses.push(eq(employees.departmentId, input.departmentId));
  if (input.status) clauses.push(eq(attendanceRecords.status, input.status));
  const where = clauses.length ? and(...clauses) : undefined;
  const from = db.select({ attendance: attendanceRecords, employee: employees, departmentName: departments.name }).from(attendanceRecords).innerJoin(employees, eq(attendanceRecords.employeeId, employees.id)).leftJoin(departments, eq(employees.departmentId, departments.id));
  const [items, count] = await Promise.all([
    from.where(where).orderBy(desc(attendanceRecords.workDate), desc(attendanceRecords.checkInAt)).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
    db.select({ count: sql<number>`count(*)` }).from(attendanceRecords).innerJoin(employees, eq(attendanceRecords.employeeId, employees.id)).where(where),
  ]);
  return { items, total: Number(count[0]?.count ?? 0) };
}

export async function getDashboardMetrics(today: string, user?: User) {
  const db = await getDb();
  if (!db) return { totalEmployees: 0, presentToday: 0, absentToday: 0, lateToday: 0, pendingLeaves: 0, attendanceRate: 0 };
  const scopeEmployeeId = user?.role === "employee" ? (await getEmployeeForUser(user.id))?.id : undefined;
  const activeWhere = scopeEmployeeId ? and(eq(employees.status, "active"), eq(employees.id, scopeEmployeeId)) : eq(employees.status, "active");
  const employeeRows = await db.select({ id: employees.id }).from(employees).where(activeWhere);
  const ids = employeeRows.map(row => row.id);
  if (!ids.length) return { totalEmployees: 0, presentToday: 0, absentToday: 0, lateToday: 0, pendingLeaves: 0, attendanceRate: 0 };
  const rows = await db.select().from(attendanceRecords).where(eq(attendanceRecords.workDate, today));
  const scoped = rows.filter(row => ids.includes(row.employeeId));
  const presentToday = scoped.filter(row => row.status === "present" || row.status === "late" || row.status === "half_day").length;
  const lateToday = scoped.filter(row => row.status === "late").length;
  const pendingWhere = scopeEmployeeId ? and(eq(leaveRequests.employeeId, scopeEmployeeId), eq(leaveRequests.status, "pending")) : eq(leaveRequests.status, "pending");
  const pending = await db.select({ count: sql<number>`count(*)` }).from(leaveRequests).where(pendingWhere);
  return {
    totalEmployees: ids.length,
    presentToday,
    absentToday: Math.max(ids.length - presentToday, 0),
    lateToday,
    pendingLeaves: Number(pending[0]?.count ?? 0),
    attendanceRate: ids.length ? Math.round((presentToday / ids.length) * 1000) / 10 : 0,
  };
}

export const schemaTables = { attendanceAnomalies, attendanceRecords, auditLogs, copilotConversations, copilotMessages, departments, employees, leaveBalances, leaveRequests, notifications, reports, users };
