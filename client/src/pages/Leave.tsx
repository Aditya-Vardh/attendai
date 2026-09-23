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
              <Card key={b.id} className="neu-card border-none">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#5C6B44]">
                      {b.leaveType} Leave
                    </span>
                    <span className="grid h-9 w-9 place-items-center neu-badge-sage">
                      <CalendarDays className="h-4 w-4 text-[#2C3917]" />
                    </span>
                  </div>
                  <p className="mt-3 text-3xl font-black text-[#364322]">
                    {remaining} <span className="text-xs text-[#5C6B44] font-bold">Days Left</span>
                  </p>
                  <p className="mt-1 text-xs text-[#89986D] font-bold">
                    {b.usedDays} used of {b.allocatedDays} allocated
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Leave Requests Table */}
      <Card className="neu-card border-none">
        <CardContent className="p-0">
          <div className="p-5 border-b border-[#D8D2BC]/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center neu-badge-sage">
                <FileClock className="h-4 w-4 text-[#2C3917]" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-[#364322]">Leave Application Timeline</h3>
                <p className="text-xs text-[#5C6B44]">Auditable request timeline and manager decision notes</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#D8D2BC]/60 neu-card-flat text-[#5C6B44]">
                <tr>
                  <th className="px-5 py-3.5 font-bold">Employee</th>
                  <th className="px-5 py-3.5 font-bold">Leave Type</th>
                  <th className="px-5 py-3.5 font-bold">Duration</th>
                  <th className="px-5 py-3.5 font-bold">Reason</th>
                  <th className="px-5 py-3.5 font-bold">Status</th>
                  <th className="px-5 py-3.5 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8D2BC]/40 text-[#364322]">
                {list.isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[#5C6B44] font-medium">
                      Loading leave applications…
                    </td>
                  </tr>
                ) : list.data?.items.length ? (
                  list.data.items.map((row: any) => (
                    <tr key={row.request.id} className="hover:bg-[#C5D89D]/20 transition-colors">
                      <td className="px-5 py-4 font-bold text-[#364322]">
                        {row.employee.firstName} {row.employee.lastName}
                      </td>
                      <td className="px-5 py-4 capitalize font-bold text-[#89986D]">
                        {row.request.leaveType}
                      </td>
                      <td className="px-5 py-4 font-mono font-semibold text-[#364322]">
                        {row.request.startDate} → {row.request.endDate}
                      </td>
                      <td className="px-5 py-4 max-w-xs truncate text-[#5C6B44] font-medium">
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
                            className="neu-button-primary text-xs px-4 h-9 py-1"
                          >
                            Review Request
                          </Button>
                        ) : isEmployee && row.request.status === "pending" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancelMutation.mutate({ id: row.request.id })}
                            className="text-[#D9534F] hover:bg-rose-50 text-xs font-bold cursor-pointer"
                          >
                            Cancel
                          </Button>
                        ) : (
                          <span className="text-[#5C6B44] font-bold">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[#5C6B44] font-medium">
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
        <DialogContent className="max-w-md border-none bg-[#F6F0D7] text-[#364322] shadow-[12px_12px_30px_#D8D2BC,-12px_-12px_30px_#FFFFFF] rounded-[30px] p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#364322]">Submit Leave Request</DialogTitle>
            <DialogDescription className="text-xs text-[#5C6B44] font-medium">
              Applications are automatically routed to HR Managers for review.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-[#364322] font-bold">Leave Type</Label>
              <Select value={leaveType} onValueChange={(val: any) => setLeaveType(val)}>
                <SelectTrigger className="neu-input text-xs font-bold text-[#364322]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#F6F0D7] border-none shadow-[8px_8px_20px_#D8D2BC,-8px_-8px_20px_#FFFFFF] rounded-2xl text-[#364322]">
                  <SelectItem value="annual">Annual Leave</SelectItem>
                  <SelectItem value="sick">Sick Leave</SelectItem>
                  <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[#364322] font-bold">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="neu-input text-xs font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[#364322] font-bold">End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="neu-input text-xs font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[#364322] font-bold">Reason / Explanation</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain the purpose of this leave request for your manager…"
                className="neu-input text-xs min-h-[90px] p-3 font-medium"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setOpenRequestModal(false)}
              className="neu-button text-xs px-5"
            >
              Cancel
            </Button>
            <Button
              disabled={!startDate || !endDate || reason.length < 5 || requestMutation.isPending}
              onClick={handleSubmitRequest}
              className="neu-button-primary text-xs px-6"
            >
              {requestMutation.isPending ? "Submitting…" : "Submit Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review & Decide Dialog */}
      <Dialog open={!!decisionTarget} onOpenChange={() => setDecisionTarget(null)}>
        <DialogContent className="max-w-md border-none bg-[#F6F0D7] text-[#364322] shadow-[12px_12px_30px_#D8D2BC,-12px_-12px_30px_#FFFFFF] rounded-[30px] p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#364322]">Review Leave Application</DialogTitle>
            <DialogDescription className="text-xs text-[#5C6B44] font-medium">
              Provide a decision reason. The employee will receive an instant in-app notification.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div className="p-3.5 neu-inset space-y-1">
              <p className="font-bold text-[#364322]">{decisionTarget?.reason}</p>
              <p className="text-[11px] text-[#5C6B44] font-semibold">
                {decisionTarget?.startDate} to {decisionTarget?.endDate} • {decisionTarget?.leaveType}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[#364322] font-bold">Decision Explanation</Label>
              <Textarea
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder="e.g. Approved based on available annual leave balance."
                className="neu-input text-xs min-h-[80px] p-3 font-medium"
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
              className="neu-button text-[#D9534F] text-xs flex-1"
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
              className="neu-button-primary text-xs flex-1"
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
    pending: "neu-badge text-[#364322] font-bold",
    approved: "neu-badge-olive text-white font-bold",
    rejected: "bg-[#D9534F] text-white font-bold",
    cancelled: "neu-badge text-[#5C6B44] font-bold",
  };

  return (
    <Badge className={`${styles[value] ?? "neu-badge text-[#364322]"} capitalize text-[11px] px-3 py-0.5`}>
      {value}
    </Badge>
  );
}

