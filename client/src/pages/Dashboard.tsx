import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { trpc } from "@/lib/trpc";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { AlertTriangle, CalendarClock, CheckCircle2, Clock3, FileClock, Users, UserX } from "lucide-react";
import { useLocation } from "wouter";

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(new Date(`${value}T00:00:00`));

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const overview = trpc.dashboard.overview.useQuery();
  const trend = trpc.dashboard.trend.useQuery({ days: 14 });
  const activity = trpc.dashboard.activity.useQuery();
  const clockIn = trpc.attendance.clockIn.useMutation({ onSuccess: () => { overview.refetch(); mineToday.refetch(); } });
  const clockOut = trpc.attendance.clockOut.useMutation({ onSuccess: () => { overview.refetch(); mineToday.refetch(); } });
  const mineToday = trpc.attendance.mineToday.useQuery(undefined, { enabled: user?.role === "employee" });
  const metrics = overview.data;

  return <div>
    <PageHeader eyebrow={user?.role === "employee" ? "Your workday" : "Workforce command center"} title={user?.role === "employee" ? `Good to see you, ${user.name?.split(" ")[0] ?? "there"}.` : "Workforce, at a glance."} description={user?.role === "employee" ? "Track your attendance, time today, and leave activity from one focused view." : "Monitor attendance health, outstanding leave decisions, and the signals that need attention."} />
    {overview.isLoading ? <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      <Metric icon={Users} label="Active employees" value={metrics?.totalEmployees ?? 0} accent="indigo" />
      <Metric icon={CheckCircle2} label="Present today" value={metrics?.presentToday ?? 0} accent="emerald" />
      <Metric icon={UserX} label="Not recorded" value={metrics?.absentToday ?? 0} accent="rose" />
      <Metric icon={Clock3} label="Late arrivals" value={metrics?.lateToday ?? 0} accent="amber" />
      <Metric icon={FileClock} label="Pending leave" value={metrics?.pendingLeaves ?? 0} accent="violet" />
      <Metric icon={CalendarClock} label="Attendance rate" value={`${metrics?.attendanceRate ?? 0}%`} accent="blue" />
    </div>}
    {user?.role === "employee" && <Card className="mt-5 overflow-hidden border-indigo-100 bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/15"><CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-indigo-100">Today’s attendance</p><h2 className="mt-1 text-2xl font-bold">{mineToday.data?.checkOutAt ? "You’re all set for today." : mineToday.data?.checkInAt ? "You’re clocked in." : "Ready when you are."}</h2><p className="mt-1 text-sm text-indigo-100">{mineToday.data?.checkInAt ? `Checked in at ${new Date(mineToday.data.checkInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Your timestamp will be recorded automatically."}</p></div><div className="flex gap-3">{!mineToday.data?.checkInAt && <Button onClick={() => clockIn.mutate()} disabled={clockIn.isPending} className="rounded-xl bg-white text-indigo-700 hover:bg-indigo-50">{clockIn.isPending ? "Checking in…" : "Check in"}</Button>}{mineToday.data?.checkInAt && !mineToday.data?.checkOutAt && <Button onClick={() => clockOut.mutate()} disabled={clockOut.isPending} className="rounded-xl bg-white text-indigo-700 hover:bg-indigo-50">{clockOut.isPending ? "Checking out…" : "Check out"}</Button>}</div></CardContent></Card>}
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_.9fr]">
      <Card className="border-slate-200/80 shadow-sm dark:border-white/10"><CardContent className="p-5 sm:p-6"><div className="flex items-start justify-between"><div><p className="text-sm font-bold">Attendance movement</p><p className="mt-1 text-xs text-muted-foreground">Present, late, and half-day records over the last 14 days.</p></div><Badge variant="secondary" className="rounded-lg">Live data</Badge></div><div className="mt-6 h-[260px]">{trend.isLoading ? <Skeleton className="h-full w-full rounded-xl" /> : <ResponsiveContainer width="100%" height="100%"><AreaChart data={trend.data ?? []}><defs><linearGradient id="presentGradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.4}/><stop offset="100%" stopColor="#6366f1" stopOpacity={0.02}/></linearGradient></defs><XAxis dataKey="date" tickFormatter={formatDate} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }}/><Tooltip labelFormatter={value => String(value)} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}/><Area type="monotone" dataKey="present" stroke="#4f46e5" fill="url(#presentGradient)" strokeWidth={2.5}/><Area type="monotone" dataKey="late" stroke="#f59e0b" fill="transparent" strokeWidth={2}/></AreaChart></ResponsiveContainer>}</div></CardContent></Card>
      <Card className="border-slate-200/80 shadow-sm dark:border-white/10"><CardContent className="p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-bold">Recent activity</p><p className="mt-1 text-xs text-muted-foreground">Latest leave workflow movement.</p></div><Button variant="ghost" size="sm" onClick={() => setLocation("/leave")}>View all</Button></div><div className="mt-5 space-y-3">{activity.isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />) : activity.data?.length ? activity.data.map((item: any) => <div key={item.id} className="flex gap-3 rounded-xl border border-slate-100 p-3 dark:border-white/10"><span className="mt-1 grid h-7 w-7 place-items-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10"><FileClock className="h-3.5 w-3.5"/></span><div className="min-w-0"><p className="truncate text-xs font-semibold">{item.firstName ? `${item.firstName} ${item.lastName}` : "Leave request"}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{item.leaveType ?? "Leave"} · {item.status}</p></div></div>) : <Empty text="No leave activity yet."/>}</div></CardContent></Card>
    </div>
    {overview.error && <div className="mt-5 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><AlertTriangle className="h-4 w-4"/>Could not load current dashboard data. <Button variant="link" className="h-auto p-0 text-rose-700" onClick={() => overview.refetch()}>Try again</Button></div>}
  </div>;
}

function Metric({ icon: Icon, label, value, accent }: { icon: typeof Users; label: string; value: string | number; accent: string }) { const classes: Record<string, string> = { indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10", emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10", rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/10", amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10", violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/10", blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10" }; return <Card className="border-slate-200/80 shadow-sm dark:border-white/10"><CardContent className="p-4"><span className={`grid h-9 w-9 place-items-center rounded-xl ${classes[accent]}`}><Icon className="h-4 w-4"/></span><p className="mt-4 text-2xl font-bold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></CardContent></Card>; }
export function Empty({ text }: { text: string }) { return <div className="grid min-h-24 place-items-center rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-muted-foreground dark:border-white/10">{text}</div>; }

