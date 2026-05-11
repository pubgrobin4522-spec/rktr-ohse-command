import { ObservationStatus, ObservationType } from "@/backend";
import type { ObservationRecord } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { RKTR_LOCATIONS } from "@/constants/locations";
import {
  useCreateObservation,
  useDeleteObservation,
  useObservations,
  useUpdateObservation,
  useUpdateObservationStatus,
} from "@/hooks/useBackend";
import {
  AlertOctagon,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FlameKindling,
  Info,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  User,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

type PageView = "list" | "create" | "detail";
type TypeFilter = "all" | "unsafeAct" | "unsafeCondition" | "nearMiss";
type StatusFilter = "all" | "open" | "inProgress" | "closed";

interface FormData {
  obsType: ObservationType;
  description: string;
  location: string;
  observedAt: string;
  reportedBy: string;
  severity: string;
  immediateAction: string;
  correctiveActions: string[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const LOCATIONS = RKTR_LOCATIONS;

const TYPE_META = {
  unsafeAct: {
    label: "Unsafe Act",
    color: "#f97316",
    bg: "rgba(249,115,22,0.12)",
    border: "rgba(249,115,22,0.25)",
    icon: FlameKindling,
    description: "Action or behavior that could cause injury",
  },
  unsafeCondition: {
    label: "Unsafe Condition",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.25)",
    icon: AlertOctagon,
    description: "Physical hazard or dangerous environment",
  },
  nearMiss: {
    label: "Near Miss",
    color: "#eab308",
    bg: "rgba(234,179,8,0.12)",
    border: "rgba(234,179,8,0.25)",
    icon: Zap,
    description: "Event that could have resulted in injury",
  },
} as const;

const STATUS_META = {
  open: {
    label: "Open",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.15)",
    border: "rgba(239,68,68,0.3)",
  },
  inProgress: {
    label: "In Progress",
    color: "#eab308",
    bg: "rgba(234,179,8,0.15)",
    border: "rgba(234,179,8,0.3)",
  },
  closed: {
    label: "Closed",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.15)",
    border: "rgba(34,197,94,0.3)",
  },
} as const;

const SEVERITY_OPTIONS = ["Low", "Medium", "High", "Critical"];

const SEVERITY_COLOR: Record<string, { color: string; bg: string }> = {
  Low: { color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  Medium: { color: "#eab308", bg: "rgba(234,179,8,0.15)" },
  High: { color: "#f97316", bg: "rgba(249,115,22,0.15)" },
  Critical: { color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
};

function generateObsId(): string {
  const yr = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 900) + 100);
  return `OBS-${yr}-${seq}`;
}

function tsToDate(ts: bigint): string {
  return new Date(Number(ts) / 1_000_000).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ElementType;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-xl p-4 flex items-center gap-4"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${color}20`, border: `1px solid ${color}40` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-display font-bold text-white">{value}</p>
        <p className="text-xs text-white/50">{label}</p>
      </div>
    </motion.div>
  );
}

function TypeBadge({ type }: { type: ObservationType }) {
  const meta = TYPE_META[type];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        background: meta.bg,
        border: `1px solid ${meta.border}`,
        color: meta.color,
      }}
    >
      {meta.label}
    </span>
  );
}

function StatusBadge({ status }: { status: ObservationStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        background: meta.bg,
        border: `1px solid ${meta.border}`,
        color: meta.color,
      }}
    >
      {meta.label}
    </span>
  );
}

