import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useActivityFeed,
  useDashboardStats,
  usePermits,
} from "@/hooks/useBackend";
import type {
  ActivityFeedItem,
  DashboardStats,
  HighRiskAlertDetail,
  IncidentTrendMonth,
  PermitRecord,
} from "@/types";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileCheck,
  FileText,
  Flame,
  HardHat,
  Leaf,
  Minus,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wrench,
  Zap,
} from "lucide-react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ─── Animated Counter ────────────────────────────────────────────────────────
function AnimatedCounter({
  value,
  suffix = "",
}: { value: number; suffix?: string }) {
  const motionVal = useMotionValue(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(motionVal, value, {
      duration: 1.6,
      ease: "easeOut",
    });
    const unsub = motionVal.on("change", (v) => setDisplay(Math.round(v)));
    return () => {
      controls.stop();
      unsub();
    };
  }, [value, motionVal]);

  return (
    <span>
      {display}
      {suffix}
    </span>
  );
}

// ─── Sparkline data ─────────────────────────────────────────────────────────
// Empty arrays — sparklines will be flat until real data is submitted
const sparklines: Record<string, { v: number }[]> = {
  incidents: [],
  ltifr: [],
  nearMiss: [],
  permits: [],
  training: [],
  audit: [],
  highRisk: [],
  envDev: [],
};

// ─── KPI Card ────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: number;
  suffix?: string;
  trend: "up" | "down" | "neutral";
  trendText: string;
  trendColor: "red" | "green" | "yellow" | "blue" | "gray";
  sparkKey: string;
  sparkColor: string;
  icon: React.ReactNode;
  index: number;
}

