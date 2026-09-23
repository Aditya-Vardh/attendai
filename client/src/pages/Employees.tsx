import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { trpc } from "@/lib/trpc";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  Filter,
  Mail,
  Phone,
  Plus,
  Search,
  Shield,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type EmployeeForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  departmentId: string;
  jobTitle: string;
  joinedOn: string;
  workdayStartMinute: string;
};

const blankForm: EmployeeForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  departmentId: "none",
  jobTitle: "",
  joinedOn: new Date().toISOString().slice(0, 10),
  workdayStartMinute: "540",
};

export default function Employees() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailEmployee, setDetailEmployee] = useState<any>(null);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [form, setForm] = useState<EmployeeForm>(blankForm);

  const isEmployeeRole = user?.role === "employee";

  const departments = trpc.organization.departments.list.useQuery();
  const list = trpc.organization.employees.list.useQuery(
    {
      page,
      pageSize: 9,
      search: search || undefined,
      departmentId: selectedDepartment !== "all" ? Number(selectedDepartment) : undefined,
      status: selectedStatus !== "all" ? (selectedStatus as "active" | "inactive") : undefined,
    },
    { enabled: !isEmployeeRole }
  );

  const utils = trpc.useUtils();

  const createMutation = trpc.organization.employees.create.useMutation({
    onSuccess: () => {
      toast.success("Employee created & initial leave balances allocated.");
      utils.organization.employees.list.invalidate();
      setDialogOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.organization.employees.update.useMutation({
    onSuccess: () => {
      toast.success("Employee profile updated.");
      utils.organization.employees.list.invalidate();
      setDialogOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const setStatusMutation = trpc.organization.employees.setStatus.useMutation({
    onSuccess: () => {
      toast.success("Employee status updated.");
      utils.organization.employees.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditingEmployee(null);
    setForm(blankForm);
    setDialogOpen(true);
  };

  const openEdit = (emp: any) => {
    setEditingEmployee(emp);
    setForm({
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      phone: emp.phone ?? "",
      departmentId: emp.departmentId ? String(emp.departmentId) : "none",
      jobTitle: emp.jobTitle,
      joinedOn: emp.joinedOn,
      workdayStartMinute: String(emp.workdayStartMinute),
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const payload = {
      ...form,
      phone: form.phone || null,
      departmentId: form.departmentId === "none" ? null : Number(form.departmentId),
      workdayStartMinute: Number(form.workdayStartMinute),
    };

    if (editingEmployee) {
      updateMutation.mutate({ ...payload, id: editingEmployee.id });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (isEmployeeRole) {
    return <MyEmployeeWorkspace />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People Operations"
        title="Workforce Directory"
        description="Search, inspect, and manage employee profiles, department assignments, and active statuses across your organization."
        action={{ label: "Add Employee", onClick: openCreate }}
      />

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 neu-card">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-[#89986D]" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, email, or employee code…"
            className="pl-10 neu-input text-xs font-medium"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <Select
            value={selectedDepartment}
            onValueChange={(val) => {
              setSelectedDepartment(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44 neu-input text-xs font-bold text-[#364322]">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent className="bg-[#F6F0D7] border-none shadow-[8px_8px_20px_#D8D2BC,-8px_-8px_20px_#FFFFFF] rounded-2xl text-[#364322]">
              <SelectItem value="all">All Departments</SelectItem>
              {departments.data?.map((dept: any) => (
                <SelectItem key={dept.department.id} value={String(dept.department.id)}>
                  {dept.department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedStatus}
            onValueChange={(val) => {
              setSelectedStatus(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-32 neu-input text-xs font-bold text-[#364322]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent className="bg-[#F6F0D7] border-none shadow-[8px_8px_20px_#D8D2BC,-8px_-8px_20px_#FFFFFF] rounded-2xl text-[#364322]">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <span className="text-xs text-[#5C6B44] font-mono font-bold hidden md:inline">
            {list.data?.total ?? 0} Records
          </span>
        </div>
      </div>

      {/* Workforce Directory Grid Cards */}
      {list.isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-3xl bg-[#D8D2BC]/40" />
          ))}
        </div>
      ) : list.data?.items.length ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {list.data.items.map((row: any) => {
            const emp = row.employee;
            const initials = `${emp.firstName[0]}${emp.lastName[0]}`;
            return (
              <Card
                key={emp.id}
                className="neu-card neu-card-interactive border-none overflow-hidden flex flex-col justify-between"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 bg-[#9CAB84] text-white shadow-[3px_3px_8px_#D8D2BC]">
                        <AvatarImage src={emp.avatarUrl ?? ""} />
                        <AvatarFallback className="bg-[#9CAB84] text-white font-bold text-sm">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-base font-bold text-[#364322]">
                          {emp.firstName} {emp.lastName}
                        </h3>
                        <p className="text-xs text-[#89986D] font-mono font-bold">{emp.employeeCode}</p>
                      </div>
                    </div>

                    <Badge
                      className={
                        emp.status === "active"
                          ? "neu-badge-sage text-[#2C3917] font-bold"
                          : "neu-badge text-[#5C6B44] font-bold"
                      }
                    >
                      {emp.status}
                    </Badge>
                  </div>

                  <div className="mt-5 space-y-2.5 text-xs text-[#364322] border-t border-[#D8D2BC]/60 pt-4">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-[#5C6B44] flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-[#89986D]" /> Job Title:
                      </span>
                      <span className="font-bold text-[#364322]">{emp.jobTitle}</span>
                    </div>

                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-[#5C6B44] flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-[#89986D]" /> Department:
                      </span>
                      <span className="font-bold text-[#364322]">
                        {row.departmentName ?? "Unassigned"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-[#5C6B44] flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-[#89986D]" /> Email:
                      </span>
                      <span className="font-mono text-[#364322] truncate max-w-[180px]">
                        {emp.email}
                      </span>
                    </div>
                  </div>
                </CardContent>

                <div className="border-t border-[#D8D2BC]/60 p-3 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDetailEmployee(row)}
                    className="text-xs font-bold text-[#364322] hover:text-[#89986D] cursor-pointer"
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5 text-[#89986D]" /> View Profile
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(emp)}
                      className="text-xs text-[#89986D] hover:text-[#364322] cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setStatusMutation.mutate({
                          id: emp.id,
                          status: emp.status === "active" ? "inactive" : "active",
                        })
                      }
                      className={
                        emp.status === "active"
                          ? "text-[#D9534F] hover:bg-rose-50 cursor-pointer"
                          : "text-[#89986D] hover:bg-emerald-50 cursor-pointer"
                      }
                    >
                      {emp.status === "active" ? (
                        <UserMinus className="h-3.5 w-3.5" />
                      ) : (
                        <UserPlus className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center neu-inset">
          <p className="text-sm font-bold text-[#5C6B44]">
            No employee profiles match your search criteria.
          </p>
        </div>
      )}

      {/* Pagination */}
      {(list.data?.total ?? 0) > 9 && (
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="neu-button text-xs px-4"
          >
            Previous
          </Button>
          <span className="text-xs font-mono font-bold text-[#5C6B44]">Page {page}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={(list.data?.items.length ?? 0) < 9}
            onClick={() => setPage((p) => p + 1)}
            className="neu-button text-xs px-4"
          >
            Next
          </Button>
        </div>
      )}

      {/* Employee Dialog (Add / Edit) */}
      <EmployeeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        form={form}
        setForm={setForm}
        departments={departments.data ?? []}
        onSubmit={handleSubmit}
        busy={createMutation.isPending || updateMutation.isPending}
        editing={!!editingEmployee}
      />

      {/* Employee Workspace Detail Modal */}
      {detailEmployee && (
        <Dialog open={!!detailEmployee} onOpenChange={() => setDetailEmployee(null)}>
          <DialogContent className="max-w-xl border-none bg-[#F6F0D7] text-[#364322] shadow-[12px_12px_30px_#D8D2BC,-12px_-12px_30px_#FFFFFF] rounded-[30px] p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-3">
                <Avatar className="h-10 w-10 bg-[#9CAB84] text-white">
                  <AvatarImage src={detailEmployee.employee.avatarUrl ?? ""} />
                  <AvatarFallback className="bg-[#9CAB84] text-white font-bold">
                    {detailEmployee.employee.firstName[0]}
                    {detailEmployee.employee.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-[#364322]">
                    {detailEmployee.employee.firstName} {detailEmployee.employee.lastName}
                  </p>
                  <p className="text-xs text-[#89986D] font-mono font-bold">
                    {detailEmployee.employee.employeeCode}
                  </p>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="mt-4 space-y-4 text-xs text-[#364322] border-t border-[#D8D2BC]/60 pt-4">
              <div className="grid grid-cols-2 gap-4 neu-inset p-4">
                <div>
                  <span className="text-[#5C6B44] block font-bold">Job Title</span>
                  <span className="text-sm font-bold text-[#364322]">{detailEmployee.employee.jobTitle}</span>
                </div>
                <div>
                  <span className="text-[#5C6B44] block font-bold">Department</span>
                  <span className="text-sm font-bold text-[#89986D]">
                    {detailEmployee.departmentName ?? "Unassigned"}
                  </span>
                </div>
                <div>
                  <span className="text-[#5C6B44] block font-bold">Email Address</span>
                  <span className="font-mono text-[#364322] font-semibold">{detailEmployee.employee.email}</span>
                </div>
                <div>
                  <span className="text-[#5C6B44] block font-bold">Phone</span>
                  <span className="font-mono text-[#364322] font-semibold">
                    {detailEmployee.employee.phone ?? "Not provided"}
                  </span>
                </div>
                <div>
                  <span className="text-[#5C6B44] block font-bold">Joining Date</span>
                  <span className="font-mono text-[#364322] font-semibold">{detailEmployee.employee.joinedOn}</span>
                </div>
                <div>
                  <span className="text-[#5C6B44] block font-bold">Workday Start</span>
                  <span className="font-mono text-[#364322] font-semibold">
                    {String(Math.floor(detailEmployee.employee.workdayStartMinute / 60)).padStart(2, "0")}
                    :
                    {String(detailEmployee.employee.workdayStartMinute % 60).padStart(2, "0")} AM
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setDetailEmployee(null)}
                className="neu-button text-xs px-5"
              >
                Close Profile Workspace
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function MyEmployeeWorkspace() {
  const me = trpc.organization.employees.me.useQuery();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Personal Workspace"
        title="My Employee Profile"
        description="Your verified organization employee record, placement, and shift schedule."
      />

      <div className="max-w-2xl neu-card p-8 text-[#364322]">
        {me.isLoading ? (
          <p className="text-sm text-[#5C6B44]">Loading your profile record…</p>
        ) : me.data ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4 border-b border-[#D8D2BC]/60 pb-6">
              <Avatar className="h-16 w-16 bg-[#9CAB84] text-white">
                <AvatarImage src={me.data.avatarUrl ?? ""} />
                <AvatarFallback className="bg-[#9CAB84] text-white font-bold text-lg">
                  {me.data.firstName[0]}
                  {me.data.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-bold text-[#364322]">
                  {me.data.firstName} {me.data.lastName}
                </h3>
                <p className="text-xs text-[#89986D] font-mono font-bold">{me.data.employeeCode}</p>
                <p className="text-xs text-[#5C6B44] font-semibold mt-1">{me.data.jobTitle}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ProfileItem label="Work Email" value={me.data.email} />
              <ProfileItem label="Phone" value={me.data.phone ?? "Not provided"} />
              <ProfileItem label="Joining Date" value={me.data.joinedOn} />
              <ProfileItem
                label="Scheduled Start Time"
                value={`${String(Math.floor(me.data.workdayStartMinute / 60)).padStart(2, "0")}:${String(
                  me.data.workdayStartMinute % 60
                ).padStart(2, "0")} AM`}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#5C6B44]">
            Your user account is not linked to an employee record yet.
          </p>
        )}
      </div>
    </div>
  );
}

function ProfileItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 neu-card-flat">
      <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C6B44]">{label}</span>
      <p className="mt-1 text-sm font-bold text-[#364322]">{value}</p>
    </div>
  );
}

function EmployeeDialog({
  open,
  onOpenChange,
  form,
  setForm,
  departments,
  onSubmit,
  busy,
  editing,
}: any) {
  const set = (key: keyof EmployeeForm, value: string) =>
    setForm((curr: EmployeeForm) => ({ ...curr, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-none bg-[#F6F0D7] text-[#364322] shadow-[12px_12px_30px_#D8D2BC,-12px_-12px_30px_#FFFFFF] rounded-[30px] p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#364322]">
            {editing ? "Update Employee Profile" : "Create New Employee"}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#5C6B44] font-medium">
            Server validates input schemas and automatically provisions default leave allocations.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-3 sm:grid-cols-2 text-xs">
          <Field label="First Name" value={form.firstName} onChange={(v) => set("firstName", v)} />
          <Field label="Last Name" value={form.lastName} onChange={(v) => set("lastName", v)} />
          <Field label="Work Email" type="email" value={form.email} onChange={(v) => set("email", v)} />
          <Field label="Phone Number" value={form.phone} onChange={(v) => set("phone", v)} />
          <Field label="Job Title" value={form.jobTitle} onChange={(v) => set("jobTitle", v)} />
          <Field label="Joining Date" type="date" value={form.joinedOn} onChange={(v) => set("joinedOn", v)} />

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#364322]">Department</Label>
            <Select value={form.departmentId} onValueChange={(v) => set("departmentId", v)}>
              <SelectTrigger className="neu-input text-xs font-bold text-[#364322]">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent className="bg-[#F6F0D7] border-none shadow-[8px_8px_20px_#D8D2BC,-8px_-8px_20px_#FFFFFF] rounded-2xl text-[#364322]">
                <SelectItem value="none">Unassigned</SelectItem>
                {departments.map((row: any) => (
                  <SelectItem key={row.department.id} value={String(row.department.id)}>
                    {row.department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Field
            label="Workday Start Minute (e.g. 540 = 09:00 AM)"
            type="number"
            value={form.workdayStartMinute}
            onChange={(v) => set("workdayStartMinute", v)}
          />
        </div>

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="neu-button text-xs px-5"
          >
            Cancel
          </Button>
          <Button
            disabled={busy}
            onClick={onSubmit}
            className="neu-button-primary text-xs px-6"
          >
            {busy ? "Saving…" : editing ? "Save Changes" : "Create Profile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold text-[#364322]">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="neu-input text-xs font-medium"
      />
    </div>
  );
}

