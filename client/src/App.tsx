import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/_core/hooks/useAuth";
import { Route, Switch, useLocation } from "wouter";
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Departments from "./pages/Departments";
import Attendance from "./pages/Attendance";
import Leave from "./pages/Leave";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import { Analytics, Reports, Intelligence, Audit } from "./pages/Operations";

type AppRole = "admin" | "hr_manager" | "employee";
function Workspace({ children, roles }: { children: React.ReactNode; roles?: AppRole[] }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const denied = !loading && (!user || !!(roles && user && !roles.includes(user.role)));
  useEffect(() => {
    if (denied) setLocation(user ? "/dashboard" : "/");
  }, [denied, setLocation, user]);
  if (loading || denied)
    return (
      <div className="grid min-h-screen place-items-center bg-[#F6F0D7]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#9CAB84]/30 border-t-[#89986D]" />
          <span className="text-xs font-semibold text-[#5C6B44]">Authenticating AttendAI workspace…</span>
        </div>
      </div>
    );
  return <DashboardLayout>{children}</DashboardLayout>;
}



import OfficeQrDisplay from "./pages/OfficeQrDisplay";

function Router() { return <Switch>
  <Route path="/"><Home /></Route>
  <Route path="/login"><Home initialAuthOpen={true} /></Route>
  <Route path="/register"><Home initialAuthOpen={true} /></Route>
  <Route path="/dashboard"><Workspace><Dashboard/></Workspace></Route>
  <Route path="/office-qr"><Workspace roles={["admin", "hr_manager"]}><OfficeQrDisplay/></Workspace></Route>
  <Route path="/employees"><Workspace roles={["admin", "hr_manager"]}><Employees/></Workspace></Route>
  <Route path="/departments"><Workspace roles={["admin", "hr_manager"]}><Departments/></Workspace></Route>
  <Route path="/attendance"><Workspace><Attendance/></Workspace></Route>
  <Route path="/leave"><Workspace><Leave/></Workspace></Route>
  <Route path="/notifications"><Workspace><Notifications/></Workspace></Route>
  <Route path="/settings"><Workspace><Settings/></Workspace></Route>
  <Route path="/analytics"><Workspace roles={["admin", "hr_manager"]}><Analytics/></Workspace></Route>
  <Route path="/reports"><Workspace roles={["admin", "hr_manager"]}><Reports/></Workspace></Route>
  <Route path="/intelligence"><Workspace><Intelligence/></Workspace></Route>
  <Route path="/audit"><Workspace roles={["admin"]}><Audit/></Workspace></Route>
  <Route path="/404"><NotFound/></Route><Route><NotFound/></Route>
</Switch>; }

export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light" switchable><TooltipProvider><Toaster richColors position="top-right"/><Router/></TooltipProvider></ThemeProvider></ErrorBoundary>; }
