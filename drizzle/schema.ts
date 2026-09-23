import {
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const userRoles = ["admin", "hr_manager", "employee"] as const;
export const employmentStatuses = ["active", "inactive"] as const;
export const attendanceStatuses = ["present", "late", "absent", "half_day"] as const;
export const leaveTypes = ["annual", "sick", "unpaid"] as const;
export const leaveStatuses = ["pending", "approved", "rejected", "cancelled"] as const;
export const notificationChannels = ["in_app", "email"] as const;
export const notificationDeliveryStatuses = ["queued", "sent", "failed", "not_configured"] as const;
export const anomalySeverities = ["low", "medium", "high", "critical"] as const;
export const anomalyStatuses = ["open", "acknowledged", "resolved"] as const;

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  clerkId: varchar("clerkId", { length: 255 }).unique(),
  openId: varchar("openId", { length: 64 }),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", userRoles).default("employee").notNull(),
  faceDescriptor: text("faceDescriptor"),
  faceConsentGiven: boolean("faceConsentGiven").default(false),
  faceEnrolledAt: timestamp("faceEnrolledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const departments = mysqlTable(
  "departments",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    code: varchar("code", { length: 24 }).notNull(),
    description: text("description"),
    headEmployeeId: int("headEmployeeId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    departmentCodeUnique: uniqueIndex("departments_code_unique").on(table.code),
    departmentNameUnique: uniqueIndex("departments_name_unique").on(table.name),
  }),
);

export const employees = mysqlTable(
  "employees",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").unique(),
    employeeCode: varchar("employeeCode", { length: 32 }).notNull(),
    firstName: varchar("firstName", { length: 80 }).notNull(),
    lastName: varchar("lastName", { length: 80 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    phone: varchar("phone", { length: 40 }),
    departmentId: int("departmentId"),
    jobTitle: varchar("jobTitle", { length: 120 }).notNull(),
    joinedOn: varchar("joinedOn", { length: 10 }).notNull(),
    status: mysqlEnum("status", employmentStatuses).default("active").notNull(),
    avatarUrl: text("avatarUrl"),
    workdayStartMinute: int("workdayStartMinute").default(540).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    employeeCodeUnique: uniqueIndex("employees_code_unique").on(table.employeeCode),
    employeeEmailUnique: uniqueIndex("employees_email_unique").on(table.email),
    employeeDepartmentIndex: index("employees_department_idx").on(table.departmentId),
    employeeStatusIndex: index("employees_status_idx").on(table.status),
  }),
);

export const attendanceRecords = mysqlTable(
  "attendance_records",
  {
    id: int("id").autoincrement().primaryKey(),
    employeeId: int("employeeId").notNull(),
    workDate: varchar("workDate", { length: 10 }).notNull(),
    checkInAt: timestamp("checkInAt"),
    checkOutAt: timestamp("checkOutAt"),
    status: mysqlEnum("status", attendanceStatuses).default("present").notNull(),
    workMinutes: int("workMinutes").default(0).notNull(),
    lateMinutes: int("lateMinutes").default(0).notNull(),
    note: text("note"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    employeeWorkDateUnique: uniqueIndex("attendance_employee_date_unique").on(table.employeeId, table.workDate),
    attendanceDateIndex: index("attendance_workdate_idx").on(table.workDate),
    attendanceEmployeeIndex: index("attendance_employee_idx").on(table.employeeId),
  }),
);

export const leaveBalances = mysqlTable(
  "leave_balances",
  {
    id: int("id").autoincrement().primaryKey(),
    employeeId: int("employeeId").notNull(),
    leaveType: mysqlEnum("leaveType", leaveTypes).notNull(),
    allocatedDays: int("allocatedDays").default(0).notNull(),
    usedDays: int("usedDays").default(0).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    employeeLeaveTypeUnique: uniqueIndex("leave_balance_employee_type_unique").on(table.employeeId, table.leaveType),
  }),
);

export const leaveRequests = mysqlTable(
  "leave_requests",
  {
    id: int("id").autoincrement().primaryKey(),
    employeeId: int("employeeId").notNull(),
    leaveType: mysqlEnum("leaveType", leaveTypes).notNull(),
    startDate: varchar("startDate", { length: 10 }).notNull(),
    endDate: varchar("endDate", { length: 10 }).notNull(),
    reason: text("reason").notNull(),
    supportingDocumentKey: text("supportingDocumentKey"),
    status: mysqlEnum("status", leaveStatuses).default("pending").notNull(),
    decisionReason: text("decisionReason"),
    reviewedByUserId: int("reviewedByUserId"),
    reviewedAt: timestamp("reviewedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    leaveEmployeeIndex: index("leave_employee_idx").on(table.employeeId),
    leaveStatusIndex: index("leave_status_idx").on(table.status),
    leaveDatesIndex: index("leave_date_idx").on(table.startDate, table.endDate),
  }),
);

