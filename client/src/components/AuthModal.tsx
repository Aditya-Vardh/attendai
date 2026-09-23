import { useAuth } from "@/_core/hooks/useAuth";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { SignIn, useUser } from "@clerk/react";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [, setLocation] = useLocation();
  const { refresh } = useAuth();
  const { isSignedIn } = useUser();
  const [mode, setMode] = useState<"clerk" | "dev">("clerk");
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

  useEffect(() => {
    if (isSignedIn && open) {
      refresh().then(() => {
        onOpenChange(false);
        setLocation("/dashboard");
      });
    }
  }, [isSignedIn, open, refresh, onOpenChange, setLocation]);

  const devLoginMutation = trpc.auth.devLogin.useMutation({
    onSuccess: async (data) => {
      toast.success(`Logged in as ${data.user.name} (${data.user.role})`);
      await refresh();
      onOpenChange(false);
      setLocation("/dashboard");
    },
    onError: (err) => {
      toast.error(`Login failed: ${err.message}`);
      setLoadingRole(null);
    },
  });

  const handleDevLogin = (role: "admin" | "hr_manager" | "employee") => {
    setLoadingRole(role);
    devLoginMutation.mutate({ role });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] p-0 overflow-hidden bg-[#F6F0D7] text-[#364322] shadow-[12px_12px_30px_#D8D2BC,-12px_-12px_30px_#FFFFFF] border-none rounded-[24px] sm:rounded-[30px]">
        <div className="grid md:grid-cols-12 min-h-[520px]">
          {/* Left Panel: Branding & Highlights */}
          <div className="hidden md:flex md:col-span-5 relative flex-col justify-between p-6 lg:p-8 bg-[#C5D89D] text-[#2C3917] overflow-hidden shadow-[inset_4px_4px_10px_#A8BB81,inset_-4px_-4px_10px_#E2F5B9]">
            <div>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#9CAB84] text-lg font-black text-white shadow-[4px_4px_10px_#A8BB81]">
                  A
                </span>
                <div>
                  <span className="text-xl font-bold tracking-tight text-[#2C3917]">AttendAI</span>
                  <span className="ml-2 rounded-full neu-badge-olive px-2.5 py-0.5 text-[10px] font-bold">
                    Clerk Auth Active
                  </span>
                </div>
              </div>

              <div className="mt-6 lg:mt-8">
                <span className="inline-flex items-center gap-1.5 rounded-full neu-badge px-3 py-1 text-xs font-bold text-[#2C3917]">
                  <Sparkles className="h-3.5 w-3.5 text-[#89986D]" /> Workforce Intelligence
                </span>
                <h2 className="mt-4 text-xl lg:text-2xl font-black leading-snug tracking-tight text-[#2C3917]">
                  Workforce clarity, <span className="text-[#89986D]">intelligently</span> delivered.
                </h2>
                <p className="mt-3 text-xs lg:text-sm leading-relaxed text-[#384A1E] font-medium">
                  Log in via Clerk Authentication to access your role-scoped workspace, live attendance logs, and AI workforce copilot.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3 border-t border-[#A8BB81] pt-4">
              <div className="flex items-center gap-3 text-xs text-[#2C3917] font-semibold">
                <CheckCircle2 className="h-4 w-4 text-[#2C3917] shrink-0" />
                <span>Clerk Session Security & Multi-Factor Support</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#2C3917] font-semibold">
                <CheckCircle2 className="h-4 w-4 text-[#2C3917] shrink-0" />
                <span>Automatic Drizzle MySQL Role Mapping</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#2C3917] font-semibold">
                <CheckCircle2 className="h-4 w-4 text-[#2C3917] shrink-0" />
                <span>Neumorphic Soft UI Styled Experience</span>
              </div>
            </div>
          </div>

          {/* Right Panel: Clerk Sign In & Persona Switcher */}
          <div className="col-span-12 md:col-span-7 p-5 sm:p-6 lg:p-8 flex flex-col justify-between bg-[#F6F0D7] max-h-[85vh] overflow-y-auto w-full">
            <div className="w-full">
              {/* Mode Selector Tabs */}
              <div className="flex items-center justify-between mb-6 bg-[#EADFB4]/50 p-1.5 rounded-2xl shadow-[inset_2px_2px_5px_#D8D2BC]">
                <button
                  type="button"
                  onClick={() => setMode("clerk")}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                    mode === "clerk"
                      ? "bg-[#9CAB84] text-white shadow-[3px_3px_8px_#82916B]"
                      : "text-[#5C6B44] hover:text-[#364322]"
                  }`}
                >
                  Clerk Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode("dev")}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                    mode === "dev"
                      ? "bg-[#9CAB84] text-white shadow-[3px_3px_8px_#82916B]"
                      : "text-[#5C6B44] hover:text-[#364322]"
                  }`}
                >
                  Dev Persona Quick Switch
                </button>
              </div>

              {mode === "clerk" ? (
                <div className="flex justify-center w-full my-1">
                  <SignIn
                    fallbackRedirectUrl="/dashboard"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold tracking-tight text-[#364322]">Development Personas</h3>
                    <span className="flex items-center gap-1.5 text-xs text-[#5C6B44] font-medium">
                      <Lock className="h-3.5 w-3.5 text-[#89986D]" /> Local Dev Mode
                    </span>
                  </div>

                  <p className="text-xs text-[#5C6B44] font-medium">
                    Quickly switch persona roles to test role-scoped UI permissions:
                  </p>

                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => handleDevLogin("employee")}
                      disabled={loadingRole !== null}
                      className="w-full flex items-center justify-between p-3.5 neu-button text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#C5D89D] text-[#2C3917] font-bold shadow-[2px_2px_5px_#A8BB81]">
                          <UserCheck className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-bold text-[#364322]">Rahul Sharma</p>
                          <p className="text-xs text-[#5C6B44]">Employee • Senior Engineer</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#89986D] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                        {loadingRole === "employee" ? "Signing in…" : "Enter"} <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDevLogin("hr_manager")}
                      disabled={loadingRole !== null}
                      className="w-full flex items-center justify-between p-3.5 neu-button text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#C5D89D] text-[#2C3917] font-bold shadow-[2px_2px_5px_#A8BB81]">
                          <Bot className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-bold text-[#364322]">Sarah Jenkins</p>
                          <p className="text-xs text-[#5C6B44]">HR Manager • People Ops</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#89986D] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                        {loadingRole === "hr_manager" ? "Signing in…" : "Enter"} <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDevLogin("admin")}
                      disabled={loadingRole !== null}
                      className="w-full flex items-center justify-between p-3.5 neu-button text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#C5D89D] text-[#2C3917] font-bold shadow-[2px_2px_5px_#A8BB81]">
                          <ShieldCheck className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-bold text-[#364322]">Alex Vance</p>
                          <p className="text-xs text-[#5C6B44]">Administrator • Operations VP</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#89986D] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                        {loadingRole === "admin" ? "Signing in…" : "Enter"} <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 text-center text-[11px] text-[#5C6B44] font-medium">
              AttendAI Intelligence Platform • Powered by Clerk Security & tRPC
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

