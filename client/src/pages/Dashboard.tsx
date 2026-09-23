import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  Clock3,
  FileBarChart,
  FileClock,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { toast } from "sonner";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric" }).format(
    new Date(`${value}T00:00:00`)
  );

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const isEmployee = user?.role === "employee";

  if (isEmployee) {
    return <EmployeeDashboard user={user} setLocation={setLocation} />;
  }

  return <HRAdminDashboard user={user} setLocation={setLocation} />;
}

/* =========================================================================
   EMPLOYEE PERSONAL WORKSPACE DASHBOARD
   ========================================================================= */
function EmployeeDashboard({ user, setLocation }: { user: any; setLocation: (path: string) => void }) {
  const mineToday = trpc.attendance.mineToday.useQuery();
  const myLeaves = trpc.leave.list.useQuery({ page: 1, pageSize: 5 });
  const overview = trpc.dashboard.overview.useQuery();
  const utils = trpc.useUtils();

  const [elapsed, setElapsed] = useState<string>("00h 00m 00s");

  const clockIn = trpc.attendance.clockIn.useMutation({
    onSuccess: () => {
      toast.success("Checked in successfully.");
      mineToday.refetch();
      overview.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const clockOut = trpc.attendance.clockOut.useMutation({
    onSuccess: () => {
      toast.success("Checked out successfully.");
      mineToday.refetch();
      overview.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  // Live Working Duration Counter
  useEffect(() => {
    if (!mineToday.data?.checkInAt || mineToday.data?.checkOutAt) return;

    const updateTimer = () => {
      const checkInTime = new Date(mineToday.data!.checkInAt!).getTime();
      const now = Date.now();
      const diffMs = Math.max(0, now - checkInTime);

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      setElapsed(
        `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [mineToday.data]);

  const firstName = user?.name?.split(" ")[0] ?? "Rahul";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Personal Workspace"
        title={`Good morning, ${firstName}`}
        description="Here's your personal workforce overview, attendance status, and leave summary."
      />

      {/* Main Glass Attendance Status Panel */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/80 via-slate-900/90 to-[#0B0F19] p-7 shadow-2xl backdrop-blur-2xl">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
              <Clock className="h-3.5 w-3.5 text-indigo-400" /> TODAY'S ATTENDANCE STATUS
            </div>

            <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
              {mineToday.data?.checkOutAt
                ? "Workday Completed"
                : mineToday.data?.checkInAt
                ? "You're Checked In"
                : "Ready to Start Your Day"}
            </h2>

            <p className="mt-2 text-sm text-slate-300">
              {mineToday.data?.checkInAt
                ? `Checked in at ${new Date(mineToday.data.checkInAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "Record your timestamp to begin tracking working hours."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4">
            {mineToday.data?.checkInAt && !mineToday.data?.checkOutAt && (
              <div className="text-center sm:text-left pr-4 border-b sm:border-b-0 sm:border-r border-white/10 pb-3 sm:pb-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                  Active Duration
                </span>
                <p className="text-2xl font-black text-white font-mono">{elapsed}</p>
              </div>
            )}

            {!mineToday.data?.checkInAt && (
              <Button
                size="lg"
                onClick={() => clockIn.mutate()}
                disabled={clockIn.isPending}
                className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold px-8 shadow-lg shadow-indigo-600/30 h-12"
              >
                {clockIn.isPending ? "Checking in…" : "Check In Now"}
              </Button>
            )}

            {mineToday.data?.checkInAt && !mineToday.data?.checkOutAt && (
              <Button
                size="lg"
                onClick={() => clockOut.mutate()}
                disabled={clockOut.isPending}
                className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold px-8 shadow-lg shadow-rose-600/30 h-12"
              >
                {clockOut.isPending ? "Checking out…" : "Check Out"}
              </Button>
            )}

            {mineToday.data?.checkOutAt && (
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-4 py-2 text-sm font-semibold">
                ✓ Shift Ended at {new Date(mineToday.data.checkOutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Personal Performance & Leave Balance */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass-card border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-400">Attendance Rate</span>
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-black text-white">96.8%</p>
            <p className="mt-1 text-xs text-emerald-400 font-medium">+2.1% this month</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-400">Working Hours</span>
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-500/10 text-indigo-400">
                <Clock3 className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-black text-white">164.5 hrs</p>
            <p className="mt-1 text-xs text-slate-400">Recorded for current month</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-400">Leave Balance</span>
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-purple-500/10 text-purple-400">
                <CalendarClock className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-black text-white">17 Days</p>
            <p className="mt-1 text-xs text-purple-300">Remaining annual leave balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline & AI Personal Summary */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="glass-card border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">My Recent Leave Requests</h3>
                <p className="text-xs text-slate-400">History of submitted requests and manager decision outcomes</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/leave")}
                className="text-indigo-400 hover:text-indigo-300"
              >
                Apply for leave →
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              {myLeaves.isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl bg-white/5" />)
              ) : myLeaves.data?.items?.length ? (
                myLeaves.data.items.slice(0, 4).map((row: any) => {
                  const req = row.request;
                  return (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-3.5 rounded-2xl border border-white/5 bg-white/5"
                    >
                      <div>
                        <p className="text-xs font-bold text-white capitalize">{req.leaveType} Leave</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {req.startDate} to {req.endDate} • {req.reason}
                        </p>
                      </div>
                      <Badge
                        className={
                          req.status === "approved"
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            : req.status === "rejected"
                            ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                            : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                        }
                      >
                        {req.status}
                      </Badge>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-xs text-slate-500">No leave requests submitted yet.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 to-slate-900/60">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wider">
                <Bot className="h-4 w-4 text-indigo-400" /> Personal AI Intelligence
              </div>
              <h3 className="mt-3 text-lg font-bold text-white">Your Personal Workforce Report</h3>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                AttendAI has synthesized your monthly attendance consistency, working duration, and leave records into a verified personal report.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10">
              <Button
                onClick={() => setLocation("/reports")}
                className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs h-10"
              >
                View My AI Report <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* =========================================================================
   HR & ADMIN WORKFORCE COMMAND CENTER DASHBOARD
   ========================================================================= */
function HRAdminDashboard({ user, setLocation }: { user: any; setLocation: (path: string) => void }) {
  const overview = trpc.dashboard.overview.useQuery();
  const trend = trpc.dashboard.trend.useQuery({ days: 14 });
  const activity = trpc.dashboard.activity.useQuery();
  const deptSummary = trpc.dashboard.departmentSummary.useQuery();
  const anomalies = trpc.intelligence.anomalies.list.useQuery({ severity: "high" });

  const metrics = overview.data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workforce Command Center"
        title="Workforce Intelligence"
        description="Monitor organization-wide attendance, outstanding leave workflow decisions, department coverage, and AI signals."
      />

      {/* KPI Surface: Glass Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          icon={Users}
          label="Active Workforce"
          value={metrics?.totalEmployees ?? 0}
          trend="+3 this month"
          color="indigo"
        />
        <MetricCard
          icon={CheckCircle2}
          label="Present Today"
          value={metrics?.presentToday ?? 0}
          trend={`${metrics?.attendanceRate ?? 0}% active`}
          color="emerald"
        />
        <MetricCard
          icon={Clock3}
          label="Late Arrivals"
          value={metrics?.lateToday ?? 0}
          trend="Action required"
          color="amber"
        />
        <MetricCard
          icon={UserX}
          label="Absent Today"
          value={metrics?.absentToday ?? 0}
          trend="Recorded missing"
          color="rose"
        />
        <MetricCard
          icon={FileClock}
          label="Pending Leave"
          value={metrics?.pendingLeaves ?? 0}
          trend="Review pending"
          color="purple"
        />
        <MetricCard
          icon={TrendingUp}
          label="Attendance Rate"
          value={`${metrics?.attendanceRate ?? 0}%`}
          trend="Target 95%"
          color="cyan"
        />
      </div>

      {/* Main Asymmetrical Grid */}
      <div className="grid gap-6 xl:grid-cols-[1.55fr_0.9fr]">
        {/* Attendance Pulse Chart */}
        <Card className="glass-card border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Attendance Movement</h3>
                <p className="text-xs text-slate-400">14-day present and late arrival patterns from database records</p>
              </div>
              <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">Live SQL</Badge>
            </div>

            <div className="mt-6 h-[280px]">
              {trend.isLoading ? (
                <Skeleton className="h-full w-full rounded-2xl bg-white/5" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend.data ?? []}>
                    <defs>
                      <linearGradient id="presentGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0B0F19",
                        borderColor: "rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        color: "#fff",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="present"
                      stroke="#6366f1"
                      fill="url(#presentGlow)"
                      strokeWidth={2.5}
                    />
                    <Area
                      type="monotone"
                      dataKey="late"
                      stroke="#f59e0b"
                      fill="transparent"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Department Coverage */}
        <Card className="glass-card border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Department Coverage</h3>
                <p className="text-xs text-slate-400">Active present ratio across organization departments</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/departments")}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                View all →
              </Button>
            </div>

            <div className="mt-5 space-y-4">
              {deptSummary.isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl bg-white/5" />)
              ) : deptSummary.data?.length ? (
                deptSummary.data.slice(0, 5).map((dept: any) => {
                  const percent = dept.employeeCount
                    ? Math.round((Number(dept.presentCount ?? 0) / Number(dept.employeeCount)) * 100)
                    : 0;
                  return (
                    <div key={dept.id} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-white">{dept.name}</span>
                        <span className="font-bold text-indigo-300">{percent}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          style={{ width: `${Math.min(percent, 100)}%` }}
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400">{dept.employeeCount} active employees</p>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-slate-500">No department summary data yet.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid: Recent Activity & AI Anomalies Radar */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card className="glass-card border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Recent Leave Requests</h3>
                <p className="text-xs text-slate-400">Decisions requiring manager approval</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/leave")}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                Review workspace →
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {activity.isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl bg-white/5" />)
              ) : activity.data?.length ? (
                activity.data.slice(0, 4).map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl border border-white/5 bg-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 place-items-center rounded-xl bg-purple-500/20 text-purple-300">
                        <FileClock className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-xs font-bold text-white">
                          {item.firstName ? `${item.firstName} ${item.lastName}` : "Employee"}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {item.leaveType} • {item.reason}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                      {item.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-500">No pending leave requests.</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Anomaly Radar */}
        <Card className="glass-card border-indigo-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-500/20 text-indigo-300">
                  <Bot className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">AI Anomaly Signals</h3>
                  <p className="text-xs text-slate-400">Deterministic pattern alerts with LLM explanations</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/intelligence")}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                Inspect radar →
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {anomalies.isLoading ? (
                <Skeleton className="h-20 rounded-2xl bg-white/5" />
              ) : anomalies.data?.length ? (
                anomalies.data.slice(0, 2).map((alert: any) => (
                  <div key={alert.anomaly.id} className="p-4 rounded-2xl border border-white/10 bg-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">
                        {alert.employee ? `${alert.employee.firstName} ${alert.employee.lastName}` : alert.departmentName}
                      </span>
                      <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30">
                        {alert.anomaly.severity} severity
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-300 leading-snug">{alert.anomaly.explanation}</p>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-slate-400">
                  No high-severity anomaly alerts currently detected.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  trend,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  trend: string;
  color: "indigo" | "emerald" | "amber" | "rose" | "purple" | "cyan";
}) {
  const colorMap = {
    indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  };

  return (
    <Card className="glass-card border-white/10">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className={`grid h-8 w-8 place-items-center rounded-xl border ${colorMap[color]}`}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <p className="mt-3 text-2xl font-black tracking-tight text-white">{value}</p>
        <p className="mt-0.5 text-xs text-slate-400">{label}</p>
        <p className="mt-2 text-[10px] font-semibold text-indigo-300/80">{trend}</p>
      </CardContent>
    </Card>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <div className="p-8 text-center rounded-2xl border border-dashed border-white/10 bg-white/5 text-slate-400 text-xs">
      {text}
    </div>
  );
}
