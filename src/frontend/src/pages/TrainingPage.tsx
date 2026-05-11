import type { TrainingRecord } from "@/backend";
import { TrainingStatus } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCreateTrainingRecord,
  useDeleteTrainingRecord,
  useTrainingRecords,
} from "@/hooks/useBackend";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  Edit,
  Flame,
  GraduationCap,
  HardHat,
  Heart,
  Lock,
  MoveUp,
  Plus,
  Search,
  Shield,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const COURSES = [
  { id: "fire-safety", name: "Fire Safety", duration: "4 hrs", icon: Flame },
  { id: "loto", name: "LOTO", duration: "8 hrs", icon: Lock },
  {
    id: "work-at-height",
    name: "Work at Height",
    duration: "6 hrs",
    icon: MoveUp,
  },
  { id: "first-aid", name: "First Aid", duration: "16 hrs", icon: Heart },
  { id: "ppe", name: "PPE", duration: "2 hrs", icon: HardHat },
  { id: "crane-safety", name: "Crane Safety", duration: "8 hrs", icon: Shield },
] as const;

const COURSE_NAMES = COURSES.map((c) => c.name);

const COURSE_DETAILS = [
  {
    id: "fire-safety",
    name: "Fire Safety",
    description: "Annual mandatory for all staff",
    duration: "4 hours",
    enrolled: 0,
    completed: 0,
    icon: Flame,
    color: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.25)",
    iconColor: "#ef4444",
  },
  {
    id: "loto",
    name: "LOTO",
    description: "Lockout Tagout procedures",
    duration: "8 hours",
    enrolled: 0,
    completed: 0,
    icon: Lock,
    color: "rgba(234,179,8,0.12)",
    border: "rgba(234,179,8,0.25)",
    iconColor: "#eab308",
  },
  {
    id: "work-at-height",
    name: "Work at Height",
    description: "Fall prevention and harness use",
    duration: "6 hours",
    enrolled: 0,
    completed: 0,
    icon: MoveUp,
    color: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.25)",
    iconColor: "#3b82f6",
  },
  {
    id: "first-aid",
    name: "First Aid",
    description: "Basic first aid and CPR",
    duration: "16 hours",
    enrolled: 0,
    completed: 0,
    icon: Heart,
    color: "rgba(236,72,153,0.12)",
    border: "rgba(236,72,153,0.25)",
    iconColor: "#ec4899",
  },
  {
    id: "ppe",
    name: "PPE",
    description: "Personal protective equipment selection and use",
    duration: "2 hours",
    enrolled: 0,
    completed: 0,
    icon: HardHat,
    color: "rgba(24,195,126,0.12)",
    border: "rgba(24,195,126,0.25)",
    iconColor: "#18C37E",
  },
  {
    id: "crane-safety",
    name: "Crane Safety",
    description: "Overhead crane operation safety",
    duration: "8 hours",
    enrolled: 0,
    completed: 0,
    icon: Shield,
    color: "rgba(168,85,247,0.12)",
    border: "rgba(168,85,247,0.25)",
    iconColor: "#a855f7",
  },
];

// No pre-filled induction records — table starts empty
const INDUCTION_RECORDS: {
  id: number;
  name: string;
  dept: string;
  date: string;
  by: string;
  type: string;
  cert: string;
}[] = [];

