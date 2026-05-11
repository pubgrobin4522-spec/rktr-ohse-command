import type { ESGRecord } from "@/backend";
import { ESGStatus } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { RKTR_DEPARTMENTS } from "@/constants/departments";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCreateESGRecord,
  useDeleteESGRecord,
  useESGRecords,
  useUpdateESGRecord,
  useUpdateESGStatus,
} from "@/hooks/useBackend";
import { autoTable } from "jspdf-autotable";
import {
  BarChart2,
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Leaf,
  Plus,
  ShieldCheck,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { utils as XLSXUtils, writeFile as XLSXWriteFile } from "xlsx";

// ─── Types ────────────────────────────────────────────────────────────────────
type PeriodFilter = "all" | "monthly" | "quarterly";

interface KpiDef {
  key: string;
  label: string;
  unit: string;
  formula: string;
  ltb: boolean;
  target: number;
  group: "environmental" | "social" | "governance";
  path: (r: ESGRecord) => number;
}

// ─── KPI definitions ────────────────────────────────────────────────────────────
const ENV_KPIS: KpiDef[] = [
  {
    key: "carbonEmissionIntensity",
    label: "Carbon Emission Intensity",
    unit: "tCO₂e/ton",
    formula: "Total GHG Emissions ÷ Production (tons)",
    ltb: true,
    target: 1.5,
    group: "environmental",
    path: (r) => r.environmental.carbonEmissionIntensity,
  },
  {
    key: "energyConsumption",
    label: "Energy Consumption",
    unit: "kWh",
    formula: "Sum of electricity + fuel energy",
    ltb: true,
    target: 950000,
    group: "environmental",
    path: (r) => r.environmental.energyConsumption,
  },
  {
    key: "renewableEnergyUsage",
    label: "Renewable Energy Usage",
    unit: "%",
    formula: "(Renewable Energy ÷ Total Energy) × 100",
    ltb: false,
    target: 30,
    group: "environmental",
    path: (r) => r.environmental.renewableEnergyUsage,
  },
  {
    key: "waterConsumption",
    label: "Water Consumption",
    unit: "KL/m³",
    formula: "Total water intake",
    ltb: true,
    target: 18000,
    group: "environmental",
    path: (r) => r.environmental.waterConsumption,
  },
  {
    key: "waterIntensity",
    label: "Water Intensity",
    unit: "KL/ton",
    formula: "Total Water ÷ Production",
    ltb: true,
    target: 2.5,
    group: "environmental",
    path: (r) => r.environmental.waterIntensity,
  },
  {
    key: "waterReuseRate",
    label: "Water Reuse / Recycled Water",
    unit: "%",
    formula: "(Reused Water ÷ Total Water) × 100",
    ltb: false,
    target: 40,
    group: "environmental",
    path: (r) => r.environmental.waterReuseRate,
  },
  {
    key: "wasteGenerated",
    label: "Waste Generated",
    unit: "Tons",
    formula: "Hazardous + Non-hazardous waste",
    ltb: true,
    target: 500,
    group: "environmental",
    path: (r) => r.environmental.wasteGenerated,
  },
  {
    key: "wasteRecyclingRate",
    label: "Waste Recycling Rate",
    unit: "%",
    formula: "(Recycled Waste ÷ Total Waste) × 100",
    ltb: false,
    target: 75,
    group: "environmental",
    path: (r) => r.environmental.wasteRecyclingRate,
  },
  {
    key: "envComplianceViolations",
    label: "Env. Compliance Violations",
    unit: "No.",
    formula: "Count of violations",
    ltb: true,
    target: 0,
    group: "environmental",
    path: (r) => r.environmental.envComplianceViolations,
  },
];

const SOCIAL_KPIS: KpiDef[] = [
  {
    key: "ltifr",
    label: "LTIFR",
    unit: "Rate",
    formula: "(LTI × 1,000,000) ÷ Total Hours Worked",
    ltb: true,
    target: 1.0,
    group: "social",
    path: (r) => r.social.ltifr,
  },
  {
    key: "trir",
    label: "TRIR",
    unit: "Rate",
    formula: "(Incidents × 200,000) ÷ Total Hours",
    ltb: true,
    target: 2.0,
    group: "social",
    path: (r) => r.social.trir,
  },
  {
    key: "fatalities",
    label: "Fatalities",
    unit: "No.",
    formula: "Count",
    ltb: true,
    target: 0,
    group: "social",
    path: (r) => r.social.fatalities,
  },
  {
    key: "employeeTurnoverRate",
    label: "Employee Turnover Rate",
    unit: "%",
    formula: "(No. left ÷ Avg employees) × 100",
    ltb: true,
    target: 10,
    group: "social",
    path: (r) => r.social.employeeTurnoverRate,
  },
  {
    key: "absenteeismRate",
    label: "Absenteeism Rate",
    unit: "%",
    formula: "(Absent days ÷ Total working days) × 100",
    ltb: true,
    target: 3,
    group: "social",
    path: (r) => r.social.absenteeismRate,
  },
  {
    key: "trainingHoursPerEmployee",
    label: "Training Hrs / Employee",
    unit: "Hours",
    formula: "Total training hours ÷ Employees",
    ltb: false,
    target: 24,
    group: "social",
    path: (r) => r.social.trainingHoursPerEmployee,
  },
  {
    key: "employeeSatisfactionIndex",
    label: "Employee Satisfaction",
    unit: "%",
    formula: "Survey score (%)",
    ltb: false,
    target: 75,
    group: "social",
    path: (r) => r.social.employeeSatisfactionIndex,
  },
  {
    key: "genderDiversityRatio",
    label: "Gender Diversity Ratio",
    unit: "%",
    formula: "(Female ÷ Total employees) × 100",
    ltb: false,
    target: 15,
    group: "social",
    path: (r) => r.social.genderDiversityRatio,
  },
  {
    key: "womenInWorkforce",
    label: "Women in Workforce",
    unit: "%",
    formula: "(Women ÷ Total workforce) × 100",
    ltb: false,
    target: 15,
    group: "social",
    path: (r) => r.social.womenInWorkforce,
  },
  {
    key: "contractorSafetyPerformance",
    label: "Contractor Safety",
    unit: "%",
    formula: "(Safe jobs ÷ Total jobs) × 100",
    ltb: false,
    target: 90,
    group: "social",
    path: (r) => r.social.contractorSafetyPerformance,
  },
  {
    key: "occupationalHealthCases",
    label: "Occupational Health Cases",
    unit: "No.",
    formula: "Count",
    ltb: true,
    target: 5,
    group: "social",
    path: (r) => r.social.occupationalHealthCases,
  },
  {
    key: "grievanceCases",
    label: "Grievance Cases",
    unit: "No.",
    formula: "Count",
    ltb: true,
    target: 3,
    group: "social",
    path: (r) => r.social.grievanceCases,
  },
  {
    key: "communityEngagement",
    label: "Community Engagement",
    unit: "No.",
    formula: "Count",
    ltb: false,
    target: 6,
    group: "social",
    path: (r) => r.social.communityEngagementPrograms,
  },
];

const GOV_KPIS: KpiDef[] = [
  {
    key: "complianceBreaches",
    label: "Compliance Breaches",
    unit: "No.",
    formula: "Count",
    ltb: true,
    target: 0,
    group: "governance",
    path: (r) => r.governance.complianceBreaches,
  },
  {
    key: "regulatoryViolations",
    label: "Regulatory Violations",
    unit: "No.",
    formula: "Count",
    ltb: true,
    target: 0,
    group: "governance",
    path: (r) => r.governance.regulatoryViolations,
  },
  {
    key: "regulatoryPenalties",
    label: "Regulatory Penalties",
    unit: "₹",
    formula: "Amount",
    ltb: true,
    target: 0,
    group: "governance",
    path: (r) => r.governance.regulatoryPenalties,
  },
  {
    key: "whistleblowerComplaints",
    label: "Whistleblower Complaints",
    unit: "No.",
    formula: "Count",
    ltb: true,
    target: 0,
    group: "governance",
    path: (r) => r.governance.whistleblowerComplaints,
  },
  {
    key: "antiCorruptionTraining",
    label: "Anti-Corruption Training",
    unit: "%",
    formula: "(Trained ÷ Total employees) × 100",
    ltb: false,
    target: 90,
    group: "governance",
    path: (r) => r.governance.antiCorruptionTrainingCoverage,
  },
  {
    key: "codeOfConductViolations",
    label: "Code of Conduct Violations",
    unit: "No.",
    formula: "Count",
    ltb: true,
    target: 0,
    group: "governance",
    path: (r) => r.governance.codeOfConductViolations,
  },
  {
    key: "policyComplianceScore",
    label: "Policy Compliance Score",
    unit: "%",
    formula: "Audit score (%)",
    ltb: false,
    target: 95,
    group: "governance",
    path: (r) => r.governance.policyComplianceScore,
  },
  {
    key: "dataPrivacyIncidents",
    label: "Data Privacy Incidents",
    unit: "No.",
    formula: "Count",
    ltb: true,
    target: 0,
    group: "governance",
    path: (r) => r.governance.dataPrivacyIncidents,
  },
];

const ALL_KPIS = [...ENV_KPIS, ...SOCIAL_KPIS, ...GOV_KPIS];

// ─── Mock data (Jan–Jun 2026) ─────────────────────────────────────────────────────────
function makeMockRecord(period: string, idx: number): ESGRecord {
  const base = 1735689600000 + idx * 30 * 86400 * 1000;
  return {
    id: `esg-mock-${String(idx + 1).padStart(3, "0")}`,
    period,
    periodType: "monthly",
    department: "EHS",
    status: ESGStatus.approved,
    recordedAt: BigInt(base) * BigInt(1_000_000),
    approvedAt: BigInt(base + 86400 * 1000) * BigInt(1_000_000),
    recordedBy: "sumesh.j@rktrwheels.com",
    recordedByName: "Sumesh J",
    approvedBy: "Sumesh J",
    dataSource: "SAP EHS Module",
    notes: `Monthly ESG data for ${period}`,
    environmental: {
      carbonEmissionIntensity: +(1.62 - idx * 0.025).toFixed(3),
      energyConsumption: 982000 - idx * 5200,
      renewableEnergyUsage: +(17.5 + idx * 1.6).toFixed(1),
      waterConsumption: 19400 - idx * 220,
      waterIntensity: +(2.82 - idx * 0.06).toFixed(2),
      waterReuseRate: +(31 + idx * 1.4).toFixed(1),
      wasteGenerated: 558 - idx * 9,
      wasteRecyclingRate: +(67 + idx * 1.8).toFixed(1),
      envComplianceViolations: idx < 2 ? 1 : 0,
    },
    social: {
      ltifr: +(1.22 - idx * 0.04).toFixed(2),
      trir: +(2.84 - idx * 0.09).toFixed(2),
      fatalities: 0,
      employeeTurnoverRate: +(8.6 - idx * 0.12).toFixed(1),
      absenteeismRate: +(3.25 - idx * 0.06).toFixed(2),
      trainingHoursPerEmployee: +(17.5 + idx * 1.3).toFixed(1),
      employeeSatisfactionIndex: 71 + idx,
      genderDiversityRatio: +(10.8 + idx * 0.35).toFixed(1),
      womenInWorkforce: +(10.8 + idx * 0.35).toFixed(1),
      contractorSafetyPerformance: +(90.5 + idx * 0.6).toFixed(1),
      occupationalHealthCases: idx < 4 ? 4 : 3,
      grievanceCases: 2,
      communityEngagementPrograms: 4 + (idx > 2 ? 1 : 0),
    },
    governance: {
      complianceBreaches: idx < 1 ? 1 : 0,
      regulatoryViolations: 0,
      regulatoryPenalties: idx < 1 ? 25000 : 0,
      whistleblowerComplaints: idx === 1 ? 1 : 0,
      antiCorruptionTrainingCoverage: 82 + idx * 2,
      codeOfConductViolations: 0,
      policyComplianceScore: 87 + idx,
      dataPrivacyIncidents: 0,
    },
  };
}

const MOCK_RECORDS: ESGRecord[] = [
  "2026-01",
  "2026-02",
  "2026-03",
  "2026-04",
  "2026-05",
  "2026-06",
].map((p, i) => makeMockRecord(p, i));

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmtNum(v: number, dec = 1): string {
  if (!Number.isFinite(v)) return "0";
  return v % 1 === 0 ? String(v) : v.toFixed(dec);
}

function scoreColor(s: number): string {
  return s >= 70 ? "#18C37E" : s >= 50 ? "#FBBF24" : "#EF4444";
}

function esgStatusLabel(s: ESGStatus) {
  return (
    {
      [ESGStatus.draft]: "Draft",
      [ESGStatus.submitted]: "Submitted",
      [ESGStatus.approved]: "Approved",
      [ESGStatus.rejected]: "Rejected",
    }[s] ?? s
  );
}

function esgStatusClass(s: ESGStatus) {
  switch (s) {
    case ESGStatus.approved:
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case ESGStatus.submitted:
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case ESGStatus.rejected:
      return "bg-red-500/20 text-red-400 border-red-500/30";
    default:
      return "bg-white/10 text-white/50 border-white/15";
  }
}

function periodLabel(p: string): string {
  if (/^\d{4}-Q\d$/.test(p)) {
    const [yr, q] = p.split("-");
    return `${q} ${yr}`;
  }
  if (/^\d{4}-\d{2}$/.test(p)) {
    const d = new Date(Number(p.split("-")[0]), Number(p.split("-")[1]) - 1, 1);
    return d.toLocaleString("default", { month: "short", year: "numeric" });
  }
  return p;
}

function calcGroupScore(
  r: ESGRecord,
  g: "environmental" | "social" | "governance",
): number {
  const kpis = ALL_KPIS.filter((k) => k.group === g);
  if (!kpis.length) return 0;
  let total = 0;
  for (const kpi of kpis) {
    const val = kpi.path(r);
    const t = kpi.target;
    let score: number;
    if (t === 0) score = val === 0 ? 100 : Math.max(0, 100 - val * 20);
    else if (kpi.ltb)
      score = Math.max(0, Math.min(100, (1 - (val - t) / t) * 100));
    else score = Math.min(100, (val / t) * 100);
    total += score;
  }
  return total / kpis.length;
}

const tooltipStyle = {
  background: "rgba(8,20,38,0.97)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  fontSize: 12,
};
const tickStyle = { fill: "rgba(255,255,255,0.35)", fontSize: 11 };
const axisProps = { axisLine: false as const, tickLine: false as const };

// ─── Shared UI components ───────────────────────────────────────────────────────────────
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

function Sparkline({ data, ltb }: { data: number[]; ltb: boolean }) {
  if (data.length < 2) return <div className="h-7 w-16 opacity-0" />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 64;
  const H = 28;
  const P = 2;
  const pts = data.map((v, i) => {
    const x = P + (i / (data.length - 1)) * (W - P * 2);
    const y = H - P - ((v - min) / range) * (H - P * 2);
    return `${x},${y}`;
  });
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const good = ltb ? last <= prev : last >= prev;
  return (
    <svg width={W} height={H} aria-hidden="true">
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={good ? "#18C37E" : "#EF4444"}
        strokeWidth={1.5}
        opacity={0.8}
      />
    </svg>
  );
}

function KpiCard({ kpi, records }: { kpi: KpiDef; records: ESGRecord[] }) {
  const sorted = [...records].sort((a, b) => a.period.localeCompare(b.period));
  const vals = sorted.map((r) => kpi.path(r));
  const current = vals[vals.length - 1] ?? 0;
  const prev = vals[vals.length - 2] ?? current;
  const pctChg = prev !== 0 ? ((current - prev) / Math.abs(prev)) * 100 : 0;
  const improving = kpi.ltb ? current <= prev : current >= prev;
  const targetPct =
    kpi.target > 0
      ? kpi.ltb
        ? Math.min(
            100,
            Math.max(0, (1 - (current - kpi.target) / kpi.target) * 100),
          )
        : Math.min(100, (current / kpi.target) * 100)
      : 100;
  const [tip, setTip] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass p-4 relative cursor-default"
      style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}
      onMouseEnter={() => setTip(true)}
      onMouseLeave={() => setTip(false)}
    >
      {tip && (
        <div
          className="absolute top-full left-0 z-50 mt-1 px-3 py-2 rounded-lg text-xs text-white/80"
          style={{
            background: "rgba(8,20,38,0.97)",
            border: "1px solid rgba(24,195,126,0.25)",
            maxWidth: 260,
          }}
        >
          <span className="font-semibold" style={{ color: "#18C37E" }}>
            Formula:{" "}
          </span>
          {kpi.formula}
        </div>
      )}
      <div className="flex items-start justify-between gap-1 mb-2">
        <p className="text-[11px] text-white/50 leading-tight flex-1 min-w-0">
          {kpi.label}
        </p>
        <span
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${kpi.ltb ? "bg-red-500/15 text-red-400" : "bg-green-500/15 text-green-400"}`}
        >
          {kpi.ltb ? "LTB" : "UTB"}
        </span>
      </div>
      <div className="flex items-end justify-between gap-1">
        <div>
          <p className="font-display font-bold text-white text-xl leading-none">
            {fmtNum(current)}
          </p>
          <p className="text-[10px] text-white/35 mt-0.5">{kpi.unit}</p>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <Sparkline data={vals} ltb={kpi.ltb} />
          <div
            className={`flex items-center gap-0.5 text-[11px] font-semibold ${improving ? "text-[#18C37E]" : "text-red-400"}`}
          >
            {improving ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {pctChg >= 0 ? "+" : ""}
            {fmtNum(pctChg)}%
          </div>
        </div>
      </div>
      {kpi.target > 0 && (
        <div className="mt-2.5">
          <div className="flex justify-between text-[9px] text-white/30 mb-0.5">
            <span>
              vs {kpi.target} {kpi.unit}
            </span>
            <span style={{ color: improving ? "#18C37E" : "#EF4444" }}>
              {Math.round(targetPct)}%
            </span>
          </div>
          <div
            className="h-1 rounded-full"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${targetPct}%`,
                background: improving ? "#18C37E" : "#EF4444",
              }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Score Gauge ──────────────────────────────────────────────────────────────────────
