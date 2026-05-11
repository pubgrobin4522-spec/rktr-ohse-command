import type { EnvironmentRecord } from "@/backend";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { RKTR_LOCATIONS } from "@/constants/locations";
import {
  useCreateEnvironmentRecord,
  useDeleteEnvironmentRecord,
  useEnvironmentRecords,
} from "@/hooks/useBackend";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Droplets,
  Flame,
  Leaf,
  Plus,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

// ─── Constants ───────────────────────────────────────────────────────────────

const LOCATIONS = RKTR_LOCATIONS;

const RECORD_TYPES = [
  { label: "CO2 Emissions", value: "CO2 Emissions", unit: "tonnes" },
  { label: "Water Usage", value: "Water Usage", unit: "m³" },
  { label: "Energy Consumption", value: "Energy Consumption", unit: "kWh" },
  { label: "Hazardous Waste", value: "Hazardous Waste", unit: "kg" },
  { label: "Spill", value: "Spill", unit: "litres" },
  { label: "Non-Hazardous Waste", value: "Non-Hazardous Waste", unit: "kg" },
];

// chart data helpers — used inside components that call useEnvironmentRecords
function monthKey(ts: bigint): string {
  const d = new Date(Number(ts) / 1_000_000);
  return d.toLocaleString("default", { month: "short", year: "2-digit" });
}

function lastSixMonthLabels(): string[] {
  const labels: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(
      d.toLocaleString("default", { month: "short", year: "2-digit" }),
    );
  }
  return labels;
}

const SIX_MONTH_LABELS = lastSixMonthLabels();

function groupByMonth(
  recs: EnvironmentRecord[],
  matchFn: (r: EnvironmentRecord) => boolean,
): { month: string; value: number }[] {
  const map: Record<string, number> = {};
  for (const lbl of SIX_MONTH_LABELS) map[lbl] = 0;
  for (const r of recs) {
    if (!matchFn(r)) continue;
    const lbl = monthKey(r.createdAt);
    map[lbl] = (map[lbl] ?? 0) + r.value;
  }
  return SIX_MONTH_LABELS.map((m) => ({
    month: m,
    value: Math.round(map[m] * 10) / 10,
  }));
}

const MOCK_WASTE = [
  {
    type: "Metals",
    qty: 2400,
    method: "Recycling",
    date: "2026-04-05",
    contractor: "GreenMet India",
    manifest: "MNF-2026-041",
  },
  {
    type: "Oil / Lubricants",
    qty: 380,
    method: "Incineration",
    date: "2026-04-03",
    contractor: "SafeDispose Ltd",
    manifest: "MNF-2026-039",
  },
  {
    type: "Electronic Waste",
    qty: 95,
    method: "Recycling",
    date: "2026-03-28",
    contractor: "EcoTech Solutions",
    manifest: "MNF-2026-033",
  },
  {
    type: "Chemical Waste",
    qty: 145,
    method: "Secure Landfill",
    date: "2026-03-20",
    contractor: "ChemSafe Corp",
    manifest: "MNF-2026-028",
  },
  {
    type: "Slag",
    qty: 5800,
    method: "Recycling",
    date: "2026-03-15",
    contractor: "SlagReuse Pvt",
    manifest: "MNF-2026-025",
  },
];

const ASPECTS = [
  { label: "Air Emissions", icon: "💨", level: "Significant" },
  { label: "Water Effluent", icon: "💧", level: "Moderate" },
  { label: "Hazardous Waste", icon: "⚠️", level: "High" },
  { label: "Non-Hazardous Waste", icon: "♻️", level: "Low" },
  { label: "Energy Use", icon: "⚡", level: "Significant" },
  { label: "Land Use", icon: "🌱", level: "Low" },
];

const TABS = [
  "Overview",
  "Monitoring Records",
  "Spill Reports",
  "Waste Disposal",
] as const;
type Tab = (typeof TABS)[number];

// ─── Sub-components ───────────────────────────────────────────────────────────