// MATRIX_STATUS_SEED removed — matrix is now computed from live useTrainingRecords() data

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tsToDate(ts: bigint | undefined): string {
  if (!ts) return "—";
  return new Date(Number(ts) / 1_000_000).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isExpiringSoon(ts: bigint | undefined): boolean {
  if (!ts) return false;
  const d = Number(ts) / 1_000_000;
  const now = Date.now();
  return d > now && d - now < 30 * 24 * 60 * 60 * 1000;
}

function isOverdue(ts: bigint | undefined): boolean {
  if (!ts) return false;
  return Number(ts) / 1_000_000 < Date.now();
}

function statusLabel(status: TrainingStatus): string {
  switch (status) {
    case TrainingStatus.completed:
      return "Completed";
    case TrainingStatus.pending:
      return "Pending";
    case TrainingStatus.overdue:
      return "Overdue";
    case TrainingStatus.notStarted:
      return "Not Started";
    default:
      return status;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type MatrixCellStatus = "completed" | "expiring" | "overdue" | "not_started";

function MatrixCell({ status }: { status: MatrixCellStatus }) {
  const cfg: Record<
    MatrixCellStatus,
    { bg: string; border: string; text: string; label: string }
  > = {
    completed: {
      bg: "rgba(24,195,126,0.15)",
      border: "rgba(24,195,126,0.35)",
      text: "#18C37E",
      label: "✓",
    },
    expiring: {
      bg: "rgba(234,179,8,0.15)",
      border: "rgba(234,179,8,0.35)",
      text: "#eab308",
      label: "⚠",
    },
    overdue: {
      bg: "rgba(239,68,68,0.15)",
      border: "rgba(239,68,68,0.35)",
      text: "#ef4444",
      label: "✗",
    },
    not_started: {
      bg: "rgba(255,255,255,0.04)",
      border: "rgba(255,255,255,0.08)",
      text: "rgba(255,255,255,0.3)",
      label: "—",
    },
  };
  const c = cfg[status];
  return (
    <div
      className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold cursor-pointer transition-transform hover:scale-110"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
      }}
      title={status.replace("_", " ")}
    >
      {c.label}
    </div>
  );
}

function StatusBadge({ status }: { status: TrainingStatus }) {
  const map: Record<
    TrainingStatus,
    { label: string; bg: string; text: string }
  > = {
    [TrainingStatus.completed]: {
      label: "Completed",
      bg: "rgba(24,195,126,0.15)",
      text: "#18C37E",
    },
    [TrainingStatus.pending]: {
      label: "Pending",
      bg: "rgba(234,179,8,0.15)",
      text: "#eab308",
    },
    [TrainingStatus.overdue]: {
      label: "Overdue",
      bg: "rgba(239,68,68,0.15)",
      text: "#ef4444",
    },
    [TrainingStatus.notStarted]: {
      label: "Not Started",
      bg: "rgba(255,255,255,0.08)",
      text: "rgba(255,255,255,0.5)",
    },
  };
  const c = map[status] ?? {
    label: status,
    bg: "rgba(255,255,255,0.08)",
    text: "rgba(255,255,255,0.5)",
  };
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.text }}
    >
      {c.label}
    </span>
  );
}

// ─── Add/Edit Training Form Modal ─────────────────────────────────────────────

type FormState = {
  employeeName: string;
  employeeId: string;
  course: string;
  completionDate: string;
  expiryDate: string;
  status: TrainingStatus;
  score: string;
  trainerName: string;
  certNumber: string;
};

const DEFAULT_FORM: FormState = {
  employeeName: "",
  employeeId: "",
  course: "",
  completionDate: "",
  expiryDate: "",
  status: TrainingStatus.notStarted,
  score: "",
  trainerName: "",
  certNumber: "",
};

