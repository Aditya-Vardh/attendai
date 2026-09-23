import { useAuth } from "@/_core/hooks/useAuth";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  BrainCircuit,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  FileBarChart,
  FileText,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

/* =========================================================================
   1. ANALYTICS MODULE
   ========================================================================= */
export function Analytics() {
  const { user } = useAuth();
  const isEmployee = user?.role === "employee";

  const trend = trpc.dashboard.trend.useQuery({ days: 30 }, { enabled: !isEmployee });
  const department = trpc.dashboard.departmentSummary.useQuery(undefined, { enabled: !isEmployee });

  if (isEmployee) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Analytics"
          title="Organization Analytics"
          description="Company-wide analytics are restricted to HR Managers and Administrators."
        />
        <div className="p-8 text-center neu-inset text-[#5C6B44] text-xs font-bold">
          Your personal attendance insights are available on your Attendance page.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workforce Intelligence"
        title="Operational Analytics"
        description="30-day attendance trends, late arrival patterns, and department coverage metrics derived from database records."
      />

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        {/* 30-Day Pulse Chart */}
        <Card className="neu-card border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#364322]">30-Day Attendance Movement</h3>
                <p className="text-xs text-[#5C6B44]">Present vs. late arrival trends across all shifts</p>
              </div>
              <Badge className="neu-badge-sage text-xs font-bold">Live Database</Badge>
            </div>

            <div className="mt-6 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend.data ?? []}>
                  <defs>
                    <linearGradient id="analyticsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#9CAB84" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#9CAB84" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#F6F0D7",
                      borderColor: "#D8D2BC",
                      borderRadius: "16px",
                      color: "#364322",
                      boxShadow: "6px 6px 14px #D8D2BC, -6px -6px 14px #FFFFFF",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="present"
                    stroke="#9CAB84"
                    fill="url(#analyticsFill)"
                    strokeWidth={3}
                  />
                  <Area
                    type="monotone"
                    dataKey="late"
                    stroke="#D9534F"
                    fill="transparent"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Department Coverage */}
        <Card className="neu-card border-none">
          <CardContent className="p-6">
            <h3 className="text-base font-bold text-[#364322]">Department Coverage Ratios</h3>
            <p className="text-xs text-[#5C6B44] font-medium mt-0.5">Active employee attendance ratio per department</p>

            <div className="mt-6 space-y-4">
              {department.data?.length ? (
                department.data.map((row: any) => {
                  const percent = row.employeeCount
                    ? Math.round((Number(row.presentCount ?? 0) / Number(row.employeeCount)) * 100)
                    : 0;
                  return (
                    <div key={row.id} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-[#364322]">{row.name}</span>
                        <span className="text-[#89986D]">{percent}%</span>
                      </div>
                      <div className="h-2.5 rounded-full neu-inset overflow-hidden p-0.5">
                        <div
                          style={{ width: `${Math.min(percent, 100)}%` }}
                          className="h-full rounded-full bg-[#9CAB84]"
                        />
                      </div>
                      <p className="text-[11px] text-[#5C6B44] font-medium">{row.employeeCount} active headcount</p>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-[#5C6B44]">No department coverage metrics yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* =========================================================================
   2. REPORTS MODULE (AI EXECUTIVE REPORTS + EXPORTS)
   ========================================================================= */
export function Reports() {
  const [reportType, setReportType] = useState<
    | "daily_attendance"
    | "monthly_attendance"
    | "employee_attendance"
    | "department"
    | "leave"
    | "absence"
    | "anomaly"
  >("monthly_attendance");

  const [generatedReport, setGeneratedReport] = useState<any>(null);
  const utils = trpc.useUtils();

  const history = trpc.reports.list.useQuery({ page: 1, pageSize: 10 });
  const generateMutation = trpc.reports.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedReport(data);
      utils.reports.list.invalidate();
      toast.success("Executive AI Report generated from database metrics.");
    },
    onError: (err) => toast.error(err.message),
  });

  const getExportRows = () =>
    (generatedReport?.rows ?? []).map((row: any) => {
      if (generatedReport?.dataKind === "leave") {
        return {
          date: `${row.leave.startDate} to ${row.leave.endDate}`,
          employee: `${row.employee.firstName} ${row.employee.lastName}`,
          department: row.departmentName ?? "Unassigned",
          detail: row.leave.leaveType,
          status: row.leave.status,
          value: row.leave.reason,
        };
      }
      if (generatedReport?.dataKind === "department") {
        return {
          date: new Date().toLocaleDateString(),
          employee: `${row.employeeCount} active employees`,
          department: row.department.name,
          detail: `${row.attendanceCount} records`,
          status: "Summary",
          value: `${row.presentCount ?? 0} present/late`,
        };
      }
      if (generatedReport?.dataKind === "anomaly") {
        return {
          date: new Date(row.anomaly.detectedAt).toLocaleDateString(),
          employee: row.employee
            ? `${row.employee.firstName} ${row.employee.lastName}`
            : "Organization",
          department: row.departmentName ?? "Organization",
          detail: row.anomaly.ruleCode.replaceAll("_", " "),
          status: row.anomaly.status,
          value: `${row.anomaly.severity} • ${row.anomaly.confidencePercent}% confidence`,
        };
      }
      return {
        date: row.attendance.workDate,
        employee: `${row.employee.firstName} ${row.employee.lastName}`,
        department: row.departmentName ?? "Unassigned",
        detail: `${row.attendance.workMinutes} minutes`,
        status: row.attendance.status,
        value: row.attendance.checkInAt ?? "",
      };
    });

  const exportCsv = () => {
    const rows = getExportRows();
    if (!rows.length) return;

    const headers = "date,employee,department,detail,status,value";
    const body = [
      headers,
      ...rows.map((row: any) =>
        [row.date, row.employee, row.department, row.detail, row.status, row.value]
          .map((val) => `"${String(val).replaceAll('"', '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendai-${reportType}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const rows = getExportRows();
    if (!rows.length) return;

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFontSize(18);
    doc.setTextColor(54, 67, 34);
    doc.text("AttendAI Workforce Executive Report", 40, 50);

    doc.setFontSize(9);
    doc.setTextColor(92, 107, 68);
    doc.text(
      `Report Type: ${reportType.replaceAll("_", " ")} | Generated: ${new Date().toLocaleString()}`,
      40,
      68
    );
    doc.line(40, 78, 555, 78);

    let cursor = 100;
    rows.forEach((row: any, i: number) => {
      const line = `${row.date} | ${row.employee} | ${row.department} | ${row.detail} | ${row.status}`;
      const splitLines = doc.splitTextToSize(line, 515);

      if (cursor + splitLines.length * 12 > 780) {
        doc.addPage();
        cursor = 50;
      }
      doc.setTextColor(54, 67, 34);
      doc.text(splitLines, 40, cursor);
      cursor += splitLines.length * 12 + 6;
    });

    doc.save(`attendai-${reportType}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Executive Intelligence"
        title="Workforce AI Reports"
        description="Generate auditable executive reports based on verified attendance records, export CSV/PDF bundles, and inspect historical generations."
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        {/* Generator Panel */}
        <Card className="neu-card border-none">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center neu-badge-sage">
                <FileBarChart className="h-5 w-5 text-[#2C3917]" />
              </span>
              <div>
                <h3 className="text-base font-bold text-[#364322]">Generate Executive Report</h3>
                <p className="text-xs text-[#5C6B44]">Recorded in audit logs with exact filter payloads</p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-[#364322]">Select Report Type</label>
              <Select
                value={reportType}
                onValueChange={(val: any) => setReportType(val)}
              >
                <SelectTrigger className="neu-input text-xs font-bold text-[#364322]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#F6F0D7] border-none shadow-[8px_8px_20px_#D8D2BC,-8px_-8px_20px_#FFFFFF] rounded-2xl text-[#364322]">
                  <SelectItem value="daily_attendance">Daily Attendance Report</SelectItem>
                  <SelectItem value="monthly_attendance">Monthly Attendance Summary</SelectItem>
                  <SelectItem value="employee_attendance">Employee Performance Report</SelectItem>
                  <SelectItem value="department">Department Coverage Report</SelectItem>
                  <SelectItem value="leave">Leave Utilization Report</SelectItem>
                  <SelectItem value="absence">Absence Spike Report</SelectItem>
                  <SelectItem value="anomaly">AI Anomaly Signal Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => generateMutation.mutate({ reportType, filters: {} })}
              disabled={generateMutation.isPending}
              className="w-full neu-button-primary text-xs h-11"
            >
              {generateMutation.isPending ? "Generating AI Summary…" : "Generate From Database Records"}
            </Button>

            {/* Generated Report Summary Panel */}
            {generatedReport && (
              <div className="neu-card-sage p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#2C3917] uppercase tracking-wider">
                  <Sparkles className="h-4 w-4 text-[#2C3917]" /> AI Executive Summary
                </div>

                <div className="p-3.5 neu-card-sage-inset text-xs text-[#2C3917] space-y-1 font-medium">
                  <p>
                    <span className="font-bold">{generatedReport.summary.totalRecords}</span> total records evaluated •{" "}
                    <span className="font-bold">{generatedReport.summary.lateRecords}</span> late •{" "}
                    <span className="font-bold">{generatedReport.summary.absentRecords}</span> absent
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    size="sm"
                    onClick={exportCsv}
                    disabled={!generatedReport.rows.length}
                    className="neu-button-sage text-xs text-[#2C3917] flex-1 py-2"
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
                  </Button>
                  <Button
                    size="sm"
                    onClick={exportPdf}
                    disabled={!generatedReport.rows.length}
                    className="neu-button-sage text-xs text-[#2C3917] flex-1 py-2"
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Export PDF
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generation History */}
        <Card className="neu-card border-none">
          <CardContent className="p-6">
            <h3 className="text-base font-bold text-[#364322]">Report Generation History</h3>
            <p className="text-xs text-[#5C6B44] font-medium mt-0.5">Auditable log of past generated executive reports</p>

            <div className="mt-5 space-y-3">
              {history.isLoading ? (
                <p className="text-xs text-[#5C6B44]">Loading history…</p>
              ) : history.data?.items.length ? (
                history.data.items.map((item: any) => {
                  const summary = JSON.parse(item.summaryJson || "{}");
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3.5 neu-card-flat text-xs"
                    >
                      <div>
                        <p className="font-bold text-[#364322] capitalize">
                          {item.reportType.replaceAll("_", " ")}
                        </p>
                        <p className="text-[11px] text-[#5C6B44] font-medium">
                          {summary.totalRecords ?? 0} records • {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge className="neu-badge-sage text-[#2C3917] font-bold">
                        #{item.id}
                      </Badge>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-[#5C6B44]">No reports generated yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* =========================================================================
   3. INTELLIGENCE MODULE (AI COPILOT & ANOMALY RADAR)
   ========================================================================= */
export function Intelligence() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<number | undefined>();
  const [severity, setSeverity] = useState("all");

  const isEmployee = user?.role === "employee";

  const anomalies = trpc.intelligence.anomalies.list.useQuery({
    severity: severity === "all" ? undefined : (severity as any),
  });

  const utils = trpc.useUtils();

  const askMutation = trpc.intelligence.copilot.ask.useMutation({
    onSuccess: (result) => {
      setConversationId(result.conversationId);
      const citations = result.evidence?.length
        ? `\n\n---\n**Live AttendAI Data Sources**\n${result.evidence
            .map((item: any) => `- \`${item.name}\` • Verified application dataset`)
            .join("\n")}`
        : "";
      setMessages((curr) => [
        ...curr,
        { role: "assistant", content: `${result.answer}${citations}` },
      ]);
    },
    onError: (err) => {
      toast.error(`Copilot Error: ${err.message}`);
      setMessages((curr) => [
        ...curr,
        {
          role: "assistant",
          content: "I couldn't process that query. Please try again with a specific workforce question.",
        },
      ]);
    },
  });

  const scanMutation = trpc.intelligence.anomalies.scan.useMutation({
    onSuccess: (result) => {
      toast.success(
        result.length
          ? `${result.length} new attendance anomaly alerts detected.`
          : "No new attendance anomalies found."
      );
      utils.intelligence.anomalies.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const acknowledgeMutation = trpc.intelligence.anomalies.acknowledge.useMutation({
    onSuccess: () => {
      toast.success("Anomaly signal acknowledged.");
      utils.intelligence.anomalies.list.invalidate();
    },
  });

  const handleSendMessage = (content: string) => {
    setMessages((curr) => [...curr, { role: "user", content }]);
    askMutation.mutate({ message: content, conversationId });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI Intelligence"
        title="Workforce Intelligence & Anomaly Radar"
        description="Interact with the data-aware Workforce Copilot and inspect factual anomaly explanations generated from workforce signals."
        action={
          !isEmployee
            ? {
                label: scanMutation.isPending ? "Scanning…" : "Run Anomaly Scan",
                onClick: () => scanMutation.mutate(),
              }
            : undefined
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        {/* Futuristic AI Copilot Drawer */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center neu-badge-sage">
              <Bot className="h-5 w-5 text-[#2C3917]" />
            </span>
            <div>
              <h3 className="text-base font-bold text-[#364322]">Workforce Copilot</h3>
              <p className="text-xs text-[#5C6B44] font-medium">
                Connected to role-scoped application tools • Answers from verified data only
              </p>
            </div>
          </div>

          <AIChatBox
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={askMutation.isPending}
            height="580px"
            className="neu-card border-none"
            placeholder="Ask about attendance rates, department coverage, or leave patterns…"
            emptyStateMessage="Ask any authorized question about your workforce attendance, trends, or leave activity."
            suggestedPrompts={
              isEmployee
                ? [
                    "What is my current attendance rate?",
                    "What is the status of my leave applications?",
                  ]
                : [
                    "How much did attendance improve this month?",
                    "Which employees have repeated late arrivals?",
                    "Which department has the lowest attendance today?",
                  ]
            }
          />
        </div>

        {/* Anomaly Radar Feed */}
        <Card className="neu-card border-none">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#364322]">Anomaly Radar</h3>
                <p className="text-xs text-[#5C6B44] font-medium">Deterministic pattern alerts with LLM explanations</p>
              </div>

              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="w-28 neu-input text-xs font-bold text-[#364322] h-9">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="bg-[#F6F0D7] border-none shadow-[8px_8px_20px_#D8D2BC,-8px_-8px_20px_#FFFFFF] rounded-2xl text-[#364322]">
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 pt-1">
              {anomalies.isLoading ? (
                <p className="text-xs text-[#5C6B44]">Loading AI signals…</p>
              ) : anomalies.data?.length ? (
                anomalies.data.map((row: any) => (
                  <div
                    key={row.anomaly.id}
                    className="p-4 neu-card-flat space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#364322]">
                        {row.employee
                          ? `${row.employee.firstName} ${row.employee.lastName}`
                          : row.departmentName ?? "Organization"}
                      </span>
                      <SeverityBadge value={row.anomaly.severity} />
                    </div>

                    <p className="text-[11px] text-[#89986D] font-mono font-bold">
                      {row.anomaly.ruleCode.replaceAll("_", " ")} • {row.anomaly.confidencePercent}% confidence
                    </p>

                    <p className="text-[#364322] leading-relaxed font-medium">{row.anomaly.explanation}</p>

                    <div className="flex items-center justify-between pt-2 border-t border-[#D8D2BC]/60 text-[11px]">
                      <span className="text-[#5C6B44] capitalize font-semibold">Status: {row.anomaly.status}</span>
                      {!isEmployee && row.anomaly.status === "open" && (
                        <Button
                          size="sm"
                          onClick={() => acknowledgeMutation.mutate({ id: row.anomaly.id })}
                          className="neu-button text-[11px] h-7 px-3 cursor-pointer"
                        >
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#5C6B44]">No anomaly signals open.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SeverityBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    low: "neu-badge text-[#364322]",
    medium: "neu-badge-sage text-[#2C3917] font-bold",
    high: "bg-[#D9534F] text-white font-bold",
    critical: "bg-red-700 text-white font-black",
  };

  return (
    <Badge className={`${styles[value] ?? "neu-badge text-[#364322]"} capitalize text-[10px] px-2.5 py-0.5`}>
      {value}
    </Badge>
  );
}

/* =========================================================================
   4. AUDIT TRAIL MODULE
   ========================================================================= */
export function Audit() {
  const [search, setSearch] = useState("");
  const list = trpc.audit.list.useQuery({ page: 1, pageSize: 50, search: search || undefined });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Compliance & Security"
        title="Audit Trail"
        description="Immutable record of sensitive workforce actions, report generations, and system configuration modifications."
      />

      <Card className="neu-card border-none">
        <CardContent className="p-0">
          <div className="p-4 border-b border-[#D8D2BC]/60 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-[#89986D] text-xs font-extrabold">
              <ShieldCheck className="h-4 w-4" /> SECURE AUDIT LOG
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#89986D]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search action or resource…"
                className="pl-9 neu-input text-xs h-9 font-medium"
              />
            </div>
          </div>

          <div className="divide-y divide-[#D8D2BC]/40 text-xs">
            {list.isLoading ? (
              <p className="p-8 text-center text-[#5C6B44] font-medium">Loading audit log events…</p>
            ) : list.data?.items.length ? (
              list.data.items.map((item: any) => (
                <div
                  key={item.log.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-[#C5D89D]/20 transition-colors"
                >
                  <div>
                    <p className="font-bold text-[#364322]">{item.log.action.replaceAll(".", " • ")}</p>
                    <p className="text-[11px] text-[#5C6B44] font-medium mt-0.5">
                      Actor: {item.actorName ?? item.actorEmail ?? "System"} • Resource: {item.log.resourceType}
                      {item.log.resourceId ? ` #${item.log.resourceId}` : ""}
                    </p>
                  </div>
                  <span className="font-mono text-[11px] text-[#89986D] font-bold">
                    {new Date(item.log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="p-8 text-center text-[#5C6B44] font-medium">No audit events match your search.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