function KpiCard({
  label,
  value,
  suffix,
  trend,
  trendText,
  trendColor,
  sparkKey,
  sparkColor,
  icon,
  index,
}: KpiCardProps) {
  const trendColorMap = {
    red: { text: "text-red-400", bg: "rgba(239,68,68,0.12)" },
    green: { text: "text-[#18C37E]", bg: "rgba(24,195,126,0.12)" },
    yellow: { text: "text-yellow-400", bg: "rgba(234,179,8,0.12)" },
    blue: { text: "text-blue-400", bg: "rgba(59,130,246,0.12)" },
    gray: { text: "text-white/40", bg: "rgba(255,255,255,0.06)" },
  };
  const tc = trendColorMap[trendColor];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      whileHover={{ scale: 1.02 }}
      className="glass relative overflow-hidden cursor-default"
      style={{
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
      data-ocid={`dashboard.kpi.item.${index + 1}`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: tc.bg }}
          >
            {icon}
          </div>
          <div className="text-right">
            <div
              className={`flex items-center gap-1 text-xs font-medium ${tc.text}`}
            >
              {trend === "up" && <TrendingUp className="w-3 h-3" />}
              {trend === "down" && <TrendingDown className="w-3 h-3" />}
              {trend === "neutral" && <Minus className="w-3 h-3" />}
              <span>{trendText}</span>
            </div>
          </div>
        </div>

        <div className="mb-1">
          <span className="text-2xl font-display font-bold text-white">
            <AnimatedCounter value={value} suffix={suffix} />
          </span>
        </div>
        <p className="text-xs text-white/50 mb-3 truncate">{label}</p>

        {/* Sparkline */}
        <div className="h-8 w-full">
          <ResponsiveContainer width="100%" height={32}>
            <AreaChart
              data={sparklines[sparkKey]}
              margin={{ top: 2, right: 0, left: 0, bottom: 2 }}
            >
              <defs>
                <linearGradient
                  id={`sg-${sparkKey}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={sparkColor} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={sparkColor}
                strokeWidth={1.5}
                fill={`url(#sg-${sparkKey})`}
                dot={false}
                animationDuration={1200}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Module grid config (paths + icons — counts come from backend) ────────────
const MODULE_CONFIG = [
  {
    icon: AlertTriangle,
    label: "Incident Report",
    path: "/incidents",
    countKey: "incidents" as const,
    color: "#EF4444",
  },
  {
    icon: FileCheck,
    label: "Permit To Work",
    path: "/permits",
    countKey: "permits" as const,
    color: "#3B82F6",
  },
  {
    icon: ShieldAlert,
    label: "Risk Assessment",
    path: "/risk-assessment",
    countKey: "risks" as const,
    color: "#F59E0B",
  },
  {
    icon: ClipboardList,
    label: "Inspections",
    path: "/inspections",
    countKey: "inspections" as const,
    color: "#8B5CF6",
  },
  {
    icon: BookOpen,
    label: "Training Matrix",
    path: "/training",
    countKey: null,
    color: "#0EA5E9",
  },
  {
    icon: Leaf,
    label: "Environment",
    path: "/environment",
    countKey: null,
    color: "#10B981",
  },
  {
    icon: Wrench,
    label: "CAPA",
    path: "/capa",
    countKey: "capaItems" as const,
    color: "#EC4899",
  },
  {
    icon: Eye,
    label: "Observations",
    path: "/observations",
    countKey: "observations" as const,
    color: "#F97316",
  },
];

const SAFETY_SCORE_COLORS = ["#18C37E", "#3B82F6", "#A78BFA", "#FBBF24"];

// ─── Permit status helpers ────────────────────────────────────────────────────
function permitStatusColor(status: string) {
  switch (status) {
    case "active":
      return {
        bg: "rgba(24,195,126,0.15)",
        text: "#18C37E",
        border: "rgba(24,195,126,0.3)",
      };
    case "approved":
      return {
        bg: "rgba(59,130,246,0.15)",
        text: "#60A5FA",
        border: "rgba(59,130,246,0.3)",
      };
    case "submitted":
    case "draft":
      return {
        bg: "rgba(251,191,36,0.15)",
        text: "#FBBF24",
        border: "rgba(251,191,36,0.3)",
      };
    case "expired":
      return {
        bg: "rgba(239,68,68,0.15)",
        text: "#F87171",
        border: "rgba(239,68,68,0.3)",
      };
    default:
      return {
        bg: "rgba(255,255,255,0.06)",
        text: "#ffffff80",
        border: "rgba(255,255,255,0.1)",
      };
  }
}

function permitTypeLabel(type: string) {
  const map: Record<string, string> = {
    hotWork: "Hot Work",
    electrical: "Electrical",
    excavation: "Excavation",
    heightWork: "Height Work",
    confinedSpace: "Confined Space",
    lineBreaking: "Line Breaking",
  };
  return map[type] ?? type;
}

function relativeTime(ts: bigint): string {
  const ms = Number(ts) * 1000;
  const diff = Date.now() - ms;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  permit: <FileCheck className="w-4 h-4" style={{ color: "#60A5FA" }} />,
  incident: <AlertTriangle className="w-4 h-4" style={{ color: "#F87171" }} />,
  audit: <ClipboardList className="w-4 h-4" style={{ color: "#A78BFA" }} />,
  training: <BookOpen className="w-4 h-4" style={{ color: "#FBBF24" }} />,
  capa: <Wrench className="w-4 h-4" style={{ color: "#F97316" }} />,
  observation: <Eye className="w-4 h-4" style={{ color: "#18C37E" }} />,
};

// ─── Dashboard page ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: activityRaw, isLoading: activityLoading } = useActivityFeed();
  const { data: permitsRaw, isLoading: permitsLoading } = usePermits();

  const activity = (activityRaw ?? []) as ActivityFeedItem[];
  const permits = (permitsRaw ?? []) as PermitRecord[];

  const s = stats as DashboardStats | null | undefined;

  const totalIncidents = s ? Number(s.totalIncidents) : 0;
  const openPermits = s ? Number(s.openPermits) : 0;
  const nearMissCount = s ? Number(s.nearMissCount) : 0;
  const trainingCompliance = s ? Number(s.trainingCompliance) : 0;
  const auditCompletion = s ? Number(s.auditCompletion) : 0;
  const highRiskCount = s ? Number(s.highRiskCount) : 0;
  const ltifr = s ? Number(s.ltifr) : 0;
  const environmentalDeviations = s ? Number(s.environmentalDeviations) : 0;
  const safetyScore = s ? Number(s.safetyScore) : 0;

  // Incident trend chart data from backend.
  // The backend returns exactly 6 buckets in order: Month-6 (oldest) … Month-1 (most recent).
  // We remap the raw 'Month-N' labels to real calendar month+year strings by
  // counting backwards from today: bucket at index i → (totalBuckets - 1 - i) months ago.
  const incidentTrendData = s?.incidentTrendByMonth
    ? (() => {
        const buckets = s.incidentTrendByMonth as IncidentTrendMonth[];
        const total = buckets.length;
        const now = new Date();
        return buckets.map((item, i) => {
          const monthsAgo = total - 1 - i;
          const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
          const label = d.toLocaleString("en-US", {
            month: "short",
            year: "numeric",
          });
          return {
            month: label,
            critical: Number(item.critical),
            high: Number(item.high),
            medium: Number(item.medium),
            low: Number(item.low),
          };
        });
      })()
    : [];

  // Safety score donut data from backend
  const safetyScoreData = s?.safetyScoreSplit
    ? [
        {
          name: "Safety",
          value: Number(s.safetyScoreSplit.safety),
          color: SAFETY_SCORE_COLORS[0],
        },
        {
          name: "Health",
          value: Number(s.safetyScoreSplit.health),
          color: SAFETY_SCORE_COLORS[1],
        },
        {
          name: "Environment",
          value: Number(s.safetyScoreSplit.environment),
          color: SAFETY_SCORE_COLORS[2],
        },
        {
          name: "Compliance",
          value: Number(s.safetyScoreSplit.compliance),
          color: SAFETY_SCORE_COLORS[3],
        },
      ]
    : [
        { name: "Safety", value: 0, color: SAFETY_SCORE_COLORS[0] },
        { name: "Health", value: 0, color: SAFETY_SCORE_COLORS[1] },
        { name: "Environment", value: 0, color: SAFETY_SCORE_COLORS[2] },
        { name: "Compliance", value: 0, color: SAFETY_SCORE_COLORS[3] },
      ];

  // Compliance tracker bars from backend
  const complianceData = [
    {
      label: "ISO 45001",
      pct: s ? Number(s.complianceBreakdown.iso45001) : 0,
      color: "#3B82F6",
    },
    {
      label: "ISO 14001",
      pct: s ? Number(s.complianceBreakdown.iso14001) : 0,
      color: "#18C37E",
    },
    {
      label: "PPE Compliance",
      pct: s ? Number(s.complianceBreakdown.ppeCompliance) : 0,
      color: "#18C37E",
    },
    {
      label: "Legal Compliance",
      pct: s ? Number(s.complianceBreakdown.legalCompliance) : 0,
      color: "#FBBF24",
    },
  ];

  // Module open counts from backend
  const mc = s?.moduleOpenCounts;
  const modules = MODULE_CONFIG.map((m) => ({
    ...m,
    open: m.countKey && mc ? Number(mc[m.countKey]) : 0,
  }));

  // High risk alerts from backend
  const highRiskAlerts: HighRiskAlertDetail[] = s?.highRiskAlertDetails
    ? (s.highRiskAlertDetails as HighRiskAlertDetail[])
    : [];

  const [permitFilter, setPermitFilter] = useState<
    "all" | "active" | "pending" | "expired"
  >("all");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const filteredPermits = permits
    .filter((p) => {
      if (permitFilter === "all") return true;
      if (permitFilter === "active") return p.status === "active";
      if (permitFilter === "pending")
        return p.status === "submitted" || p.status === "draft";
      if (permitFilter === "expired") return p.status === "expired";
      return true;
    })
    .slice(0, 5);

  // ─── KPI config ───────────────────────────────────────────────────────────
  const kpis: KpiCardProps[] = [
    {
      label: "Total Incidents",
      value: totalIncidents,
      suffix: "",
      trend: "up",
      trendText: "+12% vs last month",
      trendColor: "red",
      sparkKey: "incidents",
      sparkColor: "#EF4444",
      icon: <AlertTriangle className="w-4 h-4" style={{ color: "#EF4444" }} />,
      index: 0,
    },
    {
      label: "LTIFR",
      value: ltifr,
      suffix: "",
      trend: "down",
      trendText: "-5%",
      trendColor: "green",
      sparkKey: "ltifr",
      sparkColor: "#18C37E",
      icon: <ShieldCheck className="w-4 h-4" style={{ color: "#18C37E" }} />,
      index: 1,
    },
    {
      label: "Near Miss Count",
      value: nearMissCount,
      suffix: "",
      trend: "up",
      trendText: "+3",
      trendColor: "yellow",
      sparkKey: "nearMiss",
      sparkColor: "#FBBF24",
      icon: <Zap className="w-4 h-4" style={{ color: "#FBBF24" }} />,
      index: 2,
    },
    {
      label: "Open Permits",
      value: openPermits,
      suffix: "",
      trend: "up",
      trendText: "+2",
      trendColor: "blue",
      sparkKey: "permits",
      sparkColor: "#3B82F6",
      icon: <FileText className="w-4 h-4" style={{ color: "#3B82F6" }} />,
      index: 3,
    },
    {
      label: "Training Compliance",
      value: trainingCompliance,
      suffix: "%",
      trend: "up",
      trendText: "+2%",
      trendColor: "green",
      sparkKey: "training",
      sparkColor: "#18C37E",
      icon: <BookOpen className="w-4 h-4" style={{ color: "#18C37E" }} />,
      index: 4,
    },
    {
      label: "Audit Completion",
      value: auditCompletion,
      suffix: "%",
      trend: "neutral",
      trendText: "No change",
      trendColor: "gray",
      sparkKey: "audit",
      sparkColor: "#94A3B8",
      icon: <ClipboardList className="w-4 h-4" style={{ color: "#94A3B8" }} />,
      index: 5,
    },
    {
      label: "High Risk Activities",
      value: highRiskCount,
      suffix: "",
      trend: "down",
      trendText: "-1",
      trendColor: "green",
      sparkKey: "highRisk",
      sparkColor: "#18C37E",
      icon: <ShieldAlert className="w-4 h-4" style={{ color: "#F59E0B" }} />,
      index: 6,
    },
    {
      label: "Environmental Deviations",
      value: environmentalDeviations,
      suffix: "",
      trend: "neutral",
      trendText: "Same",
      trendColor: "yellow",
      sparkKey: "envDev",
      sparkColor: "#FBBF24",
      icon: <Leaf className="w-4 h-4" style={{ color: "#10B981" }} />,
      index: 7,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="p-5 space-y-5 min-h-screen"
      data-ocid="dashboard.page"
    >
      {/* ─── Page Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: "rgba(24,195,126,0.12)",
              border: "1px solid rgba(24,195,126,0.25)",
            }}
          >
            <HardHat className="w-5 h-5" style={{ color: "#18C37E" }} />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-white leading-tight">
              OHSE Command Center
            </h1>
            <p className="text-xs text-white/40">
              {now.toLocaleDateString("en-IN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              {" · "}
              {now.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: "rgba(24,195,126,0.12)",
              border: "1px solid rgba(24,195,126,0.25)",
              color: "#18C37E",
            }}
          >
            <Activity className="w-3.5 h-3.5" />
            Live
          </div>
          <div
            className="px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: "rgba(24,195,126,0.15)",
              border: "1px solid rgba(24,195,126,0.3)",
              color: "#18C37E",
            }}
          >
            Safety Score: {safetyScore}%
          </div>
        </div>
      </div>

      {/* ─── KPI Strip ───────────────────────────────────────────────── */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3"
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.08 } },
          hidden: {},
        }}
        data-ocid="dashboard.kpi.list"
      >
        {statsLoading
          ? [
              "kpi-a",
              "kpi-b",
              "kpi-c",
              "kpi-d",
              "kpi-e",
              "kpi-f",
              "kpi-g",
              "kpi-h",
            ].map((k) => (
              <Skeleton
                key={k}
                className="h-[140px] rounded-lg"
                style={{ background: "rgba(255,255,255,0.04)" }}
              />
            ))
          : kpis.map((k) => <KpiCard key={k.label} {...k} />)}
      </motion.div>

      {/* ─── Main Grid ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* LEFT: Safety Score Ring */}
        <div
          className="glass p-5"
          style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}
          data-ocid="dashboard.safety_score.panel"
        >
          <h2 className="font-display font-semibold text-white text-sm mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" style={{ color: "#18C37E" }} />
            Safety Score
          </h2>
          <div className="relative flex flex-col items-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={safetyScoreData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  animationBegin={200}
                  animationDuration={1200}
                >
                  {safetyScoreData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} opacity={0.9} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "rgba(8,20,38,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                  }}
                  itemStyle={{ color: "#fff" }}
                  formatter={(v: number) => [`${v}%`]}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none"
              style={{ marginTop: -8 }}
            >
              <div className="text-3xl font-display font-bold text-white">
                {safetyScore}%
              </div>
              <div className="text-[10px] text-white/40 uppercase tracking-wide">
                Overall
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {safetyScoreData.map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: d.color }}
                />
                <span className="text-white/60">{d.name}</span>
                <span
                  className="ml-auto font-semibold"
                  style={{ color: d.color }}
                >
                  {d.value}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Incident Trend Chart */}
        <div
          className="glass p-5"
          style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}
          data-ocid="dashboard.incident_trends.panel"
        >
          <h2 className="font-display font-semibold text-white text-sm mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" style={{ color: "#18C37E" }} />
            Incident Trends (Monthly)
          </h2>
          {incidentTrendData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-white/30 text-sm">
              No incident data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={incidentTrendData}
                barSize={14}
                margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(8,20,38,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                  }}
                  itemStyle={{ color: "#fff" }}
                />
                <Legend wrapperStyle={{ paddingTop: 12, fontSize: 11 }} />
                <Bar
                  dataKey="low"
                  name="Low"
                  stackId="a"
                  fill="#18C37E"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="medium"
                  name="Medium"
                  stackId="a"
                  fill="#3B82F6"
                />
                <Bar dataKey="high" name="High" stackId="a" fill="#FBBF24" />
                <Bar
                  dataKey="critical"
                  name="Critical"
                  stackId="a"
                  fill="#EF4444"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* LEFT: Active Permit Board */}
        <div
          className="glass p-5"
          style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}
          data-ocid="dashboard.permits.panel"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-white text-sm flex items-center gap-2">
              <FileCheck className="w-4 h-4" style={{ color: "#3B82F6" }} />
              Active Permits
            </h2>
            <Link
              to="/permits"
              className="text-xs transition-smooth"
              style={{ color: "#18C37E" }}
              data-ocid="dashboard.permits.view_all_link"
            >
              View All →
            </Link>
          </div>

          {/* Filter tabs */}
          <div
            className="flex gap-1 mb-3"
            data-ocid="dashboard.permits.filter.tab"
          >
            {(["all", "active", "pending", "expired"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setPermitFilter(f)}
                className="px-2.5 py-1 rounded text-xs font-medium transition-smooth capitalize"
                style={{
                  background:
                    permitFilter === f
                      ? "rgba(24,195,126,0.15)"
                      : "rgba(255,255,255,0.04)",
                  color:
                    permitFilter === f ? "#18C37E" : "rgba(255,255,255,0.4)",
                  border: `1px solid ${permitFilter === f ? "rgba(24,195,126,0.3)" : "rgba(255,255,255,0.06)"}`,
                }}
                data-ocid={`dashboard.permits.filter.${f}`}
              >
                {f}
              </button>
            ))}
          </div>

          {permitsLoading ? (
            <div className="space-y-2">
              {["p-a", "p-b", "p-c", "p-d"].map((k) => (
                <Skeleton
                  key={k}
                  className="h-12"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                />
              ))}
            </div>
          ) : filteredPermits.length === 0 ? (
            <div
              className="text-center py-8 text-white/30 text-sm"
              data-ocid="dashboard.permits.empty_state"
            >
              No permits in this category
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPermits.map((p, i) => {
                const sc = permitStatusColor(p.status);
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                    data-ocid={`dashboard.permits.item.${i + 1}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-mono font-semibold text-white/80 text-[11px]">
                          {p.permitNumber}
                        </span>
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                          style={{
                            background: "rgba(59,130,246,0.15)",
                            color: "#60A5FA",
                          }}
                        >
                          {permitTypeLabel(p.permitType)}
                        </span>
                      </div>
                      <span className="text-white/40 truncate block">
                        {p.location}
                      </span>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize flex-shrink-0"
                      style={{
                        background: sc.bg,
                        color: sc.text,
                        border: `1px solid ${sc.border}`,
                      }}
                    >
                      {p.status}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Live Activity Feed */}
        <div
          className="glass p-5"
          style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}
          data-ocid="dashboard.activity.panel"
        >
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-display font-semibold text-white text-sm">
              Live Activity
            </h2>
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                background: "#18C37E",
                boxShadow: "0 0 6px #18C37E",
                animation: "pulse 2s ease-in-out infinite",
              }}
            />
          </div>
          {activityLoading ? (
            <div className="space-y-3">
              {["a-a", "a-b", "a-c", "a-d", "a-e"].map((k) => (
                <Skeleton
                  key={k}
                  className="h-10"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <div
              className="text-center py-8 text-white/30 text-sm"
              data-ocid="dashboard.activity.empty_state"
            >
              No recent activity
            </div>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-thin pr-1">
              {activity.slice(0, 8).map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="flex items-start gap-3 px-3 py-2 rounded-lg text-xs"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                  data-ocid={`dashboard.activity.item.${i + 1}`}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  >
                    {CATEGORY_ICONS[item.category] ?? (
                      <Activity className="w-4 h-4 text-white/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 leading-snug">{item.message}</p>
                    <p className="text-white/30 mt-0.5">
                      {relativeTime(item.timestamp)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Bottom Row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* High Risk Alerts */}
        <div
          className="glass p-5"
          style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}
          data-ocid="dashboard.high_risk.panel"
        >
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-display font-semibold text-white text-sm flex items-center gap-2">
              <AlertOctagon className="w-4 h-4" style={{ color: "#EF4444" }} />
              High Risk Alerts
            </h2>
            <span
              className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{
                background: "rgba(239,68,68,0.15)",
                color: "#F87171",
                border: "1px solid rgba(239,68,68,0.3)",
              }}
            >
              {highRiskAlerts.length > 0 ? highRiskAlerts.length : 0}
            </span>
          </div>
          {highRiskAlerts.length === 0 ? (
            <div
              className="text-center py-8 text-white/30 text-sm"
              data-ocid="dashboard.high_risk.empty_state"
            >
              No high-risk alerts
            </div>
          ) : (
            <div className="space-y-3">
              {highRiskAlerts.map((alert, i) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="relative pl-3 pr-3 py-3 rounded-lg text-xs"
                  style={{
                    background: "rgba(239,68,68,0.06)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    borderLeft: "3px solid #EF4444",
                  }}
                  data-ocid={`dashboard.high_risk.item.${i + 1}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-semibold text-white/90 leading-snug">
                      {alert.hazard}
                    </p>
                    {alert.escalationLevel === "Critical" && (
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                        style={{
                          background: "#EF4444",
                          boxShadow: "0 0 5px #EF4444",
                          animation: "pulse 1.5s ease-in-out infinite",
                        }}
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <span className="text-white/40">
                      Area: <span className="text-white/70">{alert.area}</span>
                    </span>
                    <span className="text-white/40">
                      Owner:{" "}
                      <span className="text-white/70">{alert.owner}</span>
                    </span>
                    <span className="text-white/40">
                      Due:{" "}
                      <span
                        className={
                          alert.dueDate === "Overdue"
                            ? "text-red-400 font-semibold"
                            : "text-white/70"
                        }
                      >
                        {alert.dueDate}
                      </span>
                    </span>
                    <span className="text-white/40">
                      Level:{" "}
                      <span className="text-orange-400 font-semibold">
                        {alert.escalationLevel}
                      </span>
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Compliance Tracker */}
        <div
          className="glass p-5"
          style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}
          data-ocid="dashboard.compliance.panel"
        >
          <h2 className="font-display font-semibold text-white text-sm mb-5 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" style={{ color: "#18C37E" }} />
            Compliance Status
          </h2>
          <div className="space-y-4">
            {complianceData.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.12 }}
                data-ocid={`dashboard.compliance.item.${i + 1}`}
              >
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <span className="text-white/70">{item.label}</span>
                  <span className="font-semibold" style={{ color: item.color }}>
                    {item.pct}%
                  </span>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: item.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${item.pct}%` }}
                    transition={{
                      duration: 1.2,
                      delay: i * 0.15,
                      ease: "easeOut",
                    }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Module Grid */}
        <div
          className="glass p-5"
          style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}
          data-ocid="dashboard.modules.panel"
        >
          <h2 className="font-display font-semibold text-white text-sm mb-4 flex items-center gap-2">
            <Flame className="w-4 h-4" style={{ color: "#18C37E" }} />
            Quick Access
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {modules.map((mod, i) => {
              const Icon = mod.icon;
              return (
                <motion.div
                  key={mod.label}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.06 }}
                  whileHover={{ scale: 1.04, y: -2 }}
                  className="group"
                  data-ocid={`dashboard.modules.item.${i + 1}`}
                >
                  <Link
                    to={mod.path}
                    className="flex flex-col gap-1.5 p-2.5 rounded-lg transition-smooth block"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                    data-ocid={`dashboard.modules.link.${i + 1}`}
                  >
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center transition-smooth"
                      style={{ background: `${mod.color}18` }}
                    >
                      <Icon
                        className="w-3.5 h-3.5"
                        style={{ color: mod.color }}
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-white/80 leading-tight">
                        {mod.label}
                      </p>
                      <p className="text-[10px] text-white/35">
                        Open: {mod.open}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
