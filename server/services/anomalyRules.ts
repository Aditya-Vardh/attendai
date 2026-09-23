export type AttendanceObservation = {
  workDate: string;
  status: "present" | "late" | "absent" | "half_day";
  checkOutAt: Date | null;
  workMinutes: number;
};

export type AttendanceSignal = {
  employeeId: number | null;
  departmentId: number | null;
  employeeName: string;
  ruleCode: "repeated_late_arrivals" | "sudden_absence" | "irregular_hours" | "department_attendance_deviation";
  severity: "medium" | "high";
  confidencePercent: number;
  evidence: Record<string, unknown>;
};

export function detectAttendanceSignals(input: { employeeId: number; departmentId: number | null; employeeName: string; startDate: string; endDate: string; records: AttendanceObservation[] }): AttendanceSignal[] {
  const { employeeId, departmentId, employeeName, startDate, endDate, records } = input;
  const late = records.filter(record => record.status === "late");
  const absent = records.filter(record => record.status === "absent");
  const incompleteOrShort = records.filter(record => record.status !== "absent" && (!record.checkOutAt || (record.workMinutes > 0 && record.workMinutes < 300)));
  const signals: AttendanceSignal[] = [];
  if (late.length >= 3) signals.push({ employeeId, departmentId, employeeName, ruleCode: "repeated_late_arrivals", severity: late.length >= 5 ? "high" : "medium", confidencePercent: Math.min(95, 65 + late.length * 7), evidence: { periodStart: startDate, periodEnd: endDate, lateArrivalCount: late.length, lateDates: late.map(record => record.workDate) } });
  if (absent.length >= 2) signals.push({ employeeId, departmentId, employeeName, ruleCode: "sudden_absence", severity: absent.length >= 3 ? "high" : "medium", confidencePercent: Math.min(94, 68 + absent.length * 8), evidence: { periodStart: startDate, periodEnd: endDate, absenceCount: absent.length, absenceDates: absent.map(record => record.workDate) } });
  if (incompleteOrShort.length >= 2) signals.push({ employeeId, departmentId, employeeName, ruleCode: "irregular_hours", severity: incompleteOrShort.length >= 4 ? "high" : "medium", confidencePercent: Math.min(92, 62 + incompleteOrShort.length * 8), evidence: { periodStart: startDate, periodEnd: endDate, irregularDayCount: incompleteOrShort.length, dates: incompleteOrShort.map(record => record.workDate) } });
  return signals;
}
