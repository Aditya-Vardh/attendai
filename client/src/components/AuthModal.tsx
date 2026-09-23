import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [, setLocation] = useLocation();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

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

  const handleOAuthLogin = () => {
    onOpenChange(false);
    startLogin();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden border-white/10 bg-[#0B0F19] text-white shadow-[0_25px_70px_rgba(0,0,0,0.7)] backdrop-blur-2xl sm:rounded-3xl">
        <div className="grid md:grid-cols-[1.1fr_1fr]">
          {/* Left Panel: Branding & AI Highlights */}
          <div className="relative flex flex-col justify-between p-8 bg-gradient-to-br from-indigo-950/80 via-slate-900/90 to-[#0B0F19] border-b md:border-b-0 md:border-r border-white/10 overflow-hidden">
            <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />

            <div>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-lg font-black text-white shadow-lg shadow-indigo-500/30">
                  A
                </span>
                <div>
                  <span className="text-xl font-bold tracking-tight">AttendAI</span>
                  <span className="ml-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                    Enterprise
                  </span>
                </div>
              </div>

              <div className="mt-8">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
                  <Sparkles className="h-3.5 w-3.5" /> AI-Powered Intelligence
                </span>
                <h2 className="mt-4 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                  Workforce clarity, <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-cyan-300 bg-clip-text text-transparent">intelligently</span> delivered.
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Log in to access your role-tailored dashboard, real-time attendance signals, leave management, and AI workforce copilot.
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-3 border-t border-white/10 pt-6">
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Deterministic role resolution & RBAC protection</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Encrypted session token with automatic persistence</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Real-time database queries & AI tool permissions</span>
              </div>
            </div>
          </div>

          {/* Right Panel: Authentication Form & Persona Switcher */}
          <div className="p-8 flex flex-col justify-between bg-[#0B0F19]">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold tracking-tight">Sign In</h3>
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Lock className="h-3.5 w-3.5 text-indigo-400" /> Secure SSL
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Select a development persona or continue with SSO.
              </p>

              {/* Dev Persona Quick Switcher */}
              <div className="mt-6 space-y-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                  Development Mode Personas
                </p>

                <button
                  type="button"
                  onClick={() => handleDevLogin("employee")}
                  disabled={loadingRole !== null}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-indigo-500/40 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      <UserCheck className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">Rahul Sharma</p>
                      <p className="text-xs text-slate-400">Employee • Senior Engineer</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-indigo-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    {loadingRole === "employee" ? "Signing in…" : "Enter"} <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDevLogin("hr_manager")}
                  disabled={loadingRole !== null}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-purple-500/40 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      <Bot className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">Sarah Jenkins</p>
                      <p className="text-xs text-slate-400">HR Manager • People Ops</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-purple-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    {loadingRole === "hr_manager" ? "Signing in…" : "Enter"} <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDevLogin("admin")}
                  disabled={loadingRole !== null}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-cyan-500/40 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">Alex Vance</p>
                      <p className="text-xs text-slate-400">Administrator • Operations VP</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-cyan-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    {loadingRole === "admin" ? "Signing in…" : "Enter"} <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </button>
              </div>

              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <span className="relative bg-[#0B0F19] px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Or sign in with OAuth / Email
                </span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">Work Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="pl-9 rounded-xl border-white/10 bg-white/5 text-sm focus:border-indigo-500 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleOAuthLogin}
                  className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/25 h-10"
                >
                  Continue with SSO / OAuth <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-6 text-center text-[11px] text-slate-500">
              AttendAI Intelligence Platform v1.0 • Protected by RBAC & JWT Session Auth
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
