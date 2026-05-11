import type { CapaRecord } from "@/backend";
import { CapaStatus } from "@/backend";
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
import { RKTR_DEPARTMENTS } from "@/constants/departments";
import {
  useCapas,
  useCreateCapa,
  useDeleteCapa,
  useUpdateCapa,
  useUpdateCapaStatus,
} from "@/hooks/useBackend";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Edit2,
  Loader2,
  Plus,
  Shield,
  Trash2,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

const DEPARTMENTS = RKTR_DEPARTMENTS;

const SOURCES = [
  "Incident",
  "Inspection Finding",
  "Audit",
  "Safety Observation",
  "Near Miss",
  "Risk Assessment",
];

const PRIORITIES = ["High", "Medium", "Low"];

type PageView = "list" | "create" | "edit" | "detail";

function getCapaId(capa: CapaRecord): string {
  const date = new Date(Number(capa.createdAt) / 1_000_000);
  const year = date.getFullYear();
  const seq = capa.id.slice(-3).padStart(3, "0");
  return `CAPA-${year}-${seq}`;
}

function isOverdue(capa: CapaRecord): boolean {
  if (capa.status === CapaStatus.closed || capa.status === CapaStatus.verified)
    return false;
  const target = new Date(Number(capa.targetDate) / 1_000_000);
  return target < new Date();
}

