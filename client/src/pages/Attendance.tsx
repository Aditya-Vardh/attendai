import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { trpc } from "@/lib/trpc";
import {
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  Clock3,
  Filter,
  LogIn,
  LogOut,
  UserCheck,
  UserX,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Attendance() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const isEmployee = user?.role === "employee";

  const today = trpc.attendance.mineToday.useQuery(undefined, { enabled: isEmployee });
  const list = trpc.attendance.list.useQuery({
    page,
    pageSize: 12,
    status: statusFilter === "all" ? undefined : (statusFilter as any),
  });

  const utils = trpc.useUtils();

  const clockIn = trpc.attendance.clockIn.useMutation({
    onSuccess: () => {
      toast.success("Check-in recorded successfully.");
      today.refetch();
      utils.attendance.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const clockOut = trpc.attendance.clockOut.useMutation({
    onSuccess: () => {
      toast.success("Check-out recorded successfully.");
      today.refetch();
      utils.attendance.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // Live Timer for Employee Clocking Station
  const [elapsed, setElapsed] = useState<string>("00h 00m 00s");
  useEffect(() => {
    if (!today.data?.checkInAt || today.data?.checkOutAt) return;

    const updateTimer = () => {
      const checkInTime = new Date(today.data!.checkInAt!).getTime();
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
  }, [today.data]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Attendance Operations"
        title={isEmployee ? "My Attendance Workspace" : "Workforce Attendance Monitor"}
        description={
          isEmployee
            ? "Record your daily workday timestamp and inspect your historical attendance log."
            : "Monitor live check-in timestamps, working hours, and late arrival records across all workforce departments."
        }
      />

      {/* Employee Interactive Clocking Station Panel */}
      {isEmployee && (
        <div className="relative overflow-hidden rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/80 via-slate-900/90 to-[#0B0F19] p-7 shadow-2xl backdrop-blur-2xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-indigo-300">
                <Clock className="h-3.5 w-3.5 text-indigo-400" /> Attendance Clocking Station
              </span>
              <h2 className="text-2xl font-black text-white sm:text-3xl">
                {today.data?.checkOutAt
                  ? "Workday Shift Completed"
                  : today.data?.checkInAt
                  ? "Currently Clocked In"
                  : "Not Clocked In Today"}
              </h2>
              <p className="text-xs text-slate-300">
                {today.data?.checkInAt
                  ? `Check-in recorded at ${new Date(today.data.checkInAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : "Click Check In to begin your active shift timer."}
              </p>
            </div>

            <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl">
              {today.data?.checkInAt && !today.data?.checkOutAt && (
                <div className="text-left pr-4 border-r border-white/10">
                  <span className="text-[10px] font-bold uppercase text-indigo-300">Working Duration</span>
                  <p className="text-xl font-black text-white font-mono">{elapsed}</p>
                </div>
              )}

              {!today.data?.checkInAt && (
                <Button
                  onClick={() => clockIn.mutate()}
                  disabled={clockIn.isPending}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold px-6 h-11"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  {clockIn.isPending ? "Checking in…" : "Check In"}
                </Button>
              )}

              {today.data?.checkInAt && !today.data?.checkOutAt && (
                <Button
                  onClick={() => clockOut.mutate()}
                  disabled={clockOut.isPending}
                  className="rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold px-6 h-11"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {clockOut.isPending ? "Checking out…" : "Check Out"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attendance History Table Card */}
      <Card className="glass-card border-white/10">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-500/20 text-indigo-300">
                <CalendarClock className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-white">Attendance Log</h3>
                <p className="text-xs text-slate-400">Database attendance records and timestamps</p>
              </div>
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40 rounded-xl border-white/10 bg-white/5 text-xs">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="half_day">Half Day</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-slate-400 font-semibold text-xs">Date</TableHead>
                  <TableHead className="text-slate-400 font-semibold text-xs">Employee</TableHead>
                  <TableHead className="text-slate-400 font-semibold text-xs">Check In</TableHead>
                  <TableHead className="text-slate-400 font-semibold text-xs">Check Out</TableHead>
                  <TableHead className="text-slate-400 font-semibold text-xs">Working Hours</TableHead>
                  <TableHead className="text-slate-400 font-semibold text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-xs text-slate-400">
                      Loading attendance records…
                    </TableCell>
                  </TableRow>
                ) : list.data?.items.length ? (
                  list.data.items.map((row: any) => (
                    <TableRow key={row.attendance.id} className="border-white/5 hover:bg-white/5">
                      <TableCell className="font-mono text-xs text-white font-medium">
                        {row.attendance.workDate}
                      </TableCell>
                      <TableCell>
                        <p className="text-xs font-bold text-white">
                          {row.employee.firstName} {row.employee.lastName}
                        </p>
                        <p className="text-[11px] text-slate-400">{row.departmentName ?? "Unassigned"}</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-300">
                        {row.attendance.checkInAt
                          ? new Date(row.attendance.checkInAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-300">
                        {row.attendance.checkOutAt
                          ? new Date(row.attendance.checkOutAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-300">
                        {row.attendance.workMinutes
                          ? `${Math.floor(row.attendance.workMinutes / 60)}h ${
                              row.attendance.workMinutes % 60
                            }m`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge value={row.attendance.status} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-xs text-slate-400">
                      No attendance records found for this filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {(list.data?.total ?? 0) > 12 && (
            <div className="flex items-center justify-end gap-2 p-4 border-t border-white/10">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-xl border-white/10 bg-white/5 text-xs"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(list.data?.items.length ?? 0) < 12}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-xl border-white/10 bg-white/5 text-xs"
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    present: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    late: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    absent: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    half_day: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  };

  return (
    <Badge className={`${styles[value] ?? "bg-slate-500/20 text-slate-300"} capitalize text-[11px]`}>
      {value.replace("_", " ")}
    </Badge>
  );
}