function TrainingFormModal({
  open,
  onClose,
  initialData,
}: {
  open: boolean;
  onClose: () => void;
  initialData?: Partial<FormState>;
}) {
  const [form, setForm] = useState<FormState>({
    ...DEFAULT_FORM,
    ...initialData,
  });
  const createMutation = useCreateTrainingRecord();

  const set = (key: keyof FormState) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  function dateToTs(d: string): bigint | undefined {
    if (!d) return undefined;
    return BigInt(new Date(d).getTime() * 1_000_000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.employeeName || !form.course) {
      toast.error("Employee name and course are required.");
      return;
    }
    const record: TrainingRecord = {
      id: `TRN-${Date.now()}`,
      employeeName: form.employeeName,
      employeeId: form.employeeId,
      course: form.course,
      completionDate: dateToTs(form.completionDate),
      expiryDate: dateToTs(form.expiryDate),
      status: form.status,
      score: form.score ? BigInt(form.score) : undefined,
    };
    try {
      await createMutation.mutateAsync(record);
      toast.success(`Training record for ${form.employeeName} saved.`);
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save record.",
      );
    }
  }

  const glassInput =
    "w-full rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-[#18C37E] placeholder:text-white/25";
  const glassStyle = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto p-0"
        style={{
          background: "rgba(8,20,38,0.98)",
          border: "1px solid rgba(24,195,126,0.2)",
        }}
      >
        <DialogHeader
          className="p-6 pb-4 border-b"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <DialogTitle className="text-white font-display font-bold flex items-center gap-2">
            <GraduationCap className="w-5 h-5" style={{ color: "#18C37E" }} />
            Add Training Record
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="emp-name" className="text-xs text-white/60">
              Employee Name *
            </Label>
            <Input
              id="emp-name"
              className={glassInput}
              style={glassStyle}
              placeholder="e.g. Rajesh Kumar"
              value={form.employeeName}
              onChange={(e) => set("employeeName")(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="emp-id" className="text-xs text-white/60">
              Employee ID
            </Label>
            <Input
              id="emp-id"
              className={glassInput}
              style={glassStyle}
              placeholder="e.g. E007"
              value={form.employeeId}
              onChange={(e) => set("employeeId")(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="course-sel" className="text-xs text-white/60">
              Course *
            </Label>
            <Select value={form.course} onValueChange={set("course")}>
              <SelectTrigger
                id="course-sel"
                className="text-sm"
                style={{
                  ...glassStyle,
                  color: form.course ? "white" : "rgba(255,255,255,0.3)",
                }}
              >
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent
                style={{
                  background: "#0e1f38",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {COURSE_NAMES.map((c) => (
                  <SelectItem
                    key={c}
                    value={c}
                    className="text-white hover:text-white"
                  >
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status-sel" className="text-xs text-white/60">
              Status
            </Label>
            <Select value={form.status} onValueChange={(v) => set("status")(v)}>
              <SelectTrigger
                id="status-sel"
                className="text-sm text-white"
                style={glassStyle}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                style={{
                  background: "#0e1f38",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {Object.values(TrainingStatus).map((s) => (
                  <SelectItem key={s} value={s} className="text-white">
                    {statusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="comp-date" className="text-xs text-white/60">
              Completion Date
            </Label>
            <Input
              id="comp-date"
              type="date"
              className={glassInput}
              style={{ ...glassStyle, colorScheme: "dark" }}
              value={form.completionDate}
              onChange={(e) => set("completionDate")(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-date" className="text-xs text-white/60">
              Expiry Date
            </Label>
            <Input
              id="exp-date"
              type="date"
              className={glassInput}
              style={{ ...glassStyle, colorScheme: "dark" }}
              value={form.expiryDate}
              onChange={(e) => set("expiryDate")(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="score" className="text-xs text-white/60">
              Score (0–100)
            </Label>
            <Input
              id="score"
              type="number"
              min={0}
              max={100}
              className={glassInput}
              style={glassStyle}
              placeholder="e.g. 85"
              value={form.score}
              onChange={(e) => set("score")(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trainer" className="text-xs text-white/60">
              Trainer Name
            </Label>
            <Input
              id="trainer"
              className={glassInput}
              style={glassStyle}
              placeholder="e.g. Arun Mehta"
              value={form.trainerName}
              onChange={(e) => set("trainerName")(e.target.value)}
            />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="cert-no" className="text-xs text-white/60">
              Certificate Number
            </Label>
            <Input
              id="cert-no"
              className={glassInput}
              style={glassStyle}
              placeholder="e.g. CERT-2025-0412"
              value={form.certNumber}
              onChange={(e) => set("certNumber")(e.target.value)}
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-white/60 hover:text-white"
              data-ocid="training.form.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="font-semibold"
              style={{ background: "#18C37E", color: "#081426" }}
              data-ocid="training.form.submit_button"
            >
              {createMutation.isPending ? "Saving…" : "Save Record"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Matrix Tab ───────────────────────────────────────────────────────────────

/**
 * Derives a MatrixCellStatus from live training records for a given employee+course combo.
 */
function deriveMatrixStatus(
  records: TrainingRecord[],
  employeeName: string,
  course: string,
): MatrixCellStatus {
  const now = Date.now();
  const in30Days = now + 30 * 24 * 60 * 60 * 1000;
  const matching = records.filter(
    (r) =>
      r.employeeName.toLowerCase().trim() ===
        employeeName.toLowerCase().trim() &&
      r.course.toLowerCase().trim() === course.toLowerCase().trim(),
  );
  if (matching.length === 0) return "not_started";
  const rec =
    matching.find((r) => r.status === TrainingStatus.completed) ??
    matching[matching.length - 1];
  if (rec.status === TrainingStatus.overdue) return "overdue";
  if (rec.status === TrainingStatus.completed) {
    if (rec.expiryDate) {
      const exp = Number(rec.expiryDate) / 1_000_000;
      if (exp < now) return "overdue";
      if (exp < in30Days) return "expiring";
    }
    return "completed";
  }
  if (rec.status === TrainingStatus.pending) return "expiring";
  return "not_started";
}

function MatrixTab({
  onAdd,
  records,
}: { onAdd: () => void; records: TrainingRecord[] }) {
  // Derive unique employees from live training records
  const liveEmployees = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; dept: string }>();
    for (const r of records) {
      if (!seen.has(r.employeeName)) {
        seen.set(r.employeeName, {
          id: r.employeeId ?? "",
          name: r.employeeName,
          dept: "",
        });
      }
    }
    return Array.from(seen.values());
  }, [records]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-display font-bold text-white">
            Training Matrix
          </h2>
          <p className="text-xs text-white/40 mt-0.5">
            Employee × Course competency overview
          </p>
        </div>
        <Button
          onClick={onAdd}
          className="gap-2 font-semibold text-sm"
          style={{ background: "#18C37E", color: "#081426" }}
          data-ocid="training.add_button"
        >
          <Plus className="w-4 h-4" /> Add Training Record
        </Button>
      </div>

      {liveEmployees.length === 0 ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
          data-ocid="training.matrix.empty_state"
        >
          <GraduationCap className="w-10 h-10 mx-auto mb-3 text-white/20" />
          <p className="text-white/30 text-sm">
            No training records yet. Add a training record to populate the
            matrix.
          </p>
          <Button
            onClick={onAdd}
            size="sm"
            className="mt-4 gap-1.5"
            style={{
              background: "rgba(24,195,126,0.15)",
              color: "#18C37E",
              border: "1px solid rgba(24,195,126,0.3)",
            }}
            data-ocid="training.matrix.add_button"
          >
            <Plus className="w-4 h-4" /> Add First Record
          </Button>
        </div>
      ) : (
        <div
          className="rounded-xl overflow-auto"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <table className="w-full min-w-max">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <th
                  className="text-left text-xs font-semibold text-white/50 px-4 py-3 sticky left-0 z-10"
                  style={{ background: "rgba(8,20,38,0.9)" }}
                >
                  Employee
                </th>
                <th
                  className="text-xs font-semibold text-white/50 px-3 py-3 text-center whitespace-nowrap"
                  style={{ background: "rgba(8,20,38,0.9)" }}
                >
                  ID
                </th>
                {COURSE_NAMES.map((c) => (
                  <th
                    key={c}
                    className="text-xs font-semibold text-white/50 px-3 py-3 text-center whitespace-nowrap"
                    style={{ minWidth: "7rem" }}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {liveEmployees.map((emp, i) => (
                <motion.tr
                  key={emp.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="hover:bg-white/[0.02] transition-colors"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <td
                    className="px-4 py-3 sticky left-0 z-10"
                    style={{ background: "rgba(8,20,38,0.92)" }}
                  >
                    <div className="font-medium text-sm text-white whitespace-nowrap">
                      {emp.name}
                    </div>
                    {emp.id && (
                      <div className="text-xs text-white/30">{emp.id}</div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-xs text-white/40 whitespace-nowrap">
                      {emp.id || "—"}
                    </span>
                  </td>
                  {COURSE_NAMES.map((course) => (
                    <td key={course} className="px-3 py-3 text-center">
                      <div className="flex justify-center">
                        <MatrixCell
                          status={deriveMatrixStatus(records, emp.name, course)}
                        />
                      </div>
                    </td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-1">
        {[
          { status: "completed" as MatrixCellStatus, label: "Completed" },
          { status: "expiring" as MatrixCellStatus, label: "Expiring Soon" },
          { status: "overdue" as MatrixCellStatus, label: "Overdue" },
          { status: "not_started" as MatrixCellStatus, label: "Not Started" },
        ].map(({ status, label }) => (
          <div key={status} className="flex items-center gap-2">
            <MatrixCell status={status} />
            <span className="text-xs text-white/40">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Records Tab ──────────────────────────────────────────────────────────────

function RecordsTab({
  onAdd,
  onEdit,
}: { onAdd: () => void; onEdit: (r: TrainingRecord) => void }) {
  const { data: records = [], isLoading } = useTrainingRecords();
  const deleteMutation = useDeleteTrainingRecord();
  const [search, setSearch] = useState("");
  const [filterCourse, setFilterCourse] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const now = BigInt(Date.now() * 1_000_000);
  const in30Days = BigInt((Date.now() + 30 * 24 * 60 * 60 * 1000) * 1_000_000);

  const stats = useMemo(
    () => ({
      total: records.length,
      completed: records.filter((r) => r.status === TrainingStatus.completed)
        .length,
      overdueOrPending: records.filter(
        (r) =>
          r.status === TrainingStatus.overdue ||
          r.status === TrainingStatus.pending,
      ).length,
      expiringCount: records.filter(
        (r) => r.expiryDate && r.expiryDate > now && r.expiryDate < in30Days,
      ).length,
    }),
    [records, now, in30Days],
  );

  const overdueRecords = records.filter(
    (r) => r.status === TrainingStatus.overdue,
  );

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        r.employeeName.toLowerCase().includes(q) ||
        r.course.toLowerCase().includes(q);
      const matchCourse = filterCourse === "all" || r.course === filterCourse;
      const matchStatus = filterStatus === "all" || r.status === filterStatus;
      return matchSearch && matchCourse && matchStatus;
    });
  }, [records, search, filterCourse, filterStatus]);

  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Training record deleted.");
      setConfirmDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete.");
    }
  }

  const statsCards = [
    {
      label: "Total Records",
      value: stats.total,
      icon: GraduationCap,
      color: "#18C37E",
    },
    {
      label: "Completed",
      value: stats.completed,
      icon: CheckCircle2,
      color: "#18C37E",
    },
    {
      label: "Pending / Overdue",
      value: stats.overdueOrPending,
      icon: AlertTriangle,
      color: "#ef4444",
    },
    {
      label: "Expiring (30 days)",
      value: stats.expiringCount,
      icon: Clock,
      color: "#eab308",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statsCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="rounded-xl p-4"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
              <span className="text-xs text-white/50">{s.label}</span>
            </div>
            <div className="text-2xl font-display font-bold text-white">
              {isLoading ? "–" : s.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Overdue Alert */}
      <AnimatePresence>
        {overdueRecords.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.3)",
            }}
            data-ocid="training.overdue_alert"
          >
            <AlertTriangle
              className="w-4 h-4 shrink-0"
              style={{ color: "#ef4444" }}
            />
            <p className="text-sm font-medium" style={{ color: "#ef4444" }}>
              {overdueRecords.length} training record
              {overdueRecords.length > 1 ? "s are" : " is"} overdue!
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            className="w-full rounded-lg pl-9 pr-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-[#18C37E] placeholder:text-white/25"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            placeholder="Search employee or course…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-ocid="training.search_input"
          />
        </div>
        <select
          className="rounded-lg px-3 py-2 text-sm text-white/70 outline-none focus:ring-1 focus:ring-[#18C37E]"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
          value={filterCourse}
          onChange={(e) => setFilterCourse(e.target.value)}
          data-ocid="training.filter.select"
        >
          <option value="all">All Courses</option>
          {COURSE_NAMES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg px-3 py-2 text-sm text-white/70 outline-none focus:ring-1 focus:ring-[#18C37E]"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          data-ocid="training.status.select"
        >
          <option value="all">All Statuses</option>
          {Object.values(TrainingStatus).map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
        <Button
          onClick={onAdd}
          className="gap-2 font-semibold text-sm shrink-0"
          style={{ background: "#18C37E", color: "#081426" }}
          data-ocid="training.records.add_button"
        >
          <Plus className="w-4 h-4" /> Add Record
        </Button>
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-auto"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {isLoading ? (
          <div
            className="p-8 text-center text-white/30 text-sm"
            data-ocid="training.loading_state"
          >
            Loading training records…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center" data-ocid="training.empty_state">
            <GraduationCap className="w-10 h-10 mx-auto mb-3 text-white/20" />
            <p className="text-white/30 text-sm">No training records found.</p>
            <Button
              onClick={onAdd}
              size="sm"
              className="mt-4 gap-1.5"
              style={{
                background: "rgba(24,195,126,0.15)",
                color: "#18C37E",
                border: "1px solid rgba(24,195,126,0.3)",
              }}
              data-ocid="training.empty.add_button"
            >
              <Plus className="w-4 h-4" /> Add First Record
            </Button>
          </div>
        ) : (
          <table className="w-full min-w-max">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                {[
                  "Employee",
                  "Course",
                  "Completed",
                  "Expiry",
                  "Status",
                  "Score",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left text-xs font-semibold text-white/40 px-4 py-3 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const expirySoon = isExpiringSoon(r.expiryDate);
                const expOverdue =
                  isOverdue(r.expiryDate) &&
                  r.status !== TrainingStatus.completed;
                return (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="hover:bg-white/[0.02] transition-colors"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                    data-ocid={`training.item.${i + 1}`}
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-white">
                        {r.employeeName}
                      </div>
                      <div className="text-xs text-white/30">
                        {r.employeeId}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-white/70">
                      {r.course}
                    </td>
                    <td className="px-4 py-3 text-sm text-white/60">
                      {tsToDate(r.completionDate)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        style={{
                          color: expOverdue
                            ? "#ef4444"
                            : expirySoon
                              ? "#eab308"
                              : "rgba(255,255,255,0.6)",
                        }}
                      >
                        {tsToDate(r.expiryDate)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-white/60 text-right">
                      {r.score !== undefined && r.score !== null
                        ? Number(r.score)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                          title="Edit"
                          onClick={() => onEdit(r)}
                          data-ocid={`training.edit_button.${i + 1}`}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors"
                          title="Delete"
                          onClick={() => setConfirmDelete(r.id)}
                          data-ocid={`training.delete_button.${i + 1}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete Confirm Dialog */}
      <Dialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
      >
        <DialogContent
          className="max-w-sm"
          style={{
            background: "rgba(8,20,38,0.98)",
            border: "1px solid rgba(239,68,68,0.3)",
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-white font-display flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" /> Confirm Delete
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/60 mt-2">
            This will permanently remove the training record. This action cannot
            be undone.
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="ghost"
              className="text-white/60"
              onClick={() => setConfirmDelete(null)}
              data-ocid="training.delete.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              className="bg-red-500/80 hover:bg-red-500 text-white"
              data-ocid="training.delete.confirm_button"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Courses Tab ──────────────────────────────────────────────────────────────

function CoursesTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-white">
          Training Courses
        </h2>
        <p className="text-xs text-white/40 mt-0.5">
          Safety course catalogue and completion rates
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {COURSE_DETAILS.map((course, i) => {
          const pct = Math.round((course.completed / course.enrolled) * 100);
          const Icon = course.icon;
          return (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="rounded-xl p-5 flex flex-col gap-4 cursor-pointer"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
              data-ocid={`training.course.${i + 1}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: course.color,
                    border: `1px solid ${course.border}`,
                  }}
                >
                  <Icon
                    className="w-5 h-5"
                    style={{ color: course.iconColor }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-white">
                    {course.name}
                  </div>
                  <div className="text-xs text-white/40 mt-0.5 truncate">
                    {course.description}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-white/50">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {course.duration}
                </span>
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-3 h-3" /> {course.enrolled}{" "}
                  enrolled
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/40">Completion</span>
                  <span
                    className="text-xs font-semibold"
                    style={{
                      color:
                        pct >= 80
                          ? "#18C37E"
                          : pct >= 60
                            ? "#eab308"
                            : "#ef4444",
                    }}
                  >
                    {pct}%
                  </span>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{
                      delay: i * 0.1 + 0.3,
                      duration: 0.8,
                      ease: "easeOut",
                    }}
                    style={{
                      background:
                        pct >= 80
                          ? "#18C37E"
                          : pct >= 60
                            ? "#eab308"
                            : "#ef4444",
                    }}
                  />
                </div>
                <div className="text-xs text-white/30">
                  {course.completed}/{course.enrolled} completed
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Inductions Tab ───────────────────────────────────────────────────────────

function InductionsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-white">
          Safety Induction Records
        </h2>
        <p className="text-xs text-white/40 mt-0.5">
          New joiner and contractor safety induction certificates
        </p>
      </div>
      <div
        className="rounded-xl overflow-auto"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <table className="w-full min-w-max">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              {[
                "Employee Name",
                "Department",
                "Induction Date",
                "Inducted By",
                "Type",
                "Certificate No.",
                "Action",
              ].map((h) => (
                <th
                  key={h}
                  className="text-left text-xs font-semibold text-white/40 px-4 py-3 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {INDUCTION_RECORDS.map((row, i) => (
              <motion.tr
                key={row.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="hover:bg-white/[0.02] transition-colors"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                data-ocid={`training.induction.item.${i + 1}`}
              >
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-white">
                    {row.name}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-white/60">{row.dept}</td>
                <td className="px-4 py-3 text-sm text-white/60">
                  {new Date(row.date).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3 text-sm text-white/60">{row.by}</td>
                <td className="px-4 py-3">
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background:
                        row.type === "Contractor"
                          ? "rgba(168,85,247,0.15)"
                          : row.type === "Area-specific"
                            ? "rgba(59,130,246,0.15)"
                            : "rgba(24,195,126,0.15)",
                      color:
                        row.type === "Contractor"
                          ? "#a855f7"
                          : row.type === "Area-specific"
                            ? "#3b82f6"
                            : "#18C37E",
                    }}
                  >
                    {row.type}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-white/50">
                  {row.cert}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    style={{
                      background: "rgba(24,195,126,0.12)",
                      border: "1px solid rgba(24,195,126,0.25)",
                      color: "#18C37E",
                    }}
                    onClick={() =>
                      toast.info(
                        `Certificate ${row.cert} issued to ${row.name}.`,
                      )
                    }
                    data-ocid={`training.induction.cert_button.${i + 1}`}
                  >
                    <Award className="w-3.5 h-3.5" /> Issue Certificate
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Page Root ────────────────────────────────────────────────────────────────

export default function TrainingPage() {
  const [activeTab, setActiveTab] = useState("matrix");
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState<TrainingRecord | null>(null);
  const { data: allRecords = [] } = useTrainingRecords();

  function handleEdit(r: TrainingRecord) {
    setEditRecord(r);
    setShowForm(true);
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditRecord(null);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 space-y-6"
      data-ocid="training.page"
    >
      {/* Page Header */}
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: "rgba(24,195,126,0.12)",
            border: "1px solid rgba(24,195,126,0.25)",
          }}
        >
          <GraduationCap className="w-5 h-5" style={{ color: "#18C37E" }} />
        </div>
        <div>
          <h1 className="font-display font-bold text-xl text-white">
            Training Matrix
          </h1>
          <p className="text-xs text-white/40">
            Certifications, competency tracking and safety inductions
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList
          className="w-full sm:w-auto grid grid-cols-4 sm:flex gap-1 p-1 rounded-xl h-auto"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {[
            { value: "matrix", label: "Matrix" },
            { value: "records", label: "Records" },
            { value: "courses", label: "Courses" },
            { value: "inductions", label: "Inductions" },
          ].map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="text-xs font-semibold px-4 py-2 rounded-lg data-[state=active]:text-white"
              style={{
                color:
                  activeTab === t.value ? "white" : "rgba(255,255,255,0.4)",
              }}
              data-ocid={`training.${t.value}.tab`}
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <TabsContent value="matrix" className="mt-6">
              <MatrixTab onAdd={() => setShowForm(true)} records={allRecords} />
            </TabsContent>
            <TabsContent value="records" className="mt-6">
              <RecordsTab onAdd={() => setShowForm(true)} onEdit={handleEdit} />
            </TabsContent>
            <TabsContent value="courses" className="mt-6">
              <CoursesTab />
            </TabsContent>
            <TabsContent value="inductions" className="mt-6">
              <InductionsTab />
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </Tabs>

      {/* Add/Edit Training Form Modal */}
      <TrainingFormModal
        open={showForm}
        onClose={handleCloseForm}
        initialData={
          editRecord
            ? {
                employeeName: editRecord.employeeName,
                employeeId: editRecord.employeeId,
                course: editRecord.course,
                completionDate: editRecord.completionDate
                  ? new Date(Number(editRecord.completionDate) / 1_000_000)
                      .toISOString()
                      .split("T")[0]
                  : "",
                expiryDate: editRecord.expiryDate
                  ? new Date(Number(editRecord.expiryDate) / 1_000_000)
                      .toISOString()
                      .split("T")[0]
                  : "",
                status: editRecord.status,
                score:
                  editRecord.score !== undefined && editRecord.score !== null
                    ? String(Number(editRecord.score))
                    : "",
              }
            : undefined
        }
      />
    </motion.div>
  );
}
