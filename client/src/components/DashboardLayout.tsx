import { motion } from "framer-motion";
import { UserButton, useClerk } from "@clerk/react";
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
  const clerk = useClerk();
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("attendai-sidebar") === "collapsed");
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await clerk.signOut();
    } catch {}
    await logout();
    setLocation("/");
  };

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
    <div className="flex h-full flex-col justify-between p-3.5 bg-[#F6F0D7]">
      <div>
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-3">
          <Link
            href="/dashboard"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#9CAB84] text-white font-black shadow-[4px_4px_10px_#D8D2BC,-4px_-4px_10px_#FFFFFF]"
          >
            <span className="text-xl">A</span>
          </Link>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-extrabold tracking-tight text-[#364322] text-lg">AttendAI</p>
              <p className="text-[10px] uppercase font-bold tracking-widest text-[#89986D]">
                Workforce Intel
              </p>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav className="mt-4 space-y-2">
          {!collapsed && (
            <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-[#89986D]">
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
                      active ? "text-white" : "text-[#5C6B44] group-hover:text-[#364322]"
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
                      className={`group flex h-11 w-full items-center gap-3.5 rounded-2xl px-3.5 text-xs font-bold transition-all duration-200 cursor-pointer ${
                        active
                          ? "bg-[#9CAB84] text-white shadow-[5px_5px_12px_#82916B,-5px_-5px_12px_#B6C59D]"
                          : "text-[#364322] hover:bg-[#C5D89D]/40 shadow-[3px_3px_8px_#D8D2BC,-3px_-3px_8px_#FFFFFF]"
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
          <div className="neu-card-sage p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#2C3917]">
              <Bot className="h-4 w-4 text-[#2C3917]" />
              <span>Workforce Copilot</span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[#384A1E] font-medium">
              Ask workforce questions in natural language.
            </p>
            <Button
              onClick={() => setLocation("/intelligence")}
              className="mt-3 w-full neu-button-primary text-xs h-9 py-1"
            >
              Open Copilot
            </Button>
          </div>
        )}

        <div className="border-t border-[#D8D2BC] pt-3 space-y-2">
          {/* User identity row */}
          <div className={`flex items-center gap-3 px-2 ${collapsed ? "justify-center" : ""}`}>
            <UserButton fallback={
              <Avatar className="h-9 w-9 shrink-0 bg-[#9CAB84] text-white shadow-[2px_2px_6px_#D8D2BC]">
                <AvatarFallback className="bg-[#9CAB84] text-white font-bold text-xs">
                  {user?.name?.slice(0, 2).toUpperCase() ?? "AI"}
                </AvatarFallback>
              </Avatar>
            } />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-[#364322]">{user?.name ?? "Member"}</p>
                <p className="truncate text-[10px] font-bold text-[#89986D]">
                  {roleLabel(user?.role)}
                </p>
              </div>
            )}
          </div>

          {/* Sign Out — always visible, labelled when expanded, icon+tooltip when collapsed */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="w-full flex items-center justify-center h-10 rounded-2xl text-[#5C6B44] bg-[#F6F0D7] shadow-[4px_4px_10px_#D8D2BC,-4px_-4px_10px_#FFFFFF] hover:text-[#D9534F] hover:shadow-[5px_5px_12px_#D8D2BC,-5px_-5px_12px_#FFFFFF] transition-all cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign Out</TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 h-10 px-4 rounded-2xl text-xs font-bold text-[#5C6B44] bg-[#F6F0D7] shadow-[4px_4px_10px_#D8D2BC,-4px_-4px_10px_#FFFFFF] hover:text-[#D9534F] hover:shadow-[5px_5px_12px_#D8D2BC,-5px_-5px_12px_#FFFFFF] transition-all cursor-pointer"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign Out
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F6F0D7] text-[#364322]">
      {/* Mobile Overlay */}
      {mobileOpen && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-[#364322]/30 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 hidden flex-col bg-[#F6F0D7] shadow-[8px_0_20px_#D8D2BC] transition-[width] duration-300 lg:flex ${
          collapsed ? "w-[80px]" : "w-[270px]"
        }`}
      >
        <SidebarContent />
        <button
          aria-label="Toggle sidebar"
          onClick={() => setCollapsed((v) => !v)}
          className="absolute -right-3.5 top-20 grid h-7 w-7 place-items-center rounded-full bg-[#F6F0D7] text-[#364322] shadow-[3px_3px_8px_#D8D2BC,-3px_-3px_8px_#FFFFFF] hover:text-[#89986D] transition-transform hover:scale-110 cursor-pointer"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>

      {/* Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-[#F6F0D7] shadow-[10px_0_30px_#D8D2BC] transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="absolute right-3 top-4">
          <Button size="icon" variant="ghost" onClick={() => setMobileOpen(false)} className="text-[#364322]">
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
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between bg-[#F6F0D7]/90 px-6 shadow-[0_4px_16px_#D8D2BC] backdrop-blur-md">
          <div className="flex items-center gap-4 flex-1">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-[#364322]"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <button
              onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
              className="hidden max-w-md flex-1 items-center gap-2 neu-input px-4 py-2.5 text-left text-xs text-[#364322] md:flex cursor-pointer"
            >
              <Search className="h-4 w-4 text-[#89986D]" />
              <span className="flex-1 text-[#5C6B44] font-medium">Search employees, departments, or reports…</span>
              <kbd className="rounded-md neu-badge px-2 py-0.5 text-[10px] font-mono text-[#364322]">
                ⌘K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/notifications")}
              className="relative neu-button h-10 w-10 text-[#364322]"
            >
              <Bell className="h-4 w-4" />
              {(notifications.data?.unread ?? 0) > 0 && (
                <Badge className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#D9534F] p-0 text-[10px] font-bold text-white shadow-md">
                  {notifications.data?.unread}
                </Badge>
              )}
            </Button>

            <Button
              size="sm"
              onClick={() => setLocation("/intelligence")}
              className="hidden sm:flex items-center gap-2 neu-button-primary text-xs px-5 h-10"
            >
              <Bot className="h-4 w-4" /> Ask Copilot
            </Button>
          </div>
        </header>

        {/* Viewport Workspace Container */}
        <div className="mx-auto max-w-[1600px] p-6 lg:p-8">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </div>

        <GlobalSearch />
      </main>
    </div>
  );
}
