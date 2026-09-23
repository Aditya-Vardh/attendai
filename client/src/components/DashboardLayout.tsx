import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { startLogin } from "@/const";
import { useTheme } from "@/contexts/ThemeContext";
import { GlobalSearch } from "@/components/GlobalSearch";
import { trpc } from "@/lib/trpc";
import { Bell, Bot, Building2, CalendarClock, ChartNoAxesCombined, ChevronLeft, ChevronRight, FileBarChart, Home, LogOut, Menu, Moon, Search, Settings, ShieldCheck, Sun, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

type NavItem = { label: string; path: string; icon: typeof Home; roles?: Array<"admin" | "hr_manager" | "employee"> };

const navigation: NavItem[] = [
  { label: "Overview", path: "/dashboard", icon: Home },
  { label: "Employees", path: "/employees", icon: Users, roles: ["admin", "hr_manager"] },
  { label: "Attendance", path: "/attendance", icon: CalendarClock },
  { label: "Leave", path: "/leave", icon: FileBarChart },
  { label: "Departments", path: "/departments", icon: Building2, roles: ["admin", "hr_manager"] },
  { label: "Analytics", path: "/analytics", icon: ChartNoAxesCombined, roles: ["admin", "hr_manager"] },
  { label: "Reports", path: "/reports", icon: FileBarChart, roles: ["admin", "hr_manager"] },
  { label: "AI Intelligence", path: "/intelligence", icon: Bot },
  { label: "Audit trail", path: "/audit", icon: ShieldCheck, roles: ["admin"] },
  { label: "Settings", path: "/settings", icon: Settings },
];

function roleLabel(role?: string) {
  return role === "hr_manager" ? "HR Manager" : role === "admin" ? "Administrator" : "Employee";
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("attendai-sidebar") === "collapsed");
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const notifications = trpc.notifications.list.useQuery({ page: 1, pageSize: 1, unreadOnly: true }, { enabled: !!user });

  useEffect(() => localStorage.setItem("attendai-sidebar", collapsed ? "collapsed" : "expanded"), [collapsed]);
  useEffect(() => setMobileOpen(false), [location]);
  const visibleNavigation = useMemo(() => navigation.filter(item => !item.roles || (user && item.roles.includes(user.role))), [user]);

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#F6F8FD] dark:bg-[#0A1020]"><div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" /></div>;
  if (!user) return <div className="grid min-h-screen place-items-center p-6"><div className="max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-xl"><div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-indigo-600 text-white"><Bot /></div><h1 className="text-2xl font-semibold">Sign in to AttendAI</h1><p className="mt-3 text-sm text-muted-foreground">Use your secure organization sign-in to access the workforce workspace.</p><Button className="mt-6 w-full" onClick={() => startLogin()}>Continue securely</Button></div></div>;

  const SidebarContent = () => <>
    <div className="flex h-20 items-center gap-3 px-4">
      <Link href="/dashboard" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-[0_10px_20px_rgba(79,70,229,.22)]"><span className="text-lg font-black">A</span></Link>
      {!collapsed && <div className="min-w-0"><p className="font-bold tracking-tight">AttendAI</p><p className="text-xs text-muted-foreground">Workforce intelligence</p></div>}
    </div>
    <nav className="flex-1 space-y-1 px-3 py-3">
      {!collapsed && <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.13em] text-muted-foreground">Workspace</p>}
      {visibleNavigation.map(item => {
        const active = location === item.path;
        const contents = <><item.icon className="h-[18px] w-[18px] shrink-0" /><span className="truncate">{item.label}</span></>;
        return <Tooltip key={item.path}><TooltipTrigger asChild><button onClick={() => setLocation(item.path)} className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all duration-200 ${active ? "bg-indigo-600 text-white shadow-[0_8px_18px_rgba(79,70,229,.18)]" : "text-muted-foreground hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"} ${collapsed ? "justify-center px-0" : ""}`}>{contents}</button></TooltipTrigger>{collapsed && <TooltipContent side="right">{item.label}</TooltipContent>}</Tooltip>;
      })}
    </nav>
    <div className="m-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3 dark:border-indigo-500/15 dark:bg-indigo-500/10">
      {!collapsed && <><div className="flex items-center gap-2"><Bot className="h-4 w-4 text-indigo-600"/><span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">AI Copilot</span></div><p className="mt-1 text-[11px] leading-4 text-indigo-700/75 dark:text-indigo-300/75">Ask workforce questions in plain language.</p></>}
      <button onClick={() => setLocation("/intelligence")} className={`mt-${collapsed ? "0" : "3"} flex h-8 w-full items-center justify-center rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700`}>{collapsed ? <Bot className="h-4 w-4" /> : "Open Copilot"}</button>
    </div>
    <div className={`border-t border-border p-3 ${collapsed ? "" : ""}`}>
      <button onClick={() => setLocation("/settings")} className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-muted ${collapsed ? "justify-center" : ""}`}>
        <Avatar className="h-9 w-9 border border-indigo-100"><AvatarFallback className="bg-indigo-50 text-xs font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">{user.name?.slice(0, 2).toUpperCase() ?? "AI"}</AvatarFallback></Avatar>
        {!collapsed && <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{user.name ?? "AttendAI member"}</p><p className="truncate text-xs text-muted-foreground">{roleLabel(user.role)}</p></div>}
      </button>
      {!collapsed && <button onClick={logout} className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"><LogOut className="h-3.5 w-3.5"/>Sign out</button>}
    </div>
  </>;

  return <div className="min-h-screen bg-[#F6F8FD] text-slate-950 dark:bg-[#0A1020] dark:text-slate-100">
    {mobileOpen && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}
    <aside className={`fixed inset-y-0 left-0 z-50 hidden flex-col border-r border-slate-200/80 bg-white/90 backdrop-blur-xl transition-[width] duration-200 dark:border-white/10 dark:bg-[#111A30]/90 lg:flex ${collapsed ? "w-[76px]" : "w-[268px]"}`}><SidebarContent /><button aria-label="Toggle sidebar" onClick={() => setCollapsed(value => !value)} className="absolute -right-3 top-24 grid h-6 w-6 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:text-indigo-600 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300">{collapsed ? <ChevronRight className="h-3.5 w-3.5"/> : <ChevronLeft className="h-3.5 w-3.5"/>}</button></aside>
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[288px] flex-col border-r border-slate-200 bg-white transition-transform duration-200 dark:border-white/10 dark:bg-[#111A30] lg:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}><div className="absolute right-3 top-4"><Button size="icon" variant="ghost" onClick={() => setMobileOpen(false)}><X className="h-4 w-4"/></Button></div><SidebarContent /></aside>
    <main className={`min-h-screen transition-[padding] duration-200 ${collapsed ? "lg:pl-[76px]" : "lg:pl-[268px]"}`}>
      <header className="sticky top-0 z-30 flex h-20 items-center gap-3 border-b border-slate-200/80 bg-[#F6F8FD]/75 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#0A1020]/75 sm:px-7">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5"/></Button>
        <button onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))} className="hidden max-w-md flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition-colors hover:border-indigo-300 dark:border-white/10 dark:bg-white/5 md:flex"><Search className="h-4 w-4 text-muted-foreground"/><span className="flex-1 text-sm text-muted-foreground">Search people, departments, or reports</span><kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">⌘K</kbd></button>
        <div className="ml-auto flex items-center gap-1.5"><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Switch color theme">{theme === "dark" ? <Sun className="h-4 w-4"/> : <Moon className="h-4 w-4"/>}</Button></TooltipTrigger><TooltipContent>Switch theme</TooltipContent></Tooltip><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="relative" onClick={() => setLocation("/notifications")} aria-label="View notifications"><Bell className="h-4 w-4"/>{(notifications.data?.unread ?? 0) > 0 && <Badge className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full p-0 text-[9px]">{notifications.data?.unread}</Badge>}</Button></TooltipTrigger><TooltipContent>Notifications</TooltipContent></Tooltip><Button size="sm" className="hidden gap-2 rounded-xl bg-indigo-600 px-3 text-xs hover:bg-indigo-700 sm:flex" onClick={() => setLocation("/intelligence")}><Bot className="h-4 w-4"/>Ask Copilot</Button></div>
      </header>
      <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-7">{children}</div><GlobalSearch />
    </main>
  </div>;
}
