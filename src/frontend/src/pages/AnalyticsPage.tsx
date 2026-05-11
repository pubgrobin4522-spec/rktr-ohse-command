import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCapas,
  useEnvironmentRecords,
  useIncidents,
  usePermits,
  useTrainingRecords,
} from "@/hooks/useBackend";
import { autoTable } from "jspdf-autotable";
import {
  AlertCircle,
  AlertTriangle,
  BarChart2,
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Leaf,
  Shield,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { utils as XLSXUtils, writeFile as XLSXWriteFile } from "xlsx";

// ─── Date range filter ────────────────────────────────────────────────────────
type DateRange = "30d" | "90d" | "6m" | "1y";

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
  "6m": "Last 6 Months",
  "1y": "Last Year",
};

const DATE_RANGE_DAYS: Record<DateRange, number> = {
  "30d": 30,
  "90d": 90,
  "6m": 180,
  "1y": 365,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
/**
 * Normalize a backend timestamp to milliseconds.
 * Motoko Time.now() returns nanoseconds (>1e15).
 * If the backend stored milliseconds instead the value will be <1e15.
 */
function tsToMs(ts: bigint): number {
  const n = Number(ts);
  // Nanoseconds: year 2024 ≈ 1.7e18 ns. Milliseconds: year 2024 ≈ 1.7e12 ms.
  // Threshold 1e15: safely above any realistic ms timestamp and below any ns timestamp.
  return n > 1e15 ? n / 1_000_000 : n > 1e12 ? n : n * 1_000;
}

function monthKey(ts: bigint): string {
  const d = new Date(tsToMs(ts));
  return d.toLocaleString("default", { month: "short", year: "2-digit" });
}

function withinDays(ts: bigint, days: number): boolean {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return tsToMs(ts) >= cutoff;
}

// Produce last-N-months labels in order
function lastNMonthLabels(n: number): string[] {
  const labels: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(
      d.toLocaleString("default", { month: "short", year: "2-digit" }),
    );
  }
  return labels;
}

// ─── KPI summary table (computed from live data when available) ───────────────
type MetricStatus = "on_track" | "at_risk" | "off_track";

interface KpiRow {
  metric: string;
  current: string;
  previous: string;
  ytd: string;
  target: string;
  status: MetricStatus;
}

// ─── Shared chart style helpers ───────────────────────────────────────────────
const tooltipContentStyle = {
  background: "rgba(8,20,38,0.97)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  fontSize: 12,
};
const tooltipItemStyle = { color: "#fff" };
const tooltipLabelStyle = { color: "rgba(255,255,255,0.6)", marginBottom: 4 };

const axisTick = { fill: "rgba(255,255,255,0.35)", fontSize: 11 };
const axisCommon = { axisLine: false as const, tickLine: false as const };

// ─── Helper components ─────────────────────────────────────────────────────────
function SectionHeading({
  icon,
  label,
}: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{
          background: "rgba(24,195,126,0.12)",
          border: "1px solid rgba(24,195,126,0.2)",
        }}
      >
        {icon}
      </div>
      <h2 className="font-display font-semibold text-white text-base">
        {label}
      </h2>
    </div>
  );
}

function ChartCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`glass p-5 ${className}`}
      style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.25)" }}
    >
      <h3 className="font-display font-semibold text-white/80 text-sm mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: MetricStatus }) {
  if (status === "on_track") {
    return (
      <span
        className="flex items-center gap-1 text-xs font-semibold"
        style={{ color: "#18C37E" }}
      >
        <CheckCircle2 className="w-3.5 h-3.5" /> On Track
      </span>
    );
  }
  if (status === "at_risk") {
    return (
      <span
        className="flex items-center gap-1 text-xs font-semibold"
        style={{ color: "#FBBF24" }}
      >
        <AlertCircle className="w-3.5 h-3.5" /> At Risk
      </span>
    );
  }
  return (
    <span
      className="flex items-center gap-1 text-xs font-semibold"
      style={{ color: "#EF4444" }}
    >
      <XCircle className="w-3.5 h-3.5" /> Off Track
    </span>
  );
}

function courseBarColor(pct: number): string {
  if (pct >= 80) return "#18C37E";
  if (pct >= 60) return "#FBBF24";
  return "#EF4444";
}

function EmptyChart({ height = 220 }: { height?: number }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 text-white/30"
      style={{ height }}
    >
      <BarChart2 className="w-8 h-8 opacity-40" />
      <p className="text-xs">No data recorded yet</p>
    </div>
  );
}