function WorkflowProgress({ status }: { status: ObservationStatus }) {
  const steps: ObservationStatus[] = [
    ObservationStatus.open,
    ObservationStatus.inProgress,
    ObservationStatus.closed,
  ];
  const labels = ["Open", "In Progress", "Closed"];
  const idx = steps.indexOf(status);
  return (
    <div className="flex items-center gap-1 mt-1">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: i <= idx ? "#18C37E" : "rgba(255,255,255,0.2)",
              boxShadow: i === idx ? "0 0 6px #18C37E" : "none",
            }}
          />
          <span
            className="text-xs"
            style={{ color: i <= idx ? "#18C37E" : "rgba(255,255,255,0.3)" }}
          >
            {labels[i]}
          </span>
          {i < steps.length - 1 && (
            <div
              className="w-4 h-px"
              style={{
                background: i < idx ? "#18C37E" : "rgba(255,255,255,0.15)",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({
  id,
  onConfirm,
  onCancel,
  isPending,
}: {
  id: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        className="rounded-2xl p-6 w-full max-w-sm mx-4"
        style={{
          background: "#0d1c2e",
          border: "1px solid rgba(239,68,68,0.3)",
        }}
        data-ocid="observations.dialog"
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{
              background: "rgba(239,68,68,0.15)",
              border: "1px solid rgba(239,68,68,0.3)",
            }}
          >
            <Trash2 className="w-5 h-5 text-red-400" />
          </div>
          <h3 className="font-display font-semibold text-white">
            Delete Observation?
          </h3>
        </div>
        <p className="text-sm text-white/60 mb-5">
          Observation <span className="text-white font-mono">{id}</span> will be
          permanently removed. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            data-ocid="observations.cancel_button"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="flex-1"
            onClick={onConfirm}
            disabled={isPending}
            data-ocid="observations.confirm_button"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Trash2 className="w-4 h-4 mr-1" />
            )}
            Delete
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Observation Card ─────────────────────────────────────────────────────────

function ObsCard({
  obs,
  index,
  onView,
  onEdit,
  onDelete,
  onStatusUpdate,
}: {
  obs: ObservationRecord;
  index: number;
  onView: (o: ObservationRecord) => void;
  onEdit: (o: ObservationRecord) => void;
  onDelete: (id: string) => void;
  onStatusUpdate: (id: string, status: ObservationStatus) => void;
}) {
  const meta = TYPE_META[obs.obsType];
  const Icon = meta.icon;
  const nextStatus =
    obs.status === ObservationStatus.open
      ? ObservationStatus.inProgress
      : obs.status === ObservationStatus.inProgress
        ? ObservationStatus.closed
        : null;
  const nextLabel =
    obs.status === ObservationStatus.open
      ? "Start Investigation"
      : obs.status === ObservationStatus.inProgress
        ? "Close Observation"
        : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      whileHover={{ y: -2 }}
      className="rounded-xl p-4 transition-smooth"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
      data-ocid={`observations.item.${index + 1}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: meta.bg, border: `1px solid ${meta.border}` }}
          >
            <Icon className="w-4 h-4" style={{ color: meta.color }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="font-mono text-xs text-white/50">
                {obs.id.startsWith("OBS-")
                  ? obs.id
                  : `OBS-${new Date().getFullYear()}-${obs.id.slice(-3)}`}
              </span>
              <TypeBadge type={obs.obsType} />
            </div>
            <p className="text-sm text-white font-medium leading-snug line-clamp-2">
              {obs.description}
            </p>
          </div>
        </div>
        <StatusBadge status={obs.status} />
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-white/50 mb-3">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {obs.location}
        </span>
        <span className="flex items-center gap-1">
          <User className="w-3 h-3" />
          {obs.reportedBy}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {tsToDate(obs.createdAt)}
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          {obs.actions.length} action{obs.actions.length !== 1 ? "s" : ""}
        </span>
      </div>

      <WorkflowProgress status={obs.status} />

      <div
        className="flex items-center gap-2 mt-3 pt-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <button
          type="button"
          onClick={() => onView(obs)}
          className="flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors px-2 py-1 rounded"
          style={{ background: "rgba(255,255,255,0.05)" }}
          data-ocid={`observations.view_button.${index + 1}`}
        >
          <Eye className="w-3 h-3" /> View
        </button>
        {obs.status !== ObservationStatus.closed && (
          <button
            type="button"
            onClick={() => onEdit(obs)}
            className="flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors px-2 py-1 rounded"
            style={{ background: "rgba(255,255,255,0.05)" }}
            data-ocid={`observations.edit_button.${index + 1}`}
          >
            <Pencil className="w-3 h-3" /> Edit
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(obs.id)}
          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded"
          style={{ background: "rgba(239,68,68,0.08)" }}
          data-ocid={`observations.delete_button.${index + 1}`}
        >
          <Trash2 className="w-3 h-3" /> Delete
        </button>
        {nextStatus && nextLabel && (
          <button
            type="button"
            onClick={() => onStatusUpdate(obs.id, nextStatus)}
            className="ml-auto flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-lg transition-smooth"
            style={{
              background: "rgba(24,195,126,0.15)",
              border: "1px solid rgba(24,195,126,0.3)",
              color: "#18C37E",
            }}
            data-ocid={`observations.status_button.${index + 1}`}
          >
            <ChevronRight className="w-3 h-3" /> {nextLabel}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Detail View ──────────────────────────────────────────────────────────────

function DetailView({
  obs,
  onBack,
  onStatusUpdate,
  isPending,
}: {
  obs: ObservationRecord;
  onBack: () => void;
  onStatusUpdate: (id: string, status: ObservationStatus) => void;
  isPending: boolean;
}) {
  const meta = TYPE_META[obs.obsType];
  const Icon = meta.icon;
  const nextStatus =
    obs.status === ObservationStatus.open
      ? ObservationStatus.inProgress
      : obs.status === ObservationStatus.inProgress
        ? ObservationStatus.closed
        : null;
  const nextLabel =
    obs.status === ObservationStatus.open
      ? "Start Investigation"
      : obs.status === ObservationStatus.inProgress
        ? "Close Observation"
        : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      data-ocid="observations.detail_panel"
    >
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
          data-ocid="observations.back_button"
        >
          <ChevronLeft className="w-4 h-4" /> Back to list
        </button>
      </div>

      <div
        className="rounded-2xl p-6 mb-4"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: meta.bg,
                border: `1px solid ${meta.border}`,
              }}
            >
              <Icon className="w-6 h-6" style={{ color: meta.color }} />
            </div>
            <div>
              <p className="font-mono text-sm text-white/50 mb-0.5">
                {obs.id.startsWith("OBS-")
                  ? obs.id
                  : `OBS-${new Date().getFullYear()}-${obs.id.slice(-3)}`}
              </p>
              <TypeBadge type={obs.obsType} />
            </div>
          </div>
          <StatusBadge status={obs.status} />
        </div>

        <WorkflowProgress status={obs.status} />

        <div className="mt-5 space-y-4">
          <div>
            <p className="text-xs text-white/40 mb-1">Description</p>
            <p className="text-sm text-white leading-relaxed">
              {obs.description}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-white/40 mb-1">Location</p>
              <p className="text-sm text-white flex items-center gap-1">
                <MapPin className="w-3 h-3 text-white/40" />
                {obs.location}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/40 mb-1">Reported By</p>
              <p className="text-sm text-white flex items-center gap-1">
                <User className="w-3 h-3 text-white/40" />
                {obs.reportedBy}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/40 mb-1">Reported On</p>
              <p className="text-sm text-white">{tsToDate(obs.createdAt)}</p>
            </div>
          </div>

          {obs.actions.length > 0 && (
            <div>
              <p className="text-xs text-white/40 mb-2">
                Actions Taken ({obs.actions.length})
              </p>
              <ul className="space-y-1.5">
                {obs.actions.map((a) => (
                  <li
                    key={`action-${a.substring(0, 20)}`}
                    className="flex items-start gap-2 text-sm text-white/80"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {nextStatus && nextLabel && (
        <button
          type="button"
          onClick={() => onStatusUpdate(obs.id, nextStatus)}
          disabled={isPending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-smooth"
          style={{
            background: "rgba(24,195,126,0.2)",
            border: "1px solid rgba(24,195,126,0.4)",
            color: "#18C37E",
          }}
          data-ocid="observations.status_update_button"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          {nextLabel}
        </button>
      )}
    </motion.div>
  );
}

// ─── Create Form ──────────────────────────────────────────────────────────────

const EMPTY_FORM: FormData = {
  obsType: ObservationType.unsafeAct,
  description: "",
  location: "",
  observedAt: new Date().toISOString().slice(0, 16),
  reportedBy: "Safety Officer",
  severity: "Medium",
  immediateAction: "",
  correctiveActions: [""],
};

function CreateForm({
  onSuccess,
  onCancel,
  initialData,
}: {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: ObservationRecord;
}) {
  const isEdit = !!initialData;
  const [form, setForm] = useState<FormData>(
    initialData
      ? {
          obsType: initialData.obsType,
          description: initialData.description,
          location: initialData.location,
          observedAt: new Date(Number(initialData.createdAt) / 1_000_000)
            .toISOString()
            .slice(0, 16),
          reportedBy: initialData.reportedBy,
          severity: "Medium",
          immediateAction: "",
          correctiveActions:
            initialData.actions.length > 0 ? initialData.actions : [""],
        }
      : EMPTY_FORM,
  );
  const [obsId] = useState(initialData?.id ?? generateObsId);
  const createObs = useCreateObservation();
  const updateObs = useUpdateObservation();

  function setField<K extends keyof FormData>(k: K, v: FormData[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function addAction() {
    setField("correctiveActions", [...form.correctiveActions, ""]);
  }

  function setAction(i: number, val: string) {
    const next = [...form.correctiveActions];
    next[i] = val;
    setField("correctiveActions", next);
  }

  function removeAction(i: number) {
    setField(
      "correctiveActions",
      form.correctiveActions.filter((_, idx) => idx !== i),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim() || !form.location) {
      toast.error("Please fill in all required fields");
      return;
    }
    const now = BigInt(Date.now()) * BigInt(1_000_000);
    const rec: ObservationRecord = {
      id: obsId,
      status: initialData?.status ?? ObservationStatus.open,
      createdAt: initialData?.createdAt ?? now,
      description: form.description.trim(),
      actions: form.correctiveActions.filter((a) => a.trim()),
      reportedBy: form.reportedBy,
      obsType: form.obsType,
      location: form.location,
    };
    try {
      if (isEdit) {
        await updateObs.mutateAsync({ id: obsId, observation: rec });
        toast.success(`Observation ${obsId} updated successfully`);
      } else {
        await createObs.mutateAsync(rec);
        toast.success(`Observation ${obsId} submitted successfully`);
      }
      onSuccess();
    } catch {
      toast.error(
        isEdit
          ? "Failed to update observation. Please try again."
          : "Failed to submit observation. Please try again.",
      );
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      data-ocid="observations.create_panel"
    >
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
          data-ocid="observations.back_to_list_button"
        >
          <ChevronLeft className="w-4 h-4" /> Back to list
        </button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{
            background: "rgba(24,195,126,0.15)",
            border: "1px solid rgba(24,195,126,0.3)",
          }}
        >
          {isEdit ? (
            <Pencil className="w-5 h-5 text-green-400" />
          ) : (
            <Plus className="w-5 h-5 text-green-400" />
          )}
        </div>
        <div>
          <h2 className="font-display font-bold text-xl text-white">
            {isEdit ? "Edit Safety Observation" : "Submit Safety Observation"}
          </h2>
          <p className="text-xs text-white/40">
            {isEdit
              ? "Update the observation details below"
              : "Report unsafe conditions, acts, or near misses"}
          </p>
        </div>
        <div className="ml-auto">
          <span
            className="font-mono text-xs px-3 py-1 rounded-lg"
            style={{
              background: "rgba(24,195,126,0.1)",
              border: "1px solid rgba(24,195,126,0.2)",
              color: "#18C37E",
            }}
          >
            {obsId}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Observation Type */}
        <div>
          <Label className="text-white/60 text-sm mb-3 block">
            Observation Type <span className="text-red-400">*</span>
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(
              Object.entries(TYPE_META) as [
                ObservationType,
                (typeof TYPE_META)[keyof typeof TYPE_META],
              ][]
            ).map(([type, meta]) => {
              const Icon = meta.icon;
              const active = form.obsType === type;
              return (
                <button
                  type="button"
                  key={type}
                  onClick={() => setField("obsType", type)}
                  className="p-4 rounded-xl text-left transition-smooth"
                  style={{
                    background: active ? meta.bg : "rgba(255,255,255,0.03)",
                    border: `1px solid ${
                      active ? meta.border : "rgba(255,255,255,0.08)"
                    }`,
                  }}
                  data-ocid={`observations.type_${type}_button`}
                >
                  <Icon
                    className="w-6 h-6 mb-2"
                    style={{ color: meta.color }}
                  />
                  <p className="font-medium text-sm text-white">{meta.label}</p>
                  <p className="text-xs text-white/50 mt-0.5">
                    {meta.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div>
          <Label
            htmlFor="obs-description"
            className="text-white/60 text-sm mb-1.5 block"
          >
            Description <span className="text-red-400">*</span>
          </Label>
          <Textarea
            id="obs-description"
            placeholder="Describe what you observed in detail..."
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            rows={4}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-green-500/50 resize-none"
            data-ocid="observations.description_input"
          />
        </div>

        {/* Location + DateTime row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label
              htmlFor="obs-location"
              className="text-white/60 text-sm mb-1.5 block"
            >
              Location <span className="text-red-400">*</span>
            </Label>
            <select
              id="obs-location"
              value={form.location}
              onChange={(e) => setField("location", e.target.value)}
              className="w-full rounded-md px-3 py-2 text-sm bg-white/5 border border-white/10 text-white focus:outline-none focus:border-green-500/50 transition-colors"
              data-ocid="observations.location_select"
            >
              <option value="" className="bg-[#081426]">
                Select location...
              </option>
              {LOCATIONS.map((l) => (
                <option key={l} value={l} className="bg-[#081426]">
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label
              htmlFor="obs-datetime"
              className="text-white/60 text-sm mb-1.5 block"
            >
              Date &amp; Time Observed
            </Label>
            <input
              id="obs-datetime"
              type="datetime-local"
              value={form.observedAt}
              onChange={(e) => setField("observedAt", e.target.value)}
              className="w-full rounded-md px-3 py-2 text-sm bg-white/5 border border-white/10 text-white focus:outline-none focus:border-green-500/50 transition-colors [color-scheme:dark]"
              data-ocid="observations.datetime_input"
            />
          </div>
        </div>

        {/* Reporter + Severity row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label
              htmlFor="obs-reporter"
              className="text-white/60 text-sm mb-1.5 block"
            >
              Reported By
            </Label>
            <Input
              id="obs-reporter"
              value={form.reportedBy}
              onChange={(e) => setField("reportedBy", e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              data-ocid="observations.reporter_input"
            />
          </div>
          <div>
            <Label
              htmlFor="obs-severity"
              className="text-white/60 text-sm mb-1.5 block"
            >
              Severity Assessment
            </Label>
            <select
              id="obs-severity"
              value={form.severity}
              onChange={(e) => setField("severity", e.target.value)}
              className="w-full rounded-md px-3 py-2 text-sm bg-white/5 border border-white/10 text-white focus:outline-none focus:border-green-500/50 transition-colors"
              data-ocid="observations.severity_select"
            >
              {SEVERITY_OPTIONS.map((s) => (
                <option key={s} value={s} className="bg-[#081426]">
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Immediate Action */}
        <div>
          <Label
            htmlFor="obs-immediate"
            className="text-white/60 text-sm mb-1.5 block"
          >
            Immediate Action Taken{" "}
            <span className="text-white/30">(optional)</span>
          </Label>
          <Textarea
            id="obs-immediate"
            placeholder="Describe any immediate corrective actions taken..."
            value={form.immediateAction}
            onChange={(e) => setField("immediateAction", e.target.value)}
            rows={2}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-green-500/50 resize-none"
            data-ocid="observations.immediate_action_input"
          />
        </div>

        {/* Corrective Actions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-white/60 text-sm">
              Recommended Corrective Actions
            </Label>
            <button
              type="button"
              onClick={addAction}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-smooth"
              style={{
                background: "rgba(24,195,126,0.12)",
                border: "1px solid rgba(24,195,126,0.25)",
                color: "#18C37E",
              }}
              data-ocid="observations.add_action_button"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          <div className="space-y-2">
            {form.correctiveActions.map((action, i) => (
              <div
                key={`corrective-action-${String(i).padStart(3, "0")}`}
                className="flex gap-2"
              >
                <Input
                  value={action}
                  onChange={(e) => setAction(i, e.target.value)}
                  placeholder={`Action ${i + 1}...`}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 flex-1"
                  data-ocid={`observations.action_input.${i + 1}`}
                />
                {form.correctiveActions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAction(i)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg transition-smooth text-white/40 hover:text-red-400"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                    data-ocid={`observations.remove_action_button.${i + 1}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Photo Upload Zone */}
        <div>
          <Label className="text-white/60 text-sm mb-1.5 block">
            Photo Evidence
          </Label>
          <div
            className="rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-smooth"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "2px dashed rgba(255,255,255,0.12)",
            }}
            data-ocid="observations.upload_button"
          >
            <Camera className="w-8 h-8 text-white/30" />
            <p className="text-sm text-white/50">
              Click to upload photo evidence
            </p>
            <p className="text-xs text-white/30">PNG, JPG up to 10MB</p>
          </div>
        </div>

        {/* Severity visual */}
        {form.severity && (
          <div
            className="flex items-center gap-2 p-3 rounded-lg"
            style={{
              background: SEVERITY_COLOR[form.severity].bg,
              border: `1px solid ${SEVERITY_COLOR[form.severity].color}40`,
            }}
          >
            <Info
              className="w-4 h-4"
              style={{ color: SEVERITY_COLOR[form.severity].color }}
            />
            <p
              className="text-sm"
              style={{ color: SEVERITY_COLOR[form.severity].color }}
            >
              Severity: <strong>{form.severity}</strong> &mdash;{" "}
              {form.severity === "Critical"
                ? "Requires immediate escalation"
                : form.severity === "High"
                  ? "Requires urgent attention"
                  : form.severity === "Medium"
                    ? "Needs timely resolution"
                    : "Monitor and document"}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            data-ocid="observations.cancel_create_button"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={createObs.isPending || updateObs.isPending}
            style={{ background: "#18C37E", color: "#081426" }}
            data-ocid="observations.submit_button"
          >
            {createObs.isPending || updateObs.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : isEdit ? (
              <Pencil className="w-4 h-4 mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            {isEdit ? "Update Observation" : "Submit Observation"}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ObservationsPage() {
  const [view, setView] = useState<PageView>("list");
  const [selected, setSelected] = useState<ObservationRecord | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const { data: observations = [], isLoading } = useObservations();
  const deleteObs = useDeleteObservation();
  const updateStatus = useUpdateObservationStatus();

  const total = observations.length;
  const unsafeActs = observations.filter(
    (o) => o.obsType === ObservationType.unsafeAct,
  ).length;
  const unsafeConds = observations.filter(
    (o) => o.obsType === ObservationType.unsafeCondition,
  ).length;
  const nearMisses = observations.filter(
    (o) => o.obsType === ObservationType.nearMiss,
  ).length;

  const filtered = observations.filter((o) => {
    if (typeFilter !== "all" && o.obsType !== typeFilter) return false;
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (
      search &&
      !o.description.toLowerCase().includes(search.toLowerCase()) &&
      !o.location.toLowerCase().includes(search.toLowerCase()) &&
      !o.reportedBy.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  async function handleDelete(id: string) {
    try {
      await deleteObs.mutateAsync(id);
      toast.success("Observation deleted");
    } catch {
      toast.error("Failed to delete observation");
    } finally {
      setDeleteId(null);
    }
  }

  async function handleStatusUpdate(id: string, status: ObservationStatus) {
    try {
      await updateStatus.mutateAsync({ id, status });
      const statusLabel = STATUS_META[status].label;
      toast.success(`Observation moved to ${statusLabel}`);
      if (selected?.id === id) {
        setSelected((prev) => (prev ? { ...prev, status } : null));
      }
    } catch {
      toast.error("Failed to update status");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 max-w-7xl"
      data-ocid="observations.page"
    >
      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteId && (
          <DeleteModal
            id={deleteId}
            onConfirm={() => handleDelete(deleteId)}
            onCancel={() => setDeleteId(null)}
            isPending={deleteObs.isPending}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {view === "list" && (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{
                    background: "rgba(234,179,8,0.12)",
                    border: "1px solid rgba(234,179,8,0.25)",
                  }}
                >
                  <Eye className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <h1 className="font-display font-bold text-xl text-white">
                    Safety Observations
                  </h1>
                  <p className="text-xs text-white/40">
                    Report and track unsafe acts, conditions &amp; near misses
                  </p>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => setView("create")}
                className="flex items-center gap-2"
                style={{
                  background: "#18C37E",
                  color: "#081426",
                  fontWeight: 600,
                }}
                data-ocid="observations.submit_observation_button"
              >
                <Plus className="w-4 h-4" /> Submit Observation
              </Button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <StatCard
                label="Total Observations"
                value={total}
                color="#18C37E"
                icon={Eye}
              />
              <StatCard
                label="Unsafe Acts"
                value={unsafeActs}
                color="#f97316"
                icon={FlameKindling}
              />
              <StatCard
                label="Unsafe Conditions"
                value={unsafeConds}
                color="#ef4444"
                icon={AlertOctagon}
              />
              <StatCard
                label="Near Misses"
                value={nearMisses}
                color="#eab308"
                icon={Zap}
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="flex gap-1.5 flex-wrap">
                {(
                  [
                    "all",
                    "unsafeAct",
                    "unsafeCondition",
                    "nearMiss",
                  ] as TypeFilter[]
                ).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTypeFilter(t)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-smooth"
                    style={{
                      background:
                        typeFilter === t
                          ? "rgba(24,195,126,0.2)"
                          : "rgba(255,255,255,0.05)",
                      border:
                        typeFilter === t
                          ? "1px solid rgba(24,195,126,0.4)"
                          : "1px solid rgba(255,255,255,0.1)",
                      color:
                        typeFilter === t ? "#18C37E" : "rgba(255,255,255,0.6)",
                    }}
                    data-ocid={`observations.type_filter_${t}`}
                  >
                    {t === "all"
                      ? "All Types"
                      : TYPE_META[t as keyof typeof TYPE_META].label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {(
                  ["all", "open", "inProgress", "closed"] as StatusFilter[]
                ).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-smooth"
                    style={{
                      background:
                        statusFilter === s
                          ? "rgba(24,195,126,0.2)"
                          : "rgba(255,255,255,0.05)",
                      border:
                        statusFilter === s
                          ? "1px solid rgba(24,195,126,0.4)"
                          : "1px solid rgba(255,255,255,0.1)",
                      color:
                        statusFilter === s
                          ? "#18C37E"
                          : "rgba(255,255,255,0.6)",
                    }}
                    data-ocid={`observations.status_filter_${s}`}
                  >
                    {s === "all"
                      ? "All Status"
                      : STATUS_META[s as keyof typeof STATUS_META].label}
                  </button>
                ))}
              </div>
              <div className="relative ml-auto">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search observations..."
                  className="pl-9 pr-4 py-1.5 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-green-500/40 w-56 transition-smooth"
                  data-ocid="observations.search_input"
                />
              </div>
            </div>

            {/* Cards */}
            {isLoading ? (
              <div className="space-y-3" data-ocid="observations.loading_state">
                {Array.from({ length: 3 }).map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: static skeletons
                  <Skeleton key={`skel-${i}`} className="h-36 rounded-xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl p-12 text-center"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
                data-ocid="observations.empty_state"
              >
                <Eye className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/60 font-medium mb-1">
                  No observations found
                </p>
                <p className="text-white/30 text-sm mb-5">
                  {search || typeFilter !== "all" || statusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Submit the first observation to get started"}
                </p>
                <Button
                  type="button"
                  onClick={() => setView("create")}
                  style={{ background: "#18C37E", color: "#081426" }}
                  data-ocid="observations.empty_state_cta_button"
                >
                  <Plus className="w-4 h-4 mr-2" /> Submit Observation
                </Button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {filtered.map((obs, i) => (
                  <ObsCard
                    key={obs.id}
                    obs={obs}
                    index={i}
                    onView={(o) => {
                      setSelected(o);
                      setView("detail");
                    }}
                    onEdit={(o) => {
                      setSelected(o);
                      setView("create");
                    }}
                    onDelete={(id) => setDeleteId(id)}
                    onStatusUpdate={handleStatusUpdate}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {view === "create" && (
          <motion.div
            key="create"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <CreateForm
              onSuccess={() => {
                setSelected(null);
                setView("list");
              }}
              onCancel={() => {
                setSelected(null);
                setView("list");
              }}
              initialData={selected ?? undefined}
            />
          </motion.div>
        )}

        {view === "detail" && selected && (
          <motion.div
            key="detail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <DetailView
              obs={selected}
              onBack={() => setView("list")}
              onStatusUpdate={handleStatusUpdate}
              isPending={updateStatus.isPending}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