function ESGScoreGauge({ records }: { records: ESGRecord[] }) {
  // Derive all scores from the same approved records so overall stays in sync
  // with pillar scores the instant any record changes — no stale backend query.
  const latest = [...records]
    .filter((r) => r.status === ESGStatus.approved)
    .sort((a, b) => b.period.localeCompare(a.period))[0];
  const eS = latest ? Math.round(calcGroupScore(latest, "environmental")) : 0;
  const sS = latest ? Math.round(calcGroupScore(latest, "social")) : 0;
  const gS = latest ? Math.round(calcGroupScore(latest, "governance")) : 0;
  const overall = Math.round(eS * 0.4 + sS * 0.4 + gS * 0.2);
  const color = scoreColor(overall);

  return (
    <div className="glass p-5 flex flex-col items-center gap-3">
      <h3 className="font-display font-semibold text-white/80 text-sm w-full">
        Overall ESG Score
      </h3>
      <div className="relative" style={{ width: 150, height: 150 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius={48}
            outerRadius={72}
            data={[{ name: "score", value: overall, fill: color }]}
            startAngle={90}
            endAngle={-270}
          >
            <RadialBar
              dataKey="value"
              cornerRadius={6}
              background={{ fill: "rgba(255,255,255,0.06)" }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display font-bold text-3xl" style={{ color }}>
            {overall}
          </span>
          <span className="text-[10px] text-white/40">/100</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 w-full">
        {[
          { label: "E", value: eS, color: "#18C37E" },
          { label: "S", value: sS, color: "#3B82F6" },
          { label: "G", value: gS, color: "#8B5CF6" },
        ].map((s) => (
          <div
            key={s.label}
            className="text-center p-2 rounded-lg"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <p className="font-bold text-lg" style={{ color: s.color }}>
              {s.value}
            </p>
            <p className="text-[10px] text-white/40">{s.label} Score</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Trend Chart ─────────────────────────────────────────────────────────────────────
type ChartKeyDef<T> = { key: keyof T; color: string; name: string };

function TrendChart<T>({
  title,
  records,
  accessor,
  keys,
}: {
  title: string;
  records: ESGRecord[];
  accessor: (r: ESGRecord) => T;
  keys: ChartKeyDef<T>[];
}) {
  const sorted = [...records]
    .filter((r) => r.status === ESGStatus.approved)
    .sort((a, b) => a.period.localeCompare(b.period));
  const data = sorted.map((r) => {
    const g = accessor(r);
    const row: Record<string, number | string> = {
      period: periodLabel(r.period),
    };
    for (const { key } of keys) row[key as string] = Number(g[key]) || 0;
    return row;
  });
  if (!data.length)
    return (
      <div
        className="glass p-5"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}
      >
        <h3 className="font-display font-semibold text-white/80 text-sm mb-4">
          {title}
        </h3>
        <div
          className="flex flex-col items-center justify-center gap-2 text-white/30"
          style={{ height: 180 }}
        >
          <BarChart2 className="w-8 h-8 opacity-30" />
          <p className="text-xs">No approved data yet</p>
        </div>
      </div>
    );
  return (
    <div
      className="glass p-5"
      style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}
    >
      <h3 className="font-display font-semibold text-white/80 text-sm mb-4">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={190}>
        <AreaChart
          data={data}
          margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
        >
          <defs>
            {keys.map((k) => (
              <linearGradient
                key={String(k.key)}
                id={`esg-g-${String(k.key)}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={k.color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={k.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.06)"
            vertical={false}
          />
          <XAxis dataKey="period" tick={tickStyle} {...axisProps} />
          <YAxis tick={tickStyle} {...axisProps} />
          <Tooltip
            contentStyle={tooltipStyle}
            itemStyle={{ color: "#fff" }}
            labelStyle={{ color: "rgba(255,255,255,0.5)" }}
          />
          <Legend wrapperStyle={{ paddingTop: 8, fontSize: 10 }} />
          {keys.map((k) => (
            <Area
              key={String(k.key)}
              type="monotone"
              dataKey={String(k.key)}
              name={k.name}
              stroke={k.color}
              strokeWidth={2}
              fill={`url(#esg-g-${String(k.key)})`}
              animationDuration={1200}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── KPI Form Section ─────────────────────────────────────────────────────────────────
type KpiVals = Record<string, string>;

function KpiFieldGroup({
  title,
  kpis,
  vals,
  onChange,
}: {
  title: string;
  kpis: KpiDef[];
  vals: KpiVals;
  onChange: (k: string, v: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
        {title}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.key}>
            <Label className="text-xs text-white/60 mb-1 block">
              {kpi.label} <span className="text-white/30">({kpi.unit})</span>
            </Label>
            <Input
              type="number"
              step="any"
              placeholder="0"
              value={vals[kpi.key] ?? ""}
              onChange={(e) => onChange(kpi.key, e.target.value)}
              className="text-sm"
              style={{
                background: "rgba(255,255,255,0.04)",
                borderColor: "rgba(255,255,255,0.1)",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Entry Dialog ───────────────────────────────────────────────────────────────────
function ESGEntryDialog({
  open,
  onClose,
  record,
  user,
}: {
  open: boolean;
  onClose: () => void;
  record?: ESGRecord;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
  };
}) {
  const createMut = useCreateESGRecord();
  const updateMut = useUpdateESGRecord();

  const [period, setPeriod] = useState(record?.period ?? "");
  const [periodType, setPeriodType] = useState(record?.periodType ?? "monthly");
  const [department, setDepartment] = useState(
    record?.department ?? user.department ?? "",
  );
  const [dataSource, setDataSource] = useState(record?.dataSource ?? "");
  const [notes, setNotes] = useState(record?.notes ?? "");
  const [kpiVals, setKpiVals] = useState<KpiVals>(() =>
    record
      ? Object.fromEntries(ALL_KPIS.map((k) => [k.key, String(k.path(record))]))
      : Object.fromEntries(ALL_KPIS.map((k) => [k.key, ""])),
  );

  function buildRecord(status: ESGStatus): ESGRecord {
    const now = BigInt(Date.now()) * BigInt(1_000_000);
    const n = (key: string) => {
      const v = Number.parseFloat(kpiVals[key] ?? "0");
      return Number.isNaN(v) ? 0 : v;
    };
    return {
      id: record?.id ?? `esg-${Date.now()}`,
      period,
      periodType,
      department,
      status,
      recordedAt: record?.recordedAt ?? now,
      approvedAt: BigInt(0),
      recordedBy: user.email,
      recordedByName: user.name,
      approvedBy: "",
      dataSource,
      notes,
      environmental: {
        carbonEmissionIntensity: n("carbonEmissionIntensity"),
        energyConsumption: n("energyConsumption"),
        renewableEnergyUsage: n("renewableEnergyUsage"),
        waterConsumption: n("waterConsumption"),
        waterIntensity: n("waterIntensity"),
        waterReuseRate: n("waterReuseRate"),
        wasteGenerated: n("wasteGenerated"),
        wasteRecyclingRate: n("wasteRecyclingRate"),
        envComplianceViolations: n("envComplianceViolations"),
      },
      social: {
        ltifr: n("ltifr"),
        trir: n("trir"),
        fatalities: n("fatalities"),
        employeeTurnoverRate: n("employeeTurnoverRate"),
        absenteeismRate: n("absenteeismRate"),
        trainingHoursPerEmployee: n("trainingHoursPerEmployee"),
        employeeSatisfactionIndex: n("employeeSatisfactionIndex"),
        genderDiversityRatio: n("genderDiversityRatio"),
        womenInWorkforce: n("womenInWorkforce"),
        contractorSafetyPerformance: n("contractorSafetyPerformance"),
        occupationalHealthCases: n("occupationalHealthCases"),
        grievanceCases: n("grievanceCases"),
        communityEngagementPrograms: n("communityEngagement"),
      },
      governance: {
        complianceBreaches: n("complianceBreaches"),
        regulatoryViolations: n("regulatoryViolations"),
        regulatoryPenalties: n("regulatoryPenalties"),
        whistleblowerComplaints: n("whistleblowerComplaints"),
        antiCorruptionTrainingCoverage: n("antiCorruptionTraining"),
        codeOfConductViolations: n("codeOfConductViolations"),
        policyComplianceScore: n("policyComplianceScore"),
        dataPrivacyIncidents: n("dataPrivacyIncidents"),
      },
    };
  }

  async function submit(status: ESGStatus) {
    if (!period.trim() || !department.trim()) {
      toast.error("Period and department are required");
      return;
    }
    const rec = buildRecord(status);
    if (record) await updateMut.mutateAsync(rec);
    else await createMut.mutateAsync(rec);
    onClose();
  }

  const loading = createMut.isPending || updateMut.isPending;
  const isValid = period.trim().length > 0 && department.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        style={{
          background: "rgba(8,20,38,0.99)",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
        data-ocid="esg.dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-white">
            {record ? "Edit ESG Entry" : "New ESG Entry"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-white/60 mb-1 block">
                Period <span className="text-red-400">*</span>
              </Label>
              <Input
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="YYYY-MM or YYYY-Q1"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  borderColor: "rgba(255,255,255,0.1)",
                }}
                data-ocid="esg.period_input"
              />
            </div>
            <div>
              <Label className="text-xs text-white/60 mb-1 block">
                Period Type
              </Label>
              <Select value={periodType} onValueChange={setPeriodType}>
                <SelectTrigger
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    borderColor: "rgba(255,255,255,0.1)",
                  }}
                  data-ocid="esg.period_type_select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: "rgba(8,20,38,0.97)" }}>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-white/60 mb-1 block">
                Department <span className="text-red-400">*</span>
              </Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    borderColor: "rgba(255,255,255,0.1)",
                  }}
                  data-ocid="esg.department_select"
                >
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent
                  style={{ background: "rgba(8,20,38,0.97)" }}
                  className="max-h-60 overflow-y-auto"
                >
                  {RKTR_DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <KpiFieldGroup
            title="Environmental KPIs"
            kpis={ENV_KPIS}
            vals={kpiVals}
            onChange={(k, v) => setKpiVals((p) => ({ ...p, [k]: v }))}
          />
          <KpiFieldGroup
            title="Social KPIs"
            kpis={SOCIAL_KPIS}
            vals={kpiVals}
            onChange={(k, v) => setKpiVals((p) => ({ ...p, [k]: v }))}
          />
          <KpiFieldGroup
            title="Governance KPIs"
            kpis={GOV_KPIS}
            vals={kpiVals}
            onChange={(k, v) => setKpiVals((p) => ({ ...p, [k]: v }))}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-white/60 mb-1 block">
                Data Source
              </Label>
              <Input
                value={dataSource}
                onChange={(e) => setDataSource(e.target.value)}
                placeholder="SAP EHS Module, Manual Entry..."
                style={{
                  background: "rgba(255,255,255,0.04)",
                  borderColor: "rgba(255,255,255,0.1)",
                }}
                data-ocid="esg.data_source_input"
              />
            </div>
            <div>
              <Label className="text-xs text-white/60 mb-1 block">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  borderColor: "rgba(255,255,255,0.1)",
                }}
                data-ocid="esg.notes_textarea"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              style={{ borderColor: "rgba(255,255,255,0.12)" }}
              data-ocid="esg.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => submit(ESGStatus.draft)}
              disabled={loading || !isValid}
              style={{
                background: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.7)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
              data-ocid="esg.save_draft_button"
            >
              {loading ? (
                <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
              ) : (
                "Save Draft"
              )}
            </Button>
            <Button
              type="button"
              onClick={() => submit(ESGStatus.submitted)}
              disabled={loading || !isValid}
              style={{
                background: "rgba(24,195,126,0.15)",
                border: "1px solid rgba(24,195,126,0.35)",
                color: "#18C37E",
              }}
              data-ocid="esg.submit_button"
            >
              {loading ? (
                <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
              ) : (
                "Submit for Approval"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Approve/Reject Modal ──────────────────────────────────────────────────────────────
function ApproveModal({
  record,
  user,
  onClose,
}: { record: ESGRecord; user: { name: string }; onClose: () => void }) {
  const updateStatus = useUpdateESGStatus();
  const [comment, setComment] = useState("");

  async function decide(approve: boolean) {
    await updateStatus.mutateAsync({
      id: record.id,
      status: approve ? ESGStatus.approved : ESGStatus.rejected,
      approvedBy: user.name,
      approvedAt: BigInt(Date.now()) * BigInt(1_000_000),
    });
    onClose();
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-2xl max-h-[85vh] overflow-y-auto"
        style={{
          background: "rgba(8,20,38,0.99)",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
        data-ocid="esg.approve_dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-white">
            Review ESG Record — {periodLabel(record.period)}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Department", val: record.department },
              { label: "Submitted By", val: record.recordedByName },
              { label: "Data Source", val: record.dataSource || "—" },
            ].map((i) => (
              <div key={i.label} className="glass p-3">
                <p className="text-[10px] text-white/40 mb-1">{i.label}</p>
                <p className="text-sm text-white font-semibold">{i.val}</p>
              </div>
            ))}
          </div>
          {[
            { title: "Environmental", kpis: ENV_KPIS },
            { title: "Social", kpis: SOCIAL_KPIS },
            { title: "Governance", kpis: GOV_KPIS },
          ].map(({ title, kpis }) => (
            <div key={title}>
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                {title}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {kpis.map((k) => (
                  <div
                    key={k.key}
                    className="rounded-lg p-2.5"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <p className="text-[10px] text-white/40">{k.label}</p>
                    <p className="font-semibold text-white text-sm">
                      {fmtNum(k.path(record))}{" "}
                      <span className="text-[10px] text-white/30">
                        {k.unit}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div>
            <Label className="text-xs text-white/60 mb-1 block">
              Comments (optional)
            </Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add review comments..."
              rows={2}
              style={{
                background: "rgba(255,255,255,0.04)",
                borderColor: "rgba(255,255,255,0.1)",
              }}
              data-ocid="esg.review_comment_textarea"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              style={{ borderColor: "rgba(255,255,255,0.12)" }}
              data-ocid="esg.review_cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => decide(false)}
              disabled={updateStatus.isPending}
              style={{
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#EF4444",
              }}
              data-ocid="esg.reject_button"
            >
              <XCircle className="w-4 h-4 mr-1" /> Reject
            </Button>
            <Button
              type="button"
              onClick={() => decide(true)}
              disabled={updateStatus.isPending}
              style={{
                background: "rgba(24,195,126,0.15)",
                border: "1px solid rgba(24,195,126,0.35)",
                color: "#18C37E",
              }}
              data-ocid="esg.approve_button"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Chart key configs ─────────────────────────────────────────────────────────────────
const ENV_CHART: ChartKeyDef<ESGRecord["environmental"]>[] = [
  {
    key: "carbonEmissionIntensity",
    color: "#F97316",
    name: "Carbon Intensity",
  },
  { key: "renewableEnergyUsage", color: "#18C37E", name: "Renewable %" },
  { key: "waterReuseRate", color: "#3B82F6", name: "Water Reuse %" },
  { key: "wasteRecyclingRate", color: "#8B5CF6", name: "Waste Recycling %" },
];
const SOC_CHART: ChartKeyDef<ESGRecord["social"]>[] = [
  { key: "ltifr", color: "#EF4444", name: "LTIFR" },
  { key: "trainingHoursPerEmployee", color: "#18C37E", name: "Training Hrs" },
  {
    key: "employeeSatisfactionIndex",
    color: "#3B82F6",
    name: "Satisfaction %",
  },
  {
    key: "contractorSafetyPerformance",
    color: "#FBBF24",
    name: "Contractor Safety %",
  },
];
const GOV_CHART: ChartKeyDef<ESGRecord["governance"]>[] = [
  {
    key: "policyComplianceScore",
    color: "#18C37E",
    name: "Policy Compliance %",
  },
  {
    key: "antiCorruptionTrainingCoverage",
    color: "#3B82F6",
    name: "Anti-Corruption %",
  },
  { key: "complianceBreaches", color: "#EF4444", name: "Compliance Breaches" },
  {
    key: "regulatoryViolations",
    color: "#F97316",
    name: "Regulatory Violations",
  },
];

// ─── Main Page ──────────────────────────────────────────────────────────────────────
export default function ESGPage() {
  const { user } = useAuth();
  const { data: backendRecs, isLoading } = useESGRecords();

  const deleteMut = useDeleteESGRecord();

  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [showEntry, setShowEntry] = useState(false);
  const [editRecord, setEditRecord] = useState<ESGRecord | undefined>();
  const [approveRecord, setApproveRecord] = useState<ESGRecord | undefined>();
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);
  const [activeTab, setActiveTab] = useState("environmental");

  const canApprove =
    user?.role === "safetyOfficer" ||
    user?.role === "ehsManager" ||
    user?.role === "systemAdmin";
  const canCreate = [
    "employee",
    "supervisor",
    "safetyOfficer",
    "ehsManager",
    "systemAdmin",
  ].includes(user?.role ?? "");
  const canDelete = (r: ESGRecord) =>
    user?.role === "systemAdmin" ||
    user?.role === "ehsManager" ||
    (r.status === ESGStatus.draft && r.recordedBy === user?.email);

  const allRecords = useMemo(() => {
    const ids = new Set((backendRecs ?? []).map((r) => r.id));
    return [
      ...MOCK_RECORDS.filter((m) => !ids.has(m.id)),
      ...(backendRecs ?? []),
    ];
  }, [backendRecs]);

  const filteredRecords = useMemo(
    () =>
      periodFilter === "all"
        ? allRecords
        : allRecords.filter((r) => r.periodType === periodFilter),
    [allRecords, periodFilter],
  );

  const sortedRecords = useMemo(
    () => [...filteredRecords].sort((a, b) => b.period.localeCompare(a.period)),
    [filteredRecords],
  );

  const dateStr = new Date().toISOString().split("T")[0];
  const filenameBase = `RKTR-ESG-Report-${dateStr}`;

  async function handleExcelExport() {
    setExporting("excel");
    const tid = toast.loading("Generating Excel report…");
    try {
      const wb = XLSXUtils.book_new();
      const approved = filteredRecords.filter(
        (r) => r.status === ESGStatus.approved,
      );
      XLSXUtils.book_append_sheet(
        wb,
        XLSXUtils.aoa_to_sheet([
          [
            "Period",
            "Department",
            "E Score",
            "S Score",
            "G Score",
            "Overall",
            "Status",
            "Recorded By",
          ],
          ...approved.map((r) => [
            periodLabel(r.period),
            r.department,
            Math.round(calcGroupScore(r, "environmental")),
            Math.round(calcGroupScore(r, "social")),
            Math.round(calcGroupScore(r, "governance")),
            Math.round(
              calcGroupScore(r, "environmental") * 0.4 +
                calcGroupScore(r, "social") * 0.4 +
                calcGroupScore(r, "governance") * 0.2,
            ),
            esgStatusLabel(r.status),
            r.recordedByName,
          ]),
        ]),
        "ESG Summary",
      );
      XLSXUtils.book_append_sheet(
        wb,
        XLSXUtils.aoa_to_sheet([
          ["Period", ...ENV_KPIS.map((k) => `${k.label} (${k.unit})`)],
          ...approved.map((r) => [
            periodLabel(r.period),
            ...ENV_KPIS.map((k) => k.path(r)),
          ]),
        ]),
        "Environmental KPIs",
      );
      XLSXUtils.book_append_sheet(
        wb,
        XLSXUtils.aoa_to_sheet([
          ["Period", ...SOCIAL_KPIS.map((k) => `${k.label} (${k.unit})`)],
          ...approved.map((r) => [
            periodLabel(r.period),
            ...SOCIAL_KPIS.map((k) => k.path(r)),
          ]),
        ]),
        "Social KPIs",
      );
      XLSXUtils.book_append_sheet(
        wb,
        XLSXUtils.aoa_to_sheet([
          ["Period", ...GOV_KPIS.map((k) => `${k.label} (${k.unit})`)],
          ...approved.map((r) => [
            periodLabel(r.period),
            ...GOV_KPIS.map((k) => k.path(r)),
          ]),
        ]),
        "Governance KPIs",
      );
      XLSXWriteFile(wb, `${filenameBase}.xlsx`);
      toast.success("Excel report downloaded!", { id: tid });
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate Excel.", { id: tid });
    } finally {
      setExporting(null);
    }
  }

  async function handlePDFExport() {
    setExporting("pdf");
    const tid = toast.loading("Generating PDF report…");
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const W = doc.internal.pageSize.getWidth();
      let y = 14;
      doc.setFillColor(8, 20, 38);
      doc.rect(0, 0, W, 30, "F");
      doc.setTextColor(24, 195, 126);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("RKTR OHSE Command Center", W / 2, 13, { align: "center" });
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(180, 200, 220);
      doc.text(`ESG Performance Report  ·  Generated: ${dateStr}`, W / 2, 21, {
        align: "center",
      });
      doc.setTextColor(60, 80, 100);
      doc.text(
        "Ramkrishna Titagarh Rail Wheels Limited — Confidential",
        W / 2,
        27,
        { align: "center" },
      );
      y = 40;
      const opts = {
        theme: "striped" as const,
        headStyles: {
          fillColor: [8, 20, 38] as [number, number, number],
          textColor: [24, 195, 126] as [number, number, number],
          fontStyle: "bold" as const,
          fontSize: 8,
        },
        bodyStyles: {
          fontSize: 7,
          textColor: [30, 40, 60] as [number, number, number],
        },
        alternateRowStyles: {
          fillColor: [245, 248, 252] as [number, number, number],
        },
        margin: { left: 10, right: 10 },
      };
      const approved = filteredRecords.filter(
        (r) => r.status === ESGStatus.approved,
      );
      autoTable(doc, {
        startY: y,
        head: [["Period", "Dept", "E", "S", "G", "Overall", "By"]],
        body: approved.map((r) => [
          periodLabel(r.period),
          r.department,
          Math.round(calcGroupScore(r, "environmental")),
          Math.round(calcGroupScore(r, "social")),
          Math.round(calcGroupScore(r, "governance")),
          Math.round(
            calcGroupScore(r, "environmental") * 0.4 +
              calcGroupScore(r, "social") * 0.4 +
              calcGroupScore(r, "governance") * 0.2,
          ),
          r.recordedByName,
        ]),
        ...opts,
      });
      y =
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY + 8;
      if (y > 220) {
        doc.addPage();
        y = 20;
      }
      autoTable(doc, {
        startY: y,
        head: [["KPI", "Unit", ...approved.map((r) => periodLabel(r.period))]],
        body: ENV_KPIS.map((k) => [
          k.label,
          k.unit,
          ...approved.map((r) => fmtNum(k.path(r))),
        ]),
        ...opts,
      });
      y =
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY + 8;
      if (y > 220) {
        doc.addPage();
        y = 20;
      }
      autoTable(doc, {
        startY: y,
        head: [["KPI", "Unit", ...approved.map((r) => periodLabel(r.period))]],
        body: SOCIAL_KPIS.map((k) => [
          k.label,
          k.unit,
          ...approved.map((r) => fmtNum(k.path(r))),
        ]),
        ...opts,
      });
      y =
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY + 8;
      if (y > 220) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(24, 195, 126);
      doc.text("Governance KPIs", 10, y);
      y += 5;
      autoTable(doc, {
        startY: y,
        head: [["KPI", "Unit", ...approved.map((r) => periodLabel(r.period))]],
        body: GOV_KPIS.map((k) => [
          k.label,
          k.unit,
          ...approved.map((r) => fmtNum(k.path(r))),
        ]),
        ...opts,
      });
      const n = doc.getNumberOfPages();
      for (let p = 1; p <= n; p++) {
        doc.setPage(p);
        doc.setFontSize(7);
        doc.setTextColor(150, 160, 180);
        doc.text(
          `RKTR ESG Report  |  Page ${p} of ${n}  |  ${dateStr}`,
          W / 2,
          doc.internal.pageSize.getHeight() - 6,
          { align: "center" },
        );
      }
      doc.save(`${filenameBase}.pdf`);
      toast.success("PDF report downloaded!", { id: tid });
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF.", { id: tid });
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
      data-ocid="esg.page"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: "rgba(24,195,126,0.12)",
              border: "1px solid rgba(24,195,126,0.25)",
            }}
          >
            <Leaf className="w-5 h-5" style={{ color: "#18C37E" }} />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-white leading-tight">
              ESG Performance Tracker
            </h1>
            <p className="text-xs text-white/40">
              RKTR OHSE · Environmental, Social &amp; Governance
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
            data-ocid="esg.period_filter"
          >
            {(["all", "monthly", "quarterly"] as PeriodFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setPeriodFilter(f)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-smooth capitalize"
                style={{
                  background:
                    periodFilter === f
                      ? "rgba(24,195,126,0.18)"
                      : "transparent",
                  color:
                    periodFilter === f ? "#18C37E" : "rgba(255,255,255,0.45)",
                  border:
                    periodFilter === f
                      ? "1px solid rgba(24,195,126,0.35)"
                      : "1px solid transparent",
                }}
                data-ocid={`esg.filter.${f}`}
              >
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
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
                data-ocid="esg.export_button"
              >
                {exporting ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    {exporting === "excel" ? "Excel…" : "PDF…"}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export
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
                onClick={handleExcelExport}
                className="gap-2.5 cursor-pointer"
                data-ocid="esg.export_excel_button"
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
                    .xlsx · 4 sheets
                  </div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handlePDFExport}
                className="gap-2.5 cursor-pointer"
                data-ocid="esg.export_pdf_button"
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
          {canCreate && (
            <Button
              type="button"
              size="sm"
              className="gap-2"
              onClick={() => {
                setEditRecord(undefined);
                setShowEntry(true);
              }}
              style={{
                background: "rgba(24,195,126,0.15)",
                border: "1px solid rgba(24,195,126,0.35)",
                color: "#18C37E",
              }}
              data-ocid="esg.new_entry_button"
            >
              <Plus className="w-4 h-4" /> New ESG Entry
            </Button>
          )}
        </div>
      </div>

      {/* Score + Group Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div data-ocid="esg.score_card">
          {isLoading ? (
            <Skeleton className="w-full h-64" />
          ) : (
            <ESGScoreGauge records={allRecords} />
          )}
        </div>
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(
            [
              {
                label: "Environmental",
                icon: <Leaf className="w-5 h-5" style={{ color: "#18C37E" }} />,
                kpis: ENV_KPIS,
                color: "#18C37E",
                tab: "environmental",
              },
              {
                label: "Social",
                icon: (
                  <Users className="w-5 h-5" style={{ color: "#3B82F6" }} />
                ),
                kpis: SOCIAL_KPIS,
                color: "#3B82F6",
                tab: "social",
              },
              {
                label: "Governance",
                icon: (
                  <ShieldCheck
                    className="w-5 h-5"
                    style={{ color: "#8B5CF6" }}
                  />
                ),
                kpis: GOV_KPIS,
                color: "#8B5CF6",
                tab: "governance",
              },
            ] as const
          ).map((g) => {
            const latestApproved = [...allRecords]
              .filter((r) => r.status === ESGStatus.approved)
              .sort((a, b) => b.period.localeCompare(a.period))[0];
            const score = latestApproved
              ? Math.round(calcGroupScore(latestApproved, g.tab))
              : 0;
            return (
              <motion.button
                key={g.tab}
                type="button"
                onClick={() => setActiveTab(g.tab)}
                className="glass p-4 text-left transition-smooth w-full"
                whileHover={{ scale: 1.02 }}
                style={{
                  boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                  border:
                    activeTab === g.tab
                      ? `1px solid ${g.color}40`
                      : "1px solid rgba(255,255,255,0.08)",
                }}
                data-ocid={`esg.group.${g.tab}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {g.icon}
                  <span className="text-sm font-semibold text-white/80">
                    {g.label}
                  </span>
                </div>
                <p
                  className="font-display font-bold text-2xl"
                  style={{ color: scoreColor(score) }}
                >
                  {score}
                </p>
                <p className="text-[11px] text-white/40">
                  {g.kpis.length} indicators
                </p>
                <div
                  className="mt-2 h-1 rounded-full"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${score}%`,
                      background: g.color,
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* KPI Cards */}
      <section data-ocid="esg.kpi_section">
        <SectionHeading
          icon={<BarChart2 className="w-4 h-4" style={{ color: "#18C37E" }} />}
          label="KPI Indicators"
        />
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList
            className="mb-5"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <TabsTrigger
              value="environmental"
              data-ocid="esg.tab.environmental"
            >
              Environmental ({ENV_KPIS.length})
            </TabsTrigger>
            <TabsTrigger value="social" data-ocid="esg.tab.social">
              Social ({SOCIAL_KPIS.length})
            </TabsTrigger>
            <TabsTrigger value="governance" data-ocid="esg.tab.governance">
              Governance ({GOV_KPIS.length})
            </TabsTrigger>
          </TabsList>
          {[
            { tab: "environmental", kpis: ENV_KPIS },
            { tab: "social", kpis: SOCIAL_KPIS },
            { tab: "governance", kpis: GOV_KPIS },
          ].map(({ tab, kpis }) => (
            <TabsContent key={tab} value={tab}>
              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {kpis.map((k) => (
                    <Skeleton key={k.key} className="h-32 rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {kpis.map((k) => (
                    <KpiCard key={k.key} kpi={k} records={filteredRecords} />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </section>

      {/* Trend Charts */}
      <section data-ocid="esg.trends_section">
        <SectionHeading
          icon={<TrendingUp className="w-4 h-4" style={{ color: "#18C37E" }} />}
          label="ESG Trend Charts"
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <TrendChart
            title="Environmental Trends"
            records={filteredRecords}
            accessor={(r) => r.environmental}
            keys={ENV_CHART}
          />
          <TrendChart
            title="Social Trends"
            records={filteredRecords}
            accessor={(r) => r.social}
            keys={SOC_CHART}
          />
          <TrendChart
            title="Governance Trends"
            records={filteredRecords}
            accessor={(r) => r.governance}
            keys={GOV_CHART}
          />
        </div>
      </section>

      {/* Records Table */}
      <section data-ocid="esg.records_section">
        <SectionHeading
          icon={<FileText className="w-4 h-4" style={{ color: "#18C37E" }} />}
          label="ESG Records"
        />
        <div
          className="glass overflow-hidden"
          style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.25)" }}
        >
          {isLoading ? (
            <div className="p-6 space-y-3">
              {["r1", "r2", "r3", "r4"].map((k) => (
                <Skeleton key={k} className="h-10 w-full" />
              ))}
            </div>
          ) : sortedRecords.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-3 py-16 text-white/30"
              data-ocid="esg.records_empty_state"
            >
              <Leaf className="w-10 h-10 opacity-30" />
              <p className="text-sm">No ESG records found</p>
              {canCreate && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowEntry(true)}
                  style={{
                    background: "rgba(24,195,126,0.15)",
                    border: "1px solid rgba(24,195,126,0.3)",
                    color: "#18C37E",
                  }}
                >
                  + New Entry
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm" data-ocid="esg.records_table">
                <thead>
                  <tr
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    {[
                      "Period",
                      "Department",
                      "E Score",
                      "S Score",
                      "G Score",
                      "Overall",
                      "Status",
                      "Submitted By",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/40"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedRecords.map((rec, i) => {
                    const eS = Math.round(calcGroupScore(rec, "environmental"));
                    const sS = Math.round(calcGroupScore(rec, "social"));
                    const gS = Math.round(calcGroupScore(rec, "governance"));
                    const ov = Math.round(eS * 0.4 + sS * 0.4 + gS * 0.2);
                    return (
                      <motion.tr
                        key={rec.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="transition-smooth"
                        style={{
                          borderBottom:
                            i < sortedRecords.length - 1
                              ? "1px solid rgba(255,255,255,0.05)"
                              : "none",
                        }}
                        onMouseEnter={(e) => {
                          (
                            e.currentTarget as HTMLTableRowElement
                          ).style.background = "rgba(255,255,255,0.025)";
                        }}
                        onMouseLeave={(e) => {
                          (
                            e.currentTarget as HTMLTableRowElement
                          ).style.background = "transparent";
                        }}
                        data-ocid={`esg.records_table.row.${i + 1}`}
                      >
                        <td className="px-4 py-3 font-semibold text-white/80">
                          {periodLabel(rec.period)}
                        </td>
                        <td className="px-4 py-3 text-white/60 text-xs">
                          {rec.department}
                        </td>
                        <td
                          className="px-4 py-3 font-mono"
                          style={{ color: scoreColor(eS) }}
                        >
                          {eS}
                        </td>
                        <td
                          className="px-4 py-3 font-mono"
                          style={{ color: scoreColor(sS) }}
                        >
                          {sS}
                        </td>
                        <td
                          className="px-4 py-3 font-mono"
                          style={{ color: scoreColor(gS) }}
                        >
                          {gS}
                        </td>
                        <td
                          className="px-4 py-3 font-mono font-bold"
                          style={{ color: scoreColor(ov) }}
                        >
                          {ov}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`text-[11px] border ${esgStatusClass(rec.status)}`}
                          >
                            {esgStatusLabel(rec.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-white/50 text-xs">
                          {rec.recordedByName}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {canApprove &&
                              rec.status === ESGStatus.submitted && (
                                <button
                                  type="button"
                                  onClick={() => setApproveRecord(rec)}
                                  className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-smooth"
                                  style={{
                                    background: "rgba(24,195,126,0.12)",
                                    color: "#18C37E",
                                    border: "1px solid rgba(24,195,126,0.25)",
                                  }}
                                  data-ocid={`esg.approve_button.${i + 1}`}
                                >
                                  <CheckCircle2 className="w-3 h-3" /> Review
                                </button>
                              )}
                            {rec.status === ESGStatus.draft && canCreate && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditRecord(rec);
                                  setShowEntry(true);
                                }}
                                className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-smooth"
                                style={{
                                  background: "rgba(59,130,246,0.12)",
                                  color: "#3B82F6",
                                  border: "1px solid rgba(59,130,246,0.25)",
                                }}
                                data-ocid={`esg.edit_button.${i + 1}`}
                              >
                                Edit
                              </button>
                            )}
                            {canDelete(rec) && (
                              <button
                                type="button"
                                onClick={async () => {
                                  if (
                                    confirm(
                                      "Delete this ESG record? This cannot be undone.",
                                    )
                                  )
                                    await deleteMut.mutateAsync(rec.id);
                                }}
                                className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-smooth"
                                style={{
                                  background: "rgba(239,68,68,0.12)",
                                  color: "#EF4444",
                                  border: "1px solid rgba(239,68,68,0.25)",
                                }}
                                data-ocid={`esg.delete_button.${i + 1}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {showEntry && user && (
        <ESGEntryDialog
          open={showEntry}
          onClose={() => {
            setShowEntry(false);
            setEditRecord(undefined);
          }}
          record={editRecord}
          user={user}
        />
      )}
      {approveRecord && user && (
        <ApproveModal
          record={approveRecord}
          user={user}
          onClose={() => setApproveRecord(undefined)}
        />
      )}
    </motion.div>
  );
}
