import type { InspectionRecord, InspectionStatus } from "@/backend";
import { InspectionStatus as IS } from "@/backend";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { RKTR_LOCATIONS } from "@/constants/locations";
import {
  useCreateInspection,
  useDeleteInspection,
  useInspections,
  useUpdateInspection,
  useUpdateInspectionStatus,
} from "@/hooks/useBackend";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileWarning,
  ListChecks,
  PlusCircle,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

// ───────────────────────────── types ─────────────────────────────
type TabId = "schedule" | "list" | "findings" | "ncr";
type Severity = "Critical" | "Major" | "Minor" | "Observation";
type FindingStatus = "Open" | "CAPA Assigned" | "Closed";
type NCRStatus = "Open" | "In Progress" | "Closed";
type ChecklistAnswer = "Yes" | "No" | "NA" | null;

interface Finding {
  id: string;
  description: string;
  inspection: string;
  area: string;
  severity: Severity;
  status: FindingStatus;
  dueDate: string;
}

interface NCR {
  id: string;
  ncrNumber: string;
  description: string;
  area: string;
  raisedBy: string;
  targetCloseDate: string;
  status: NCRStatus;
}

interface FormFinding {
  id: string;
  description: string;
  severity: Severity;
}

// ───────────────────────────── constants ─────────────────────────
const AREAS = RKTR_LOCATIONS;

const INSPECTION_TYPES = [
  "Fire Safety",
  "Electrical",
  "Housekeeping",
  "PPE",
  "Emergency Equipment",
  "Machinery",
];

const CHECKLIST_ITEMS = [
  "Fire extinguishers accessible and charged",
  "Emergency exits unobstructed",
  "PPE available and in good condition",
  "Electrical panels labeled and closed",
  "Housekeeping maintained",
  "First aid kit stocked",
  "Hazardous material labeled and stored",
  "Machine guards in place",
  "Safety signage visible",
  "LOTO devices available",
];

// MOCK_FINDINGS and MOCK_NCRS removed — now derived from live inspection records

// ───────────────────────────── helper utils ──────────────────────
function toTimestamp(dateStr: string): bigint {
  return BigInt(new Date(dateStr).getTime()) * 1_000_000n;
}