export const notifications = mysqlTable(
  "notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    recipientUserId: int("recipientUserId").notNull(),
    channel: mysqlEnum("channel", notificationChannels).default("in_app").notNull(),
    type: varchar("type", { length: 64 }).notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    body: text("body").notNull(),
    href: varchar("href", { length: 240 }),
    readAt: timestamp("readAt"),
    deliveryStatus: mysqlEnum("deliveryStatus", notificationDeliveryStatuses).default("queued").notNull(),
    deliveryError: text("deliveryError"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    recipientReadIndex: index("notifications_recipient_read_idx").on(table.recipientUserId, table.readAt),
  }),
);

export const attendanceAnomalies = mysqlTable(
  "attendance_anomalies",
  {
    id: int("id").autoincrement().primaryKey(),
    employeeId: int("employeeId"),
    departmentId: int("departmentId"),
    ruleCode: varchar("ruleCode", { length: 64 }).notNull(),
    severity: mysqlEnum("severity", anomalySeverities).notNull(),
    confidencePercent: int("confidencePercent").notNull(),
    evidenceJson: text("evidenceJson").notNull(),
    explanation: text("explanation").notNull(),
    status: mysqlEnum("status", anomalyStatuses).default("open").notNull(),
    detectedAt: timestamp("detectedAt").defaultNow().notNull(),
    acknowledgedAt: timestamp("acknowledgedAt"),
    resolvedAt: timestamp("resolvedAt"),
  },
  table => ({
    anomalyStatusIndex: index("anomalies_status_idx").on(table.status, table.detectedAt),
    anomalyEmployeeIndex: index("anomalies_employee_idx").on(table.employeeId),
  }),
);

export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    actorUserId: int("actorUserId"),
    action: varchar("action", { length: 100 }).notNull(),
    resourceType: varchar("resourceType", { length: 64 }).notNull(),
    resourceId: varchar("resourceId", { length: 64 }),
    status: varchar("status", { length: 32 }).default("success").notNull(),
    metadataJson: text("metadataJson"),
    ipHash: varchar("ipHash", { length: 128 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    auditCreatedIndex: index("audit_created_idx").on(table.createdAt),
    auditActorIndex: index("audit_actor_idx").on(table.actorUserId),
  }),
);

export const reports = mysqlTable(
  "reports",
  {
    id: int("id").autoincrement().primaryKey(),
    generatedByUserId: int("generatedByUserId").notNull(),
    reportType: varchar("reportType", { length: 64 }).notNull(),
    filtersJson: text("filtersJson").notNull(),
    summaryJson: text("summaryJson").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ reportCreatedIndex: index("reports_created_idx").on(table.createdAt) }),
);

export const scheduledJobs = mysqlTable(
  "scheduled_jobs",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 80 }).notNull(),
    taskUid: varchar("taskUid", { length: 65 }).notNull(),
    cronExpression: varchar("cronExpression", { length: 80 }).notNull(),
    lastRunDate: varchar("lastRunDate", { length: 10 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    scheduledJobNameUnique: uniqueIndex("scheduled_jobs_name_unique").on(table.name),
    scheduledJobTaskUnique: uniqueIndex("scheduled_jobs_task_uid_unique").on(table.taskUid),
  }),
);

export const copilotConversations = mysqlTable(
  "copilot_conversations",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ conversationUserIndex: index("copilot_conversation_user_idx").on(table.userId, table.updatedAt) }),
);

export const copilotMessages = mysqlTable(
  "copilot_messages",
  {
    id: int("id").autoincrement().primaryKey(),
    conversationId: int("conversationId").notNull(),
    role: mysqlEnum("role", ["user", "assistant", "tool"] as const).notNull(),
    content: text("content").notNull(),
    toolName: varchar("toolName", { length: 80 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ messageConversationIndex: index("copilot_message_conversation_idx").on(table.conversationId, table.createdAt) }),
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Employee = typeof employees.$inferSelect;
export type Department = typeof departments.$inferSelect;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
