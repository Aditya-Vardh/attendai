import { eq, sql } from "drizzle-orm";
import {
  attendanceAnomalies,
  attendanceRecords,
  auditLogs,
  departments,
  employees,
  leaveBalances,
  leaveRequests,
  notifications,
  users,
} from "../drizzle/schema";
import { getDb } from "./db";

export async function runSeedIfNeeded() {
  const db = await getDb();
  if (!db) return;

  try {
    const existingEmployees = await db.select({ count: sql<number>`count(*)` }).from(employees);
    if (Number(existingEmployees[0]?.count ?? 0) > 0) {
      // Database already has employee data
      return;
    }

    console.log("[Seed] Seeding AttendAI database with deterministic workforce data...");

    // 1. Seed Users for the 3 target personas
    const now = new Date();

    // Admin User
    await db.insert(users).values({
      openId: "demo_admin_id",
      name: "Alex Vance",
      email: "admin@attendai.com",
      loginMethod: "email",
      role: "admin",
      lastSignedIn: now,
    }).onDuplicateKeyUpdate({ set: { role: "admin" } });

    // HR Manager User
    await db.insert(users).values({
      openId: "demo_hr_id",
      name: "Sarah Jenkins",
      email: "hr@attendai.com",
      loginMethod: "email",
      role: "hr_manager",
      lastSignedIn: now,
    }).onDuplicateKeyUpdate({ set: { role: "hr_manager" } });

    // Employee User
    await db.insert(users).values({
      openId: "demo_employee_id",
      name: "Rahul Sharma",
      email: "rahul@attendai.com",
      loginMethod: "email",
      role: "employee",
      lastSignedIn: now,
    }).onDuplicateKeyUpdate({ set: { role: "employee" } });

    const adminUser = (await db.select().from(users).where(eq(users.email, "admin@attendai.com")).limit(1))[0];
    const hrUser = (await db.select().from(users).where(eq(users.email, "hr@attendai.com")).limit(1))[0];
    const employeeUser = (await db.select().from(users).where(eq(users.email, "rahul@attendai.com")).limit(1))[0];

    // 2. Seed Departments
    const deptData = [
      { name: "Engineering", code: "ENG", description: "Product development, architecture, and core AI systems." },
      { name: "Product & Design", code: "PRD", description: "Product management, UI/UX design, and user research." },
      { name: "Human Resources", code: "HR", description: "People operations, talent acquisition, and workforce policy." },
      { name: "Operations", code: "OPS", description: "Business operations, logistics, and internal security." },
      { name: "Marketing & Sales", code: "MKT", description: "Growth, brand strategy, enterprise partnerships, and sales." },
    ];

    for (const d of deptData) {
      await db.insert(departments).values(d).onDuplicateKeyUpdate({ set: { description: d.description } });
    }

    const depts = await db.select().from(departments);
    const engDept = depts.find(d => d.code === "ENG")?.id;
    const prdDept = depts.find(d => d.code === "PRD")?.id;
    const hrDept = depts.find(d => d.code === "HR")?.id;
    const opsDept = depts.find(d => d.code === "OPS")?.id;
    const mktDept = depts.find(d => d.code === "MKT")?.id;

    // 3. Seed Employees
    const employeeList = [
      {
        userId: employeeUser?.id,
        employeeCode: "EMP-1001",
        firstName: "Rahul",
        lastName: "Sharma",
        email: "rahul@attendai.com",
        phone: "+1 (555) 234-5678",
        departmentId: engDept,
        jobTitle: "Senior Software Engineer",
        joinedOn: "2023-03-15",
        status: "active" as const,
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
        workdayStartMinute: 540, // 09:00 AM
      },
      {
        userId: hrUser?.id,
        employeeCode: "EMP-1002",
        firstName: "Sarah",
        lastName: "Jenkins",
        email: "hr@attendai.com",
        phone: "+1 (555) 345-6789",
        departmentId: hrDept,
        jobTitle: "Head of People Operations",
        joinedOn: "2022-01-10",
        status: "active" as const,
        avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80",
        workdayStartMinute: 540,
      },
      {
        userId: adminUser?.id,
        employeeCode: "EMP-1003",
        firstName: "Alex",
        lastName: "Vance",
        email: "admin@attendai.com",
        phone: "+1 (555) 456-7890",
        departmentId: opsDept,
        jobTitle: "VP of Operations",
        joinedOn: "2021-06-01",
        status: "active" as const,
        avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
        workdayStartMinute: 540,
      },
      {
        employeeCode: "EMP-1004",
        firstName: "Priya",
        lastName: "Patel",
        email: "priya.patel@attendai.com",
        phone: "+1 (555) 567-8901",
        departmentId: engDept,
        jobTitle: "AI Systems Architect",
        joinedOn: "2023-08-01",
        status: "active" as const,
        avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80",
        workdayStartMinute: 540,
      },
      {
        employeeCode: "EMP-1005",
        firstName: "Marcus",
        lastName: "Chen",
        email: "marcus.chen@attendai.com",
        phone: "+1 (555) 678-9012",
        departmentId: prdDept,
        jobTitle: "Principal Product Designer",
        joinedOn: "2023-02-20",
        status: "active" as const,
        avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80",
        workdayStartMinute: 540,
      },
      {
        employeeCode: "EMP-1006",
        firstName: "Elena",
        lastName: "Rostova",
        email: "elena.rostova@attendai.com",
        phone: "+1 (555) 789-0123",
        departmentId: prdDept,
        jobTitle: "Group Product Manager",
        joinedOn: "2022-11-05",
        status: "active" as const,
        avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80",
        workdayStartMinute: 540,
      },
      {
        employeeCode: "EMP-1007",
        firstName: "David",
        lastName: "Kim",
        email: "david.kim@attendai.com",
        phone: "+1 (555) 890-1234",
        departmentId: mktDept,
        jobTitle: "Growth Marketing Director",
        joinedOn: "2023-05-12",
        status: "active" as const,
        avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80",
        workdayStartMinute: 540,
      },
      {
        employeeCode: "EMP-1008",
        firstName: "Aisha",
        lastName: "Bello",
        email: "aisha.bello@attendai.com",
        phone: "+1 (555) 901-2345",
        departmentId: hrDept,
        jobTitle: "Talent Partner",
        joinedOn: "2023-09-01",
        status: "active" as const,
        avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80",
        workdayStartMinute: 540,
      },
    ];

    for (const emp of employeeList) {
      await db.insert(employees).values(emp).onDuplicateKeyUpdate({ set: { jobTitle: emp.jobTitle } });
    }

    const insertedEmployees = await db.select().from(employees);

    // Update department head references
    const rahulEmp = insertedEmployees.find(e => e.email === "rahul@attendai.com");
    const sarahEmp = insertedEmployees.find(e => e.email === "hr@attendai.com");
    const alexEmp = insertedEmployees.find(e => e.email === "admin@attendai.com");
    const elenaEmp = insertedEmployees.find(e => e.email === "elena.rostova@attendai.com");

    if (engDept && rahulEmp) await db.update(departments).set({ headEmployeeId: rahulEmp.id }).where(eq(departments.id, engDept));
    if (hrDept && sarahEmp) await db.update(departments).set({ headEmployeeId: sarahEmp.id }).where(eq(departments.id, hrDept));
    if (opsDept && alexEmp) await db.update(departments).set({ headEmployeeId: alexEmp.id }).where(eq(departments.id, opsDept));
    if (prdDept && elenaEmp) await db.update(departments).set({ headEmployeeId: elenaEmp.id }).where(eq(departments.id, prdDept));

    // 4. Seed Leave Balances for all employees
    for (const emp of insertedEmployees) {
      await db.insert(leaveBalances).values([
        { employeeId: emp.id, leaveType: "annual", allocatedDays: 20, usedDays: 3 },
        { employeeId: emp.id, leaveType: "sick", allocatedDays: 10, usedDays: 1 },
        { employeeId: emp.id, leaveType: "unpaid", allocatedDays: 5, usedDays: 0 },
      ]).onDuplicateKeyUpdate({ set: { allocatedDays: 20 } });
    }

    // 5. Seed Attendance Records for past 30 days
    const todayObj = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(todayObj);
      d.setDate(d.getDate() - i);
      // Skip weekends
      if (d.getDay() === 0 || d.getDay() === 6) continue;

      const dateStr = d.toISOString().slice(0, 10);

      for (const emp of insertedEmployees) {
        // Create deterministic status
        const dayHash = (emp.id * 17 + i * 31) % 100;
        let status: "present" | "late" | "absent" | "half_day" = "present";
        let checkInMinute = 530 + ((emp.id * 7 + i) % 15); // around 8:50 - 9:05 AM
        let workMinutes = 480;
        let lateMinutes = 0;

        if (dayHash < 75) {
          // Present on time
          status = "present";
        } else if (dayHash < 88) {
          // Late
          status = "late";
          lateMinutes = 25 + ((emp.id * 3 + i) % 35);
          checkInMinute = 540 + lateMinutes; // 9:25 - 10:00 AM
          workMinutes = 480 - lateMinutes;
        } else if (dayHash < 94) {
          // Half day
          status = "half_day";
          workMinutes = 240;
        } else {
          // Absent
          status = "absent";
          workMinutes = 0;
        }

        const checkInAt = status !== "absent" ? new Date(`${dateStr}T${String(Math.floor(checkInMinute / 60)).padStart(2, "0")}:${String(checkInMinute % 60).padStart(2, "0")}:00.000Z`) : null;
        const checkOutMinute = checkInMinute + Math.floor(workMinutes * 1.1); // include lunch break
        const checkOutAt = (status !== "absent" && i > 0) ? new Date(`${dateStr}T${String(Math.floor(checkOutMinute / 60)).padStart(2, "0")}:${String(checkOutMinute % 60).padStart(2, "0")}:00.000Z`) : null;

        await db.insert(attendanceRecords).values({
          employeeId: emp.id,
          workDate: dateStr,
          checkInAt,
          checkOutAt,
          status,
          workMinutes,
          lateMinutes,
          note: status === "late" ? "Traffic delay on main corridor" : undefined,
        }).onDuplicateKeyUpdate({ set: { status } });
      }
    }

    // 6. Seed Leave Requests
    if (rahulEmp && sarahEmp && hrUser) {
      await db.insert(leaveRequests).values([
        {
          employeeId: rahulEmp.id,
          leaveType: "annual",
          startDate: "2026-10-10",
          endDate: "2026-10-14",
          reason: "Attending annual developer conference and team workshop.",
          status: "pending",
        },
        {
          employeeId: rahulEmp.id,
          leaveType: "sick",
          startDate: "2026-09-02",
          endDate: "2026-09-03",
          reason: "Seasonal viral fever.",
          status: "approved",
          decisionReason: "Approved with medical note on file.",
          reviewedByUserId: hrUser.id,
          reviewedAt: new Date("2026-09-02T10:30:00Z"),
        },
      ]);
    }

    // 7. Seed Attendance Anomalies
    if (rahulEmp && engDept) {
      await db.insert(attendanceAnomalies).values([
        {
          employeeId: rahulEmp.id,
          departmentId: engDept,
          ruleCode: "repeated_late_arrivals",
          severity: "medium",
          confidencePercent: 88,
          evidenceJson: JSON.stringify({ periodStart: "2026-09-01", periodEnd: "2026-09-20", lateArrivalCount: 4 }),
          explanation: "Employee recorded 4 late arrivals exceeding 20 minutes over the last 14 working days.",
          status: "open",
          detectedAt: new Date("2026-09-21T08:00:00Z"),
        },
      ]);
    }

    // 8. Seed Notifications
    if (employeeUser) {
      await db.insert(notifications).values([
        {
          recipientUserId: employeeUser.id,
          channel: "in_app",
          type: "leave_approved",
          title: "Leave request approved",
          body: "Your sick leave request for Sep 02 - Sep 03 was approved by Sarah Jenkins.",
          href: "/leave",
          deliveryStatus: "sent",
          readAt: new Date(),
        },
      ]);
    }

    // 9. Seed Audit Logs
    if (adminUser) {
      await db.insert(auditLogs).values([
        {
          actorUserId: adminUser.id,
          action: "system.initialization",
          resourceType: "system",
          resourceId: "1",
          status: "success",
          metadataJson: JSON.stringify({ environment: "development", seededAt: now.toISOString() }),
        },
      ]);
    }

    console.log("[Seed] AttendAI database successfully seeded with 3 personas, 5 departments, 8 employees, and 30 days of attendance!");
  } catch (error) {
    console.error("[Seed] Error seeding database:", error);
  }
}