function fromTimestamp(ts: bigint): string {
  return new Date(Number(ts) / 1_000_000).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fromTimestampDate(ts: bigint): string {
  const d = new Date(Number(ts) / 1_000_000);
  return d.toISOString().split("T")[0];
}

function genId(): string {
  return `INS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ───────────────────────────── status utils ──────────────────────
function statusColor(s: InspectionStatus): string {
  switch (s) {
    case IS.scheduled:
      return "bg-blue-500/15 text-blue-300 border-blue-500/30";
    case IS.inProgress:
      return "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
    case IS.completed:
      return "bg-green-500/15 text-green-400 border-green-500/30";
    case IS.overdue:
      return "bg-red-500/15 text-red-400 border-red-500/30";
  }
}

function statusLabel(s: InspectionStatus): string {
  switch (s) {
    case IS.scheduled:
      return "Scheduled";
    case IS.inProgress:
      return "In Progress";
    case IS.completed:
      return "Completed";
    case IS.overdue:
      return "Overdue";
  }
}

function findingStatusColor(s: FindingStatus): string {
  switch (s) {
    case "Open":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    case "CAPA Assigned":
      return "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
    case "Closed":
      return "bg-green-500/15 text-green-400 border-green-500/30";
  }
}

function severityColor(s: Severity): string {
  switch (s) {
    case "Critical":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    case "Major":
      return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    case "Minor":
      return "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
    case "Observation":
      return "bg-blue-500/15 text-blue-300 border-blue-500/30";
  }
}

function ncrStatusColor(s: NCRStatus): string {
  switch (s) {
    case "Open":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    case "In Progress":
      return "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
    case "Closed":
      return "bg-green-500/15 text-green-400 border-green-500/30";
  }
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-300";
  return "text-red-400";
}

const GLASS = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
};
const GLASS_EL = {
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.12)",
};

// ═══════════════════════════════════════════════════════════════════
// INSPECTION FORM MODAL
// ═══════════════════════════════════════════════════════════════════
interface FormState {
  title: string;
  area: string;
  inspectionDate: string;
  inspector: string;
  inspectionType: string;
  status: InspectionStatus;
  score: string;
  notes: string;
  findings: FormFinding[];
  checklistAnswers: ChecklistAnswer[];
}

const defaultForm = (): FormState => ({
  title: "",
  area: AREAS[0],
  inspectionDate: new Date().toISOString().split("T")[0],
  inspector: "",
  inspectionType: INSPECTION_TYPES[0],
  status: IS.scheduled,
  score: "100",
  notes: "",
  findings: [{ id: "f-init", description: "", severity: "Minor" }],
  checklistAnswers: CHECKLIST_ITEMS.map(() => null),
});

interface InspectionFormProps {
  initial?: InspectionRecord | null;
  onClose: () => void;
  onSave: (record: InspectionRecord) => void;
  saving: boolean;
}

function InspectionForm({
  initial,
  onClose,
  onSave,
  saving,
}: InspectionFormProps) {
  const [form, setForm] = useState<FormState>(() => {
    if (!initial) return defaultForm();
    return {
      title: initial.title,
      area: initial.area,
      inspectionDate: fromTimestampDate(initial.inspectionDate),
      inspector: initial.inspector,
      inspectionType: "Fire Safety",
      status: initial.status,
      score: String(initial.score),
      notes: "",
      findings:
        initial.findings.length > 0
          ? initial.findings.map((f, fi) => ({
              id: `f-${fi}`,
              description: f,
              severity: "Minor" as Severity,
            }))
          : [{ id: "f-init", description: "", severity: "Minor" }],
      checklistAnswers: CHECKLIST_ITEMS.map(() => null),
    };
  });

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const addFinding = () =>
    setField("findings", [
      ...form.findings,
      { id: `f-${Date.now()}`, description: "", severity: "Minor" },
    ]);

  const removeFinding = (id: string) =>
    setField(
      "findings",
      form.findings.filter((ff) => ff.id !== id),
    );

  const updateFinding = (
    id: string,
    key: "description" | "severity",
    val: string,
  ) =>
    setField(
      "findings",
      form.findings.map((ff) => (ff.id === id ? { ...ff, [key]: val } : ff)),
    );

  const setChecklist = (i: number, val: ChecklistAnswer) =>
    setField(
      "checklistAnswers",
      form.checklistAnswers.map((a, idx) => (idx === i ? val : a)),
    );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.inspector.trim()) {
      toast.error("Title and Inspector are required");
      return;
    }
    const record: InspectionRecord = {
      id: initial?.id ?? genId(),
      title: form.title.trim(),
      area: form.area,
      inspectionDate: toTimestamp(form.inspectionDate),
      inspector: form.inspector.trim(),
      status: form.status,
      score: BigInt(Math.max(0, Math.min(100, Number(form.score) || 0))),
      findings: form.findings
        .filter((f) => f.description.trim())
        .map((f) => f.description.trim()),
      createdAt: initial?.createdAt ?? BigInt(Date.now()) * 1_000_000n,
    };
    onSave(record);
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-start justify-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.6)" }}
        onClick={onClose}
        onKeyDown={onClose}
        role="presentation"
      />
      {/* Panel */}
      <motion.div
        className="relative h-full w-full max-w-2xl flex flex-col overflow-hidden"
        style={{
          background: "#0e1a2e",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
        }}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 200 }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: "rgba(24,195,126,0.15)",
                border: "1px solid rgba(24,195,126,0.3)",
              }}
            >
              <ClipboardCheck className="w-4 h-4 text-[#18C37E]" />
            </div>
            <h2 className="font-display font-semibold text-white">
              {initial ? "Edit Inspection" : "Schedule New Inspection"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-smooth"
            data-ocid="inspections.form.close_button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-6"
        >
          {/* Basic Info */}
          <section>
            <h3 className="text-xs font-semibold text-[#18C37E] uppercase tracking-widest mb-4">
              Inspection Details
            </h3>
            <div className="space-y-4">
              <div>
                <Label
                  htmlFor="ins-title"
                  className="text-white/70 text-xs mb-1.5 block"
                >
                  Inspection Title *
                </Label>
                <Input
                  id="ins-title"
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  placeholder="e.g. Monthly Fire Safety Audit – Forge Shop"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  data-ocid="inspections.form.title_input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="ins-area"
                    className="text-white/70 text-xs mb-1.5 block"
                  >
                    Area / Department *
                  </Label>
                  <Select
                    value={form.area}
                    onValueChange={(v) => setField("area", v)}
                  >
                    <SelectTrigger
                      id="ins-area"
                      className="bg-white/5 border-white/10 text-white"
                      data-ocid="inspections.form.area_select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AREAS.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label
                    htmlFor="ins-type"
                    className="text-white/70 text-xs mb-1.5 block"
                  >
                    Inspection Type
                  </Label>
                  <Select
                    value={form.inspectionType}
                    onValueChange={(v) => setField("inspectionType", v)}
                  >
                    <SelectTrigger
                      id="ins-type"
                      className="bg-white/5 border-white/10 text-white"
                      data-ocid="inspections.form.type_select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INSPECTION_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="ins-date"
                    className="text-white/70 text-xs mb-1.5 block"
                  >
                    Inspection Date *
                  </Label>
                  <Input
                    id="ins-date"
                    type="date"
                    value={form.inspectionDate}
                    onChange={(e) => setField("inspectionDate", e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                    data-ocid="inspections.form.date_input"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="ins-inspector"
                    className="text-white/70 text-xs mb-1.5 block"
                  >
                    Inspector *
                  </Label>
                  <Input
                    id="ins-inspector"
                    value={form.inspector}
                    onChange={(e) => setField("inspector", e.target.value)}
                    placeholder="Inspector name"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    data-ocid="inspections.form.inspector_input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="ins-status"
                    className="text-white/70 text-xs mb-1.5 block"
                  >
                    Status
                  </Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) =>
                      setField("status", v as InspectionStatus)
                    }
                  >
                    <SelectTrigger
                      id="ins-status"
                      className="bg-white/5 border-white/10 text-white"
                      data-ocid="inspections.form.status_select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={IS.scheduled}>Scheduled</SelectItem>
                      <SelectItem value={IS.inProgress}>In Progress</SelectItem>
                      <SelectItem value={IS.completed}>Completed</SelectItem>
                      <SelectItem value={IS.overdue}>Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label
                    htmlFor="ins-score"
                    className="text-white/70 text-xs mb-1.5 block"
                  >
                    Score (0–100)
                  </Label>
                  <Input
                    id="ins-score"
                    type="number"
                    min="0"
                    max="100"
                    value={form.score}
                    onChange={(e) => setField("score", e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                    data-ocid="inspections.form.score_input"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Checklist */}
          <section>
            <h3 className="text-xs font-semibold text-[#18C37E] uppercase tracking-widest mb-4">
              Inspection Checklist
            </h3>
            <div className="space-y-2" data-ocid="inspections.form.checklist">
              {CHECKLIST_ITEMS.map((item, i) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 gap-3"
                  style={GLASS}
                >
                  <span className="text-white/75 text-sm flex-1">
                    {i + 1}. {item}
                  </span>
                  <div className="flex gap-1.5 shrink-0">
                    {(["Yes", "No", "NA"] as ChecklistAnswer[]).map((opt) => (
                      <button
                        key={String(opt)}
                        type="button"
                        onClick={() =>
                          setChecklist(
                            i,
                            form.checklistAnswers[i] === opt ? null : opt,
                          )
                        }
                        className="px-2.5 py-1 rounded text-xs font-medium transition-smooth"
                        style={{
                          background:
                            form.checklistAnswers[i] === opt
                              ? opt === "Yes"
                                ? "rgba(24,195,126,0.25)"
                                : opt === "No"
                                  ? "rgba(239,68,68,0.25)"
                                  : "rgba(255,255,255,0.12)"
                              : "rgba(255,255,255,0.05)",
                          border: `1px solid ${
                            form.checklistAnswers[i] === opt
                              ? opt === "Yes"
                                ? "rgba(24,195,126,0.5)"
                                : opt === "No"
                                  ? "rgba(239,68,68,0.4)"
                                  : "rgba(255,255,255,0.3)"
                              : "rgba(255,255,255,0.08)"
                          }`,
                          color:
                            form.checklistAnswers[i] === opt
                              ? opt === "Yes"
                                ? "#18C37E"
                                : opt === "No"
                                  ? "#f87171"
                                  : "#e2e8f0"
                              : "rgba(255,255,255,0.4)",
                        }}
                        data-ocid={`inspections.form.checklist.item.${i + 1}`}
                      >
                        {opt}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const newFinding: FormFinding = {
                          id: `f-cl-${Date.now()}`,
                          description: `Finding: ${item}`,
                          severity: "Minor",
                        };
                        setField("findings", [...form.findings, newFinding]);
                        toast.info("Finding added to list below");
                      }}
                      className="px-2 py-1 rounded text-xs text-orange-400 hover:bg-orange-400/10 transition-smooth"
                      style={{ border: "1px solid rgba(251,146,60,0.25)" }}
                    >
                      + Finding
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Findings */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-[#18C37E] uppercase tracking-widest">
                Findings
              </h3>
              <button
                type="button"
                onClick={addFinding}
                className="flex items-center gap-1.5 text-xs text-[#18C37E] hover:text-[#18C37E]/80 transition-smooth"
                data-ocid="inspections.form.add_finding_button"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Add Finding
              </button>
            </div>
            <div
              className="space-y-2"
              data-ocid="inspections.form.findings_list"
            >
              {form.findings.map((f) => (
                <div key={f.id} className="flex items-center gap-2">
                  <Input
                    value={f.description}
                    onChange={(e) =>
                      updateFinding(f.id, "description", e.target.value)
                    }
                    placeholder="Describe the finding…"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 flex-1"
                    data-ocid={`inspections.form.finding.${f.id}`}
                  />
                  <Select
                    value={f.severity}
                    onValueChange={(v) => updateFinding(f.id, "severity", v)}
                  >
                    <SelectTrigger className="w-36 bg-white/5 border-white/10 text-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        [
                          "Critical",
                          "Major",
                          "Minor",
                          "Observation",
                        ] as Severity[]
                      ).map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.findings.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFinding(f.id)}
                      className="text-white/30 hover:text-red-400 transition-smooth"
                      data-ocid={`inspections.form.remove_finding.${f.id}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Notes */}
          <section>
            <Label
              htmlFor="ins-notes"
              className="text-white/70 text-xs mb-1.5 block"
            >
              Notes / Remarks
            </Label>
            <Textarea
              id="ins-notes"
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Additional observations or context…"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[80px] resize-none"
              data-ocid="inspections.form.notes_textarea"
            />
          </section>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 text-[#081426] font-semibold"
              style={{ background: "#18C37E" }}
              data-ocid="inspections.form.submit_button"
            >
              {saving
                ? "Saving…"
                : initial
                  ? "Update Inspection"
                  : "Schedule Inspection"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-white/15 text-white/70 hover:text-white hover:bg-white/10"
              data-ocid="inspections.form.cancel_button"
            >
              Cancel
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CALENDAR VIEW
// ═══════════════════════════════════════════════════════════════════
interface CalendarProps {
  inspections: InspectionRecord[];
  onDayClick: (dateStr: string) => void;
}

function CalendarView({ inspections, onDayClick }: CalendarProps) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthLabel = viewDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1,
  );
  while (cells.length % 7 !== 0) cells.push(null);

  const inspByDay = useMemo(() => {
    const map: Record<string, InspectionRecord[]> = {};
    for (const ins of inspections) {
      const d = new Date(Number(ins.inspectionDate) / 1_000_000);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const key = String(d.getDate());
        if (!map[key]) map[key] = [];
        map[key].push(ins);
      }
    }
    return map;
  }, [inspections, year, month]);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const isToday = (d: number) =>
    d === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  return (
    <div className="rounded-xl overflow-hidden" style={GLASS_EL}>
      {/* Month nav */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <button
          type="button"
          onClick={prevMonth}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-white/60 hover:text-white transition-smooth"
          data-ocid="inspections.calendar.prev"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-display font-semibold text-white text-sm">
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-white/60 hover:text-white transition-smooth"
          data-ocid="inspections.calendar.next"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      {/* Day headers */}
      <div className="grid grid-cols-7">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-semibold text-white/30 uppercase tracking-wider"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          >
            {d}
          </div>
        ))}
      </div>
      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          const cellKey = day ? `cal-${year}-${month}-${day}` : `empty-${idx}`;
          const ins = day ? (inspByDay[String(day)] ?? []) : [];
          const todayCell = day ? isToday(day) : false;
          return (
            <div
              key={cellKey}
              onClick={() =>
                day &&
                onDayClick(
                  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
                )
              }
              onKeyDown={(e) =>
                e.key === "Enter" &&
                day &&
                onDayClick(
                  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
                )
              }
              role={day ? "button" : undefined}
              tabIndex={day ? 0 : undefined}
              className={`min-h-[72px] p-2 flex flex-col transition-smooth ${day ? "cursor-pointer hover:bg-white/5" : ""}`}
              style={{
                borderRight:
                  idx % 7 !== 6
                    ? "1px solid rgba(255,255,255,0.04)"
                    : undefined,
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}
              data-ocid={
                day ? `inspections.calendar.day.${idx + 1}` : undefined
              }
            >
              {day && (
                <>
                  <span
                    className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                      todayCell ? "text-[#081426] font-bold" : "text-white/50"
                    }`}
                    style={todayCell ? { background: "#18C37E" } : {}}
                  >
                    {day}
                  </span>
                  <div className="space-y-0.5">
                    {ins.slice(0, 2).map((i) => (
                      <div
                        key={i.id}
                        className="text-[10px] leading-tight px-1 py-0.5 rounded truncate"
                        style={{
                          background: "rgba(24,195,126,0.12)",
                          color: "#18C37E",
                          border: "1px solid rgba(24,195,126,0.2)",
                        }}
                      >
                        {i.title.length > 14
                          ? `${i.title.slice(0, 14)}…`
                          : i.title}
                      </div>
                    ))}
                    {ins.length > 2 && (
                      <div className="text-[10px] text-white/30">
                        +{ins.length - 2} more
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════
const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "schedule", label: "Schedule", icon: <Calendar className="w-4 h-4" /> },
  {
    id: "list",
    label: "Inspections",
    icon: <ClipboardList className="w-4 h-4" />,
  },
  {
    id: "findings",
    label: "Findings Tracker",
    icon: <ListChecks className="w-4 h-4" />,
  },
  {
    id: "ncr",
    label: "Non-Conformances",
    icon: <FileWarning className="w-4 h-4" />,
  },
];

export default function InspectionsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("schedule");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<InspectionRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // List filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterArea, setFilterArea] = useState("all");
  const [filterInspector, setFilterInspector] = useState("all");

  // Findings filters
  const [filterFindingSeverity, setFilterFindingSeverity] = useState("all");
  const [filterFindingStatus, setFilterFindingStatus] = useState("all");

  const { data: inspections = [], isLoading } = useInspections();
  const createMut = useCreateInspection();
  const updateMut = useUpdateInspection();
  const deleteMut = useDeleteInspection();
  const updateStatus = useUpdateInspectionStatus();

  const saving = editTarget ? updateMut.isPending : createMut.isPending;

  function openCreate() {
    setEditTarget(null);
    setShowForm(true);
  }

  function openEdit(ins: InspectionRecord) {
    setEditTarget(ins);
    setShowForm(true);
  }

  function handleSave(record: InspectionRecord) {
    if (editTarget) {
      updateMut.mutate(
        { id: editTarget.id, inspection: record },
        {
          onSuccess: () => {
            toast.success("Inspection updated");
            setShowForm(false);
            setEditTarget(null);
          },
          onError: (e) => toast.error(e.message),
        },
      );
    } else {
      createMut.mutate(record, {
        onSuccess: () => {
          setShowForm(false);
          setEditTarget(null);
        },
        onError: (e) => toast.error(e.message),
      });
    }
  }

  function handleDelete(id: string) {
    deleteMut.mutate(id, {
      onSuccess: () => {
        toast.success("Inspection deleted");
        setDeleteConfirm(null);
      },
      onError: (e) => toast.error(e.message),
    });
  }

  function handleStatusChange(id: string, status: InspectionStatus) {
    updateStatus.mutate(
      { id, status },
      {
        onSuccess: () =>
          toast.success(`Status updated to ${statusLabel(status)}`),
        onError: (e) => toast.error(e.message),
      },
    );
  }

  // Derived data for filters
  const uniqueInspectors = useMemo(() => {
    const s = new Set(inspections.map((i) => i.inspector).filter(Boolean));
    return Array.from(s);
  }, [inspections]);

  const filteredInspections = useMemo(() => {
    return inspections.filter((i) => {
      const matchSearch =
        !search ||
        i.title.toLowerCase().includes(search.toLowerCase()) ||
        i.area.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || i.status === filterStatus;
      const matchArea = filterArea === "all" || i.area === filterArea;
      const matchInspector =
        filterInspector === "all" || i.inspector === filterInspector;
      return matchSearch && matchStatus && matchArea && matchInspector;
    });
  }, [inspections, search, filterStatus, filterArea, filterInspector]);

  // Upcoming 5
  const upcoming = useMemo(() => {
    const now = BigInt(Date.now()) * 1_000_000n;
    return [...inspections]
      .filter((i) => i.inspectionDate >= now || i.status === IS.inProgress)
      .sort((a, b) => Number(a.inspectionDate - b.inspectionDate))
      .slice(0, 5);
  }, [inspections]);

  // Stats
  const stats = useMemo(
    () => ({
      total: inspections.length,
      completed: inspections.filter((i) => i.status === IS.completed).length,
      inProgress: inspections.filter((i) => i.status === IS.inProgress).length,
      overdue: inspections.filter((i) => i.status === IS.overdue).length,
      scheduled: inspections.filter((i) => i.status === IS.scheduled).length,
    }),
    [inspections],
  );

  // Derive findings from all inspection records (flatten findings arrays)
  const allFindings = useMemo((): Finding[] => {
    const result: Finding[] = [];
    for (const ins of inspections) {
      if (ins.findings.length === 0) continue;
      for (let fi = 0; fi < ins.findings.length; fi++) {
        const text = ins.findings[fi];
        result.push({
          id: `${ins.id}-f${fi}`,
          description: text,
          inspection: ins.id,
          area: ins.area,
          severity: "Minor" as Severity,
          status: ins.status === IS.completed ? "Closed" : "Open",
          dueDate: fromTimestampDate(ins.inspectionDate),
        });
      }
    }
    return result;
  }, [inspections]);

  // Derive NCRs from overdue inspections or inspections with low scores
  const allNcrs = useMemo((): NCR[] => {
    return inspections
      .filter((ins) => ins.status === IS.overdue || Number(ins.score) < 60)
      .map((ins, i) => ({
        id: `ncr-${ins.id}`,
        ncrNumber: `NCR-${new Date(Number(ins.createdAt) / 1_000_000).getFullYear()}-${String(i + 1).padStart(3, "0")}`,
        description:
          ins.findings.length > 0
            ? ins.findings[0]
            : `Non-conformance identified during: ${ins.title}`,
        area: ins.area,
        raisedBy: ins.inspector,
        targetCloseDate: fromTimestampDate(ins.inspectionDate),
        status:
          ins.status === IS.completed
            ? "Closed"
            : ins.status === IS.inProgress
              ? "In Progress"
              : "Open",
      }));
  }, [inspections]);

  // Filtered findings
  const filteredFindings = useMemo(
    () =>
      allFindings.filter((f) => {
        const matchSev =
          filterFindingSeverity === "all" ||
          f.severity === filterFindingSeverity;
        const matchSt =
          filterFindingStatus === "all" || f.status === filterFindingStatus;
        return matchSev && matchSt;
      }),
    [allFindings, filterFindingSeverity, filterFindingStatus],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional – scroll to top when tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 md:p-6 space-y-6"
      data-ocid="inspections.page"
    >
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{
              background: "rgba(24,195,126,0.12)",
              border: "1px solid rgba(24,195,126,0.25)",
            }}
          >
            <ClipboardCheck className="w-5 h-5 text-[#18C37E]" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-white">
              Inspections
            </h1>
            <p className="text-xs text-white/40">
              Audit schedules, checklists & non-conformance tracking
            </p>
          </div>
        </div>
        <Button
          onClick={openCreate}
          className="flex items-center gap-2 text-[#081426] font-semibold text-sm"
          style={{ background: "#18C37E" }}
          data-ocid="inspections.schedule_button"
        >
          <PlusCircle className="w-4 h-4" /> Schedule Inspection
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl p-1" style={GLASS}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-smooth"
            style={
              activeTab === tab.id
                ? {
                    background: "rgba(24,195,126,0.15)",
                    color: "#18C37E",
                    border: "1px solid rgba(24,195,126,0.3)",
                  }
                : { color: "rgba(255,255,255,0.45)" }
            }
            data-ocid={`inspections.${tab.id}.tab`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {/* SCHEDULE */}
        {activeTab === "schedule" && (
          <motion.div
            key="schedule"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
            data-ocid="inspections.schedule.section"
          >
            <CalendarView
              inspections={inspections}
              onDayClick={(dateStr) => {
                const found = inspections.find(
                  (i) => fromTimestampDate(i.inspectionDate) === dateStr,
                );
                if (found) openEdit(found);
              }}
            />

            <div>
              <h3 className="text-sm font-semibold text-white/70 mb-3">
                Upcoming Inspections
              </h3>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-14 rounded-lg animate-pulse"
                      style={GLASS}
                    />
                  ))}
                </div>
              ) : upcoming.length === 0 ? (
                <div
                  className="rounded-xl p-8 text-center"
                  style={GLASS}
                  data-ocid="inspections.upcoming.empty_state"
                >
                  <Calendar className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p className="text-white/40 text-sm">
                    No upcoming inspections. Schedule one to get started.
                  </p>
                </div>
              ) : (
                <div
                  className="space-y-2"
                  data-ocid="inspections.upcoming.list"
                >
                  {upcoming.map((ins, idx) => (
                    <motion.div
                      key={ins.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.06 }}
                      className="flex items-center justify-between gap-4 rounded-xl px-4 py-3 cursor-pointer hover:bg-white/5 transition-smooth"
                      style={GLASS}
                      onClick={() => openEdit(ins)}
                      data-ocid={`inspections.upcoming.item.${idx + 1}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: "rgba(24,195,126,0.1)" }}
                        >
                          <Calendar className="w-4 h-4 text-[#18C37E]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {ins.title}
                          </p>
                          <p className="text-white/40 text-xs">
                            {ins.inspector} · {ins.area}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-white/50 text-xs">
                          {fromTimestamp(ins.inspectionDate)}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border ${statusColor(ins.status)}`}
                        >
                          {statusLabel(ins.status)}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* LIST */}
        {activeTab === "list" && (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
            data-ocid="inspections.list.section"
          >
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: "Total", value: stats.total, color: "text-white" },
                {
                  label: "Completed",
                  value: stats.completed,
                  color: "text-green-400",
                },
                {
                  label: "In Progress",
                  value: stats.inProgress,
                  color: "text-yellow-300",
                },
                {
                  label: "Overdue",
                  value: stats.overdue,
                  color: "text-red-400",
                },
                {
                  label: "Scheduled",
                  value: stats.scheduled,
                  color: "text-blue-300",
                },
              ].map((s, idx) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="rounded-xl px-4 py-3 text-center"
                  style={GLASS_EL}
                  data-ocid={`inspections.stats.${s.label.toLowerCase()}`}
                >
                  <div className={`text-2xl font-display font-bold ${s.color}`}>
                    {s.value}
                  </div>
                  <div className="text-xs text-white/40 mt-0.5">{s.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search inspections…"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pl-9"
                  data-ocid="inspections.list.search_input"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger
                  className="w-40 bg-white/5 border-white/10 text-white text-xs"
                  data-ocid="inspections.list.status_select"
                >
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value={IS.scheduled}>Scheduled</SelectItem>
                  <SelectItem value={IS.inProgress}>In Progress</SelectItem>
                  <SelectItem value={IS.completed}>Completed</SelectItem>
                  <SelectItem value={IS.overdue}>Overdue</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterArea} onValueChange={setFilterArea}>
                <SelectTrigger
                  className="w-44 bg-white/5 border-white/10 text-white text-xs"
                  data-ocid="inspections.list.area_select"
                >
                  <SelectValue placeholder="Area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Areas</SelectItem>
                  {AREAS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filterInspector}
                onValueChange={setFilterInspector}
              >
                <SelectTrigger
                  className="w-44 bg-white/5 border-white/10 text-white text-xs"
                  data-ocid="inspections.list.inspector_select"
                >
                  <SelectValue placeholder="Inspector" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Inspectors</SelectItem>
                  {uniqueInspectors.map((i) => (
                    <SelectItem key={i} value={i}>
                      {i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="rounded-xl overflow-hidden" style={GLASS_EL}>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      {[
                        "Title",
                        "Area",
                        "Date",
                        "Inspector",
                        "Score",
                        "Status",
                        "Findings",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <tr key={`ins-skel-row-${String(i).padStart(2, "0")}`}>
                          {Array.from({ length: 8 }).map((_, j) => (
                            <td
                              key={`ins-skel-cell-${String(i)}-${String(j)}`}
                              className="px-4 py-3"
                            >
                              <div
                                className="h-4 rounded animate-pulse"
                                style={{
                                  background: "rgba(255,255,255,0.06)",
                                }}
                              />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : filteredInspections.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="text-center py-12"
                          data-ocid="inspections.list.empty_state"
                        >
                          <ClipboardCheck className="w-8 h-8 text-white/15 mx-auto mb-2" />
                          <p className="text-white/30 text-sm">
                            No inspections match your filters
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredInspections.map((ins, idx) => (
                        <motion.tr
                          key={ins.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.03 }}
                          className="hover:bg-white/3 transition-smooth border-b"
                          style={{ borderColor: "rgba(255,255,255,0.04)" }}
                          data-ocid={`inspections.list.item.${idx + 1}`}
                        >
                          <td className="px-4 py-3">
                            <span className="text-white font-medium">
                              {ins.title}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white/60 whitespace-nowrap">
                            {ins.area}
                          </td>
                          <td className="px-4 py-3 text-white/60 whitespace-nowrap">
                            {fromTimestamp(ins.inspectionDate)}
                          </td>
                          <td className="px-4 py-3 text-white/60 whitespace-nowrap">
                            {ins.inspector}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`font-bold tabular-nums ${scoreColor(Number(ins.score))}`}
                            >
                              {String(ins.score)}
                              <span className="text-white/30 font-normal">
                                /100
                              </span>
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Select
                              value={ins.status}
                              onValueChange={(v) =>
                                handleStatusChange(
                                  ins.id,
                                  v as InspectionStatus,
                                )
                              }
                            >
                              <SelectTrigger
                                className={`w-36 text-xs border px-2 py-1 h-auto ${statusColor(ins.status)}`}
                                style={{ background: "transparent" }}
                                data-ocid={`inspections.status_select.${idx + 1}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={IS.scheduled}>
                                  Scheduled
                                </SelectItem>
                                <SelectItem value={IS.inProgress}>
                                  In Progress
                                </SelectItem>
                                <SelectItem value={IS.completed}>
                                  Completed
                                </SelectItem>
                                <SelectItem value={IS.overdue}>
                                  Overdue
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-white/60">
                              {ins.findings.length}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEdit(ins)}
                                className="text-xs text-[#18C37E] hover:text-[#18C37E]/70 transition-smooth"
                                data-ocid={`inspections.list.edit_button.${idx + 1}`}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm(ins.id)}
                                className="text-white/30 hover:text-red-400 transition-smooth"
                                data-ocid={`inspections.list.delete_button.${idx + 1}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* FINDINGS */}
        {activeTab === "findings" && (
          <motion.div
            key="findings"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
            data-ocid="inspections.findings.section"
          >
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="font-display font-semibold text-white">
                Inspection Findings
              </h2>
              <div className="flex gap-3">
                <Select
                  value={filterFindingSeverity}
                  onValueChange={setFilterFindingSeverity}
                >
                  <SelectTrigger
                    className="w-40 bg-white/5 border-white/10 text-white text-xs"
                    data-ocid="inspections.findings.severity_select"
                  >
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="Major">Major</SelectItem>
                    <SelectItem value="Minor">Minor</SelectItem>
                    <SelectItem value="Observation">Observation</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filterFindingStatus}
                  onValueChange={setFilterFindingStatus}
                >
                  <SelectTrigger
                    className="w-44 bg-white/5 border-white/10 text-white text-xs"
                    data-ocid="inspections.findings.status_select"
                  >
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="CAPA Assigned">CAPA Assigned</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden" style={GLASS_EL}>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      {[
                        "Finding",
                        "Inspection Ref",
                        "Area",
                        "Severity",
                        "Status",
                        "Due Date",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFindings.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="text-center py-10 text-white/30"
                          data-ocid="inspections.findings.empty_state"
                        >
                          No findings match filters
                        </td>
                      </tr>
                    ) : (
                      filteredFindings.map((f, idx) => (
                        <motion.tr
                          key={f.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.04 }}
                          className="border-b hover:bg-white/3 transition-smooth"
                          style={{ borderColor: "rgba(255,255,255,0.04)" }}
                          data-ocid={`inspections.findings.item.${idx + 1}`}
                        >
                          <td className="px-4 py-3 max-w-xs">
                            <span className="text-white/80 line-clamp-2">
                              {f.description}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white/50 whitespace-nowrap font-mono text-xs">
                            {f.inspection}
                          </td>
                          <td className="px-4 py-3 text-white/60 whitespace-nowrap">
                            {f.area}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              className={`text-xs border ${severityColor(f.severity)}`}
                            >
                              {f.severity}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              className={`text-xs border ${findingStatusColor(f.status)}`}
                            >
                              {f.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-white/60 whitespace-nowrap">
                            {f.dueDate}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              disabled={f.status === "Closed"}
                              onClick={() =>
                                toast.info(
                                  "CAPA will be created for this finding",
                                )
                              }
                              className="text-xs px-3 py-1 rounded-lg font-medium transition-smooth disabled:opacity-30 disabled:cursor-not-allowed"
                              style={{
                                background: "rgba(24,195,126,0.1)",
                                border: "1px solid rgba(24,195,126,0.25)",
                                color: "#18C37E",
                              }}
                              data-ocid={`inspections.findings.assign_capa.${idx + 1}`}
                            >
                              Assign CAPA
                            </button>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* NCR */}
        {activeTab === "ncr" && (
          <motion.div
            key="ncr"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
            data-ocid="inspections.ncr.section"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold text-white">
                Non-Conformance Logs
              </h2>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <AlertCircle className="w-3.5 h-3.5" />
                {allNcrs.filter((n) => n.status === "Open").length} open NCRs
              </div>
            </div>

            <div
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
              data-ocid="inspections.ncr.list"
            >
              {allNcrs.length === 0 ? (
                <div
                  className="col-span-3 rounded-xl p-8 text-center"
                  style={GLASS}
                  data-ocid="inspections.ncr.empty_state"
                >
                  <FileWarning className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p className="text-white/30 text-sm">
                    No non-conformances found. NCRs are auto-generated from
                    overdue or low-scoring inspections.
                  </p>
                </div>
              ) : (
                allNcrs.map((ncr, idx) => (
                  <motion.div
                    key={ncr.id}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.06 }}
                    whileHover={{ y: -2, transition: { duration: 0.15 } }}
                    className="rounded-xl p-4 flex flex-col gap-3"
                    style={GLASS_EL}
                    data-ocid={`inspections.ncr.item.${idx + 1}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-mono text-[#18C37E] font-semibold">
                          {ncr.ncrNumber}
                        </span>
                        <p className="text-white font-medium text-sm mt-1 leading-snug">
                          {ncr.description}
                        </p>
                      </div>
                      <Badge
                        className={`text-xs border shrink-0 ${ncrStatusColor(ncr.status)}`}
                      >
                        {ncr.status}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-white/40">Area</span>
                        <span className="text-white/70">{ncr.area}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/40">Raised By</span>
                        <span className="text-white/70 text-right max-w-[60%] truncate">
                          {ncr.raisedBy}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/40">Target Close</span>
                        <span
                          className={`font-medium ${
                            ncr.status === "Open"
                              ? "text-red-400"
                              : ncr.status === "In Progress"
                                ? "text-yellow-300"
                                : "text-green-400"
                          }`}
                        >
                          {ncr.targetCloseDate}
                        </span>
                      </div>
                    </div>

                    {ncr.status !== "Closed" ? (
                      <div
                        className="w-full h-1 rounded-full overflow-hidden"
                        style={{ background: "rgba(255,255,255,0.06)" }}
                      >
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            background:
                              ncr.status === "In Progress"
                                ? "#eab308"
                                : "#ef4444",
                          }}
                          initial={{ width: 0 }}
                          animate={{
                            width: ncr.status === "In Progress" ? "55%" : "15%",
                          }}
                          transition={{
                            delay: idx * 0.06 + 0.3,
                            duration: 0.6,
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-green-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Closed &amp; Verified</span>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form Slide Panel */}
      <AnimatePresence>
        {showForm && (
          <InspectionForm
            initial={editTarget}
            onClose={() => {
              setShowForm(false);
              setEditTarget(null);
            }}
            onSave={handleSave}
            saving={saving}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            data-ocid="inspections.delete.dialog"
          >
            <div
              className="absolute inset-0"
              style={{ background: "rgba(0,0,0,0.6)" }}
              onClick={() => setDeleteConfirm(null)}
              onKeyDown={(e) => e.key === "Escape" && setDeleteConfirm(null)}
              role="presentation"
            />
            <motion.div
              className="relative w-full max-w-sm rounded-2xl p-6 space-y-4"
              style={{
                background: "#0e1a2e",
                border: "1px solid rgba(239,68,68,0.3)",
              }}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(239,68,68,0.15)" }}
                >
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">
                    Delete Inspection
                  </h3>
                  <p className="text-white/50 text-sm">
                    This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={deleteMut.isPending}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                  data-ocid="inspections.delete.confirm_button"
                >
                  {deleteMut.isPending ? "Deleting…" : "Delete"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 border-white/15 text-white/70 hover:text-white hover:bg-white/10"
                  data-ocid="inspections.delete.cancel_button"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status update loading indicator */}
      <AnimatePresence>
        {updateStatus.isPending && (
          <motion.div
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-xl px-4 py-3"
            style={{
              background: "rgba(24,195,126,0.15)",
              border: "1px solid rgba(24,195,126,0.3)",
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            data-ocid="inspections.status.loading_state"
          >
            <Clock className="w-4 h-4 text-[#18C37E] animate-spin" />
            <span className="text-[#18C37E] text-sm">Updating status…</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
