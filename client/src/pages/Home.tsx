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

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const [authOpen, setAuthOpen] = useState(false);

  const handleAction = () => {
    if (isAuthenticated) {
      setLocation("/dashboard");
    } else {
      setAuthOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 overflow-x-hidden relative selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background Gradient Mesh & Glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 h-[700px] w-[1100px] rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.18)_0%,rgba(56,189,248,0.10)_40%,transparent_70%)] blur-3xl" />
        <div className="absolute top-[30%] -left-[10%] h-[500px] w-[600px] rounded-full bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.12)_0%,transparent_70%)] blur-3xl" />
        <div className="absolute top-[65%] -right-[10%] h-[600px] w-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.14)_0%,transparent_70%)] blur-3xl" />
        <div className="absolute inset-0 bg-grid-pattern opacity-40" />
      </div>

      {/* Header / Navbar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070913]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <button onClick={() => setLocation("/")} className="flex items-center gap-3 group">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 text-lg font-black text-white shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
              A
            </span>
            <div className="text-left">
              <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-200 bg-clip-text text-transparent">
                AttendAI
              </span>
              <span className="block text-[10px] uppercase font-bold tracking-widest text-indigo-400">
                Workforce Intelligence
              </span>
            </div>
          </button>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#platform" className="hover:text-white transition-colors">Platform</a>
            <a href="#experiences" className="hover:text-white transition-colors">Experiences</a>
            <a href="#copilot" className="hover:text-white transition-colors">AI Copilot</a>
            <a href="#workflow" className="hover:text-white transition-colors">Workflow</a>
          </nav>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Button
                onClick={() => setLocation("/dashboard")}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30 px-5"
              >
                Go to Workspace <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="hidden sm:flex text-slate-300 hover:text-white hover:bg-white/5 rounded-xl"
                  onClick={() => setAuthOpen(true)}
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => setAuthOpen(true)}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold shadow-lg shadow-indigo-600/25 px-5"
                >
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 pt-16 pb-28">
        
        {/* HERO SECTION */}
        <section className="text-center pt-8 pb-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-300 shadow-inner backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span className="uppercase tracking-wider font-bold">ATTENDAI • AI-POWERED WORKFORCE INTELLIGENCE</span>
          </div>

          <h1 className="mt-8 text-5xl font-black tracking-tight leading-[1.08] sm:text-7xl max-w-4xl mx-auto">
            Turn workforce data into <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-300 bg-clip-text text-transparent">decisions.</span>
          </h1>

          <p className="mt-6 max-w-2xl mx-auto text-lg leading-8 text-slate-400">
            Attendance, employee activity, workforce analytics, and AI-generated intelligence reports consolidated into one high-precision platform.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={handleAction}
              className="rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold px-8 shadow-[0_0_30px_rgba(99,102,241,0.4)] text-base h-13"
            >
              {isAuthenticated ? "Open Dashboard" : "Get Started Now"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => document.getElementById("platform")?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-2xl border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:border-indigo-400/30 font-semibold px-7 h-13"
            >
              Explore Platform
            </Button>
          </div>

          {/* Floating Glass Dashboard Mockup Preview */}
          <div className="mt-16 relative mx-auto max-w-5xl rounded-3xl border border-white/10 bg-[#0B0F19]/80 p-4 sm:p-6 shadow-[0_30px_100px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500/20 via-purple-500/10 to-cyan-500/20 blur-xl opacity-70" />
            
            <div className="relative rounded-2xl border border-white/10 bg-[#070913]/90 p-5 overflow-hidden">
              {/* Top Bar Mockup */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                  <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-3 text-xs font-mono text-slate-400">attendai.internal/intelligence</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Live Workforce Stream
                </div>
              </div>

              {/* Grid Preview Cards */}
              <div className="grid gap-4 mt-5 sm:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Attendance Rate</span>
                  <p className="mt-2 text-3xl font-black text-white">96.4%</p>
                  <span className="mt-1 inline-flex items-center text-xs text-emerald-400 font-medium">
                    <TrendingUp className="mr-1 h-3.5 w-3.5" /> +4.7% vs last month
                  </span>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Present Today</span>
                  <p className="mt-2 text-3xl font-black text-white">142 / 150</p>
                  <span className="mt-1 text-xs text-slate-400 font-medium">94.6% active coverage</span>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Late Arrivals</span>
                  <p className="mt-2 text-3xl font-black text-amber-400">04</p>
                  <span className="mt-1 text-xs text-amber-400/80 font-medium">-2 occurrences today</span>
                </div>
                <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-left">
                  <span className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider">AI Anomalies</span>
                  <p className="mt-2 text-3xl font-black text-indigo-300">01 Signal</p>
                  <span className="mt-1 text-xs text-indigo-200 font-medium">Repeated late pattern</span>
                </div>
              </div>

              {/* Chart & AI Callout Row */}
              <div className="mt-4 grid gap-4 md:grid-cols-[1.5fr_1fr] text-left">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">Workforce Pulse</p>
                      <p className="text-xs text-slate-400">14-day attendance & late arrival trends</p>
                    </div>
                    <BarChart3 className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div className="mt-6 flex h-28 items-end gap-2 px-1">
                    {[45, 62, 58, 80, 75, 92, 88, 96, 90, 98, 94, 100, 92, 96].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span
                          style={{ height: `${h}%` }}
                          className="w-full rounded-t-md bg-gradient-to-t from-indigo-600 via-purple-500 to-cyan-400 opacity-90 transition-all hover:opacity-100"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/60 to-purple-950/40 p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wider">
                      <Bot className="h-4 w-4 text-indigo-400" /> AI Workforce Insight
                    </div>
                    <p className="mt-3 text-sm text-slate-200 leading-snug font-medium">
                      “Attendance increased from <span className="text-emerald-400 font-semibold">88.4%</span> to <span className="text-emerald-400 font-semibold">93.1%</span> (+4.7 pts). Engineering showed the highest consistency.”
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-indigo-300 font-semibold">
                    <span>Generated from database metrics</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: INTELLIGENT WORKFORCE */}
        <section id="platform" className="pt-20 pb-16">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">Intelligent Platform</span>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl tracking-tight">
              Raw workforce data transformed into real-time decision intelligence.
            </h2>
            <p className="mt-4 text-base text-slate-400 leading-relaxed">
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
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Role-Specific Architectures</span>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl tracking-tight">
              Two experiences. One unified system.
            </h2>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Employee Experience Panel */}
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-8 backdrop-blur-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    <UserCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-xl font-bold text-white">Employee Workspace</h3>
                    <p className="text-xs text-slate-400">Personal attendance, leave balance & personal AI report</p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-[#070913] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">TODAY'S STATUS</span>
                    <span className="rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold px-2.5 py-0.5 border border-emerald-500/30">
                      Checked in • 09:12 AM
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-2xl font-black text-white font-mono">04h 32m 14s</p>
                      <p className="text-xs text-slate-400">Active working duration</p>
                    </div>
                    <Button size="sm" className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
                      Check Out
                    </Button>
                  </div>
                </div>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Personal attendance history & working hours</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Leave application submission & decision timeline</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Personal AI summary report ("View My Report")</li>
                </ul>
              </div>
            </div>

            {/* HR / Admin Experience Panel */}
            <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-[#070913] p-8 backdrop-blur-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-xl font-bold text-white">HR & Admin Command Center</h3>
                    <p className="text-xs text-slate-400">Organization-wide workforce intelligence & control</p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-[#070913] p-5 grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Active Workforce</p>
                    <p className="text-xl font-bold text-white mt-1">150 Employees</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Attendance Rate</p>
                    <p className="text-xl font-bold text-emerald-400 mt-1">96.4%</p>
                  </div>
                </div>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400" /> Company-wide attendance trend & department coverage</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400" /> Leave approval workspace & anomaly alerts radar</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400" /> Exportable executive reports (CSV / PDF) & audit trail</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: AI REPORTS TRANSFORMATION */}
        <section className="py-16 border-t border-white/10">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">AI Intelligence Pipeline</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              From raw timestamps to executive clarity.
            </h2>
          </div>

          <div className="grid items-center gap-4 md:grid-cols-3">
            <PipelineStep
              step="01"
              title="Raw Workforce Data"
              desc="Daily check-ins, check-outs, leave applications, and workday start timestamps recorded in MySQL database."
            />
            <PipelineStep
              step="02"
              title="Backend Aggregation"
              desc="Server aggregates attendance rates, late minutes, and department coverage with zero LLM hallucination."
            />
            <PipelineStep
              step="03"
              title="AI Executive Summary"
              desc="Structured metrics combined with narrative explanations generated for company and employee reports."
            />
          </div>
        </section>

        {/* SECTION 5: WORKFORCE COPILOT DEMO */}
        <section id="copilot" className="py-20 border-t border-white/10">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Workforce Copilot</span>
              <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl tracking-tight">
                Ask anything about your workforce in plain language.
              </h2>
              <p className="mt-4 text-slate-400 leading-relaxed text-sm">
                The Workforce Copilot connects directly to role-scoped application tools, giving instant answers backed by live database records.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-white">Strict Role Boundaries</h4>
                    <p className="text-xs text-slate-400">Employees see only their data; HR & Admins query department and company trends.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
                    <Cpu className="h-4 w-4" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-white">Factually Verified Responses</h4>
                    <p className="text-xs text-slate-400">AI never invents metrics—answers are synthesized strictly from database queries.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Realistic AI Chat UI Preview */}
            <div className="rounded-3xl border border-indigo-500/30 bg-[#0B0F19] p-6 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-600 text-white shadow-md">
                    <Bot className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white">ATTENDAI INTELLIGENCE</p>
                    <p className="text-[10px] text-indigo-300 font-mono">Model: claude-haiku-4-5 • Live Context</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold px-2 py-0.5">
                  Ready
                </span>
              </div>

              <div className="mt-5 space-y-4 text-xs">
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-tr-sm bg-indigo-600 px-4 py-2.5 text-white max-w-[80%]">
                    "How much did attendance improve this month?"
                  </div>
                </div>

                {/* AI Response */}
                <div className="flex justify-start gap-2.5">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-500/20 text-indigo-300 shrink-0">
                    <Bot className="h-3.5 w-3.5" />
                  </span>
                  <div className="rounded-2xl rounded-tl-sm border border-white/10 bg-white/5 p-4 text-slate-200 max-w-[85%] space-y-3">
                    <p className="leading-relaxed">
                      Attendance increased from <span className="font-bold text-white">88.4%</span> to <span className="font-bold text-emerald-400">93.1%</span>, a <span className="font-bold text-emerald-400">+4.7 percentage-point increase</span> over the last 30 days.
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-[11px]">
                      <div className="p-2 rounded-lg bg-white/5">
                        <span className="text-slate-400 block">Top Department</span>
                        <span className="font-bold text-indigo-300">Engineering (98.2%)</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white/5">
                        <span className="text-slate-400 block">Late Reduction</span>
                        <span className="font-bold text-emerald-400">-12 occurrences</span>
                      </div>
                    </div>

                    <div className="pt-1 text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Source: get_attendance_stats • Verified</span>
                      <span className="text-indigo-400 font-semibold cursor-pointer">View Report →</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6: WORKFLOW */}
        <section id="workflow" className="py-16 border-t border-white/10">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">End-to-End Workflow</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Continuous intelligence lifecycle.
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-5 text-center">
            <WorkflowNode number="01" label="Employee Activity" sub="Clock-in & leave" />
            <WorkflowNode number="02" label="Workforce Data" sub="MySQL storage" />
            <WorkflowNode number="03" label="AI Analysis" sub="Pattern & anomaly" />
            <WorkflowNode number="04" label="AI Reports" sub="Executive summary" />
            <WorkflowNode number="05" label="HR Insights" sub="Actionable decisions" />
          </div>
        </section>

        {/* SECTION 7: FINAL CTA */}
        <section className="mt-16 rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950 via-purple-950/80 to-[#0B0F19] p-10 text-center relative overflow-hidden shadow-2xl">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl text-white">
            Ready to elevate your workforce intelligence?
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-sm text-slate-300 leading-relaxed">
            Experience modern AI attendance monitoring, leave management, and automated executive reporting today.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button
              size="lg"
              onClick={handleAction}
              className="rounded-2xl bg-white text-indigo-950 hover:bg-slate-100 font-bold px-8 shadow-xl text-base h-12"
            >
              {isAuthenticated ? "Enter Workspace" : "Get Started Free"} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#04060C] py-10 relative z-10 text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-indigo-600 text-xs font-black text-white">
              A
            </span>
            <span className="font-bold text-slate-300">AttendAI</span>
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
    <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl text-left hover:border-indigo-500/30 transition-colors">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-5 text-lg font-bold text-white">{title}</h3>
      <p className="mt-2 text-xs leading-relaxed text-slate-400">{description}</p>
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