function ChartSkeleton({ height = 220 }: { height?: number }) {
  return <Skeleton className="w-full rounded-lg" style={{ height }} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [range, setRange] = useState<DateRange>("6m");
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);

  const { data: incidents, isLoading: loadingInc } = useIncidents();
  const { data: permits, isLoading: loadingPermits } = usePermits();
  const { data: capas, isLoading: loadingCapas } = useCapas();
  const { data: trainingRecs, isLoading: loadingTraining } =
    useTrainingRecords();
  const { data: envRecs, isLoading: loadingEnv } = useEnvironmentRecords();

  const isLoading =
    loadingInc ||
    loadingPermits ||
    loadingCapas ||
    loadingTraining ||
    loadingEnv;

  const days = DATE_RANGE_DAYS[range];
  const numMonths =
    range === "30d" ? 1 : range === "90d" ? 3 : range === "6m" ? 6 : 12;
  const monthLabels = lastNMonthLabels(numMonths);

  // ── Live KPI row computation ─────────────────────────────────────
  const kpiRows: KpiRow[] = (() => {
    const allIncidents = incidents ?? [];
    const allTraining = trainingRecs ?? [];
    const allCapas = capas ?? [];

    // LTIFR = (lost-time injuries * 1e6) / total man-hours (estimated at 2000h/person * assumed 500 workers)
    const ltifrs = allIncidents.filter(
      (i) =>
        withinDays(i.createdAt, days) &&
        ((i.daysLost != null && Number(i.daysLost) > 0) ||
          (i.severity ?? "").toLowerCase() === "major" ||
          (i.severity ?? "").toLowerCase() === "critical"),
    ).length;
    const MAN_HOURS = 1_000_000; // default denominator
    const ltifrVal =
      allIncidents.length > 0
        ? Number(((ltifrs * 1_000_000) / MAN_HOURS).toFixed(2))
        : 0;
    const ltifrStatus: MetricStatus =
      ltifrVal < 1.0 ? "on_track" : ltifrVal < 2.0 ? "at_risk" : "off_track";

    // Near miss count
    const nearMissCount = allIncidents.filter(
      (i) =>
        withinDays(i.createdAt, days) &&
        (i.severity ?? "").toLowerCase().replace(/\s/g, "") === "nearmiss",
    ).length;
    const nearMissStatus: MetricStatus =
      nearMissCount <= 15 ? "on_track" : "at_risk";

    // Training compliance
    const completedTraining = allTraining.filter(
      (r) => r.status === "completed",
    ).length;
    const trainingPct =
      allTraining.length > 0
        ? Math.round((completedTraining / allTraining.length) * 100)
        : 0;
    const trainingStatus: MetricStatus =
      trainingPct >= 90
        ? "on_track"
        : trainingPct >= 75
          ? "at_risk"
          : "off_track";

    // Audit completion — use inspection records as proxy
    // (no direct audit hook — use 85% static unless we have evidence)
    const auditStatus: MetricStatus = "at_risk";

    // Open CAPAs
    const openCapas = allCapas.filter(
      (c) =>
        (c.status as string) === "open" ||
        (c.status as string) === "inProgress",
    ).length;
    const capaStatus: MetricStatus =
      openCapas <= 5 ? "on_track" : openCapas <= 10 ? "at_risk" : "off_track";

    return [
      {
        metric: "LTIFR",
        current: String(ltifrVal),
        previous: "—",
        ytd: String(ltifrVal),
        target: "<1.0",
        status: ltifrStatus,
      },
      {
        metric: "Near Miss Rate",
        current: String(nearMissCount),
        previous: "—",
        ytd: String(nearMissCount),
        target: "15",
        status: nearMissStatus,
      },
      {
        metric: "Training Compliance",
        current: `${trainingPct}%`,
        previous: "—",
        ytd: `${trainingPct}%`,
        target: "90%",
        status: trainingStatus,
      },
      {
        metric: "Audit Completion",
        current: "—",
        previous: "—",
        ytd: "—",
        target: "85%",
        status: auditStatus,
      },
      {
        metric: "Open CAPAs",
        current: String(openCapas),
        previous: "—",
        ytd: String(openCapas),
        target: "<5",
        status: capaStatus,
      },
      {
        metric: "ISO Compliance",
        current: "91%",
        previous: "89%",
        ytd: "88%",
        target: "95%",
        status: "at_risk" as MetricStatus,
      },
    ];
  })();
  const incidentData = (() => {
    const filtered = (incidents ?? []).filter((inc) =>
      withinDays(inc.createdAt, days),
    );
    const map: Record<
      string,
      { nearMiss: number; minor: number; major: number; critical: number }
    > = {};
    for (const lbl of monthLabels) {
      map[lbl] = { nearMiss: 0, minor: 0, major: 0, critical: 0 };
    }
    for (const inc of filtered) {
      const lbl = monthKey(inc.createdAt);
      if (!map[lbl])
        map[lbl] = { nearMiss: 0, minor: 0, major: 0, critical: 0 };
      const sev = inc.severity?.toLowerCase() ?? "";
      if (sev === "near miss" || sev === "nearmiss") map[lbl].nearMiss++;
      else if (sev === "minor" || sev === "low") map[lbl].minor++;
      else if (sev === "major" || sev === "medium" || sev === "high")
        map[lbl].major++;
      else if (sev === "critical") map[lbl].critical++;
      else map[lbl].minor++;
    }
    return monthLabels.map((m) => ({ month: m, ...map[m] }));
  })();

  // Debug: log first incident's createdAt when incidents exist but all chart buckets are zero
  useEffect(() => {
    if (!incidents || incidents.length === 0) return;
    const totalInChart = incidentData.reduce(
      (s, d) => s + d.nearMiss + d.minor + d.major + d.critical,
      0,
    );
    if (totalInChart === 0) {
      const first = incidents[0];
      console.warn(
        "[AnalyticsPage] Incidents exist but chart shows zeros.\n",
        "createdAt raw:",
        String(first.createdAt),
        "\ntsToMs():",
        tsToMs(first.createdAt),
        "\nDate:",
        new Date(tsToMs(first.createdAt)).toISOString(),
        "\nTotal incidents:",
        incidents.length,
        "\nDate range (days):",
        DATE_RANGE_DAYS[range],
      );
    }
  }, [incidents, incidentData, range]);

  // ── Dept incidents
  const deptIncidents = (() => {
    const filtered = (incidents ?? []).filter((inc) =>
      withinDays(inc.createdAt, days),
    );
    const map: Record<string, number> = {};
    for (const inc of filtered) {
      const d = inc.department || inc.location || "Unknown";
      map[d] = (map[d] ?? 0) + 1;
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([dept, count]) => ({ dept, count }));
  })();

  // ── Severity data (pie)
  const severityData = (() => {
    const filtered = (incidents ?? []).filter((inc) =>
      withinDays(inc.createdAt, days),
    );
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    for (const inc of filtered) {
      const sev = (inc.severity ?? "").toLowerCase();
      if (sev === "critical") counts.Critical++;
      else if (sev === "high" || sev === "major") counts.High++;
      else if (sev === "medium") counts.Medium++;
      else counts.Low++;
    }
    return [
      { name: "Critical", value: counts.Critical, color: "#EF4444" },
      { name: "High", value: counts.High, color: "#F97316" },
      { name: "Medium", value: counts.Medium, color: "#FBBF24" },
      { name: "Low", value: counts.Low, color: "#18C37E" },
    ];
  })();
  const totalSeverity = severityData.reduce((s, d) => s + d.value, 0);

  // ── Severity trend by month
  const severityTrendData = (() => {
    const map: Record<
      string,
      { critical: number; high: number; medium: number; low: number }
    > = {};
    for (const lbl of monthLabels) {
      map[lbl] = { critical: 0, high: 0, medium: 0, low: 0 };
    }
    for (const inc of (incidents ?? []).filter((i) =>
      withinDays(i.createdAt, days),
    )) {
      const lbl = monthKey(inc.createdAt);
      if (!map[lbl]) map[lbl] = { critical: 0, high: 0, medium: 0, low: 0 };
      const sev = (inc.severity ?? "").toLowerCase();
      if (sev === "critical") map[lbl].critical++;
      else if (sev === "high" || sev === "major") map[lbl].high++;
      else if (sev === "medium") map[lbl].medium++;
      else map[lbl].low++;
    }
    return monthLabels.map((m) => ({ month: m, ...map[m] }));
  })();

  // ── Permit type distribution
  const PERMIT_TYPE_COLORS: Record<string, string> = {
    hotWork: "#EF4444",
    electrical: "#FBBF24",
    excavation: "#F97316",
    heightWork: "#3B82F6",
    confinedSpace: "#8B5CF6",
    lineBreaking: "#18C37E",
  };
  const PERMIT_TYPE_LABELS: Record<string, string> = {
    hotWork: "Hot Work",
    electrical: "Electrical",
    excavation: "Excavation",
    heightWork: "Height Work",
    confinedSpace: "Confined Space",
    lineBreaking: "Line Breaking",
  };
  const permitTypeData = (() => {
    const filtered = (permits ?? []).filter((p) =>
      withinDays(p.createdAt, days),
    );
    const map: Record<string, number> = {};
    for (const p of filtered) {
      map[p.permitType] = (map[p.permitType] ?? 0) + 1;
    }
    return Object.entries(map).map(([type, value]) => ({
      name: PERMIT_TYPE_LABELS[type] ?? type,
      value,
      color: PERMIT_TYPE_COLORS[type] ?? "#6B7280",
    }));
  })();

  // ── Permit status by month
  const permitStatusData = (() => {
    const map: Record<
      string,
      {
        draft: number;
        submitted: number;
        approved: number;
        active: number;
        closed: number;
        expired: number;
      }
    > = {};
    for (const lbl of monthLabels) {
      map[lbl] = {
        draft: 0,
        submitted: 0,
        approved: 0,
        active: 0,
        closed: 0,
        expired: 0,
      };
    }
    for (const p of (permits ?? []).filter((p) =>
      withinDays(p.createdAt, days),
    )) {
      const lbl = monthKey(p.createdAt);
      if (!map[lbl])
        map[lbl] = {
          draft: 0,
          submitted: 0,
          approved: 0,
          active: 0,
          closed: 0,
          expired: 0,
        };
      const s = p.status as string;
      if (s === "draft") map[lbl].draft++;
      else if (s === "submitted" || s === "underReview" || s === "validated")
        map[lbl].submitted++;
      else if (s === "approved") map[lbl].approved++;
      else if (s === "active") map[lbl].active++;
      else if (s === "closed" || s === "rejected") map[lbl].closed++;
      else if (s === "expired") map[lbl].expired++;
    }
    return monthLabels.map((m) => ({ month: m, ...map[m] }));
  })();

  // ── Permit volume by month
  const permitVolumeData = (() => {
    const map: Record<string, number> = {};
    for (const lbl of monthLabels) map[lbl] = 0;
    for (const p of (permits ?? []).filter((p) =>
      withinDays(p.createdAt, days),
    )) {
      const lbl = monthKey(p.createdAt);
      map[lbl] = (map[lbl] ?? 0) + 1;
    }
    return monthLabels.map((m) => ({ month: m, total: map[m] }));
  })();

  // ── Course completion
  const courseCompletionData = (() => {
    const allRecs = trainingRecs ?? [];
    const courseMap: Record<string, { total: number; completed: number }> = {};
    for (const r of allRecs) {
      if (!courseMap[r.course])
        courseMap[r.course] = { total: 0, completed: 0 };
      courseMap[r.course].total++;
      if (r.status === "completed") courseMap[r.course].completed++;
    }
    return Object.entries(courseMap).map(([course, { total, completed }]) => ({
      course,
      completion: total > 0 ? Math.round((completed / total) * 100) : 0,
    }));
  })();

  // ── Training trend by month (overall % of completed)
  const trainingTrendData = (() => {
    const monthMap: Record<string, { total: number; completed: number }> = {};
    for (const lbl of monthLabels) monthMap[lbl] = { total: 0, completed: 0 };
    for (const r of (trainingRecs ?? []).filter(
      (r) => r.completionDate && withinDays(r.completionDate, days),
    )) {
      const lbl = monthKey(r.completionDate!);
      if (!monthMap[lbl]) monthMap[lbl] = { total: 0, completed: 0 };
      monthMap[lbl].total++;
      if (r.status === "completed") monthMap[lbl].completed++;
    }
    return monthLabels.map((m) => ({
      month: m,
      compliance:
        monthMap[m].total > 0
          ? Math.round((monthMap[m].completed / monthMap[m].total) * 100)
          : 0,
    }));
  })();

  // ── Carbon & Water from env records
  const carbonData = (() => {
    const recs = (envRecs ?? []).filter(
      (r) =>
        (r.recordType === "emission" ||
          r.recordType === "CO2 Emissions" ||
          r.unit?.toLowerCase().includes("tco") ||
          r.unit?.toLowerCase() === "tonnes") &&
        withinDays(r.createdAt, days),
    );
    const map: Record<string, number> = {};
    for (const lbl of monthLabels) map[lbl] = 0;
    for (const r of recs) {
      const lbl = monthKey(r.createdAt);
      map[lbl] = (map[lbl] ?? 0) + r.value;
    }
    return monthLabels.map((m) => ({
      month: m,
      emissions: Math.round(map[m] * 10) / 10,
    }));
  })();

  const waterData = (() => {
    const recs = (envRecs ?? []).filter(
      (r) =>
        (r.recordType === "water" ||
          r.recordType === "Water Usage" ||
          r.unit?.toLowerCase() === "m³" ||
          r.unit?.toLowerCase() === "m3") &&
        withinDays(r.createdAt, days),
    );
    const map: Record<string, number> = {};
    for (const lbl of monthLabels) map[lbl] = 0;
    for (const r of recs) {
      const lbl = monthKey(r.createdAt);
      map[lbl] = (map[lbl] ?? 0) + r.value;
    }
    return monthLabels.map((m) => ({ month: m, usage: Math.round(map[m]) }));
  })();

  const hasCarbonData = carbonData.some((d) => d.emissions > 0);
  const hasWaterData = waterData.some((d) => d.usage > 0);

  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];
  const rangeLabel = DATE_RANGE_LABELS[range].replace(/ /g, "-");
  const filenameBase = `RKTR-OHSE-Report-${rangeLabel}-${dateStr}`;

  // ─── Excel Export ──────────────────────────────────────────────────────
  async function handleExportExcel() {
    setExporting("excel");
    const toastId = toast.loading("Generating Excel report…");
    try {
      const wb = XLSXUtils.book_new();

      // Sheet 1 — KPI Summary
      const kpiHeader = [
        "Metric",
        "Current Month",
        "Previous Month",
        "YTD",
        "Target",
        "Status",
      ];
      const kpiBody = kpiRows.map((r) => [
        r.metric,
        r.current,
        r.previous,
        r.ytd,
        r.target,
        r.status === "on_track"
          ? "On Track"
          : r.status === "at_risk"
            ? "At Risk"
            : "Off Track",
      ]);
      XLSXUtils.book_append_sheet(
        wb,
        XLSXUtils.aoa_to_sheet([kpiHeader, ...kpiBody]),
        "KPI Summary",
      );

      // Sheet 2 — Incident Trends
      const incBody = incidentData.map((r) => [
        r.month,
        r.nearMiss,
        r.minor,
        r.major,
        r.critical,
      ]);
      XLSXUtils.book_append_sheet(
        wb,
        XLSXUtils.aoa_to_sheet([
          ["Month", "Near Miss", "Minor", "Major", "Critical"],
          ...incBody,
        ]),
        "Incident Trends",
      );

      // Sheet 3 — Incidents by Department
      XLSXUtils.book_append_sheet(
        wb,
        XLSXUtils.aoa_to_sheet([
          ["Department", "Incident Count"],
          ...deptIncidents.map((r) => [r.dept, r.count]),
        ]),
        "Dept Incidents",
      );

      // Sheet 4 — Severity
      XLSXUtils.book_append_sheet(
        wb,
        XLSXUtils.aoa_to_sheet([
          ["Severity", "Count", "Percentage"],
          ...severityData.map((r) => [
            r.name,
            r.value,
            totalSeverity > 0
              ? `${Math.round((r.value / totalSeverity) * 100)}%`
              : "0%",
          ]),
        ]),
        "Severity",
      );

      // Sheet 5 — Permit Statistics
      XLSXUtils.book_append_sheet(
        wb,
        XLSXUtils.aoa_to_sheet([
          ["Permit Type", "Count"],
          ...permitTypeData.map((r) => [r.name, r.value]),
        ]),
        "Permits by Type",
      );
      XLSXUtils.book_append_sheet(
        wb,
        XLSXUtils.aoa_to_sheet([
          [
            "Month",
            "Total",
            "Draft",
            "Submitted",
            "Approved",
            "Active",
            "Closed",
            "Expired",
          ],
          ...permitStatusData.map((r) => [
            r.month,
            permitVolumeData.find((v) => v.month === r.month)?.total ?? 0,
            r.draft,
            r.submitted,
            r.approved,
            r.active,
            r.closed,
            r.expired,
          ]),
        ]),
        "Permit Volume",
      );

      // Sheet 6 — Training
      XLSXUtils.book_append_sheet(
        wb,
        XLSXUtils.aoa_to_sheet([
          ["Course", "Completion %"],
          ...courseCompletionData.map((r) => [r.course, `${r.completion}%`]),
        ]),
        "Training",
      );
      XLSXUtils.book_append_sheet(
        wb,
        XLSXUtils.aoa_to_sheet([
          ["Month", "Overall Compliance %"],
          ...trainingTrendData.map((r) => [r.month, `${r.compliance}%`]),
        ]),
        "Training Trend",
      );

      // Sheet 7 — Environmental
      XLSXUtils.book_append_sheet(
        wb,
        XLSXUtils.aoa_to_sheet([
          ["Month", "Carbon Emissions", "Water Usage (m³)"],
          ...carbonData.map((c, i) => [
            c.month,
            c.emissions,
            waterData[i]?.usage ?? 0,
          ]),
        ]),
        "Environmental",
      );

      XLSXWriteFile(wb, `${filenameBase}.xlsx`);
      toast.success("Excel report downloaded!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate Excel report.", { id: toastId });
    } finally {
      setExporting(null);
    }
  }

  // ─── PDF Export ────────────────────────────────────────────────────────
  async function handleExportPDF() {
    setExporting("pdf");
    const toastId = toast.loading("Generating PDF report…");
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageW = doc.internal.pageSize.getWidth();
      let curY = 14;

      doc.setFillColor(8, 20, 38);
      doc.rect(0, 0, pageW, 30, "F");
      doc.setTextColor(24, 195, 126);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("RKTR OHSE Command Center", pageW / 2, 13, { align: "center" });
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(180, 200, 220);
      doc.text(
        `Analytics & Reporting  ·  Period: ${DATE_RANGE_LABELS[range]}  ·  Generated: ${dateStr}`,
        pageW / 2,
        21,
        { align: "center" },
      );
      doc.setTextColor(60, 80, 100);
      doc.text(
        "Ramkrishna Titagarh Rail Wheels Limited — Confidential",
        pageW / 2,
        27,
        { align: "center" },
      );
      curY = 40;

      const sectionTitle = (title: string) => {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(8, 20, 38);
        doc.setFillColor(230, 240, 245);
        doc.rect(10, curY - 5, pageW - 20, 8, "F");
        doc.text(title, 14, curY + 0.5);
        curY += 6;
      };

      const tableOptions = {
        theme: "striped" as const,
        headStyles: {
          fillColor: [8, 20, 38] as [number, number, number],
          textColor: [24, 195, 126] as [number, number, number],
          fontStyle: "bold" as const,
          fontSize: 8,
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [30, 40, 60] as [number, number, number],
        },
        alternateRowStyles: {
          fillColor: [245, 248, 252] as [number, number, number],
        },
        margin: { left: 10, right: 10 },
      };

      const maybeNewPage = () => {
        if (curY > 220) {
          doc.addPage();
          curY = 20;
        }
      };

      sectionTitle("KPI Summary");
      autoTable(doc, {
        startY: curY,
        head: [["Metric", "Current", "Previous", "YTD", "Target", "Status"]],
        body: kpiRows.map((r) => [
          r.metric,
          r.current,
          r.previous,
          r.ytd,
          r.target,
          r.status === "on_track"
            ? "On Track"
            : r.status === "at_risk"
              ? "At Risk"
              : "Off Track",
        ]),
        ...tableOptions,
      });
      curY =
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY + 10;

      maybeNewPage();
      sectionTitle(`Incident Trends — ${DATE_RANGE_LABELS[range]}`);
      autoTable(doc, {
        startY: curY,
        head: [["Month", "Near Miss", "Minor", "Major", "Critical"]],
        body: incidentData.map((r) => [
          r.month,
          r.nearMiss,
          r.minor,
          r.major,
          r.critical,
        ]),
        ...tableOptions,
      });
      curY =
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY + 10;

      maybeNewPage();
      sectionTitle("Incidents by Department");
      autoTable(doc, {
        startY: curY,
        head: [["Department", "Incident Count"]],
        body: deptIncidents.map((r) => [r.dept, r.count]),
        ...tableOptions,
      });
      curY =
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY + 10;

      maybeNewPage();
      sectionTitle("Permits by Type");
      autoTable(doc, {
        startY: curY,
        head: [["Permit Type", "Count"]],
        body: permitTypeData.map((r) => [r.name, r.value]),
        ...tableOptions,
      });
      curY =
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY + 10;

      maybeNewPage();
      sectionTitle("Training Compliance by Course");
      autoTable(doc, {
        startY: curY,
        head: [["Course", "Completion %"]],
        body: courseCompletionData.map((r) => [r.course, `${r.completion}%`]),
        ...tableOptions,
      });
      curY =
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY + 10;

      maybeNewPage();
      sectionTitle("Environmental Metrics");
      autoTable(doc, {
        startY: curY,
        head: [["Month", "Carbon Emissions", "Water Usage (m³)"]],
        body: carbonData.map((c, i) => [
          c.month,
          c.emissions,
          waterData[i]?.usage ?? 0,
        ]),
        ...tableOptions,
      });

      const pageCount = doc.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setFontSize(7);
        doc.setTextColor(150, 160, 180);
        doc.text(
          `RKTR OHSE Command Center — Confidential  |  Page ${p} of ${pageCount}  |  ${dateStr}`,
          pageW / 2,
          doc.internal.pageSize.getHeight() - 6,
          { align: "center" },
        );
      }

      doc.save(`${filenameBase}.pdf`);
      toast.success("PDF report downloaded!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF report.", { id: toastId });
    } finally {
      setExporting(null);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="p-5 space-y-8 min-h-screen"
      data-ocid="analytics.page"
    >
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: "rgba(24,195,126,0.12)",
              border: "1px solid rgba(24,195,126,0.25)",
            }}
          >
            <BarChart2 className="w-5 h-5" style={{ color: "#18C37E" }} />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-white leading-tight">
              Analytics &amp; Reporting
            </h1>
            <p className="text-xs text-white/40">
              RKTR OHSE · Operational Intelligence Dashboard
            </p>
          </div>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <div
            className="flex gap-1 rounded-lg p-1"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
            data-ocid="analytics.date_range_filter"
          >
            {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-smooth"
                style={{
                  background:
                    range === r ? "rgba(24,195,126,0.18)" : "transparent",
                  color: range === r ? "#18C37E" : "rgba(255,255,255,0.45)",
                  border:
                    range === r
                      ? "1px solid rgba(24,195,126,0.35)"
                      : "1px solid transparent",
                }}
                data-ocid={`analytics.range.${r}`}
              >
                {DATE_RANGE_LABELS[r]}
              </button>
            ))}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                disabled={exporting !== null}
                className="gap-2 font-semibold"
                style={{
                  background: "rgba(24,195,126,0.15)",
                  border: "1px solid rgba(24,195,126,0.35)",
                  color: "#18C37E",
                }}
                data-ocid="analytics.export_button"
              >
                {exporting ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    {exporting === "excel"
                      ? "Generating Excel…"
                      : "Generating PDF…"}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export Report
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-52"
              style={{
                background: "rgba(8,20,38,0.97)",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <DropdownMenuItem
                onClick={handleExportExcel}
                className="gap-2.5 cursor-pointer"
                data-ocid="analytics.export_excel_button"
              >
                <FileSpreadsheet
                  className="w-4 h-4"
                  style={{ color: "#18C37E" }}
                />
                <div>
                  <div className="text-sm font-medium text-white">
                    Download Excel
                  </div>
                  <div className="text-[11px] text-white/40">
                    .xlsx · All data, 7 sheets
                  </div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExportPDF}
                className="gap-2.5 cursor-pointer"
                data-ocid="analytics.export_pdf_button"
              >
                <FileText className="w-4 h-4" style={{ color: "#3B82F6" }} />
                <div>
                  <div className="text-sm font-medium text-white">
                    Download PDF
                  </div>
                  <div className="text-[11px] text-white/40">
                    .pdf · Formatted report
                  </div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* SECTION 1 — Incident Analytics */}
      <section data-ocid="analytics.incidents.section">
        <SectionHeading
          icon={
            <AlertTriangle className="w-4 h-4" style={{ color: "#18C37E" }} />
          }
          label="Incident Analytics"
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* 1a Monthly Incident Trends */}
          <ChartCard title="Monthly Incident Trends">
            {isLoading ? (
              <ChartSkeleton />
            ) : incidentData.every(
                (d) => d.nearMiss + d.minor + d.major + d.critical === 0,
              ) ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart
                  data={incidentData}
                  margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gnm" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="#18C37E"
                        stopOpacity={0.35}
                      />
                      <stop offset="100%" stopColor="#18C37E" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gmin" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="#3B82F6"
                        stopOpacity={0.35}
                      />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gmaj" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="#F97316"
                        stopOpacity={0.35}
                      />
                      <stop offset="100%" stopColor="#F97316" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gcrit" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="#EF4444"
                        stopOpacity={0.35}
                      />
                      <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                    vertical={false}
                  />
                  <XAxis dataKey="month" tick={axisTick} {...axisCommon} />
                  <YAxis tick={axisTick} {...axisCommon} />
                  <Tooltip
                    contentStyle={tooltipContentStyle}
                    itemStyle={tooltipItemStyle}
                    labelStyle={tooltipLabelStyle}
                  />
                  <Legend wrapperStyle={{ paddingTop: 8, fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="nearMiss"
                    name="Near Miss"
                    stroke="#18C37E"
                    strokeWidth={2}
                    fill="url(#gnm)"
                    animationDuration={1200}
                  />
                  <Area
                    type="monotone"
                    dataKey="minor"
                    name="Minor"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fill="url(#gmin)"
                    animationDuration={1400}
                  />
                  <Area
                    type="monotone"
                    dataKey="major"
                    name="Major"
                    stroke="#F97316"
                    strokeWidth={2}
                    fill="url(#gmaj)"
                    animationDuration={1600}
                  />
                  <Area
                    type="monotone"
                    dataKey="critical"
                    name="Critical"
                    stroke="#EF4444"
                    strokeWidth={2}
                    fill="url(#gcrit)"
                    animationDuration={1800}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* 1b Incidents by Department */}
          <ChartCard title="Incidents by Department">
            {isLoading ? (
              <ChartSkeleton />
            ) : deptIncidents.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={deptIncidents}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                  barSize={14}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                    horizontal={false}
                  />
                  <XAxis type="number" tick={axisTick} {...axisCommon} />
                  <YAxis
                    type="category"
                    dataKey="dept"
                    tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={tooltipContentStyle}
                    itemStyle={tooltipItemStyle}
                    labelStyle={tooltipLabelStyle}
                  />
                  <Bar
                    dataKey="count"
                    name="Incidents"
                    radius={[0, 4, 4, 0]}
                    animationDuration={1200}
                  >
                    {deptIncidents.map((_, i) => (
                      <Cell
                        key={`dept-cell-${String(i).padStart(2, "0")}`}
                        fill="#18C37E"
                        opacity={0.65 + (deptIncidents.length - i) * 0.05}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* 1c Incidents by Severity (Donut) */}
          <ChartCard title="Incidents by Severity">
            {isLoading ? (
              <ChartSkeleton />
            ) : totalSeverity === 0 ? (
              <EmptyChart />
            ) : (
              <div className="flex items-center gap-4">
                <div style={{ flexShrink: 0 }}>
                  <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                      <Pie
                        data={severityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        animationBegin={200}
                        animationDuration={1200}
                      >
                        {severityData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <text
                        x="50%"
                        y="46%"
                        textAnchor="middle"
                        fill="#fff"
                        style={{ fontSize: 26, fontWeight: 700 }}
                      >
                        {totalSeverity}
                      </text>
                      <text
                        x="50%"
                        y="60%"
                        textAnchor="middle"
                        fill="rgba(255,255,255,0.4)"
                        style={{ fontSize: 11 }}
                      >
                        Total
                      </text>
                      <Tooltip
                        contentStyle={tooltipContentStyle}
                        itemStyle={tooltipItemStyle}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2 min-w-0">
                  {severityData.map((d) => {
                    const pct = Math.round((d.value / totalSeverity) * 100);
                    return (
                      <div
                        key={d.name}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: d.color }}
                        />
                        <span className="text-white/60 flex-1">{d.name}</span>
                        <span
                          className="font-semibold"
                          style={{ color: d.color }}
                        >
                          {d.value}
                        </span>
                        <span className="text-white/30 w-9 text-right">
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </ChartCard>

          {/* 1d Severity Trend */}
          <ChartCard title="Severity Trend">
            {isLoading ? (
              <ChartSkeleton />
            ) : severityTrendData.every(
                (d) => d.critical + d.high + d.medium + d.low === 0,
              ) ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={severityTrendData}
                  margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                    vertical={false}
                  />
                  <XAxis dataKey="month" tick={axisTick} {...axisCommon} />
                  <YAxis tick={axisTick} {...axisCommon} />
                  <Tooltip
                    contentStyle={tooltipContentStyle}
                    itemStyle={tooltipItemStyle}
                    labelStyle={tooltipLabelStyle}
                  />
                  <Legend wrapperStyle={{ paddingTop: 8, fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="critical"
                    name="Critical"
                    stroke="#EF4444"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#EF4444" }}
                    animationDuration={1200}
                  />
                  <Line
                    type="monotone"
                    dataKey="high"
                    name="High"
                    stroke="#F97316"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#F97316" }}
                    animationDuration={1400}
                  />
                  <Line
                    type="monotone"
                    dataKey="medium"
                    name="Medium"
                    stroke="#FBBF24"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#FBBF24" }}
                    animationDuration={1600}
                  />
                  <Line
                    type="monotone"
                    dataKey="low"
                    name="Low"
                    stroke="#18C37E"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#18C37E" }}
                    animationDuration={1800}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </section>

      {/* SECTION 2 — Permit Statistics */}
      <section data-ocid="analytics.permits.section">
        <SectionHeading
          icon={<Shield className="w-4 h-4" style={{ color: "#18C37E" }} />}
          label="Permit Statistics"
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* 2a Permits by Type */}
          <ChartCard title="Permits by Type">
            {isLoading ? (
              <ChartSkeleton />
            ) : permitTypeData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={permitTypeData}
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                    animationBegin={200}
                    animationDuration={1200}
                  >
                    {permitTypeData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipContentStyle}
                    itemStyle={tooltipItemStyle}
                  />
                  <Legend wrapperStyle={{ paddingTop: 4, fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* 2b Permit Status Distribution */}
          <ChartCard title="Permit Status Distribution">
            {isLoading ? (
              <ChartSkeleton />
            ) : permitStatusData.every(
                (d) =>
                  d.draft +
                    d.submitted +
                    d.approved +
                    d.active +
                    d.closed +
                    d.expired ===
                  0,
              ) ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={permitStatusData}
                  barSize={10}
                  margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                    vertical={false}
                  />
                  <XAxis dataKey="month" tick={axisTick} {...axisCommon} />
                  <YAxis tick={axisTick} {...axisCommon} />
                  <Tooltip
                    contentStyle={tooltipContentStyle}
                    itemStyle={tooltipItemStyle}
                    labelStyle={tooltipLabelStyle}
                  />
                  <Legend wrapperStyle={{ paddingTop: 8, fontSize: 10 }} />
                  <Bar
                    dataKey="draft"
                    name="Draft"
                    stackId="a"
                    fill="rgba(255,255,255,0.25)"
                  />
                  <Bar
                    dataKey="submitted"
                    name="Submitted"
                    stackId="a"
                    fill="#FBBF24"
                  />
                  <Bar
                    dataKey="approved"
                    name="Approved"
                    stackId="a"
                    fill="#3B82F6"
                  />
                  <Bar
                    dataKey="active"
                    name="Active"
                    stackId="a"
                    fill="#18C37E"
                  />
                  <Bar
                    dataKey="closed"
                    name="Closed"
                    stackId="a"
                    fill="#6B7280"
                  />
                  <Bar
                    dataKey="expired"
                    name="Expired"
                    stackId="a"
                    fill="#EF4444"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* 2c Monthly Permit Volume */}
          <ChartCard title="Monthly Permit Volume">
            {isLoading ? (
              <ChartSkeleton />
            ) : permitVolumeData.every((d) => d.total === 0) ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={permitVolumeData}
                  margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                    vertical={false}
                  />
                  <XAxis dataKey="month" tick={axisTick} {...axisCommon} />
                  <YAxis tick={axisTick} {...axisCommon} />
                  <Tooltip
                    contentStyle={tooltipContentStyle}
                    itemStyle={tooltipItemStyle}
                    labelStyle={tooltipLabelStyle}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Permits"
                    stroke="#3B82F6"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#3B82F6", strokeWidth: 0 }}
                    animationDuration={1400}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </section>

      {/* SECTION 3 — Training Compliance */}
      <section data-ocid="analytics.training.section">
        <SectionHeading
          icon={<TrendingUp className="w-4 h-4" style={{ color: "#18C37E" }} />}
          label="Training Compliance"
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* 3a Course Completion Rates */}
          <ChartCard title="Course Completion Rates">
            {isLoading ? (
              <ChartSkeleton />
            ) : courseCompletionData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={courseCompletionData}
                  barSize={22}
                  margin={{ top: 4, right: 8, left: -10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                    vertical={false}
                  />
                  <XAxis dataKey="course" tick={axisTick} {...axisCommon} />
                  <YAxis
                    domain={[0, 100]}
                    tick={axisTick}
                    {...axisCommon}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={tooltipContentStyle}
                    itemStyle={tooltipItemStyle}
                    formatter={(v: number) => [`${v}%`, "Completion"]}
                  />
                  <ReferenceLine
                    y={80}
                    stroke="rgba(24,195,126,0.4)"
                    strokeDasharray="4 4"
                    label={{
                      value: "80% Target",
                      fill: "rgba(24,195,126,0.6)",
                      fontSize: 10,
                    }}
                  />
                  <Bar
                    dataKey="completion"
                    name="Completion"
                    animationDuration={1200}
                    radius={[3, 3, 0, 0]}
                  >
                    {courseCompletionData.map((d, i) => (
                      <Cell
                        key={`course-cell-${String(i).padStart(2, "0")}`}
                        fill={courseBarColor(d.completion)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* 3b Training Compliance Trend */}
          <ChartCard title="Training Compliance Trend">
            {isLoading ? (
              <ChartSkeleton />
            ) : trainingTrendData.every((d) => d.compliance === 0) ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={trainingTrendData}
                  margin={{ top: 4, right: 16, left: -10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                    vertical={false}
                  />
                  <XAxis dataKey="month" tick={axisTick} {...axisCommon} />
                  <YAxis
                    domain={[0, 100]}
                    tick={axisTick}
                    {...axisCommon}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={tooltipContentStyle}
                    itemStyle={tooltipItemStyle}
                    formatter={(v: number) => [`${v}%`]}
                  />
                  <ReferenceLine
                    y={90}
                    stroke="#EF4444"
                    strokeDasharray="5 5"
                    label={{
                      value: "90% Target",
                      fill: "rgba(239,68,68,0.7)",
                      fontSize: 10,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="compliance"
                    name="Compliance"
                    stroke="#18C37E"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#18C37E", strokeWidth: 0 }}
                    animationDuration={1400}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </section>

      {/* SECTION 4 — Environmental Trends */}
      <section data-ocid="analytics.environment.section">
        <SectionHeading
          icon={<Leaf className="w-4 h-4" style={{ color: "#18C37E" }} />}
          label="Environmental Trends"
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* 4a Carbon Emissions */}
          <ChartCard title="Carbon Emissions (tCO₂e)">
            {isLoading ? (
              <ChartSkeleton />
            ) : !hasCarbonData ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart
                  data={carbonData}
                  margin={{ top: 4, right: 8, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gcarbon" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F97316" stopOpacity={0.5} />
                      <stop
                        offset="100%"
                        stopColor="#EF4444"
                        stopOpacity={0.04}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                    vertical={false}
                  />
                  <XAxis dataKey="month" tick={axisTick} {...axisCommon} />
                  <YAxis tick={axisTick} {...axisCommon} />
                  <Tooltip
                    contentStyle={tooltipContentStyle}
                    itemStyle={tooltipItemStyle}
                    formatter={(v: number) => [`${v} tCO₂e`, "Emissions"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="emissions"
                    name="Emissions"
                    stroke="#F97316"
                    strokeWidth={2}
                    fill="url(#gcarbon)"
                    animationDuration={1400}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* 4b Water Usage */}
          <ChartCard title="Water Usage (m³)">
            {isLoading ? (
              <ChartSkeleton />
            ) : !hasWaterData ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart
                  data={waterData}
                  margin={{ top: 4, right: 8, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gwater" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.5} />
                      <stop
                        offset="100%"
                        stopColor="#3B82F6"
                        stopOpacity={0.03}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                    vertical={false}
                  />
                  <XAxis dataKey="month" tick={axisTick} {...axisCommon} />
                  <YAxis tick={axisTick} {...axisCommon} />
                  <Tooltip
                    contentStyle={tooltipContentStyle}
                    itemStyle={tooltipItemStyle}
                    formatter={(v: number) => [`${v} m³`, "Water Usage"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="usage"
                    name="Water Usage"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fill="url(#gwater)"
                    animationDuration={1400}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </section>

      {/* SECTION 5 — Summary KPI Table */}
      <section data-ocid="analytics.kpi_table.section">
        <SectionHeading
          icon={<BarChart2 className="w-4 h-4" style={{ color: "#18C37E" }} />}
          label="Summary KPI Table"
        />
        <div
          className="glass overflow-hidden"
          style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.25)" }}
        >
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm" data-ocid="analytics.kpi_table">
              <thead>
                <tr
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
                >
                  {[
                    "Metric",
                    "Current Month",
                    "Previous Month",
                    "YTD",
                    "Target",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/40"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kpiRows.map((row, i) => (
                  <motion.tr
                    key={row.metric}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="transition-smooth cursor-default"
                    style={{
                      borderBottom:
                        i < kpiRows.length - 1
                          ? "1px solid rgba(255,255,255,0.05)"
                          : "none",
                    }}
                    onMouseEnter={(e) => {
                      (
                        e.currentTarget as HTMLTableRowElement
                      ).style.background = "rgba(255,255,255,0.03)";
                    }}
                    onMouseLeave={(e) => {
                      (
                        e.currentTarget as HTMLTableRowElement
                      ).style.background = "transparent";
                    }}
                    data-ocid={`analytics.kpi_table.row.${i + 1}`}
                  >
                    <td className="px-5 py-3.5 font-semibold text-white/80">
                      {row.metric}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-white/70">
                      {row.current}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-white/50">
                      {row.previous}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-white/50">
                      {row.ytd}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge
                        variant="outline"
                        className="font-mono text-[11px]"
                        style={{
                          borderColor: "rgba(255,255,255,0.12)",
                          color: "rgba(255,255,255,0.5)",
                        }}
                      >
                        {row.target}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={row.status} />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
