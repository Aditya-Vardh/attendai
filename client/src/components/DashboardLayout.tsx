import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { GlobalSearch } from "@/components/GlobalSearch";
import { trpc } from "@/lib/trpc";
import {
  Bell,
  Bot,
  Building2,
  CalendarClock,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  FileBarChart,
  Home,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

type NavItem = {
  label: string;
  path: string;
  icon: typeof Home;
  roles?: Array<"admin" | "hr_manager" | "employee">;
};

const navigation: NavItem[] = [
  { label: "Overview", path: "/dashboard", icon: Home },
  { label: "Employees", path: "/employees", icon: Users, roles: ["admin", "hr_manager"] },
  { label: "Attendance", path: "/attendance", icon: CalendarClock },
  { label: "Leave", path: "/leave", icon: FileBarChart },
  { label: "Departments", path: "/departments", icon: Building2, roles: ["admin", "hr_manager"] },
  { label: "Analytics", path: "/analytics", icon: ChartNoAxesCombined, roles: ["admin", "hr_manager"] },
  { label: "Reports", path: "/reports", icon: FileBarChart, roles: ["admin", "hr_manager"] },
  { label: "AI Intelligence", path: "/intelligence", icon: Bot },
  { label: "Audit Trail", path: "/audit", icon: ShieldCheck, roles: ["admin"] },
  { label: "Settings", path: "/settings", icon: Settings },
];

function roleLabel(role?: string) {
  return role === "hr_manager" ? "HR Manager" : role === "admin" ? "Administrator" : "Employee";
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("attendai-sidebar") === "collapsed");
  const [mobileOpen, setMobileOpen] = useState(false);

  const notifications = trpc.notifications.list.useQuery(
    { page: 1, pageSize: 1, unreadOnly: true },
    { enabled: !!user }
  );

  useEffect(() => localStorage.setItem("attendai-sidebar", collapsed ? "collapsed" : "expanded"), [collapsed]);
  useEffect(() => setMobileOpen(false), [location]);

  const visibleNavigation = useMemo(
    () => navigation.filter((item) => !item.roles || (user && item.roles.includes(user.role))),
    [user]
  );

  const SidebarContent = () => (
    <div className="flex h-full flex-col justify-between p-3.5">
      <div>
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-3">
          <Link
            href="/dashboard"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 text-white font-black shadow-lg shadow-indigo-500/25"
          >
            <span className="text-lg">A</span>
          </Link>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-extrabold tracking-tight text-white text-base">AttendAI</p>
              <p className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">
                Workforce Intel
              </p>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav className="mt-4 space-y-1">
          {!collapsed && (
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Navigation
            </p>
          )}

          <TooltipProvider>
            {visibleNavigation.map((item) => {
              const active = location === item.path;
              const contents = (
                <>
                  <item.icon
                    className={`h-[18px] w-[18px] shrink-0 ${
                      active ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </>
              );

              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setLocation(item.path)}
                      className={`group flex h-11 w-full items-center gap-3.5 rounded-2xl px-3.5 text-xs font-semibold transition-all duration-200 ${
                        active
                          ? "bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg shadow-indigo-600/25 font-bold"
                          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                      } ${collapsed ? "justify-center px-0" : ""}`}
                    >
                      {contents}
                    </button>
                  </TooltipTrigger>
                  {collapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </nav>
      </div>

      {/* Footer Area: Copilot Card & User Profile */}
      <div className="space-y-3">
        {!collapsed && (
          <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/60 to-purple-950/40 p-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
              <Bot className="h-4 w-4 text-indigo-400" />
              <span>Workforce Copilot</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
              Ask workforce questions in natural language.
            </p>
            <Button
              onClick={() => setLocation("/intelligence")}
              className="mt-3 w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs h-8"
            >
              Open Copilot
            </Button>
          </div>
        )}

        <div className="border-t border-white/10 pt-3">
          <div
            className={`flex items-center justify-between p-2 rounded-2xl bg-white/5 border border-white/5 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-9 w-9 border border-indigo-500/30">
                <AvatarFallback className="bg-indigo-600 text-white font-bold text-xs">
                  {user?.name?.slice(0, 2).toUpperCase() ?? "AI"}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-white">{user?.name ?? "Member"}</p>
                  <p className="truncate text-[10px] font-semibold text-indigo-300">
                    {roleLabel(user?.role)}
                  </p>
                </div>
              )}
            </div>

            {!collapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                title="Sign out"
                className="h-8 w-8 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Mobile Overlay */}
      {mobileOpen && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 hidden flex-col border-r border-white/10 bg-[#0B0F19]/90 backdrop-blur-2xl transition-[width] duration-300 lg:flex ${
          collapsed ? "w-[80px]" : "w-[270px]"
        }`}
      >
        <SidebarContent />
        <button
          aria-label="Toggle sidebar"
          onClick={() => setCollapsed((v) => !v)}
          className="absolute -right-3 top-20 grid h-6 w-6 place-items-center rounded-full border border-white/10 bg-[#0B0F19] text-slate-300 shadow-md hover:text-indigo-400 transition-transform hover:scale-110"
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </aside>

      {/* Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-white/10 bg-[#0B0F19] transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="absolute right-3 top-4">
          <Button size="icon" variant="ghost" onClick={() => setMobileOpen(false)} className="text-slate-400">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <main
        className={`min-h-screen transition-[padding] duration-300 ${
          collapsed ? "lg:pl-[80px]" : "lg:pl-[270px]"
        }`}
      >
        {/* Header Bar */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-white/10 bg-[#070913]/80 px-6 backdrop-blur-xl">
          <div className="flex items-center gap-4 flex-1">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-slate-300"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <button
              onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
              className="hidden max-w-md flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-left text-xs transition-colors hover:border-indigo-500/40 md:flex"
            >
              <Search className="h-4 w-4 text-slate-400" />
              <span className="flex-1 text-slate-400">Search employees, departments, or reports…</span>
              <kbd className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                ⌘K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/notifications")}
              className="relative text-slate-300 hover:text-white rounded-xl"
            >
              <Bell className="h-4 w-4" />
              {(notifications.data?.unread ?? 0) > 0 && (
                <Badge className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 p-0 text-[9px] font-bold text-white">
                  {notifications.data?.unread}
                </Badge>
              )}
            </Button>

            <Button
              size="sm"
              onClick={() => setLocation("/intelligence")}
              className="hidden sm:flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-xs px-4 h-9 shadow-md shadow-indigo-600/20"
            >
              <Bot className="h-4 w-4" /> Ask Copilot
            </Button>
          </div>
        </header>

        {/* Viewport Workspace Container */}
        <div className="mx-auto max-w-[1600px] p-6 lg:p-8">{children}</div>

        <GlobalSearch />
      </main>
    </div>
  );
}