function formatDate(ts: bigint): string {
  return new Date(Number(ts) / 1_000_000).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function dateToTimestamp(dateStr: string): bigint {
  return BigInt(new Date(dateStr).getTime()) * 1_000_000n;
}

function timestampToDate(ts: bigint): string {
  const d = new Date(Number(ts) / 1_000_000);
  return d.toISOString().split("T")[0];
}

const STATUS_CONFIG: Record<
  CapaStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  [CapaStatus.open]: {
    label: "Open",
    color: "bg-red-500/15 text-red-400 border-red-500/30",
    icon: <Circle className="w-3 h-3" />,
  },
  [CapaStatus.inProgress]: {
    label: "In Progress",
    color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    icon: <Clock className="w-3 h-3" />,
  },
  [CapaStatus.closed]: {
    label: "Closed",
    color: "bg-[#18C37E]/15 text-[#18C37E] border-[#18C37E]/30",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  [CapaStatus.verified]: {
    label: "Verified",
    color: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    icon: <Shield className="w-3 h-3" />,
  },
};

const WORKFLOW_STEPS: CapaStatus[] = [
  CapaStatus.open,
  CapaStatus.inProgress,
  CapaStatus.closed,
  CapaStatus.verified,
];

function StatusBadge({ status }: { status: CapaStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <Badge
      className={`flex items-center gap-1 text-xs font-medium border ${cfg.color}`}
    >
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
  index,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="rounded-xl p-4 flex items-center gap-4"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
      data-ocid={`capa.stat.${index + 1}`}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-display font-bold text-white">{value}</p>
        <p className="text-xs text-white/40">{label}</p>
      </div>
    </motion.div>
  );
}

function WorkflowStepper({ status }: { status: CapaStatus }) {
  const currentIdx = WORKFLOW_STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-0">
      {WORKFLOW_STEPS.map((s, idx) => {
        const cfg = STATUS_CONFIG[s];
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        return (
          <div key={s} className="flex items-center">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${
                active
                  ? "border-[#18C37E] bg-[#18C37E]/20 text-[#18C37E]"
                  : done
                    ? "border-white/30 bg-white/10 text-white/60"
                    : "border-white/15 bg-transparent text-white/25"
              }`}
              title={cfg.label}
            >
              {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
            </div>
            {idx < WORKFLOW_STEPS.length - 1 && (
              <div
                className={`h-px w-8 ${done ? "bg-white/30" : "bg-white/10"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

type FormData = {
  title: string;
  source: string;
  sourceRef: string;
  priority: string;
  department: string;
  rootCause: string;
  actionPlan: string;
  owner: string;
  targetDate: string;
  verificationRequired: boolean;
  verificationDetails: string;
  reviewDate: string;
};

const EMPTY_FORM: FormData = {
  title: "",
  source: "",
  sourceRef: "",
  priority: "Medium",
  department: "",
  rootCause: "",
  actionPlan: "",
  owner: "",
  targetDate: "",
  verificationRequired: false,
  verificationDetails: "",
  reviewDate: "",
};

function CapaForm({
  initial,
  capaRecord,
  onCancel,
  onSaved,
}: {
  initial?: FormData;
  capaRecord?: CapaRecord;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormData>(initial ?? EMPTY_FORM);
  const createCapa = useCreateCapa();
  const updateCapa = useUpdateCapa();

  const isEdit = !!capaRecord;

  const set = (k: keyof FormData, v: string | boolean) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.title ||
      !form.rootCause ||
      !form.actionPlan ||
      !form.targetDate
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    const now = BigInt(Date.now()) * 1_000_000n;
    const record: CapaRecord = {
      id: capaRecord?.id ?? crypto.randomUUID(),
      status: capaRecord?.status ?? CapaStatus.open,
      title: form.title,
      owner: form.owner,
      createdAt: capaRecord?.createdAt ?? now,
      updatedAt: now,
      actionPlan: form.actionPlan,
      rootCause: form.rootCause,
      department: form.department,
      targetDate: dateToTimestamp(form.targetDate),
      verificationDetails: form.verificationDetails || undefined,
    };

    try {
      if (isEdit && capaRecord) {
        await updateCapa.mutateAsync({ id: capaRecord.id, capa: record });
        toast.success("CAPA updated successfully");
      } else {
        await createCapa.mutateAsync(record);
        toast.success("CAPA created successfully");
      }
      onSaved();
    } catch {
      toast.error(isEdit ? "Failed to update CAPA" : "Failed to create CAPA");
    }
  };

  const isPending = createCapa.isPending || updateCapa.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-ocid="capa.form">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-smooth"
          data-ocid="capa.form.back_button"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="font-display font-bold text-lg text-white">
            {isEdit ? "Edit CAPA" : "Create New CAPA"}
          </h2>
          {capaRecord && (
            <p className="text-xs text-white/40">{getCapaId(capaRecord)}</p>
          )}
        </div>
      </div>

      {/* CAPA ID notice */}
      {!isEdit && (
        <div
          className="rounded-xl px-4 py-3 flex items-center gap-3"
          style={{
            background: "rgba(24,195,126,0.06)",
            border: "1px solid rgba(24,195,126,0.15)",
          }}
        >
          <Shield className="w-4 h-4 text-[#18C37E] flex-shrink-0" />
          <p className="text-xs text-white/60">
            CAPA ID will be auto-generated upon submission (e.g., CAPA-
            {new Date().getFullYear()}-001)
          </p>
        </div>
      )}

      {/* Form fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor="capa-title" className="text-white/70 text-xs">
            Title <span className="text-red-400">*</span>
          </Label>
          <Input
            id="capa-title"
            placeholder="Brief description of the corrective action"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/25"
            data-ocid="capa.title_input"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="capa-source" className="text-white/70 text-xs">
            Source
          </Label>
          <Select value={form.source} onValueChange={(v) => set("source", v)}>
            <SelectTrigger
              id="capa-source"
              className="bg-white/5 border-white/10 text-white"
              data-ocid="capa.source_select"
            >
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              {SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="capa-source-ref" className="text-white/70 text-xs">
            Source Reference
          </Label>
          <Input
            id="capa-source-ref"
            placeholder="e.g. INC-2024-001"
            value={form.sourceRef}
            onChange={(e) => set("sourceRef", e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/25"
            data-ocid="capa.source_ref_input"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="capa-priority" className="text-white/70 text-xs">
            Priority
          </Label>
          <Select
            value={form.priority}
            onValueChange={(v) => set("priority", v)}
          >
            <SelectTrigger
              id="capa-priority"
              className="bg-white/5 border-white/10 text-white"
              data-ocid="capa.priority_select"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="capa-dept" className="text-white/70 text-xs">
            Department
          </Label>
          <Select
            value={form.department}
            onValueChange={(v) => set("department", v)}
          >
            <SelectTrigger
              id="capa-dept"
              className="bg-white/5 border-white/10 text-white"
              data-ocid="capa.department_select"
            >
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor="capa-root" className="text-white/70 text-xs">
            Root Cause <span className="text-red-400">*</span>
          </Label>
          <Textarea
            id="capa-root"
            placeholder="Describe the root cause analysis findings..."
            value={form.rootCause}
            onChange={(e) => set("rootCause", e.target.value)}
            rows={3}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/25 resize-none"
            data-ocid="capa.root_cause_textarea"
          />
        </div>

        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor="capa-action" className="text-white/70 text-xs">
            Action Plan <span className="text-red-400">*</span>
          </Label>
          <Textarea
            id="capa-action"
            placeholder="Detail the corrective and preventive actions to be taken..."
            value={form.actionPlan}
            onChange={(e) => set("actionPlan", e.target.value)}
            rows={3}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/25 resize-none"
            data-ocid="capa.action_plan_textarea"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="capa-owner" className="text-white/70 text-xs">
            Responsible Owner
          </Label>
          <Input
            id="capa-owner"
            placeholder="e.g. Rajiv Sharma"
            value={form.owner}
            onChange={(e) => set("owner", e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/25"
            data-ocid="capa.owner_input"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="capa-target" className="text-white/70 text-xs">
            Target Completion Date <span className="text-red-400">*</span>
          </Label>
          <Input
            id="capa-target"
            type="date"
            value={form.targetDate}
            onChange={(e) => set("targetDate", e.target.value)}
            className="bg-white/5 border-white/10 text-white"
            data-ocid="capa.target_date_input"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="capa-review" className="text-white/70 text-xs">
            Review Date
          </Label>
          <Input
            id="capa-review"
            type="date"
            value={form.reviewDate}
            onChange={(e) => set("reviewDate", e.target.value)}
            className="bg-white/5 border-white/10 text-white"
            data-ocid="capa.review_date_input"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/70 text-xs">Verification Required</Label>
          <div className="flex gap-3 pt-1">
            {([true, false] as const).map((val) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => set("verificationRequired", val)}
                className={`flex-1 py-2 px-4 rounded-lg text-xs font-medium border transition-smooth ${
                  form.verificationRequired === val
                    ? "bg-[#18C37E]/20 border-[#18C37E]/40 text-[#18C37E]"
                    : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                }`}
                data-ocid={`capa.verification_${val ? "yes" : "no"}_toggle`}
              >
                {val ? "Yes" : "No"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {form.verificationRequired && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1.5 overflow-hidden"
          >
            <Label
              htmlFor="capa-verif-details"
              className="text-white/70 text-xs"
            >
              Verification Details
            </Label>
            <Textarea
              id="capa-verif-details"
              placeholder="Describe how the action will be verified..."
              value={form.verificationDetails}
              onChange={(e) => set("verificationDetails", e.target.value)}
              rows={3}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/25 resize-none"
              data-ocid="capa.verification_details_textarea"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="border-white/15 text-white/60 hover:bg-white/10"
          data-ocid="capa.form.cancel_button"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="bg-[#18C37E] hover:bg-[#15a86c] text-black font-semibold"
          data-ocid="capa.form.submit_button"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isEdit ? (
            "Save Changes"
          ) : (
            "Create CAPA"
          )}
        </Button>
      </div>
    </form>
  );
}

function DetailTimeline({ capa }: { capa: CapaRecord }) {
  const events: Array<{
    label: string;
    ts: bigint;
    icon: React.ReactNode;
    color: string;
  }> = [
    {
      label: "CAPA Created",
      ts: capa.createdAt,
      icon: <Plus className="w-3 h-3" />,
      color: "#18C37E",
    },
    ...(capa.status !== CapaStatus.open
      ? [
          {
            label: "Started In Progress",
            ts: capa.updatedAt,
            icon: <Clock className="w-3 h-3" />,
            color: "#eab308",
          },
        ]
      : []),
    ...(capa.status === CapaStatus.closed || capa.status === CapaStatus.verified
      ? [
          {
            label: "Marked Closed",
            ts: capa.updatedAt,
            icon: <CheckCircle2 className="w-3 h-3" />,
            color: "#22c55e",
          },
        ]
      : []),
    ...(capa.status === CapaStatus.verified
      ? [
          {
            label: "Verified & Completed",
            ts: capa.updatedAt,
            icon: <Shield className="w-3 h-3" />,
            color: "#3b82f6",
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
        Status Timeline
      </h3>
      <div className="space-y-2">
        {events.map((ev, i) => (
          <div
            key={`ev-${ev.ts.toString()}-${String(i)}`}
            className="flex items-start gap-3"
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{
                background: `${ev.color}20`,
                border: `1px solid ${ev.color}40`,
                color: ev.color,
              }}
            >
              {ev.icon}
            </div>
            <div>
              <p className="text-sm text-white/80">{ev.label}</p>
              <p className="text-xs text-white/35">{formatDate(ev.ts)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailField({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <p className="text-xs text-white/40 mb-1">{label}</p>
      <p
        className={`text-sm text-white/85 ${multiline ? "leading-relaxed" : ""}`}
      >
        {value || <span className="text-white/25 italic">Not specified</span>}
      </p>
    </div>
  );
}

function CapaDetail({
  capa,
  onEdit,
  onBack,
}: {
  capa: CapaRecord;
  onEdit: () => void;
  onBack: () => void;
}) {
  const updateStatus = useUpdateCapaStatus();
  const overdue = isOverdue(capa);

  const nextStatusMap: Partial<Record<CapaStatus, CapaStatus>> = {
    [CapaStatus.open]: CapaStatus.inProgress,
    [CapaStatus.inProgress]: CapaStatus.closed,
    [CapaStatus.closed]: CapaStatus.verified,
  };
  const actionLabelMap: Partial<Record<CapaStatus, string>> = {
    [CapaStatus.open]: "Start Progress",
    [CapaStatus.inProgress]: "Mark as Closed",
    [CapaStatus.closed]: "Verify & Complete",
  };

  const handleTransition = async () => {
    const next = nextStatusMap[capa.status];
    if (!next) return;
    try {
      await updateStatus.mutateAsync({ id: capa.id, status: next });
      toast.success(`CAPA moved to ${STATUS_CONFIG[next].label}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
      data-ocid="capa.detail"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-smooth"
            data-ocid="capa.detail.back_button"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display font-bold text-lg text-white">
                {capa.title}
              </h2>
              {overdue && (
                <span className="flex items-center gap-1 text-xs text-red-400">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
                  Overdue
                </span>
              )}
            </div>
            <p className="text-xs text-white/40">{getCapaId(capa)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="border-white/15 text-white/60 hover:bg-white/10"
            data-ocid="capa.detail.edit_button"
          >
            <Edit2 className="w-3.5 h-3.5 mr-1" />
            Edit
          </Button>
          {nextStatusMap[capa.status] && (
            <Button
              type="button"
              size="sm"
              onClick={handleTransition}
              disabled={updateStatus.isPending}
              className="bg-[#18C37E] hover:bg-[#15a86c] text-black font-semibold text-xs"
              data-ocid="capa.detail.workflow_button"
            >
              {updateStatus.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <ChevronRight className="w-3.5 h-3.5 mr-1" />
                  {actionLabelMap[capa.status]}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div
        className="rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex items-center gap-3">
          <StatusBadge status={capa.status} />
          {overdue && (
            <span className="text-xs text-red-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Past target date
            </span>
          )}
        </div>
        <WorkflowStepper status={capa.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DetailField label="Department" value={capa.department} />
        <DetailField label="Responsible Owner" value={capa.owner} />
        <DetailField label="Target Date" value={formatDate(capa.targetDate)} />
        <DetailField label="Created" value={formatDate(capa.createdAt)} />
        <div className="md:col-span-2">
          <DetailField label="Root Cause" value={capa.rootCause} multiline />
        </div>
        <div className="md:col-span-2">
          <DetailField label="Action Plan" value={capa.actionPlan} multiline />
        </div>
        {capa.verificationDetails && (
          <div className="md:col-span-2">
            <DetailField
              label="Verification Details"
              value={capa.verificationDetails}
              multiline
            />
          </div>
        )}
      </div>

      <div
        className="rounded-xl p-5"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <DetailTimeline capa={capa} />
      </div>
    </motion.div>
  );
}

function CapaCard({
  capa,
  index,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  capa: CapaRecord;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: CapaStatus) => void;
}) {
  const overdue = isOverdue(capa);
  const nextStatusMap: Partial<Record<CapaStatus, CapaStatus>> = {
    [CapaStatus.open]: CapaStatus.inProgress,
    [CapaStatus.inProgress]: CapaStatus.closed,
    [CapaStatus.closed]: CapaStatus.verified,
  };
  const actionLabelMap: Partial<Record<CapaStatus, string>> = {
    [CapaStatus.open]: "Start",
    [CapaStatus.inProgress]: "Close",
    [CapaStatus.closed]: "Verify",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -2 }}
      className="rounded-xl p-4 cursor-pointer transition-smooth group"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${overdue ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.08)"}`,
      }}
      onClick={onView}
      data-ocid={`capa.item.${index + 1}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono text-white/40">
              {getCapaId(capa)}
            </span>
            <StatusBadge status={capa.status} />
            {overdue && (
              <span className="flex items-center gap-1 text-xs text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
                Overdue
              </span>
            )}
          </div>
          <h3
            className="font-semibold text-sm text-white truncate mb-1"
            title={capa.title}
          >
            {capa.title}
          </h3>
          <p
            className="text-xs text-white/40 line-clamp-1"
            title={capa.rootCause}
          >
            {capa.rootCause}
          </p>
        </div>
        <div
          className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-smooth"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="presentation"
        >
          {nextStatusMap[capa.status] && (
            <button
              type="button"
              onClick={() => onStatusChange(nextStatusMap[capa.status]!)}
              className="px-2 py-1 rounded text-xs font-medium bg-[#18C37E]/15 text-[#18C37E] border border-[#18C37E]/25 hover:bg-[#18C37E]/25 transition-smooth"
              data-ocid={`capa.status_button.${index + 1}`}
              title={`Move to ${STATUS_CONFIG[nextStatusMap[capa.status]!].label}`}
            >
              {actionLabelMap[capa.status]}
            </button>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="w-7 h-7 rounded flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-smooth"
            data-ocid={`capa.edit_button.${index + 1}`}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="w-7 h-7 rounded flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-smooth"
            data-ocid={`capa.delete_button.${index + 1}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-xs text-white/40">
            <span className="text-white/25">Owner:</span>
            <span className="text-white/60">{capa.owner || "\u2014"}</span>
          </span>
          <span className="flex items-center gap-1 text-xs text-white/40">
            <span className="text-white/25">Dept:</span>
            <span className="text-white/60">{capa.department || "\u2014"}</span>
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <Calendar className="w-3 h-3 text-white/30" />
          <span className={overdue ? "text-red-400" : "text-white/40"}>
            {formatDate(capa.targetDate)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function DeleteConfirm({
  onConfirm,
  onCancel,
  isPending,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="rounded-xl p-6 w-full max-w-sm space-y-4"
        style={{
          background: "rgba(15,20,40,0.98)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
        onClick={(e) => e.stopPropagation()}
        data-ocid="capa.dialog"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(239,68,68,0.15)",
              border: "1px solid rgba(239,68,68,0.3)",
            }}
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-white">
              Delete CAPA
            </h3>
            <p className="text-xs text-white/50">
              This action cannot be undone
            </p>
          </div>
        </div>
        <p className="text-sm text-white/60">
          Are you sure you want to delete this CAPA record?
        </p>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1 border-white/15 text-white/60 hover:bg-white/10"
            onClick={onCancel}
            data-ocid="capa.cancel_button"
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1 bg-red-500/80 hover:bg-red-500 text-white"
            onClick={onConfirm}
            disabled={isPending}
            data-ocid="capa.confirm_button"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Delete"
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function CapaPage() {
  const { data: capas = [], isLoading } = useCapas();
  const deleteCapa = useDeleteCapa();
  const updateStatus = useUpdateCapaStatus();

  const [view, setView] = useState<PageView>("list");
  const [selected, setSelected] = useState<CapaRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDept, setFilterDept] = useState<string>("all");
  const [filterOwner, setFilterOwner] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const total = capas.length;
  const openCount = capas.filter((c) => c.status === CapaStatus.open).length;
  const inProgressCount = capas.filter(
    (c) => c.status === CapaStatus.inProgress,
  ).length;
  const overdueCount = capas.filter(isOverdue).length;

  const filtered = capas.filter((c) => {
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (filterDept !== "all" && c.department !== filterDept) return false;
    if (
      filterOwner &&
      !c.owner.toLowerCase().includes(filterOwner.toLowerCase())
    )
      return false;
    if (
      searchQuery &&
      !c.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !c.rootCause.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  const handleStatusChange = async (id: string, status: CapaStatus) => {
    try {
      await updateStatus.mutateAsync({ id, status });
      toast.success(`CAPA moved to ${STATUS_CONFIG[status].label}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCapa.mutateAsync(deleteTarget);
      toast.success("CAPA deleted");
      setDeleteTarget(null);
      if (selected?.id === deleteTarget) {
        setSelected(null);
        setView("list");
      }
    } catch {
      toast.error("Failed to delete CAPA");
    }
  };

  const buildEditFormData = (c: CapaRecord): FormData => ({
    title: c.title,
    source: "",
    sourceRef: "",
    priority: "Medium",
    department: c.department,
    rootCause: c.rootCause,
    actionPlan: c.actionPlan,
    owner: c.owner,
    targetDate: timestampToDate(c.targetDate),
    verificationRequired: !!c.verificationDetails,
    verificationDetails: c.verificationDetails ?? "",
    reviewDate: "",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 space-y-6 min-h-full"
      data-ocid="capa.page"
    >
      {view === "list" && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                background: "rgba(24,195,126,0.12)",
                border: "1px solid rgba(24,195,126,0.2)",
              }}
            >
              <Shield className="w-5 h-5 text-[#18C37E]" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl text-white">
                CAPA Tracker
              </h1>
              <p className="text-xs text-white/40">
                Corrective and Preventive Actions management
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => {
              setSelected(null);
              setView("create");
            }}
            className="bg-[#18C37E] hover:bg-[#15a86c] text-black font-semibold gap-2"
            data-ocid="capa.create_button"
          >
            <Plus className="w-4 h-4" />
            Create New CAPA
          </Button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {view === "list" && (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Total CAPAs"
                value={total}
                color="#18C37E"
                icon={<Shield className="w-4 h-4" />}
                index={0}
              />
              <StatCard
                label="Open"
                value={openCount}
                color="#ef4444"
                icon={<XCircle className="w-4 h-4" />}
                index={1}
              />
              <StatCard
                label="In Progress"
                value={inProgressCount}
                color="#eab308"
                icon={<Clock className="w-4 h-4" />}
                index={2}
              />
              <StatCard
                label="Overdue"
                value={overdueCount}
                color="#f97316"
                icon={<AlertTriangle className="w-4 h-4" />}
                index={3}
              />
            </div>

            {/* Filters */}
            <div
              className="rounded-xl p-4"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[180px]">
                  <Input
                    placeholder="Search CAPA title or root cause..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/25 h-9 text-sm"
                    data-ocid="capa.search_input"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger
                    className="w-36 bg-white/5 border-white/10 text-white h-9 text-sm"
                    data-ocid="capa.filter_status_select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value={CapaStatus.open}>Open</SelectItem>
                    <SelectItem value={CapaStatus.inProgress}>
                      In Progress
                    </SelectItem>
                    <SelectItem value={CapaStatus.closed}>Closed</SelectItem>
                    <SelectItem value={CapaStatus.verified}>
                      Verified
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterDept} onValueChange={setFilterDept}>
                  <SelectTrigger
                    className="w-40 bg-white/5 border-white/10 text-white h-9 text-sm"
                    data-ocid="capa.filter_dept_select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Filter by owner..."
                  value={filterOwner}
                  onChange={(e) => setFilterOwner(e.target.value)}
                  className="w-40 bg-white/5 border-white/10 text-white placeholder:text-white/25 h-9 text-sm"
                  data-ocid="capa.filter_owner_input"
                />
              </div>
            </div>

            {/* CAPA list */}
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-24 rounded-xl animate-pulse"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl p-12 text-center"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
                data-ocid="capa.empty_state"
              >
                <Shield className="w-10 h-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm font-medium">
                  {capas.length === 0
                    ? "No CAPA records yet"
                    : "No CAPAs match your filters"}
                </p>
                <p className="text-white/25 text-xs mt-1">
                  {capas.length === 0
                    ? "Create your first corrective action to get started"
                    : "Try adjusting your filters"}
                </p>
                {capas.length === 0 && (
                  <Button
                    type="button"
                    onClick={() => {
                      setSelected(null);
                      setView("create");
                    }}
                    className="mt-4 bg-[#18C37E] hover:bg-[#15a86c] text-black font-semibold text-sm"
                    data-ocid="capa.empty_create_button"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Create First CAPA
                  </Button>
                )}
              </motion.div>
            ) : (
              <div className="space-y-3" data-ocid="capa.list">
                {filtered.map((capa, idx) => (
                  <CapaCard
                    key={capa.id}
                    capa={capa}
                    index={idx}
                    onView={() => {
                      setSelected(capa);
                      setView("detail");
                    }}
                    onEdit={() => {
                      setSelected(capa);
                      setView("edit");
                    }}
                    onDelete={() => setDeleteTarget(capa.id)}
                    onStatusChange={(s) => handleStatusChange(capa.id, s)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {view === "create" && (
          <motion.div
            key="create"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="rounded-xl p-6"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <CapaForm
              onCancel={() => {
                setSelected(null);
                setView("list");
              }}
              onSaved={() => {
                setSelected(null);
                setView("list");
              }}
            />
          </motion.div>
        )}

        {view === "edit" && selected && (
          <motion.div
            key="edit"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="rounded-xl p-6"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <CapaForm
              initial={buildEditFormData(selected)}
              capaRecord={selected}
              onCancel={() => setView("detail")}
              onSaved={() => setView("detail")}
            />
          </motion.div>
        )}

        {view === "detail" &&
          selected &&
          (() => {
            const latest = capas.find((c) => c.id === selected.id) ?? selected;
            return (
              <motion.div
                key="detail"
                className="rounded-xl p-6"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <CapaDetail
                  capa={latest}
                  onEdit={() => {
                    setSelected(latest);
                    setView("edit");
                  }}
                  onBack={() => {
                    setSelected(null);
                    setView("list");
                  }}
                />
              </motion.div>
            );
          })()}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirm
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
            isPending={deleteCapa.isPending}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
