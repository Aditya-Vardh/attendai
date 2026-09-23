import { useAuth } from "@/_core/hooks/useAuth";
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
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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

  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    if (isSignedIn && open) {
      refresh().then(() => {
        onOpenChange(false);
        setLocation("/dashboard");
      });
    }
  }, [isSignedIn, open, refresh, onOpenChange, setLocation]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

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

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#364322]/40 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal Panel */}
      <div
        className="relative z-10 flex rounded-[28px] overflow-hidden bg-[#F6F0D7] shadow-[16px_16px_40px_#C8C2AA,-8px_-8px_30px_#FFFFFF]"
        style={{ maxHeight: "92vh", maxWidth: "min(900px, 95vw)", width: "900px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Left branding panel ── */}
        <div
          className="hidden md:flex flex-col justify-between bg-[#C5D89D] text-[#2C3917] shadow-[inset_4px_4px_10px_#A8BB81,inset_-4px_-4px_10px_#E2F5B9]"
          style={{ width: "340px", flexShrink: 0, padding: "32px 28px" }}
        >
          {/* Logo */}
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#9CAB84] text-lg font-black text-white shadow-[4px_4px_10px_#82916B]">
                A
              </span>
              <div>
                <span className="text-xl font-bold tracking-tight text-[#2C3917]">AttendAI</span>
                <span className="ml-2 inline-block rounded-full bg-[#9CAB84] px-2.5 py-0.5 text-[10px] font-bold text-white shadow-[2px_2px_5px_#82916B]">
                  Clerk Auth Active
                </span>
              </div>
            </div>

            <div className="mt-8">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F6F0D7]/60 px-3 py-1 text-xs font-bold text-[#2C3917] shadow-[2px_2px_5px_#A8BB81]">
                <Sparkles className="h-3.5 w-3.5 text-[#89986D]" /> Workforce Intelligence
              </span>
              <h2 className="mt-4 text-2xl font-black leading-snug tracking-tight text-[#2C3917]">
                Workforce clarity,{" "}
                <span className="text-[#89986D]">intelligently</span> delivered.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[#384A1E] font-medium">
                Log in via Clerk to access your role-scoped workspace, live attendance logs, and AI workforce copilot.
              </p>
            </div>
          </div>

          {/* Feature bullets */}
          <div className="space-y-3 border-t border-[#A8BB81] pt-5 mt-6">
            {[
              "Clerk Session Security & Multi-Factor",
              "Automatic MySQL Role Mapping",
              "Neumorphic Soft UI Experience",
            ].map((text) => (
              <div key={text} className="flex items-center gap-3 text-xs text-[#2C3917] font-semibold">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right panel: Sign In / Dev ── */}
        <div
          className="flex flex-col bg-[#F6F0D7]"
          style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "28px 28px 24px" }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-full bg-[#F6F0D7] text-[#5C6B44] shadow-[3px_3px_8px_#D8D2BC,-3px_-3px_8px_#FFFFFF] hover:text-[#364322] transition-colors cursor-pointer z-10"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Mode tabs */}
          <div className="flex items-center mb-5 bg-[#EADFB4]/50 p-1.5 rounded-2xl shadow-[inset_2px_2px_5px_#D8D2BC]">
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
            /* Let Clerk render at its natural width — no centering wrapper that constrains it */
            <div className="w-full">
              <SignIn fallbackRedirectUrl="/dashboard" />
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
                {[
                  { role: "employee" as const, name: "Rahul Sharma", title: "Employee • Senior Engineer", Icon: UserCheck },
                  { role: "hr_manager" as const, name: "Sarah Jenkins", title: "HR Manager • People Ops", Icon: Bot },
                  { role: "admin" as const, name: "Alex Vance", title: "Administrator • Operations VP", Icon: ShieldCheck },
                ].map(({ role, name, title, Icon }) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleDevLogin(role)}
                    disabled={loadingRole !== null}
                    className="w-full flex items-center justify-between p-3.5 bg-[#F6F0D7] rounded-2xl shadow-[6px_6px_14px_#D8D2BC,-6px_-6px_14px_#FFFFFF] text-left group cursor-pointer hover:shadow-[8px_8px_18px_#D8D2BC,-8px_-8px_18px_#FFFFFF] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#C5D89D] text-[#2C3917] font-bold shadow-[2px_2px_5px_#A8BB81]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-[#364322]">{name}</p>
                        <p className="text-xs text-[#5C6B44]">{title}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#89986D] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      {loadingRole === role ? "Signing in…" : "Enter"} <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 text-center text-[11px] text-[#5C6B44] font-medium">
            AttendAI Intelligence Platform • Powered by Clerk Security & tRPC
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