function GlassCard({
  children,
  className = "",
}: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl p-5 ${className}`}
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {children}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  unit,
  trend,
  trendUp,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  trend: string;
  trendUp: boolean;
  color: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className="rounded-xl p-5 flex flex-col gap-3 transition-smooth"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{
            background: color,
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {icon}
        </div>
        <span
          className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
            trendUp
              ? "text-red-400 bg-red-400/10"
              : "text-green-400 bg-green-400/10"
          }`}
        >
          {trendUp ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
          {trend}
        </span>
      </div>
      <div>
        <p className="text-white/50 text-xs mb-1">{label}</p>
        <p className="font-display font-bold text-2xl text-white">
          {value}{" "}
          <span className="text-sm font-normal text-white/40">{unit}</span>
        </p>
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    Cleaned: "bg-green-500/15 text-green-400 border-green-500/20",
    Contained: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
    Monitoring: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
        cfg[status] ?? "bg-white/10 text-white/60 border-white/10"
      }`}
    >
      {status}
    </span>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function CreateRecordModal({ onClose }: { onClose: () => void }) {
  const createRecord = useCreateEnvironmentRecord();
  const [form, setForm] = useState({
    recordType: "",
    value: "",
    unit: "",
    location: "",
    recordedBy: "EHS Manager",
    notes: "",
    date: new Date().toISOString().slice(0, 10),
  });

  function handleTypeChange(val: string) {
    const found = RECORD_TYPES.find((r) => r.value === val);
    setForm((f) => ({ ...f, recordType: val, unit: found?.unit ?? "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.recordType || !form.value || !form.location) {
      toast.error("Please fill in all required fields.");
      return;
    }
    const record: EnvironmentRecord = {
      id: `ENV-${Date.now()}`,
      recordType: form.recordType,
      value: Number.parseFloat(form.value),
      unit: form.unit,
      location: form.location,
      recordedBy: form.recordedBy,
      notes: form.notes || undefined,
      createdAt: BigInt(Date.now() * 1_000_000),
    };
    try {
      await createRecord.mutateAsync(record);
      toast.success("Environment record created.");
      onClose();
    } catch (_err) {
      toast.error("Failed to create record.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg rounded-2xl p-6 mx-4"
        style={{
          background: "#0f1e33",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
        data-ocid="env.dialog"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-semibold text-white">
            Add Monitoring Record
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-smooth"
            data-ocid="env.close_button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label
              htmlFor="env-type"
              className="text-white/70 text-xs mb-1.5 block"
            >
              Record Type *
            </Label>
            <Select value={form.recordType} onValueChange={handleTypeChange}>
              <SelectTrigger
                id="env-type"
                className="border-white/10 bg-white/5 text-white"
                data-ocid="env.select"
              >
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {RECORD_TYPES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label
                htmlFor="env-value"
                className="text-white/70 text-xs mb-1.5 block"
              >
                Value *
              </Label>
              <Input
                id="env-value"
                type="number"
                placeholder="0.00"
                value={form.value}
                onChange={(e) =>
                  setForm((f) => ({ ...f, value: e.target.value }))
                }
                className="border-white/10 bg-white/5 text-white"
                data-ocid="env.input"
              />
            </div>
            <div>
              <Label
                htmlFor="env-unit"
                className="text-white/70 text-xs mb-1.5 block"
              >
                Unit
              </Label>
              <Input
                id="env-unit"
                value={form.unit}
                readOnly
                className="border-white/10 bg-white/5 text-white/50"
              />
            </div>
          </div>

          <div>
            <Label
              htmlFor="env-location"
              className="text-white/70 text-xs mb-1.5 block"
            >
              Location *
            </Label>
            <Select
              value={form.location}
              onValueChange={(v) => setForm((f) => ({ ...f, location: v }))}
            >
              <SelectTrigger
                id="env-location"
                className="border-white/10 bg-white/5 text-white"
              >
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {LOCATIONS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label
                htmlFor="env-recorded-by"
                className="text-white/70 text-xs mb-1.5 block"
              >
                Recorded By
              </Label>
              <Input
                id="env-recorded-by"
                value={form.recordedBy}
                onChange={(e) =>
                  setForm((f) => ({ ...f, recordedBy: e.target.value }))
                }
                className="border-white/10 bg-white/5 text-white"
              />
            </div>
            <div>
              <Label
                htmlFor="env-date"
                className="text-white/70 text-xs mb-1.5 block"
              >
                Recording Date
              </Label>
              <Input
                id="env-date"
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
                className="border-white/10 bg-white/5 text-white"
              />
            </div>
          </div>

          <div>
            <Label
              htmlFor="env-notes"
              className="text-white/70 text-xs mb-1.5 block"
            >
              Notes
            </Label>
            <Textarea
              id="env-notes"
              placeholder="Optional notes…"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              className="border-white/10 bg-white/5 text-white resize-none"
              rows={2}
              data-ocid="env.textarea"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-white/10 text-white/70 hover:bg-white/5"
              onClick={onClose}
              data-ocid="env.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createRecord.isPending}
              className="flex-1"
              style={{ background: "#18C37E", color: "#081426" }}
              data-ocid="env.submit_button"
            >
              {createRecord.isPending ? "Saving…" : "Save Record"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function SpillModal({ onClose }: { onClose: () => void }) {
  const createRecord = useCreateEnvironmentRecord();
  const [form, setForm] = useState({
    location: "",
    material: "",
    volume: "",
    action: "",
    notified: "",
    status: "Contained",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.location || !form.material) {
      toast.error("Please fill in location and material.");
      return;
    }
    const record: EnvironmentRecord = {
      id: `SPL-${Date.now()}`,
      recordType: "spill",
      value: form.volume ? Number.parseFloat(form.volume) : 0,
      unit: "litres",
      location: form.location,
      recordedBy: form.notified || "EHS Manager",
      notes: `Material: ${form.material} | Action: ${form.action || "—"} | Status: ${form.status}`,
      createdAt: BigInt(Date.now() * 1_000_000),
    };
    try {
      await createRecord.mutateAsync(record);
      toast.success("Spill report submitted and saved.");
      onClose();
    } catch (_err) {
      toast.error("Failed to save spill report.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg rounded-2xl p-6 mx-4"
        style={{
          background: "#0f1e33",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
        data-ocid="spill.dialog"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-semibold text-white">
            Report Spill Incident
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-smooth"
            data-ocid="spill.close_button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label
              htmlFor="spill-location"
              className="text-white/70 text-xs mb-1.5 block"
            >
              Location *
            </Label>
            <Select
              value={form.location}
              onValueChange={(v) => setForm((f) => ({ ...f, location: v }))}
            >
              <SelectTrigger
                id="spill-location"
                className="border-white/10 bg-white/5 text-white"
              >
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {LOCATIONS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label
                htmlFor="spill-material"
                className="text-white/70 text-xs mb-1.5 block"
              >
                Material Spilled *
              </Label>
              <Input
                id="spill-material"
                placeholder="e.g. Hydraulic Oil"
                value={form.material}
                onChange={(e) =>
                  setForm((f) => ({ ...f, material: e.target.value }))
                }
                className="border-white/10 bg-white/5 text-white"
              />
            </div>
            <div>
              <Label
                htmlFor="spill-volume"
                className="text-white/70 text-xs mb-1.5 block"
              >
                Volume (litres)
              </Label>
              <Input
                id="spill-volume"
                type="number"
                placeholder="0"
                value={form.volume}
                onChange={(e) =>
                  setForm((f) => ({ ...f, volume: e.target.value }))
                }
                className="border-white/10 bg-white/5 text-white"
              />
            </div>
          </div>
          <div>
            <Label
              htmlFor="spill-action"
              className="text-white/70 text-xs mb-1.5 block"
            >
              Immediate Action Taken
            </Label>
            <Textarea
              id="spill-action"
              placeholder="Describe immediate containment actions…"
              value={form.action}
              onChange={(e) =>
                setForm((f) => ({ ...f, action: e.target.value }))
              }
              className="border-white/10 bg-white/5 text-white resize-none"
              rows={2}
            />
          </div>
          <div>
            <Label
              htmlFor="spill-notified"
              className="text-white/70 text-xs mb-1.5 block"
            >
              Notified Persons
            </Label>
            <Input
              id="spill-notified"
              placeholder="e.g. EHS Manager, Shift Incharge"
              value={form.notified}
              onChange={(e) =>
                setForm((f) => ({ ...f, notified: e.target.value }))
              }
              className="border-white/10 bg-white/5 text-white"
            />
          </div>
          <div>
            <Label
              htmlFor="spill-status"
              className="text-white/70 text-xs mb-1.5 block"
            >
              Cleanup Status
            </Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
            >
              <SelectTrigger
                id="spill-status"
                className="border-white/10 bg-white/5 text-white"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Contained">Contained</SelectItem>
                <SelectItem value="Cleaned">Cleaned</SelectItem>
                <SelectItem value="Monitoring">Monitoring</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-white/10 text-white/70 hover:bg-white/5"
              onClick={onClose}
              data-ocid="spill.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createRecord.isPending}
              className="flex-1"
              style={{ background: "#18C37E", color: "#081426" }}
              data-ocid="spill.submit_button"
            >
              {createRecord.isPending ? "Saving…" : "Submit Report"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Tab content ──────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: envRecs, isLoading } = useEnvironmentRecords();
  const recs = envRecs ?? [];

  const co2Data = groupByMonth(
    recs,
    (r) =>
      r.recordType === "emission" ||
      r.recordType === "CO2 Emissions" ||
      r.unit?.toLowerCase() === "tonnes",
  );
  const waterData = groupByMonth(
    recs,
    (r) =>
      r.recordType === "water" ||
      r.recordType === "Water Usage" ||
      r.unit?.toLowerCase() === "m³" ||
      r.unit?.toLowerCase() === "m3",
  );
  const wasteData = groupByMonth(
    recs,
    (r) =>
      r.recordType === "waste" ||
      r.recordType === "Hazardous Waste" ||
      r.recordType === "spill",
  );
  const energyData = groupByMonth(
    recs,
    (r) =>
      r.recordType === "energy" ||
      r.recordType === "Energy Consumption" ||
      r.unit?.toLowerCase() === "kwh",
  );

  const hasCo2 = co2Data.some((d) => d.value > 0);
  const hasWater = waterData.some((d) => d.value > 0);
  const hasWaste = wasteData.some((d) => d.value > 0);
  const hasEnergy = energyData.some((d) => d.value > 0);

  // KPI summaries from latest non-zero month
  const latestCo2 = [...co2Data].reverse().find((d) => d.value > 0)?.value ?? 0;
  const latestWater =
    [...waterData].reverse().find((d) => d.value > 0)?.value ?? 0;
  const latestEnergy =
    [...energyData].reverse().find((d) => d.value > 0)?.value ?? 0;
  const latestWaste =
    [...wasteData].reverse().find((d) => d.value > 0)?.value ?? 0;

  const tooltipStyle = {
    background: "#0f1e33",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    color: "#fff",
  };

  function EmptyChartMsg() {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 text-white/30"
        style={{ height: 160 }}
      >
        <Activity className="w-6 h-6 opacity-40" />
        <p className="text-xs">No data recorded yet</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Flame className="w-4 h-4 text-orange-400" />}
          label="CO₂ Emissions"
          value={
            isLoading ? "…" : latestCo2 > 0 ? latestCo2.toLocaleString() : "—"
          }
          unit="tonnes"
          trend=""
          trendUp={false}
          color="rgba(251,146,60,0.15)"
        />
        <KpiCard
          icon={<Droplets className="w-4 h-4 text-blue-400" />}
          label="Water Usage"
          value={
            isLoading
              ? "…"
              : latestWater > 0
                ? latestWater.toLocaleString()
                : "—"
          }
          unit="m³"
          trend=""
          trendUp={false}
          color="rgba(96,165,250,0.15)"
        />
        <KpiCard
          icon={<Zap className="w-4 h-4 text-yellow-400" />}
          label="Energy Consumption"
          value={
            isLoading
              ? "…"
              : latestEnergy > 0
                ? latestEnergy.toLocaleString()
                : "—"
          }
          unit="kWh"
          trend=""
          trendUp={false}
          color="rgba(250,204,21,0.15)"
        />
        <KpiCard
          icon={<AlertTriangle className="w-4 h-4 text-red-400" />}
          label="Hazardous Waste"
          value={
            isLoading
              ? "…"
              : latestWaste > 0
                ? latestWaste.toLocaleString()
                : "—"
          }
          unit="kg"
          trend=""
          trendUp={false}
          color="rgba(248,113,113,0.15)"
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard>
          <p className="text-white/60 text-xs font-medium mb-4">
            Carbon Emissions Trend (CO₂ tonnes)
          </p>
          {isLoading ? (
            <Skeleton className="h-40 w-full rounded" />
          ) : !hasCo2 ? (
            <EmptyChartMsg />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart
                data={co2Data}
                margin={{ top: 4, right: 8, bottom: 0, left: -20 }}
              >
                <defs>
                  <linearGradient id="co2grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#18C37E" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#18C37E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
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
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#18C37E"
                  strokeWidth={2}
                  fill="url(#co2grad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </GlassCard>

        <GlassCard>
          <p className="text-white/60 text-xs font-medium mb-4">
            Water Usage (m³)
          </p>
          {isLoading ? (
            <Skeleton className="h-40 w-full rounded" />
          ) : !hasWater ? (
            <EmptyChartMsg />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart
                data={waterData}
                margin={{ top: 4, right: 8, bottom: 0, left: -20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
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
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={{ fill: "#60a5fa", r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </GlassCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard>
          <p className="text-white/60 text-xs font-medium mb-4">
            Energy Consumption (kWh)
          </p>
          {isLoading ? (
            <Skeleton className="h-40 w-full rounded" />
          ) : !hasEnergy ? (
            <EmptyChartMsg />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={energyData}
                margin={{ top: 4, right: 8, bottom: 0, left: -20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
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
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </GlassCard>

        <GlassCard>
          <p className="text-white/60 text-xs font-medium mb-4">
            Hazardous Waste (kg)
          </p>
          {isLoading ? (
            <Skeleton className="h-40 w-full rounded" />
          ) : !hasWaste ? (
            <EmptyChartMsg />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart
                data={wasteData}
                margin={{ top: 4, right: 8, bottom: 0, left: -20 }}
              >
                <defs>
                  <linearGradient id="wastegrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
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
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#f97316"
                  strokeWidth={2}
                  fill="url(#wastegrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </GlassCard>
      </div>

      {/* ISO 14001 + Aspects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <p className="text-white/80 text-sm font-medium">
              ISO 14001 Compliance
            </p>
            <span className="text-green-400 font-bold text-sm">92%</span>
          </div>
          <div
            className="w-full h-3 rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "92%" }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg,#18C37E,#0fa866)" }}
            />
          </div>
          <div className="mt-4 space-y-2">
            {[
              { label: "Clause 6.1 – Environmental Aspects", pct: 95 },
              { label: "Clause 7.2 – Competence", pct: 88 },
              { label: "Clause 9.1 – Monitoring", pct: 91 },
              { label: "Clause 10.2 – Nonconformity", pct: 84 },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs text-white/50 mb-1">
                  <span>{item.label}</span>
                  <span>{item.pct}%</span>
                </div>
                <div
                  className="w-full h-1.5 rounded-full"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.pct}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="h-full rounded-full"
                    style={{ background: "#18C37E" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <p className="text-white/80 text-sm font-medium mb-4">
            Environmental Aspects
          </p>
          <div className="space-y-2">
            {ASPECTS.map((a) => (
              <div
                key={a.label}
                className="flex items-center justify-between px-3 py-2 rounded-lg"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{a.icon}</span>
                  <span className="text-white/70 text-sm">{a.label}</span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                    a.level === "High" || a.level === "Significant"
                      ? "text-orange-400 bg-orange-400/10 border-orange-400/20"
                      : a.level === "Moderate"
                        ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/20"
                        : "text-green-400 bg-green-400/10 border-green-400/20"
                  }`}
                >
                  {a.level}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </motion.div>
  );
}

