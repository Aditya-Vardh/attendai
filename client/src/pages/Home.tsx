import { useAuth } from "@/_core/hooks/useAuth";
import { AuthModal } from "@/components/AuthModal";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  BrainCircuit,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Cpu,
  FileBarChart,
  Layers,
  Lock,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Home({ initialAuthOpen = false }: { initialAuthOpen?: boolean }) {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const [authOpen, setAuthOpen] = useState(initialAuthOpen);

  const handleAction = () => {
    if (isAuthenticated) {
      setLocation("/dashboard");
    } else {
      setLocation("/register");
      setAuthOpen(true);
    }
  };

  const handleSignIn = () => {
    if (isAuthenticated) {
      setLocation("/dashboard");
    } else {
      setLocation("/login");
      setAuthOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F0D7] text-[#364322] overflow-x-hidden relative">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-40 bg-[#F6F0D7]/90 backdrop-blur-md border-b border-[#D8D2BC]/40 shadow-[0_4px_16px_#D8D2BC]">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <button onClick={() => setLocation("/")} className="flex items-center gap-3 group text-left cursor-pointer">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#9CAB84] text-xl font-black text-white shadow-[4px_4px_10px_#D8D2BC,-4px_-4px_10px_#FFFFFF]">
              A
            </span>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-[#364322]">
                AttendAI
              </span>
              <span className="block text-[10px] uppercase font-bold tracking-widest text-[#89986D]">
                Workforce Intelligence
              </span>
            </div>
          </button>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#4A5833]">
            <a href="#platform" className="hover:text-[#364322] transition-colors">Platform</a>
            <a href="#experiences" className="hover:text-[#364322] transition-colors">Experiences</a>
            <a href="#copilot" className="hover:text-[#364322] transition-colors">AI Copilot</a>
            <a href="#workflow" className="hover:text-[#364322] transition-colors">Workflow</a>
          </nav>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Button
                onClick={() => setLocation("/dashboard")}
                className="rounded-2xl neu-button-primary px-6 py-2.5 text-sm"
              >
                Go to Workspace <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="hidden sm:flex neu-button px-5 py-2 text-sm"
                  onClick={handleSignIn}
                >
                  Sign In
                </Button>
                <Button
                  onClick={handleAction}
                  className="neu-button-primary px-6 py-2.5 text-sm"
                >
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 pt-12 pb-28">
        
        {/* HERO SECTION */}
        <section className="text-center pt-8 pb-16">
          <div className="inline-flex items-center gap-2 rounded-full neu-badge px-4 py-2 text-xs font-bold text-[#4A5833]">
            <Sparkles className="h-4 w-4 text-[#89986D]" />
            <span className="uppercase tracking-wider">ATTENDAI • AI-POWERED WORKFORCE INTELLIGENCE</span>
          </div>

          <h1 className="mt-8 text-5xl font-black tracking-tight leading-[1.08] sm:text-6xl max-w-4xl mx-auto text-[#364322]">
            Turn workforce attendance into <span className="text-[#89986D]">actionable intelligence.</span>
          </h1>

          <p className="mt-6 max-w-2xl mx-auto text-lg leading-8 text-[#5C6B44] font-medium">
            Attendance tracking, employee activity, workforce analytics, and AI executive summaries consolidated into one soft, high-precision platform.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
            <Button
              size="lg"
              onClick={handleAction}
              className="neu-button-primary px-8 py-6 text-base"
            >
              {isAuthenticated ? "Open Dashboard" : "Get Started Now"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              onClick={handleSignIn}
              className="neu-button-sage px-7 py-6 text-base"
            >
              Sign In to Account
            </Button>
          </div>

          {/* Floating Neumorphic Dashboard Preview */}
          <div className="mt-16 relative mx-auto max-w-5xl rounded-[30px] neu-card p-6 sm:p-8">
            <div className="relative rounded-[24px] neu-inset p-6 text-left">
              {/* Top Bar Mockup */}
              <div className="flex items-center justify-between border-b border-[#D8D2BC] pb-4">
                <div className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-full bg-[#D9534F]" />
                  <span className="h-3.5 w-3.5 rounded-full bg-[#EADFB4]" />
                  <span className="h-3.5 w-3.5 rounded-full bg-[#9CAB84]" />
                  <span className="ml-3 text-xs font-mono text-[#5C6B44] font-semibold">attendai.internal/intelligence</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-[#2C3917] neu-badge-sage px-3 py-1">
                  <span className="h-2 w-2 rounded-full bg-[#89986D] animate-pulse" /> Live Workforce Stream
                </div>
              </div>

              {/* Grid Preview Cards */}
              <div className="grid gap-4 mt-6 sm:grid-cols-4">
                <div className="neu-card-flat p-4 text-left">
                  <span className="text-[11px] font-bold text-[#5C6B44] uppercase tracking-wider">Attendance Rate</span>
                  <p className="mt-2 text-3xl font-black text-[#364322]">96.4%</p>
                  <span className="mt-1 inline-flex items-center text-xs text-[#4A5833] font-bold">
                    <TrendingUp className="mr-1 h-3.5 w-3.5 text-[#89986D]" /> +4.7% vs last month
                  </span>
                </div>
                <div className="neu-card-flat p-4 text-left">
                  <span className="text-[11px] font-bold text-[#5C6B44] uppercase tracking-wider">Present Today</span>
                  <p className="mt-2 text-3xl font-black text-[#364322]">142 / 150</p>
                  <span className="mt-1 text-xs text-[#5C6B44] font-semibold">94.6% active coverage</span>
                </div>
                <div className="neu-card-flat p-4 text-left">
                  <span className="text-[11px] font-bold text-[#5C6B44] uppercase tracking-wider">Late Arrivals</span>
                  <p className="mt-2 text-3xl font-black text-[#89986D]">04</p>
                  <span className="mt-1 text-xs text-[#89986D] font-bold">-2 occurrences today</span>
                </div>
                <div className="neu-card-sage p-4 text-left">
                  <span className="text-[11px] font-bold text-[#2C3917] uppercase tracking-wider">AI Anomalies</span>
                  <p className="mt-2 text-3xl font-black text-[#2C3917]">01 Signal</p>
                  <span className="mt-1 text-xs text-[#2C3917] font-semibold">Repeated late pattern</span>
                </div>
              </div>

              {/* Chart & AI Callout Row */}
              <div className="mt-6 grid gap-4 md:grid-cols-[1.5fr_1fr] text-left">
                <div className="neu-card-flat p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-[#364322]">Workforce Pulse</p>
                      <p className="text-xs text-[#5C6B44]">14-day attendance & late arrival trends</p>
                    </div>
                    <BarChart3 className="h-5 w-5 text-[#89986D]" />
                  </div>
                  <div className="mt-6 flex h-28 items-end gap-2 px-1">
                    {[45, 62, 58, 80, 75, 92, 88, 96, 90, 98, 94, 100, 92, 96].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span
                          style={{ height: `${h}%` }}
                          className="w-full rounded-t-md bg-[#9CAB84] hover:bg-[#89986D] transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="neu-card-sage p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#2C3917] uppercase tracking-wider">
                      <Bot className="h-4 w-4 text-[#2C3917]" /> AI Workforce Insight
                    </div>
                    <p className="mt-3 text-sm text-[#2C3917] leading-snug font-medium">
                      “Attendance increased from <span className="font-bold">88.4%</span> to <span className="font-bold">93.1%</span> (+4.7 pts). Engineering showed the highest consistency.”
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#A8BB81] flex items-center justify-between text-xs text-[#2C3917] font-bold">
                    <span>Generated from database metrics</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: INTELLIGENT WORKFORCE */}
        <section id="platform" className="pt-16 pb-16">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-[#89986D]">Intelligent Platform</span>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl tracking-tight text-[#364322]">
              Raw workforce data transformed into real-time decision intelligence.
            </h2>
            <p className="mt-4 text-base text-[#5C6B44] leading-relaxed">
              AttendAI automatically reconciles daily check-ins, department coverage, and leave approvals into verified operational analytics.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            <FeatureCard
              icon={Users}
              title="Workforce Operations"
              description="Complete employee profiles, department mapping, leave balances, and scheduled shift tracking with strict RBAC boundary checks."
            />
            <FeatureCard
              icon={Activity}
              title="Anomaly Detection"
              description="Deterministic pattern recognition for repeated late arrivals, sudden absence spikes, and irregular workday hours."
            />
            <FeatureCard
              icon={BrainCircuit}
              title="AI Executive Reports"
              description="Automated narrative summaries that analyze workforce performance trends using live database aggregations."
            />
          </div>
        </section>

        {/* SECTION 3: TWO EXPERIENCES */}
        <section id="experiences" className="pt-16 pb-20">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-[#89986D]">Role-Specific Architectures</span>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl tracking-tight text-[#364322]">
              Two experiences. One unified system.
            </h2>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Employee Experience Panel */}
            <div className="neu-card p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#9CAB84] text-white font-bold shadow-[4px_4px_10px_#D8D2BC]">
                    <UserCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-xl font-bold text-[#364322]">Employee Workspace</h3>
                    <p className="text-xs text-[#5C6B44]">Personal attendance, leave balance & personal AI report</p>
                  </div>
                </div>

                <div className="mt-6 neu-inset p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#5C6B44]">TODAY'S STATUS</span>
                    <span className="neu-badge-sage text-xs font-bold px-3 py-1">
                      Checked in • 09:12 AM
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-2xl font-black text-[#364322] font-mono">04h 32m 14s</p>
                      <p className="text-xs text-[#5C6B44]">Active working duration</p>
                    </div>
                    <Button size="sm" className="neu-button-primary px-4 py-2">
                      Check Out
                    </Button>
                  </div>
                </div>

                <ul className="mt-6 space-y-3 text-xs text-[#364322] font-semibold">
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="h-4 w-4 text-[#89986D]" /> Personal attendance history & working hours</li>
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="h-4 w-4 text-[#89986D]" /> Leave application submission & decision timeline</li>
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="h-4 w-4 text-[#89986D]" /> Personal AI summary report ("View My Report")</li>
                </ul>
              </div>
            </div>

            {/* HR / Admin Experience Panel */}
            <div className="neu-card-sage p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#9CAB84] text-white font-bold shadow-[4px_4px_10px_#A8BB81]">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-xl font-bold text-[#2C3917]">HR & Admin Command Center</h3>
                    <p className="text-xs text-[#384A1E]">Organization-wide workforce intelligence & control</p>
                  </div>
                </div>

                <div className="mt-6 neu-card-sage-inset p-5 grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-2xl bg-[#C5D89D] shadow-[3px_3px_8px_#A8BB81,-3px_-3px_8px_#E2F5B9]">
                    <p className="text-[10px] text-[#384A1E] uppercase font-bold">Active Workforce</p>
                    <p className="text-xl font-black text-[#2C3917] mt-1">150 Employees</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#C5D89D] shadow-[3px_3px_8px_#A8BB81,-3px_-3px_8px_#E2F5B9]">
                    <p className="text-[10px] text-[#384A1E] uppercase font-bold">Attendance Rate</p>
                    <p className="text-xl font-black text-[#2C3917] mt-1">96.4%</p>
                  </div>
                </div>

                <ul className="mt-6 space-y-3 text-xs text-[#2C3917] font-semibold">
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="h-4 w-4 text-[#2C3917]" /> Company-wide attendance trend & department coverage</li>
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="h-4 w-4 text-[#2C3917]" /> Leave approval workspace & anomaly alerts radar</li>
                  <li className="flex items-center gap-2.5"><CheckCircle2 className="h-4 w-4 text-[#2C3917]" /> Exportable executive reports (CSV / PDF) & audit trail</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: FINAL CTA */}
        <section className="mt-16 neu-card p-10 text-center relative overflow-hidden">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl text-[#364322]">
            Ready to elevate your workforce intelligence?
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-sm text-[#5C6B44] font-medium leading-relaxed">
            Experience modern AI attendance monitoring, leave management, and automated executive reporting today.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button
              size="lg"
              onClick={handleAction}
              className="neu-button-primary px-8 py-6 text-base"
            >
              {isAuthenticated ? "Enter Workspace" : "Get Started Free"} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-[#D8D2BC]/60 bg-[#F6F0D7] py-10 text-xs text-[#5C6B44]">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-xl bg-[#9CAB84] text-xs font-black text-white">
              A
            </span>
            <span className="font-bold text-[#364322]">AttendAI</span>
            <span>• Workforce Intelligence Platform</span>
          </div>
          <p>© {new Date().getFullYear()} AttendAI. All rights reserved.</p>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="neu-card p-6 text-left hover:shadow-[10px_10px_25px_#D8D2BC,-10px_-10px_25px_#FFFFFF] transition-all">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#C5D89D] text-[#2C3917] font-bold shadow-[4px_4px_10px_#A8BB81]">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-5 text-lg font-bold text-[#364322]">{title}</h3>
      <p className="mt-2 text-xs leading-relaxed text-[#5C6B44] font-medium">{description}</p>
    </div>
  );
}


function PipelineStep({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left relative">
      <span className="text-2xl font-black text-indigo-400/50">{step}</span>
      <h3 className="mt-2 text-base font-bold text-white">{title}</h3>
      <p className="mt-2 text-xs text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}

function WorkflowNode({ number, label, sub }: { number: string; label: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 text-center">
      <span className="text-xs font-bold text-indigo-400 font-mono">{number}</span>
      <p className="mt-1 text-sm font-bold text-white">{label}</p>
      <p className="text-[11px] text-slate-400">{sub}</p>
    </div>
  );
}
