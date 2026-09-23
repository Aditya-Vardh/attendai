import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  Bot,
  BrainCircuit,
  ChartNoAxesCombined,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const begin = () => (isAuthenticated ? setLocation("/dashboard") : startLogin());

  return (
    <div className="min-h-screen overflow-hidden bg-[#F6F8FD] text-slate-950 dark:bg-[#0A1020] dark:text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_20%_15%,rgba(99,102,241,.22),transparent_30%),radial-gradient(circle_at_80%_8%,rgba(59,130,246,.18),transparent_30%)]" />
      <header className="relative mx-auto flex h-20 max-w-7xl items-center justify-between px-5">
        <button onClick={() => setLocation("/")} className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-lg font-black text-white shadow-lg shadow-indigo-500/25">A</span>
          <span className="text-lg font-bold tracking-tight">AttendAI</span>
        </button>
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="hidden sm:flex" onClick={() => document.getElementById("capabilities")?.scrollIntoView({ behavior: "smooth" })}>Capabilities</Button>
          <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700" onClick={begin} disabled={loading}>
            {isAuthenticated ? "Open workspace" : "Sign in"}<ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </header>
      <main className="relative mx-auto max-w-7xl px-5 pb-20 pt-16 sm:pt-24">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-200"><Sparkles className="h-3.5 w-3.5" />Agentic AI for modern workforce operations</div>
            <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[1.03] tracking-[-0.045em] sm:text-6xl">Workforce clarity, <span className="bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">intelligently</span> delivered.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">AttendAI combines secure attendance, leave operations, workforce analytics, and a tool-enabled AI copilot in one calm, operationally rigorous workspace.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" className="rounded-xl bg-indigo-600 px-6 hover:bg-indigo-700" onClick={begin} disabled={loading}>{isAuthenticated ? "Go to dashboard" : "Enter AttendAI"}<ArrowRight className="ml-2 h-4 w-4" /></Button>
              <Button size="lg" variant="outline" className="rounded-xl bg-white/70 dark:bg-white/5" onClick={() => document.getElementById("capabilities")?.scrollIntoView({ behavior: "smooth" })}>Explore capabilities</Button>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600 dark:text-slate-300">
              <TrustLabel label="Role-aware access" /><TrustLabel label="Live operational data" /><TrustLabel label="AI guarded by permissions" />
            </div>
          </div>
          <PreviewCard />
        </div>
        <section id="capabilities" className="mt-28">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">One operational surface</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Built for accountable people operations.</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Every workspace interaction is connected to the same governed data model—from a clock-in to a management decision.</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <Feature icon={Users} title="Workforce operations" text="Employee profiles, departments, leave balances, and decisions with explicit ownership." />
            <Feature icon={ChartNoAxesCombined} title="Operational intelligence" text="Attendance signals, late-arrival patterns, reporting, and department comparisons." />
            <Feature icon={BrainCircuit} title="Agentic AI, safely scoped" text="A data-aware copilot and anomaly explanations that respect role boundaries." />
          </div>
        </section>
        <section className="mt-16 grid gap-5 rounded-3xl border border-slate-200 bg-white p-7 dark:border-white/10 dark:bg-white/5 md:grid-cols-[1.2fr_.8fr]">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-indigo-600"><ShieldCheck className="h-4 w-4" />SDG 8 impact</div>
            <h2 className="mt-3 text-2xl font-bold">More transparent work, less administrative drag.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">AttendAI helps teams make attendance and leave processes clearer, reduce repetitive coordination, and support data-informed workplace decisions aligned with decent work and economic growth.</p>
          </div>
          <Button variant="outline" className="self-center rounded-xl" onClick={begin}>Start with AttendAI<ArrowRight className="ml-2 h-4 w-4" /></Button>
        </section>
      </main>
    </div>
  );
}

function PreviewCard() {
  return <div className="relative mx-auto w-full max-w-xl rounded-[28px] border border-white/75 bg-white/75 p-4 shadow-[0_30px_90px_rgba(30,41,59,.16)] backdrop-blur-xl dark:border-white/10 dark:bg-[#111A30]/75">
    <div className="flex items-center gap-2 border-b border-slate-200/80 px-2 pb-4 dark:border-white/10"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /><span className="ml-3 text-xs font-medium text-muted-foreground">AttendAI · Workforce overview</span></div>
    <div className="grid grid-cols-3 gap-3 py-4"><Stat label="Present" value="94.6%" tone="bg-indigo-500" /><Stat label="Late arrivals" value="08" tone="bg-amber-500" /><Stat label="AI risks" value="03" tone="bg-rose-500" /></div>
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5"><div className="flex items-center justify-between"><div><p className="text-xs font-bold text-slate-500">Attendance pulse</p><p className="mt-1 text-sm font-semibold">Organization trend</p></div><Activity className="h-5 w-5 text-indigo-500" /></div><div className="mt-7 flex h-24 items-end gap-2">{[48, 64, 58, 75, 70, 90, 83, 96, 88, 98, 91, 100].map((height, i) => <span key={i} style={{ height: `${height}%` }} className="flex-1 rounded-t-md bg-gradient-to-t from-indigo-600 to-blue-400 opacity-90" />)}</div></div>
    <div className="mt-3 flex items-center gap-3 rounded-2xl bg-indigo-600 p-4 text-white"><div className="grid h-9 w-9 place-items-center rounded-xl bg-white/15"><Bot className="h-5 w-5" /></div><p className="text-sm leading-5"><strong>Workforce Copilot</strong><br /><span className="text-indigo-100">“Attendance is stable; Product shows a late-arrival pattern.”</span></p></div>
  </div>;
}

function TrustLabel({ label }: { label: string }) { return <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" />{label}</span>; }
function Stat({ label, value, tone }: { label: string; value: string; tone: string }) { return <div className="rounded-2xl border border-slate-100 bg-white p-3 dark:border-white/10 dark:bg-white/5"><span className={`inline-block h-2 w-2 rounded-full ${tone}`} /><p className="mt-3 text-xl font-bold">{value}</p><p className="text-[11px] text-muted-foreground">{label}</p></div>; }
function Feature({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) { return <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-transform duration-200 hover:-translate-y-1 dark:border-white/10 dark:bg-white/5"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10"><Icon className="h-5 w-5" /></div><h3 className="mt-5 font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div>; }
