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
import { QrCameraScanner } from "@/components/QrCameraScanner";
import { FaceCheckInWidget } from "@/components/FaceCheckInWidget";
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

  const [geoState, setGeoState] = useState<"idle" | "locating" | "outside" | "denied" | "error">("idle");
  const [geoInfo, setGeoInfo] = useState<{ distanceM: number; radiusM: number } | null>(null);
  const [qrInput, setQrInput] = useState("");
  const [activeTab, setActiveTab] = useState<"geo" | "qr" | "face">("geo");
  const [showManualQr, setShowManualQr] = useState(false);

  const clockInWithQr = trpc.attendance.clockInWithQr.useMutation({
    onSuccess: () => {
      toast.success("✓ Checked in via QR code.");
      setQrInput("");
      today.refetch();
      utils.attendance.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

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
        <div className="neu-card p-7 text-[#364322]">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 neu-badge-sage px-3.5 py-1 text-xs font-bold">
                <Clock className="h-3.5 w-3.5 text-[#2C3917]" /> Attendance Clocking Station
              </span>
              <h2 className="text-2xl font-black text-[#364322] sm:text-3xl">
                {today.data?.checkOutAt
                  ? "Workday Shift Completed"
                  : today.data?.checkInAt
                  ? "Currently Clocked In"
                  : "Not Clocked In Today"}
              </h2>
              <p className="text-xs text-[#5C6B44] font-medium">
                {today.data?.checkInAt
                  ? `Check-in recorded at ${new Date(today.data.checkInAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : "Use geolocation or QR code to record your arrival."}
              </p>
            </div>

            <div className="flex flex-col gap-3 neu-inset p-5 min-w-[280px]">
              {today.data?.checkInAt && !today.data?.checkOutAt && (
                <div className="text-center pb-3 border-b border-[#D8D2BC]">
                  <span className="text-[10px] font-bold uppercase text-[#89986D]">Working Duration</span>
                  <p className="text-2xl font-black text-[#364322] font-mono">{elapsed}</p>
                </div>
              )}

              {!today.data?.checkInAt && (
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
                          className="w-full neu-button-primary px-8 h-11 text-sm font-bold"
                        >
                          <LogIn className="mr-2 h-4 w-4" />
                          {clockIn.isPending ? "Checking in…" : "Check In"}
                        </Button>
                      )}
                      {geoState === "locating" && (
                        <div className="flex items-center justify-center gap-2 h-11 text-sm font-bold text-[#5C6B44]">
                          <div className="h-4 w-4 rounded-full border-2 border-[#9CAB84] border-t-transparent animate-spin" />
                          Verifying KLH Campus location…
                        </div>
                      )}
                      {geoState === "outside" && geoInfo && (
                        <div className="space-y-2">
                          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 font-semibold text-center">
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
                          className="w-full neu-button-primary px-8 h-11 text-sm font-bold"
                        >
                          Retry Location Check
                        </Button>
                      )}
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
                            className="w-full rounded-xl bg-[#F6F0D7] border-none shadow-[inset_3px_3px_7px_#D8D2BC,inset_-3px_-3px_7px_#FFFFFF] px-4 py-2 text-xs font-mono text-[#364322] placeholder:text-[#89986D] focus:outline-none"
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
                        today.refetch();
                        utils.attendance.list.invalidate();
                      }}
                    />
                  )}
                </>
              )}

              {today.data?.checkInAt && !today.data?.checkOutAt && (
                <Button
                  onClick={() => clockOut.mutate()}
                  disabled={clockOut.isPending}
                  className="neu-button px-6 h-11 text-sm text-[#D9534F]"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {clockOut.isPending ? "Checking out…" : "Check Out"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attendance Calendar Heatmap Strip */}
      <Card className="neu-card border-none">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#89986D]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#364322]">
                14-Day Attendance Heatmap
              </h3>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold text-[#5C6B44]">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-[#9CAB84]" /> Present</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-[#C5D89D]" /> Late</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-[#D9534F]" /> Absent</span>
            </div>
          </div>

          <div className="grid grid-cols-7 sm:grid-cols-14 gap-2">
            {(list.data?.items ?? []).slice(0, 14).map((item: any, idx: number) => {
              const status = item.attendance.status;
              const colorClass =
                status === "present"
                  ? "neu-badge-olive text-white"
                  : status === "late"
                  ? "neu-badge-sage text-[#2C3917]"
                  : status === "absent"
                  ? "bg-[#D9534F] text-white"
                  : "neu-badge text-[#364322]";

              return (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl text-center font-mono text-[10px] space-y-1 shadow-[3px_3px_8px_#D8D2BC,-3px_-3px_8px_#FFFFFF] ${colorClass}`}
                >
                  <p className="font-bold">{item.attendance.workDate.slice(5)}</p>
                  <p className="capitalize text-[9px] font-sans font-bold opacity-90">{status.replace("_", " ")}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      <Card className="neu-card border-none">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 border-b border-[#D8D2BC]/60">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center neu-badge-sage">
                <CalendarClock className="h-4 w-4 text-[#2C3917]" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-[#364322]">Attendance Log</h3>
                <p className="text-xs text-[#5C6B44]">Database attendance records and timestamps</p>
              </div>
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40 neu-input text-xs font-bold text-[#364322]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="bg-[#F6F0D7] border-none shadow-[8px_8px_20px_#D8D2BC,-8px_-8px_20px_#FFFFFF] rounded-2xl text-[#364322]">
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
                <TableRow className="border-[#D8D2BC]/40 hover:bg-transparent">
                  <TableHead className="text-[#5C6B44] font-bold text-xs">Date</TableHead>
                  <TableHead className="text-[#5C6B44] font-bold text-xs">Employee</TableHead>
                  <TableHead className="text-[#5C6B44] font-bold text-xs">Check In</TableHead>
                  <TableHead className="text-[#5C6B44] font-bold text-xs">Check Out</TableHead>
                  <TableHead className="text-[#5C6B44] font-bold text-xs">Working Hours</TableHead>
                  <TableHead className="text-[#5C6B44] font-bold text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-xs text-[#5C6B44]">
                      Loading attendance records…
                    </TableCell>
                  </TableRow>
                ) : list.data?.items.length ? (
                  list.data.items.map((row: any) => (
                    <TableRow key={row.attendance.id} className="border-[#D8D2BC]/30 hover:bg-[#C5D89D]/20">
                      <TableCell className="font-mono text-xs text-[#364322] font-bold">
                        {row.attendance.workDate}
                      </TableCell>
                      <TableCell>
                        <p className="text-xs font-bold text-[#364322]">
                          {row.employee.firstName} {row.employee.lastName}
                        </p>
                        <p className="text-[11px] text-[#5C6B44] font-medium">{row.departmentName ?? "Unassigned"}</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-[#364322] font-semibold">
                        {row.attendance.checkInAt
                          ? new Date(row.attendance.checkInAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-[#364322] font-semibold">
                        {row.attendance.checkOutAt
                          ? new Date(row.attendance.checkOutAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-[#364322] font-semibold">
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
                    <TableCell colSpan={6} className="h-32 text-center text-xs text-[#5C6B44]">
                      No attendance records found for this filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {(list.data?.total ?? 0) > 12 && (
            <div className="flex items-center justify-end gap-2 p-4 border-t border-[#D8D2BC]/60">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="neu-button text-xs px-4"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(list.data?.items.length ?? 0) < 12}
                onClick={() => setPage((p) => p + 1)}
                className="neu-button text-xs px-4"
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
    present: "neu-badge-olive text-white font-bold",
    late: "neu-badge-sage text-[#2C3917] font-bold",
    absent: "bg-[#D9534F] text-white font-bold",
    half_day: "neu-badge text-[#364322] font-bold",
  };

  return (
    <Badge className={`${styles[value] ?? "neu-badge text-[#364322]"} capitalize text-[11px] px-3 py-0.5`}>
      {value.replace("_", " ")}
    </Badge>
  );
}

