import { useAuth } from "@/_core/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import { Building2, Pencil, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Departments() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<any>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [headEmployeeId, setHeadEmployeeId] = useState("none");

  const list = trpc.organization.departments.list.useQuery();
  const employees = trpc.organization.employees.list.useQuery(
    { page: 1, pageSize: 100, status: "active" },
    { enabled: user?.role !== "employee" }
  );

  const utils = trpc.useUtils();

  const createMutation = trpc.organization.departments.create.useMutation({
    onSuccess: () => {
      toast.success("Department created.");
      utils.organization.departments.list.invalidate();
      setOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.organization.departments.update.useMutation({
    onSuccess: () => {
      toast.success("Department updated.");
      utils.organization.departments.list.invalidate();
      setOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMutation = trpc.organization.departments.remove.useMutation({
    onSuccess: () => {
      toast.success("Department removed.");
      utils.organization.departments.list.invalidate();
      setDeleteCandidate(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleEdit = (row?: any) => {
    const dept = row?.department;
    setEditing(dept ?? null);
    setName(dept?.name ?? "");
    setCode(dept?.code ?? "");
    setDescription(dept?.description ?? "");
    setHeadEmployeeId(dept?.headEmployeeId ? String(dept.headEmployeeId) : "none");
    setOpen(true);
  };

  const handleSave = () => {
    const payload = {
      name,
      code,
      description: description || null,
      headEmployeeId: headEmployeeId === "none" ? null : Number(headEmployeeId),
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (user?.role === "employee") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Departments"
          title="Department Operations"
          description="Department management is reserved for HR Managers and Administrators."
        />
        <div className="p-8 text-center rounded-3xl border border-white/10 bg-slate-900/40 text-slate-400 text-xs">
          You do not have administrative permissions for department configuration.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Organization Structure"
        title="Departments"
        description="Configure organizational units, assign department leaders, and inspect department headcount."
        action={{ label: "Add Department", onClick: () => handleEdit() }}
      />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {list.isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-3xl bg-white/5" />
          ))
        ) : list.data?.length ? (
          list.data.map((row: any) => (
            <Card
              key={row.department.id}
              className="glass-card glass-card-interactive border-white/10 flex flex-col justify-between"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    <Building2 className="h-5 w-5" />
                  </span>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(row)}
                      className="text-xs text-indigo-300 hover:text-white"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {user?.role === "admin" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteCandidate(row.department)}
                        className="text-xs text-rose-400 hover:text-rose-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <h3 className="mt-4 text-lg font-bold text-white">{row.department.name}</h3>
                <p className="text-xs font-mono font-semibold uppercase tracking-wider text-indigo-400">
                  {row.department.code}
                </p>

                <p className="mt-3 text-xs text-slate-300 min-h-[36px] leading-relaxed">
                  {row.department.description ?? "No description provided."}
                </p>

                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Department Head:</span>
                  <span className="font-semibold text-indigo-300">
                    {row.headEmployeeName ?? "Unassigned"}
                  </span>
                </div>
              </CardContent>

              <div className="border-t border-white/10 p-3.5 bg-white/5 flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <Users className="h-4 w-4 text-cyan-400" /> Active Headcount
                </span>
                <span className="font-bold text-white font-mono">{row.employeeCount} Employees</span>
              </div>
            </Card>
          ))
        ) : (
          <div className="md:col-span-2 xl:col-span-3 p-12 text-center rounded-3xl border border-dashed border-white/10 bg-slate-900/40 text-slate-400 text-xs">
            No departments created yet. Add a department to organize your workforce.
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md border-white/10 bg-[#0B0F19] text-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editing ? "Update Department" : "Create Department"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-slate-300">Department Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Engineering"
                className="rounded-xl border-white/10 bg-white/5 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300">Department Code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. ENG"
                className="rounded-xl border-white/10 bg-white/5 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300">Department Head</Label>
              <Select value={headEmployeeId} onValueChange={setHeadEmployeeId}>
                <SelectTrigger className="rounded-xl border-white/10 bg-white/5 text-xs">
                  <SelectValue placeholder="Select head" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Head Assigned</SelectItem>
                  {employees.data?.items.map((item: any) => (
                    <SelectItem key={item.employee.id} value={String(item.employee.id)}>
                      {item.employee.firstName} {item.employee.lastName} • {item.employee.jobTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief department responsibilities…"
                className="rounded-xl border-white/10 bg-white/5 text-xs min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-xl border-white/10 bg-white/5 text-xs"
            >
              Cancel
            </Button>
            <Button
              disabled={!name || !code || createMutation.isPending || updateMutation.isPending}
              onClick={handleSave}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5"
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving…" : "Save Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCandidate} onOpenChange={(v) => !v && setDeleteCandidate(null)}>
        <AlertDialogContent className="max-w-md border-white/10 bg-[#0B0F19] text-white rounded-3xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">
              Delete {deleteCandidate?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-400">
              This action cannot be undone. Departments with assigned active employees cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="rounded-xl border-white/10 bg-white/5 text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeMutation.mutate({ id: deleteCandidate.id })}
              className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs px-5"
            >
              Delete Department
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
