import { useAuth } from "@/_core/hooks/useAuth";
import { motion } from "framer-motion";
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
import { QrCameraScanner } from "@/components/QrCameraScanner";
import { FaceCheckInWidget } from "@/components/FaceCheckInWidget";
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

  const [elapsed, setElapsed] = useState<string>("00h 00m 00s");
  const [geoState, setGeoState] = useState<"idle" | "locating" | "outside" | "denied" | "error">("idle");
  const [geoInfo, setGeoInfo] = useState<{ distanceM: number; radiusM: number } | null>(null);
  const [qrInput, setQrInput] = useState("");
  const [activeTab, setActiveTab] = useState<"geo" | "qr" | "face">("geo");
  const [showManualQr, setShowManualQr] = useState(false);

  // Pick up ?qr= token from URL on mount (for mobile camera scan)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qrToken = params.get("qr");
    if (qrToken) {
      setQrInput(qrToken);
      setActiveTab("qr");
      setShowManualQr(true);
    }
  }, []);

  const clockIn = trpc.attendance.clockIn.useMutation({
    onSuccess: () => {
      toast.success("✓ Checked in successfully.");
      setGeoState("idle");
      mineToday.refetch();
      overview.refetch();
    },
    onError: (e) => { toast.error(e.message); setGeoState("idle"); },
  });

  const clockInWithQr = trpc.attendance.clockInWithQr.useMutation({
    onSuccess: () => {
      toast.success("✓ Checked in via QR code.");
      setQrInput("");
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
      const diffMs = Math.max(0, Date.now() - new Date(mineToday.data!.checkInAt!).getTime());
      const h = Math.floor(diffMs / 3_600_000);
      const m = Math.floor((diffMs % 3_600_000) / 60_000);
      const s = Math.floor((diffMs % 60_000) / 1000);
      setElapsed(`${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`);
    };
    updateTimer();
    const id = setInterval(updateTimer, 1000);
    return () => clearInterval(id);
  }, [mineToday.data]);

  const handleGeoCheckIn = async () => {
    setGeoState("locating");
    try {
      const { getCurrentPosition, checkGeoAllowed } = await import("@/lib/geo");
      const pos = await getCurrentPosition();
      const result = checkGeoAllowed(pos.coords.latitude, pos.coords.longitude);
      if (result.allowed) {
        clockIn.mutate();
      } else {
        setGeoState("outside");
        setGeoInfo({ distanceM: result.distanceM, radiusM: result.radiusM });
      }
    } catch (err: any) {
      if (err?.code === 1 /* PERMISSION_DENIED */) {
        setGeoState("denied");
      } else {
        setGeoState("error");
        toast.error("Location check failed: " + (err?.message ?? "Unknown error"));
      }
    }
  };

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const alreadyCheckedIn = !!mineToday.data?.checkInAt;
  const alreadyCheckedOut = !!mineToday.data?.checkOutAt;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Personal Workspace"
        title={`Good morning, ${firstName}`}
        description="Here's your personal workforce overview, attendance status, and leave summary."
      />

      {/* ── Attendance Status Panel ── */}
      <div className="neu-card p-7 text-[#364322] relative overflow-hidden">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 neu-badge-sage px-3.5 py-1.5 text-xs font-bold">
              <Clock className="h-4 w-4 text-[#2C3917]" /> TODAY'S ATTENDANCE STATUS
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-[#364322] sm:text-4xl">
              {alreadyCheckedOut
                ? "Workday Completed"
                : alreadyCheckedIn
                ? "You're Checked In"
                : "Ready to Start Your Day"}
            </h2>
            <p className="mt-2 text-sm text-[#5C6B44] font-medium">
              {alreadyCheckedIn
                ? `Checked in at ${new Date(mineToday.data!.checkInAt!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Use geolocation or QR code to record your arrival."}
            </p>
          </div>

          <div className="flex flex-col gap-3 neu-inset p-5 min-w-[280px]">
            {/* Active timer */}
            {alreadyCheckedIn && !alreadyCheckedOut && (
              <div className="text-center pb-3 border-b border-[#D8D2BC]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#89986D]">Active Duration</span>
                <p className="text-2xl font-black text-[#364322] font-mono">{elapsed}</p>
              </div>
            )}

            {/* Checked out badge */}
            {alreadyCheckedOut && (
              <Badge className="neu-badge-sage px-4 py-2 text-sm font-bold text-center">
                ✓ Shift Ended at {new Date(mineToday.data!.checkOutAt!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Badge>
            )}

            {/* Check-out button */}
            {alreadyCheckedIn && !alreadyCheckedOut && (
              <Button
                size="lg"
                onClick={() => clockOut.mutate()}
                disabled={clockOut.isPending}
                className="w-full neu-button px-8 h-12 text-sm text-[#D9534F]"
              >
                {clockOut.isPending ? "Checking out…" : "Check Out"}
              </Button>
            )}

            {/* ── Check-in block (not yet checked in) ── */}
            {!alreadyCheckedIn && (
              <>
                {/* 3 Tab Switcher: Geo, QR, Face ID */}
                <div className="flex bg-[#EADFB4]/50 rounded-xl p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => { setActiveTab("geo"); setGeoState("idle"); }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      activeTab === "geo" ? "bg-[#9CAB84] text-white shadow-[2px_2px_6px_#82916B]" : "text-[#5C6B44]"
                    }`}
                  >
                    📍 Location
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab("qr"); setGeoState("idle"); }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      activeTab === "qr" ? "bg-[#9CAB84] text-white shadow-[2px_2px_6px_#82916B]" : "text-[#5C6B44]"
                    }`}
                  >
                    📷 QR Code
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab("face"); setGeoState("idle"); }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      activeTab === "face" ? "bg-[#9CAB84] text-white shadow-[2px_2px_6px_#82916B]" : "text-[#5C6B44]"
                    }`}
                  >
                    👤 Face ID
                  </button>
                </div>

                {/* 1. Location check-in */}
                {activeTab === "geo" && (
                  <div className="space-y-2">
                    {geoState === "idle" && (
                      <Button
                        size="lg"
                        onClick={handleGeoCheckIn}
                        disabled={clockIn.isPending}
                        className="w-full neu-button-primary px-8 h-12 text-sm font-bold"
                      >
                        Check In Now
                      </Button>
                    )}
                    {geoState === "locating" && (
                      <div className="flex items-center justify-center gap-2 h-12 text-sm font-bold text-[#5C6B44]">
                        <div className="h-4 w-4 rounded-full border-2 border-[#9CAB84] border-t-transparent animate-spin" />
                        Verifying KLH Campus location…
                      </div>
                    )}
                    {geoState === "outside" && geoInfo && (
                      <div className="space-y-2">
                        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 font-semibold text-center">
                          <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-rose-600" />
                          Must be on KLH Bachupally Campus to check in.
                          <br />
                          <span className="font-black">Distance: {geoInfo.distanceM}m</span> (allowed: {geoInfo.radiusM}m).
                        </div>
                        <button
                          type="button"
                          onClick={() => setGeoState("idle")}
                          className="w-full text-xs font-bold text-[#5C6B44] underline cursor-pointer"
                        >
                          Try again
                        </button>
                      </div>
                    )}
                    {geoState === "denied" && (
                      <div className="space-y-2">
                        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 font-semibold text-center">
                          Location access was denied. Enable it in browser settings or use QR / Face ID tab.
                        </div>
                        <button
                          type="button"
                          onClick={() => setGeoState("idle")}
                          className="w-full text-xs font-bold text-[#5C6B44] underline cursor-pointer"
                        >
                          Retry
                        </button>
                      </div>
                    )}
                    {geoState === "error" && (
                      <Button
                        size="lg"
                        onClick={handleGeoCheckIn}
                        className="w-full neu-button-primary px-8 h-12 text-sm font-bold"
                      >
                        Retry Location Check
                      </Button>
                    )}
                    <p className="text-[11px] text-center text-[#89986D] font-medium">
                      KLH Bachupally Campus ({import.meta.env.VITE_OFFICE_RADIUS_M ?? 350}m allowed radius).
                    </p>
                  </div>
                )}

                {/* 2. QR Camera check-in */}
                {activeTab === "qr" && (
                  <div className="space-y-3">
                    {!showManualQr ? (
                      <>
                        <QrCameraScanner
                          onScan={(token) => {
                            clockInWithQr.mutate({ token });
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowManualQr(true)}
                          className="text-[11px] text-[#5C6B44] underline font-bold w-full text-center cursor-pointer"
                        >
                          Camera not working? Paste token manually
                        </button>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-[#5C6B44] font-medium">
                          Paste office QR code token below:
                        </p>
                        <input
                          value={qrInput}
                          onChange={(e) => setQrInput(e.target.value)}
                          placeholder="Paste QR token here…"
                          className="w-full rounded-xl bg-[#F6F0D7] border-none shadow-[inset_3px_3px_7px_#D8D2BC,inset_-3px_-3px_7px_#FFFFFF] px-4 py-2.5 text-xs font-mono text-[#364322] placeholder:text-[#89986D] focus:outline-none"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="lg"
                            onClick={() => clockInWithQr.mutate({ token: qrInput.trim() })}
                            disabled={!qrInput.trim() || clockInWithQr.isPending}
                            className="flex-1 neu-button-primary h-11 text-xs font-bold"
                          >
                            {clockInWithQr.isPending ? "Verifying…" : "Submit Token"}
                          </Button>
                          <Button
                            size="lg"
                            variant="ghost"
                            onClick={() => setShowManualQr(false)}
                            className="text-xs font-bold text-[#5C6B44]"
                          >
                            Use Camera
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Face ID check-in */}
                {activeTab === "face" && (
                  <FaceCheckInWidget
                    onSuccess={() => {
                      mineToday.refetch();
                      overview.refetch();
                    }}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Personal Performance & Leave Balance */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="neu-card border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-[#5C6B44]">Attendance Rate</span>
              <span className="grid h-9 w-9 place-items-center neu-badge-sage">
                <CheckCircle2 className="h-4 w-4 text-[#2C3917]" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-black text-[#364322]">96.8%</p>
            <p className="mt-1 text-xs text-[#89986D] font-bold">+2.1% this month</p>
          </CardContent>
        </Card>

        <Card className="neu-card border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-[#5C6B44]">Working Hours</span>
              <span className="grid h-9 w-9 place-items-center neu-badge-sage">
                <Clock3 className="h-4 w-4 text-[#2C3917]" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-black text-[#364322]">164.5 hrs</p>
            <p className="mt-1 text-xs text-[#5C6B44] font-medium">Recorded for current month</p>
          </CardContent>
        </Card>

        <Card className="neu-card border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-[#5C6B44]">Leave Balance</span>
              <span className="grid h-9 w-9 place-items-center neu-badge-sage">
                <CalendarClock className="h-4 w-4 text-[#2C3917]" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-black text-[#364322]">17 Days</p>
            <p className="mt-1 text-xs text-[#89986D] font-bold">Remaining annual leave balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline & AI Personal Summary */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="neu-card border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#364322]">My Recent Leave Requests</h3>
                <p className="text-xs text-[#5C6B44]">History of submitted requests and manager decision outcomes</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/leave")}
                className="text-xs font-bold text-[#89986D] hover:text-[#364322] cursor-pointer"
              >
                Apply for leave →
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              {myLeaves.isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl bg-[#D8D2BC]/40" />)
              ) : myLeaves.data?.items?.length ? (
                myLeaves.data.items.slice(0, 4).map((row: any) => {
                  const req = row.request;
                  return (
                    <div key={req.id} className="flex items-center justify-between p-3.5 neu-card-flat">
                      <div>
                        <p className="text-xs font-bold text-[#364322] capitalize">{req.leaveType} Leave</p>
                        <p className="text-[11px] text-[#5C6B44] font-medium mt-0.5">
                          {req.startDate} to {req.endDate} • {req.reason}
                        </p>
                      </div>
                      <Badge
                        className={
                          req.status === "approved"
                            ? "neu-badge-sage text-xs font-bold"
                            : req.status === "rejected"
                            ? "bg-rose-100 text-rose-800 text-xs font-bold"
                            : "neu-badge text-xs font-bold"
                        }
                      >
                        {req.status}
                      </Badge>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-xs text-[#5C6B44]">No leave requests submitted yet.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="neu-card-sage border-none">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#2C3917] uppercase tracking-wider">
                <Bot className="h-4 w-4 text-[#2C3917]" /> Personal AI Intelligence
              </div>
              <h3 className="mt-3 text-lg font-bold text-[#2C3917]">Your Personal Workforce Report</h3>
              <p className="mt-2 text-xs text-[#384A1E] leading-relaxed font-medium">
                AttendAI has synthesized your monthly attendance consistency, working duration, and leave records into a verified personal report.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-[#A8BB81]">
              <Button
                onClick={() => setLocation("/reports")}
                className="w-full neu-button-primary text-xs h-10"
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

      {/* KPI Surface: Neumorphic Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          icon={Users}
          label="Active Workforce"
          value={metrics?.totalEmployees ?? 0}
          trend="+3 this month"
        />
        <MetricCard
          icon={CheckCircle2}
          label="Present Today"
          value={metrics?.presentToday ?? 0}
          trend={`${metrics?.attendanceRate ?? 0}% active`}
        />
        <MetricCard
          icon={Clock3}
          label="Late Arrivals"
          value={metrics?.lateToday ?? 0}
          trend="Action required"
        />
        <MetricCard
          icon={UserX}
          label="Absent Today"
          value={metrics?.absentToday ?? 0}
          trend="Recorded missing"
        />
        <MetricCard
          icon={FileClock}
          label="Pending Leave"
          value={metrics?.pendingLeaves ?? 0}
          trend="Review pending"
        />
        <MetricCard
          icon={TrendingUp}
          label="Attendance Rate"
          value={`${metrics?.attendanceRate ?? 0}%`}
          trend="Target 95%"
        />
      </div>

      {/* Main Asymmetrical Grid */}
      <div className="grid gap-6 xl:grid-cols-[1.55fr_0.9fr]">
        {/* Attendance Pulse Chart */}
        <Card className="neu-card border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#364322]">Attendance Movement</h3>
                <p className="text-xs text-[#5C6B44]">14-day present and late arrival patterns from database records</p>
              </div>
              <Badge className="neu-badge-sage text-xs font-bold">Live SQL</Badge>
            </div>

            <div className="mt-6 h-[280px]">
              {trend.isLoading ? (
                <Skeleton className="h-full w-full rounded-2xl bg-[#D8D2BC]/40" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend.data ?? []}>
                    <defs>
                      <linearGradient id="presentGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#9CAB84" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#9CAB84" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#5C6B44" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#F6F0D7",
                        borderColor: "#D8D2BC",
                        borderRadius: "16px",
                        color: "#364322",
                        boxShadow: "6px 6px 14px #D8D2BC, -6px -6px 14px #FFFFFF",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="present"
                      stroke="#9CAB84"
                      fill="url(#presentGlow)"
                      strokeWidth={3}
                    />
                    <Area
                      type="monotone"
                      dataKey="late"
                      stroke="#D9534F"
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
        <Card className="neu-card border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#364322]">Department Coverage</h3>
                <p className="text-xs text-[#5C6B44]">Active present ratio across organization departments</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/departments")}
                className="text-xs font-bold text-[#89986D] hover:text-[#364322] cursor-pointer"
              >
                View all →
              </Button>
            </div>

            <div className="mt-5 space-y-4">
              {deptSummary.isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl bg-[#D8D2BC]/40" />)
              ) : deptSummary.data?.length ? (
                deptSummary.data.slice(0, 5).map((dept: any) => {
                  const percent = dept.employeeCount
                    ? Math.round((Number(dept.presentCount ?? 0) / Number(dept.employeeCount)) * 100)
                    : 0;
                  return (
                    <div key={dept.id} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-[#364322]">{dept.name}</span>
                        <span className="text-[#89986D]">{percent}%</span>
                      </div>
                      <div className="h-2.5 rounded-full neu-inset overflow-hidden p-0.5">
                        <div
                          style={{ width: `${Math.min(percent, 100)}%` }}
                          className="h-full rounded-full bg-[#9CAB84]"
                        />
                      </div>
                      <p className="text-[11px] text-[#5C6B44] font-medium">{dept.employeeCount} active employees</p>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-[#5C6B44]">No department summary data yet.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid: Recent Activity & AI Anomalies Radar */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card className="neu-card border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#364322]">Recent Leave Requests</h3>
                <p className="text-xs text-[#5C6B44]">Decisions requiring manager approval</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/leave")}
                className="text-xs font-bold text-[#89986D] hover:text-[#364322] cursor-pointer"
              >
                Review workspace →
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {activity.isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl bg-[#D8D2BC]/40" />)
              ) : activity.data?.length ? (
                activity.data.slice(0, 4).map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3.5 neu-card-flat"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 place-items-center neu-badge-sage">
                        <FileClock className="h-4 w-4 text-[#2C3917]" />
                      </span>
                      <div>
                        <p className="text-xs font-bold text-[#364322]">
                          {item.firstName ? `${item.firstName} ${item.lastName}` : "Employee"}
                        </p>
                        <p className="text-[11px] text-[#5C6B44] font-medium">
                          {item.leaveType} • {item.reason}
                        </p>
                      </div>
                    </div>
                    <Badge className="neu-badge text-xs font-bold">
                      {item.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-[#5C6B44]">No pending leave requests.</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Anomaly Radar */}
        <Card className="neu-card-sage border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#9CAB84] text-white shadow-[2px_2px_6px_#A8BB81]">
                  <Bot className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#2C3917]">AI Anomaly Signals</h3>
                  <p className="text-xs text-[#384A1E] font-medium">Deterministic pattern alerts with LLM explanations</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/intelligence")}
                className="text-xs font-bold text-[#2C3917] hover:underline cursor-pointer"
              >
                Inspect radar →
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {anomalies.isLoading ? (
                <Skeleton className="h-20 rounded-2xl bg-[#A8BB81]/40" />
              ) : anomalies.data?.length ? (
                anomalies.data.slice(0, 2).map((alert: any) => (
                  <div key={alert.anomaly.id} className="p-4 neu-card-sage-inset space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#2C3917]">
                        {alert.employee ? `${alert.employee.firstName} ${alert.employee.lastName}` : alert.departmentName}
                      </span>
                      <Badge className="bg-rose-600 text-white font-bold text-[10px]">
                        {alert.anomaly.severity} severity
                      </Badge>
                    </div>
                    <p className="text-xs text-[#384A1E] leading-snug font-medium">{alert.anomaly.explanation}</p>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-[#384A1E] font-medium">
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
}: {
  icon: any;
  label: string;
  value: string | number;
  trend: string;
}) {
  return (
    <Card className="neu-card border-none">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="grid h-9 w-9 place-items-center neu-badge-sage">
            <Icon className="h-4 w-4 text-[#2C3917]" />
          </span>
        </div>
        <p className="mt-3 text-2xl font-black tracking-tight text-[#364322]">{value}</p>
        <p className="mt-0.5 text-xs text-[#5C6B44] font-medium">{label}</p>
        <p className="mt-2 text-[10px] font-bold text-[#89986D]">{trend}</p>
      </CardContent>
    </Card>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <div className="p-8 text-center neu-inset text-[#5C6B44] text-xs font-medium">
      {text}
    </div>
  );
}

