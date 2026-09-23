import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { trpc } from "@/lib/trpc";
import { ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { user, logout, refresh } = useAuth();
  const utils = trpc.useUtils();

  const { data: userList = [], isLoading: loadingUsers } = trpc.organization.users.list.useQuery(
    undefined,
    { enabled: user?.role === "admin" }
  );

  const updateRoleMutation = trpc.organization.users.updateRole.useMutation({
    onSuccess: async (_, variables) => {
      toast.success(`Role updated successfully to ${variables.role}`);
      await utils.organization.users.list.invalidate();
      if (user && user.id === variables.userId) {
        await refresh();
      }
    },
    onError: (err) => {
      toast.error(`Failed to update role: ${err.message}`);
    },
  });

  const handleRoleChange = (userId: number, role: "admin" | "hr_manager" | "employee") => {
    updateRoleMutation.mutate({ userId, role });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & Security"
        description="Manage your account profile, Clerk session security, and workforce access permissions."
      />

      <div className="grid max-w-5xl gap-6">
        {/* Profile Card */}
        <section className="neu-card p-6">
          <h3 className="text-base font-bold text-[#364322] mb-4">Account Profile</h3>
          <div className="grid gap-5 sm:grid-cols-3">
            <Info label="Full Name" value={user?.name ?? "Not available"} />
            <Info label="Email Address" value={user?.email ?? "Not available"} />
            <Info
              label="Access Role"
              value={
                <Badge className="neu-badge-sage font-bold">
                  {user?.role === "hr_manager"
                    ? "HR Manager"
                    : user?.role === "admin"
                    ? "Administrator"
                    : "Employee"}
                </Badge>
              }
            />
          </div>
        </section>

        {/* Admin User Role Management Section */}
        {user?.role === "admin" && (
          <section className="neu-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D8D2BC] pb-4">
              <div>
                <div className="flex items-center gap-2 text-lg font-bold text-[#364322]">
                  <Users className="h-5 w-5 text-[#89986D]" />
                  <span>Workforce User & Role Management</span>
                </div>
                <p className="text-xs text-[#5C6B44] mt-1 font-medium">
                  Promote or change user roles across the organization. Changes apply immediately to tRPC context and role-scoped permissions.
                </p>
              </div>
              <Badge className="neu-badge-olive text-xs font-bold shrink-0 self-start sm:self-center">
                Admin Exclusive Control
              </Badge>
            </div>

            {loadingUsers ? (
              <div className="py-8 text-center text-xs font-semibold text-[#5C6B44]">
                Loading registered users…
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#D8D2BC] text-[#89986D] uppercase tracking-wider font-bold">
                      <th className="py-3 px-3">User</th>
                      <th className="py-3 px-3">Email</th>
                      <th className="py-3 px-3">Current Role</th>
                      <th className="py-3 px-3 text-right">Promote / Change Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D8D2BC]/50">
                    {userList.map((u) => (
                      <tr key={u.id} className="hover:bg-[#C5D89D]/20 transition-colors">
                        <td className="py-3 px-3 font-bold text-[#364322]">
                          {u.name || "Unnamed User"}
                        </td>
                        <td className="py-3 px-3 text-[#5C6B44] font-mono">{u.email || "No email"}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.role === "admin"
                                ? "neu-badge-olive"
                                : u.role === "hr_manager"
                                ? "neu-badge-sage"
                                : "neu-badge"
                            }`}
                          >
                            {u.role === "hr_manager" ? "HR Manager" : u.role === "admin" ? "Admin" : "Employee"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex items-center gap-1.5 bg-[#EADFB4]/40 p-1 rounded-xl shadow-[inset_2px_2px_4px_#D8D2BC]">
                            <button
                              type="button"
                              onClick={() => handleRoleChange(u.id, "employee")}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                                u.role === "employee"
                                  ? "bg-[#9CAB84] text-white shadow-[2px_2px_5px_#82916B]"
                                  : "text-[#5C6B44] hover:text-[#364322]"
                              }`}
                            >
                              Employee
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRoleChange(u.id, "hr_manager")}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                                u.role === "hr_manager"
                                  ? "bg-[#9CAB84] text-white shadow-[2px_2px_5px_#82916B]"
                                  : "text-[#5C6B44] hover:text-[#364322]"
                              }`}
                            >
                              HR Manager
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRoleChange(u.id, "admin")}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                                u.role === "admin"
                                  ? "bg-[#9CAB84] text-white shadow-[2px_2px_5px_#82916B]"
                                  : "text-[#5C6B44] hover:text-[#364322]"
                              }`}
                            >
                              Admin
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Session Security Card */}
        <section className="neu-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-[#364322]">
                <ShieldCheck className="h-4 w-4 text-[#89986D]" /> Session Security
              </div>
              <p className="mt-2 text-xs text-[#5C6B44] font-medium leading-relaxed">
                Your authentication session is backed by Clerk Security and tRPC context. Signing out will end your session and clear active cookies.
              </p>
            </div>
            <Button
              onClick={logout}
              className="shrink-0 neu-button-sage text-xs font-bold"
            >
              Sign Out Session
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#89986D]">{label}</p>
      <div className="mt-1 text-sm font-bold text-[#364322]">{value}</div>
    </div>
  );
}
