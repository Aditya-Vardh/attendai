import { describe, expect, it } from "vitest";
import { detectAttendanceSignals } from "./anomalyRules";

describe("detectAttendanceSignals", () => {
  it("flags repeated late arrivals with evidence and proportional confidence", () => {
    const signals = detectAttendanceSignals({ employeeId: 7, departmentId: 2, employeeName: "Casey Patel", startDate: "2026-08-01", endDate: "2026-08-14", records: [
      { workDate: "2026-08-01", status: "late", checkOutAt: new Date(), workMinutes: 480 },
      { workDate: "2026-08-04", status: "late", checkOutAt: new Date(), workMinutes: 480 },
      { workDate: "2026-08-07", status: "late", checkOutAt: new Date(), workMinutes: 480 },
    ] });
    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({ ruleCode: "repeated_late_arrivals", severity: "medium", confidencePercent: 86 });
    expect(signals[0]?.evidence).toMatchObject({ lateArrivalCount: 3, lateDates: ["2026-08-01", "2026-08-04", "2026-08-07"] });
  });

  it("flags repeated incomplete or short workdays without penalizing a single short day", () => {
    const signals = detectAttendanceSignals({ employeeId: 8, departmentId: null, employeeName: "Jordan Lee", startDate: "2026-08-01", endDate: "2026-08-14", records: [
      { workDate: "2026-08-01", status: "present", checkOutAt: null, workMinutes: 0 },
      { workDate: "2026-08-04", status: "half_day", checkOutAt: new Date(), workMinutes: 240 },
      { workDate: "2026-08-07", status: "present", checkOutAt: new Date(), workMinutes: 480 },
    ] });
    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({ ruleCode: "irregular_hours", severity: "medium", confidencePercent: 78 });
  });

  it("flags a repeated absence signal with factual evidence", () => {
    const signals = detectAttendanceSignals({ employeeId: 9, departmentId: 3, employeeName: "Avery Morgan", startDate: "2026-08-01", endDate: "2026-08-14", records: [
      { workDate: "2026-08-02", status: "absent", checkOutAt: null, workMinutes: 0 },
      { workDate: "2026-08-05", status: "absent", checkOutAt: null, workMinutes: 0 },
    ] });
    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({ ruleCode: "sudden_absence", severity: "medium", confidencePercent: 84 });
  });

  it("returns no signals for an employee with standard full-day attendance", () => {
    const signals = detectAttendanceSignals({ employeeId: 10, departmentId: 1, employeeName: "Alex Taylor", startDate: "2026-08-01", endDate: "2026-08-05", records: [
      { workDate: "2026-08-01", status: "present", checkOutAt: new Date(), workMinutes: 480 },
      { workDate: "2026-08-02", status: "present", checkOutAt: new Date(), workMinutes: 480 },
      { workDate: "2026-08-03", status: "present", checkOutAt: new Date(), workMinutes: 480 },
    ] });
    expect(signals).toHaveLength(0);
  });
});