function MonitoringTab() {
  const { data: records, isLoading } = useEnvironmentRecords();
  const deleteRecord = useDeleteEnvironmentRecord();
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState("All");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const filtered = (records ?? []).filter(
    (r) => filter === "All" || r.recordType === filter,
  );

  async function handleDelete(id: string) {
    try {
      await deleteRecord.mutateAsync(id);
      toast.success("Record deleted.");
      setConfirmId(null);
    } catch {
      toast.error("Failed to delete.");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {["All", ...RECORD_TYPES.map((r) => r.value)].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-smooth ${
                filter === t
                  ? "text-white"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              }`}
              style={
                filter === t ? { background: "#18C37E", color: "#081426" } : {}
              }
              data-ocid="env.filter.tab"
            >
              {t}
            </button>
          ))}
        </div>
        <Button
          onClick={() => setShowModal(true)}
          style={{ background: "#18C37E", color: "#081426" }}
          className="gap-2"
          data-ocid="env.open_modal_button"
        >
          <Plus className="w-4 h-4" /> Add Record
        </Button>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {[
                  "Record Type",
                  "Value",
                  "Location",
                  "Recorded By",
                  "Date",
                  "Notes",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-white/40 text-xs font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={`env-skel-row-${String(i)}`}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td
                        key={`env-skel-col-${String(i)}-${String(j)}`}
                        className="px-4 py-3"
                      >
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center"
                    data-ocid="env.empty_state"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Activity className="w-8 h-8 text-white/20" />
                      <p className="text-white/30 text-sm">
                        No records found. Add the first monitoring entry.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((r, idx) => (
                  <tr
                    key={r.id}
                    className="hover:bg-white/3 transition-smooth"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                    data-ocid={`env.item.${idx + 1}`}
                  >
                    <td className="px-4 py-3">
                      <span className="text-white/80 text-sm">
                        {r.recordType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white font-medium text-sm">
                        {r.value}
                      </span>
                      <span className="text-white/40 text-xs ml-1">
                        {r.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/60 text-sm">
                      {r.location}
                    </td>
                    <td className="px-4 py-3 text-white/60 text-sm">
                      {r.recordedBy}
                    </td>
                    <td className="px-4 py-3 text-white/50 text-xs">
                      {new Date(
                        Number(r.createdAt) / 1_000_000,
                      ).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-white/40 text-xs max-w-[140px] truncate">
                      {r.notes ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {confirmId === r.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDelete(r.id)}
                            className="text-xs text-red-400 hover:text-red-300 font-medium transition-smooth"
                            data-ocid={`env.confirm_button.${idx + 1}`}
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmId(null)}
                            className="text-xs text-white/40 hover:text-white/60 transition-smooth"
                            data-ocid={`env.cancel_button.${idx + 1}`}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmId(r.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-smooth"
                          aria-label="Delete record"
                          data-ocid={`env.delete_button.${idx + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <AnimatePresence>
        {showModal && <CreateRecordModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}

function SpillTab() {
  const { data: envRecs, isLoading } = useEnvironmentRecords();
  const deleteRecord = useDeleteEnvironmentRecord();
  const [showModal, setShowModal] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const spills = (envRecs ?? []).filter((r) => r.recordType === "spill");

  async function handleDelete(id: string) {
    try {
      await deleteRecord.mutateAsync(id);
      toast.success("Spill record deleted.");
      setConfirmId(null);
    } catch {
      toast.error("Failed to delete.");
    }
  }

  // Parse material/action/status from the notes field we wrote on save
  function parseNotes(notes?: string): {
    material: string;
    action: string;
    status: string;
  } {
    if (!notes) return { material: "—", action: "—", status: "—" };
    const materialMatch = notes.match(/Material: ([^|]+)/);
    const actionMatch = notes.match(/Action: ([^|]+)/);
    const statusMatch = notes.match(/Status: (.+)$/);
    return {
      material: materialMatch?.[1]?.trim() ?? "—",
      action: actionMatch?.[1]?.trim() ?? "—",
      status: statusMatch?.[1]?.trim() ?? "—",
    };
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold">
            Spill &amp; Incident Reports
          </h2>
          <p className="text-white/40 text-xs mt-0.5">
            Track and manage chemical/fluid spill events
          </p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          style={{
            background: "rgba(239,68,68,0.2)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#f87171",
          }}
          className="gap-2 hover:opacity-90"
          data-ocid="spill.open_modal_button"
        >
          <AlertTriangle className="w-4 h-4" /> Report Spill
        </Button>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {[
                  "Spill ID",
                  "Date",
                  "Location",
                  "Material",
                  "Volume (L)",
                  "Cleanup Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-white/40 text-xs font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={`spill-skel-${String(i)}`}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td
                        key={`spill-skel-col-${String(i)}-${String(j)}`}
                        className="px-4 py-3"
                      >
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : spills.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center"
                    data-ocid="spill.empty_state"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <AlertTriangle className="w-8 h-8 text-white/20" />
                      <p className="text-white/30 text-sm">
                        No spills recorded. Report a spill incident to get
                        started.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                spills.map((s, idx) => {
                  const { material, status } = parseNotes(s.notes);
                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-white/3 transition-smooth"
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                      }}
                      data-ocid={`spill.item.${idx + 1}`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-green-400">
                          {s.id}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/60 text-sm">
                        {new Date(
                          Number(s.createdAt) / 1_000_000,
                        ).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-white/80 text-sm">
                        {s.location}
                      </td>
                      <td className="px-4 py-3 text-white/70 text-sm">
                        {material}
                      </td>
                      <td className="px-4 py-3 text-white font-medium text-sm">
                        {s.value}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={status} />
                      </td>
                      <td className="px-4 py-3">
                        {confirmId === s.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDelete(s.id)}
                              className="text-xs text-red-400 hover:text-red-300 font-medium transition-smooth"
                              data-ocid={`spill.confirm_button.${idx + 1}`}
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmId(null)}
                              className="text-xs text-white/40 hover:text-white/60 transition-smooth"
                              data-ocid={`spill.cancel_button.${idx + 1}`}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmId(s.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-smooth"
                            aria-label="Delete spill"
                            data-ocid={`spill.delete_button.${idx + 1}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <AnimatePresence>
        {showModal && <SpillModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}

function WasteTab() {
  const wasteKpis = [
    { label: "Total Generated", value: "8,820", unit: "kg", icon: "🏭" },
    { label: "Recycled", value: "8,200", unit: "kg", icon: "♻️" },
    { label: "Landfill", value: "145", unit: "kg", icon: "🗑️" },
    { label: "Hazardous", value: "525", unit: "kg", icon: "☢️" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div>
        <h2 className="text-white font-semibold">Waste Disposal Tracking</h2>
        <p className="text-white/40 text-xs mt-0.5">
          Monitor all waste streams and disposal activities
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {wasteKpis.map((k) => (
          <motion.div
            key={k.label}
            whileHover={{ scale: 1.02 }}
            className="rounded-xl p-4"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <p className="text-xl mb-2">{k.icon}</p>
            <p className="text-white/50 text-xs">{k.label}</p>
            <p className="font-display font-bold text-xl text-white mt-1">
              {k.value}{" "}
              <span className="text-xs font-normal text-white/40">
                {k.unit}
              </span>
            </p>
          </motion.div>
        ))}
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {[
                  "Waste Type",
                  "Quantity (kg)",
                  "Disposal Method",
                  "Disposal Date",
                  "Contractor",
                  "Manifest No.",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-white/40 text-xs font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_WASTE.map((w, idx) => (
                <tr
                  key={w.manifest}
                  className="hover:bg-white/3 transition-smooth"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  data-ocid={`waste.item.${idx + 1}`}
                >
                  <td className="px-4 py-3">
                    <span className="text-white/80 text-sm">{w.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-white font-medium text-sm">
                      {w.qty.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        w.method === "Recycling"
                          ? "text-green-400 bg-green-400/10 border-green-400/20"
                          : w.method === "Incineration"
                            ? "text-orange-400 bg-orange-400/10 border-orange-400/20"
                            : "text-red-400 bg-red-400/10 border-red-400/20"
                      }`}
                    >
                      {w.method}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/60 text-sm">{w.date}</td>
                  <td className="px-4 py-3 text-white/60 text-sm">
                    {w.contractor}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-white/50">
                      {w.manifest}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EnvironmentPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 space-y-6"
      data-ocid="environment.page"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{
              background: "rgba(24,195,126,0.12)",
              border: "1px solid rgba(24,195,126,0.25)",
            }}
          >
            <Leaf className="w-5 h-5" style={{ color: "#18C37E" }} />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-white">
              Environmental Compliance
            </h1>
            <p className="text-xs text-white/40">
              ISO 14001 · Emissions · Water · Energy · Waste
            </p>
          </div>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{
            background: "rgba(24,195,126,0.08)",
            border: "1px solid rgba(24,195,126,0.2)",
          }}
        >
          <CheckCircle2 className="w-4 h-4" style={{ color: "#18C37E" }} />
          <span className="text-xs font-medium" style={{ color: "#18C37E" }}>
            ISO 14001 Certified
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-smooth relative ${
              activeTab === tab
                ? "text-white"
                : "text-white/40 hover:text-white/70"
            }`}
            data-ocid="environment.tab"
          >
            {tab}
            {activeTab === tab && (
              <motion.div
                layoutId="env-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ background: "#18C37E" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "Overview" && <OverviewTab />}
        {activeTab === "Monitoring Records" && <MonitoringTab />}
        {activeTab === "Spill Reports" && <SpillTab />}
        {activeTab === "Waste Disposal" && <WasteTab />}
      </div>
    </motion.div>
  );
}
