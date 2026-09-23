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
        <div className="p-8 text-center neu-inset text-[#5C6B44] text-xs font-bold">
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
            <div key={i} className="h-56 animate-pulse rounded-3xl bg-[#D8D2BC]/40" />
          ))
        ) : list.data?.length ? (
          list.data.map((row: any) => (
            <Card
              key={row.department.id}
              className="neu-card neu-card-interactive border-none flex flex-col justify-between"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <span className="grid h-11 w-11 place-items-center neu-badge-sage">
                    <Building2 className="h-5 w-5 text-[#2C3917]" />
                  </span>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(row)}
                      className="text-xs text-[#89986D] hover:text-[#364322] cursor-pointer"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {user?.role === "admin" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteCandidate(row.department)}
                        className="text-xs text-[#D9534F] hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <h3 className="mt-4 text-lg font-bold text-[#364322]">{row.department.name}</h3>
                <p className="text-xs font-mono font-bold uppercase tracking-wider text-[#89986D]">
                  {row.department.code}
                </p>

                <p className="mt-3 text-xs text-[#5C6B44] min-h-[36px] leading-relaxed font-medium">
                  {row.department.description ?? "No description provided."}
                </p>

                <div className="mt-4 pt-4 border-t border-[#D8D2BC]/60 flex items-center justify-between text-xs">
                  <span className="text-[#5C6B44] font-bold">Department Head:</span>
                  <span className="font-bold text-[#89986D]">
                    {row.headEmployeeName ?? "Unassigned"}
                  </span>
                </div>
              </CardContent>

              <div className="border-t border-[#D8D2BC]/60 p-3.5 neu-card-flat flex items-center justify-between text-xs text-[#364322]">
                <span className="flex items-center gap-1.5 font-bold text-[#5C6B44]">
                  <Users className="h-4 w-4 text-[#89986D]" /> Active Headcount
                </span>
                <span className="font-bold text-[#364322] font-mono">{row.employeeCount} Employees</span>
              </div>
            </Card>
          ))
        ) : (
          <div className="md:col-span-2 xl:col-span-3 p-12 text-center neu-inset text-[#5C6B44] text-xs font-bold">
            No departments created yet. Add a department to organize your workforce.
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md border-none bg-[#F6F0D7] text-[#364322] shadow-[12px_12px_30px_#D8D2BC,-12px_-12px_30px_#FFFFFF] rounded-[30px] p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#364322]">
              {editing ? "Update Department" : "Create Department"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-[#364322] font-bold">Department Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Engineering"
                className="neu-input text-xs font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[#364322] font-bold">Department Code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. ENG"
                className="neu-input text-xs font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[#364322] font-bold">Department Head</Label>
              <Select value={headEmployeeId} onValueChange={setHeadEmployeeId}>
                <SelectTrigger className="neu-input text-xs font-bold text-[#364322]">
                  <SelectValue placeholder="Select head" />
                </SelectTrigger>
                <SelectContent className="bg-[#F6F0D7] border-none shadow-[8px_8px_20px_#D8D2BC,-8px_-8px_20px_#FFFFFF] rounded-2xl text-[#364322]">
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
              <Label className="text-[#364322] font-bold">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief department responsibilities…"
                className="neu-input text-xs min-h-[80px] p-3 font-medium"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="neu-button text-xs px-5"
            >
              Cancel
            </Button>
            <Button
              disabled={!name || !code || createMutation.isPending || updateMutation.isPending}
              onClick={handleSave}
              className="neu-button-primary text-xs px-6"
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving…" : "Save Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCandidate} onOpenChange={(v) => !v && setDeleteCandidate(null)}>
        <AlertDialogContent className="max-w-md border-none bg-[#F6F0D7] text-[#364322] shadow-[12px_12px_30px_#D8D2BC,-12px_-12px_30px_#FFFFFF] rounded-[30px] p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-[#364322]">
              Delete {deleteCandidate?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#5C6B44] font-medium">
              This action cannot be undone. Departments with assigned active employees cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="neu-button text-xs px-5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeMutation.mutate({ id: deleteCandidate.id })}
              className="bg-[#D9534F] text-white font-bold text-xs px-5 rounded-2xl shadow-[4px_4px_10px_#D8D2BC]"
            >
              Delete Department
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

