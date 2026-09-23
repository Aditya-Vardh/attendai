import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/PageHeader";
import { trpc } from "@/lib/trpc";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  FileClock,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Leave() {
  const { user } = useAuth();
  const [openRequestModal, setOpenRequestModal] = useState(false);
  const [leaveType, setLeaveType] = useState<"annual" | "sick" | "unpaid">("annual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const [decisionTarget, setDecisionTarget] = useState<any>(null);
  const [decisionReason, setDecisionReason] = useState("");

  const isEmployee = user?.role === "employee";

  const list = trpc.leave.list.useQuery({ page: 1, pageSize: 30 });
  const balances = trpc.leave.balances.useQuery(undefined, { enabled: isEmployee });
  const utils = trpc.useUtils();

  const requestMutation = trpc.leave.request.useMutation({
    onSuccess: () => {
      toast.success("Leave request submitted for review.");
      utils.leave.list.invalidate();
      if (balances.refetch) balances.refetch();
      setOpenRequestModal(false);
      setStartDate("");
      setEndDate("");
      setReason("");
    },
    onError: (e) => toast.error(e.message),
  });

  const decideMutation = trpc.leave.decide.useMutation({
    onSuccess: () => {
      toast.success("Leave decision recorded and employee notified.");
      utils.leave.list.invalidate();
      setDecisionTarget(null);
      setDecisionReason("");
    },
    onError: (e) => toast.error(e.message),
  });

  const cancelMutation = trpc.leave.cancel.useMutation({
    onSuccess: () => {
      toast.success("Leave request cancelled.");
      utils.leave.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmitRequest = () => {
    requestMutation.mutate({
      leaveType,
      startDate,
      endDate,
      reason,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Leave Management"
        title={isEmployee ? "My Leave Workspace" : "Leave Approval Workspace"}
        description={
          isEmployee
            ? "Submit leave applications, track real-time approval status, and monitor remaining leave balances."
            : "Review pending workforce leave applications, verify allocated balances, and record reasoned approval decisions."
        }
        action={
          isEmployee
            ? { label: "Request Leave", onClick: () => setOpenRequestModal(true) }
            : undefined
        }
      />

      {/* Leave Balances Grid for Employees */}
      {isEmployee && (
        <div className="grid gap-4 sm:grid-cols-3">
          {balances.data?.map((b: any) => {
            const remaining = b.allocatedDays - b.usedDays;
            return (
              <Card key={b.id} className="glass-card border-white/10">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {b.leaveType} Leave
                    </span>
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-500/10 text-indigo-400">
                      <CalendarDays className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-3 text-3xl font-black text-white">
                    {remaining} <span className="text-xs text-slate-400 font-normal">Days Left</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {b.usedDays} used of {b.allocatedDays} allocated
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Leave Requests Table */}
      <Card className="glass-card border-white/10">
        <CardContent className="p-0">
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-purple-500/20 text-purple-300">
                <FileClock className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-white">Leave Application Timeline</h3>
                <p className="text-xs text-slate-400">Auditable request timeline and manager decision notes</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-white/5 text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Employee</th>
                  <th className="px-5 py-3 font-semibold">Leave Type</th>
                  <th className="px-5 py-3 font-semibold">Duration</th>
                  <th className="px-5 py-3 font-semibold">Reason</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {list.isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      Loading leave applications…
                    </td>
                  </tr>
                ) : list.data?.items.length ? (
                  list.data.items.map((row: any) => (
                    <tr key={row.request.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-5 py-4 font-bold text-white">
                        {row.employee.firstName} {row.employee.lastName}
                      </td>
                      <td className="px-5 py-4 capitalize font-medium text-indigo-300">
                        {row.request.leaveType}
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-300">
                        {row.request.startDate} → {row.request.endDate}
                      </td>
                      <td className="px-5 py-4 max-w-xs truncate text-slate-400">
                        {row.request.reason}
                      </td>
                      <td className="px-5 py-4">
                        <LeaveStatusBadge value={row.request.status} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        {!isEmployee && row.request.status === "pending" ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              setDecisionTarget(row.request);
                              setDecisionReason("");
                            }}
                            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3"
                          >
                            Review Request
                          </Button>
                        ) : isEmployee && row.request.status === "pending" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancelMutation.mutate({ id: row.request.id })}
                            className="text-rose-400 hover:text-rose-300 text-xs"
                          >
                            Cancel
                          </Button>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No leave requests recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Request Leave Dialog */}
      <Dialog open={openRequestModal} onOpenChange={setOpenRequestModal}>
        <DialogContent className="max-w-md border-white/10 bg-[#0B0F19] text-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Submit Leave Request</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Applications are automatically routed to HR Managers for review.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-slate-300">Leave Type</Label>
              <Select value={leaveType} onValueChange={(val: any) => setLeaveType(val)}>
                <SelectTrigger className="rounded-xl border-white/10 bg-white/5 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual Leave</SelectItem>
                  <SelectItem value="sick">Sick Leave</SelectItem>
                  <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-xl border-white/10 bg-white/5 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-xl border-white/10 bg-white/5 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300">Reason / Explanation</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain the purpose of this leave request for your manager…"
                className="rounded-xl border-white/10 bg-white/5 text-xs min-h-[90px]"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setOpenRequestModal(false)}
              className="rounded-xl border-white/10 bg-white/5 text-xs"
            >
              Cancel
            </Button>
            <Button
              disabled={!startDate || !endDate || reason.length < 5 || requestMutation.isPending}
              onClick={handleSubmitRequest}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5"
            >
              {requestMutation.isPending ? "Submitting…" : "Submit Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review & Decide Dialog */}
      <Dialog open={!!decisionTarget} onOpenChange={() => setDecisionTarget(null)}>
        <DialogContent className="max-w-md border-white/10 bg-[#0B0F19] text-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Review Leave Application</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Provide a decision reason. The employee will receive an instant in-app notification.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
              <p className="font-bold text-white">{decisionTarget?.reason}</p>
              <p className="text-[11px] text-slate-400">
                {decisionTarget?.startDate} to {decisionTarget?.endDate} • {decisionTarget?.leaveType}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300">Decision Explanation</Label>
              <Textarea
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder="e.g. Approved based on available annual leave balance."
                className="rounded-xl border-white/10 bg-white/5 text-xs min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter className="mt-4 flex gap-2">
            <Button
              variant="outline"
              disabled={decisionReason.length < 3 || decideMutation.isPending}
              onClick={() =>
                decideMutation.mutate({
                  id: decisionTarget.id,
                  decision: "rejected",
                  reason: decisionReason,
                })
              }
              className="rounded-xl border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs flex-1"
            >
              <X className="mr-1 h-3.5 w-3.5" /> Reject Request
            </Button>

            <Button
              disabled={decisionReason.length < 3 || decideMutation.isPending}
              onClick={() =>
                decideMutation.mutate({
                  id: decisionTarget.id,
                  decision: "approved",
                  reason: decisionReason,
                })
              }
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex-1"
            >
              <Check className="mr-1 h-3.5 w-3.5" /> Approve Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LeaveStatusBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    approved: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    rejected: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    cancelled: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  };

  return (
    <Badge className={`${styles[value] ?? "bg-slate-500/20 text-slate-300"} capitalize text-[11px]`}>
      {value}
    </Badge>
  );
}
