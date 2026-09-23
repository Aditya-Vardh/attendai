import { and, desc, eq, like, or } from "drizzle-orm";
import { z } from "zod";
import { departments, employees, leaveRequests, reports } from "../../drizzle/schema";
import * as db from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { getEmployeeForUser } from "../db";

export const searchRouter = router({
  query: protectedProcedure.input(z.object({ term: z.string().trim().min(2).max(100) })).query(async ({ ctx, input }) => {
    const database = await db.getDb();
    if (!database) return [];
    const term = `%${input.term}%`;
    const results: Array<{ id: string; group: string; title: string; subtitle: string; href: string }> = [];
    if (ctx.user.role === "employee") {
      const employee = await getEmployeeForUser(ctx.user.id);
      if (employee && `${employee.firstName} ${employee.lastName} ${employee.employeeCode}`.toLowerCase().includes(input.term.toLowerCase())) results.push({ id: `employee-${employee.id}`, group: "People", title: `${employee.firstName} ${employee.lastName}`, subtitle: employee.jobTitle, href: "/employees" });
      const leaves = await database.select().from(leaveRequests).where(and(eq(leaveRequests.employeeId, employee?.id ?? -1), or(like(leaveRequests.reason, term), like(leaveRequests.status, term)))).limit(5);
      leaves.forEach(leave => results.push({ id: `leave-${leave.id}`, group: "Leave", title: `${leave.leaveType} leave · ${leave.status}`, subtitle: `${leave.startDate} to ${leave.endDate}`, href: "/leave" }));
    } else {
      const [people, orgUnits, leaves, generatedReports] = await Promise.all([
        database.select().from(employees).where(or(like(employees.firstName, term), like(employees.lastName, term), like(employees.email, term), like(employees.employeeCode, term))).limit(6),
        database.select().from(departments).where(or(like(departments.name, term), like(departments.code, term))).limit(5),
        database.select({ leave: leaveRequests, employee: employees }).from(leaveRequests).innerJoin(employees, eq(leaveRequests.employeeId, employees.id)).where(or(like(employees.firstName, term), like(employees.lastName, term), like(leaveRequests.reason, term), like(leaveRequests.status, term))).orderBy(desc(leaveRequests.updatedAt)).limit(5),
        database.select().from(reports).where(like(reports.reportType, term)).orderBy(desc(reports.createdAt)).limit(5),
      ]);
      people.forEach(person => results.push({ id: `employee-${person.id}`, group: "People", title: `${person.firstName} ${person.lastName}`, subtitle: `${person.jobTitle} · ${person.employeeCode}`, href: "/employees" }));
      orgUnits.forEach(department => results.push({ id: `department-${department.id}`, group: "Departments", title: department.name, subtitle: department.code, href: "/departments" }));
      leaves.forEach(row => results.push({ id: `leave-${row.leave.id}`, group: "Leave", title: `${row.employee.firstName} ${row.employee.lastName} · ${row.leave.leaveType}`, subtitle: row.leave.status, href: "/leave" }));
      generatedReports.forEach(report => results.push({ id: `report-${report.id}`, group: "Reports", title: report.reportType.replaceAll("_", " "), subtitle: new Date(report.createdAt).toLocaleDateString(), href: "/reports" }));
    }
    return results;
  }),
});

