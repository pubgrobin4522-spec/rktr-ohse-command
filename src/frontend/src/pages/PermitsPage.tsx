import type { PermitRecord } from "@/backend";
import type { PermitStatus } from "@/backend";
import PermitDetailView from "@/components/PermitDetailView";
import PermitForm from "@/components/PermitForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCreatePermit,
  useDeletePermit,
  useGetPermit,
  usePermits,
  useUpdatePermitStatus,
} from "@/hooks/useBackend";
import { STATUS_COLORS } from "@/types";
import {
  AlertTriangle,
  Check,
  Clock,
  Container,
  Eye,
  FileCheck,
  Flame,
  MapPin,
  MoveUp,
  Plus,
  Printer,
  Shovel,
  Timer,
  Trash2,
  Truck,
  User,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

const PERMIT_TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; description: string }
> = {
  hotWork: {
    label: "Hot Work",
    icon: <Flame className="w-4 h-4" />,
    color: "#f97316",
    description: "Welding, cutting, grinding",
  },
  electrical: {
    label: "Electrical",
    icon: <Zap className="w-4 h-4" />,
    color: "#eab308",
    description: "HV/LV electrical work",
  },
  excavation: {
    label: "Excavation",
    icon: <Shovel className="w-4 h-4" />,
    color: "#8b5cf6",
    description: "Digging, trenching",
  },
  heightWork: {
    label: "Height Work",
    icon: <MoveUp className="w-4 h-4" />,
    color: "#3b82f6",
    description: "Work at elevation",
  },
  confinedSpace: {
    label: "Confined Space",
    icon: <Container className="w-4 h-4" />,
    color: "#ef4444",
    description: "Enclosed area entry",
  },
  lineBreaking: {
    label: "Line Breaking",
    icon: <Wrench className="w-4 h-4" />,
    color: "#06b6d4",
    description: "Pipeline, process lines",
  },
  liftingPermit: {
    label: "Lifting Permit",
    icon: <Truck className="w-4 h-4" />,
    color: "#a855f7",
    description: "Crane/hoist lifts over 8 tonnes",
  },
  generalWorkPermit: {
    label: "General Work Permit",
    icon: <Wrench className="w-4 h-4" />,
    color: "#64748b",
    description: "General maintenance and work activities",
  },
};

const PERMIT_TYPE_TABS = [
  "all",
  "hotWork",
  "electrical",
  "excavation",
  "heightWork",
  "confinedSpace",
  "lineBreaking",
  "liftingPermit",
  "generalWorkPermit",
] as const;
const STATUS_TABS = [
  "all",
  "draft",
  "submitted",
  "underReview",
  "validated",
  "approved",
  "active",
  "closed",
  "expired",
  "rejected",
] as const;

function CountdownTimer({ endTime }: { endTime: bigint }) {
  const [remaining, setRemaining] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const update = () => {
      const end = Number(endTime) / 1_000_000;
      const now = Date.now();
      const diff = end - now;
      if (diff <= 0) {
        setRemaining("Expired");
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setIsUrgent(diff < 3_600_000);
      setRemaining(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")} remaining`,
      );
    };
    update();
    const id = setInterval(update, 1_000);
    return () => clearInterval(id);
  }, [endTime]);

  return (
    <span
      className={`flex items-center gap-1 text-xs font-mono ${isUrgent ? "text-red-400" : "text-orange-400"}`}
    >
      <Timer className="w-3 h-3" />
      {remaining}
    </span>
  );
}

function PermitCard({
  permit,
  onView,
  onDelete,
}: {
  permit: PermitRecord;
  onView: (p: PermitRecord) => void;
  onDelete: (id: string) => void;
}) {
  const [delConfirm, setDelConfirm] = useState(false);
  const typeConf =
    PERMIT_TYPE_CONFIG[permit.permitType] ?? PERMIT_TYPE_CONFIG.hotWork;
  const statusKey = permit.status as string;
  const startDate = new Date(Number(permit.startTime) / 1_000_000);
  const endDate = new Date(Number(permit.endTime) / 1_000_000);

  const fmt = (d: Date) =>
    d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
      data-ocid={`permits.card.${permit.id}`}
    >
      <div className="h-1" style={{ background: typeConf.color }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: `${typeConf.color}22`,
                color: typeConf.color,
              }}
            >
              {typeConf.icon}
            </div>
            <div className="min-w-0">
              <p className="font-mono text-xs text-white/50 leading-none mb-0.5">
                {permit.permitNumber}
              </p>
              <p className="text-sm font-semibold text-white leading-tight truncate">
                {typeConf.label}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={`text-xs shrink-0 border ${STATUS_COLORS[statusKey] ?? "bg-muted text-muted-foreground"}`}
          >
            {statusKey === "underReview"
              ? "Under Review"
              : statusKey === "validated"
                ? "Validated"
                : statusKey.charAt(0).toUpperCase() + statusKey.slice(1)}
          </Badge>
        </div>

        <p className="text-sm text-white/70 line-clamp-2 mb-3 leading-relaxed">
          {permit.jobDescription}
        </p>

        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-1.5 text-xs text-white/50">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{permit.location}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/50">
            <User className="w-3 h-3 shrink-0" />
            <span className="truncate">{permit.requestedBy}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/50">
            <Clock className="w-3 h-3 shrink-0" />
            <span>
              {fmt(startDate)} → {fmt(endDate)}
            </span>
          </div>
        </div>

        {permit.status === "active" && (
          <div
            className="mb-3 px-2.5 py-1.5 rounded-lg"
            style={{
              background: "rgba(249,115,22,0.1)",
              border: "1px solid rgba(249,115,22,0.2)",
            }}
          >
            <CountdownTimer endTime={permit.endTime} />
          </div>
        )}

        <div
          className="flex items-center gap-2 pt-2 border-t"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="flex-1 h-7 text-xs text-white/60 hover:text-white"
            onClick={() => onView(permit)}
            data-ocid={`permits.view_button.${permit.id}`}
          >
            <Eye className="w-3 h-3 mr-1" />
            View
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-white/40 hover:text-white/60"
            onClick={() => alert("Print feature coming soon")}
            data-ocid={`permits.print_button.${permit.id}`}
          >
            <Printer className="w-3 h-3" />
          </Button>
          {!delConfirm ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-red-400/60 hover:text-red-400"
              onClick={() => setDelConfirm(true)}
              data-ocid={`permits.delete_button.${permit.id}`}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          ) : (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-red-400 hover:bg-red-400/10"
                onClick={() => {
                  onDelete(permit.id);
                  setDelConfirm(false);
                }}
                data-ocid={`permits.confirm_button.${permit.id}`}
              >
                <Check className="w-3 h-3" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-white/50"
                onClick={() => setDelConfirm(false)}
                data-ocid={`permits.cancel_button.${permit.id}`}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function PermitsPage() {
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [selectedPermit, setSelectedPermit] = useState<PermitRecord | null>(
    null,
  );
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: permits = [], isLoading } = usePermits();
  const createPermit = useCreatePermit();
  const updateStatus = useUpdatePermitStatus();
  const deletePermit = useDeletePermit();

  // Handle ?scan=<permitId> from QR code
  const scanParam = searchParams.get("scan");
  const { data: scannedPermit, isLoading: isScanLoading } =
    useGetPermit(scanParam);

  useEffect(() => {
    if (scanParam && !isScanLoading) {
      if (scannedPermit) {
        setSelectedPermit(scannedPermit);
        setView("detail");
        // Remove the query param after handling so the URL stays clean
        setSearchParams({}, { replace: true });
      }
    }
  }, [scanParam, scannedPermit, isScanLoading, setSearchParams]);

  const filtered = permits.filter((p) => {
    const typeOk = typeFilter === "all" || p.permitType === typeFilter;
    const statusOk = statusFilter === "all" || p.status === statusFilter;
    return typeOk && statusOk;
  });

  const stats = {
    total: permits.length,
    active: permits.filter((p) => p.status === "active").length,
    pending: permits.filter(
      (p) =>
        p.status === "submitted" ||
        p.status === "underReview" ||
        p.status === "validated",
    ).length,
    expired: permits.filter((p) => p.status === "expired").length,
  };

  const handleDelete = useCallback(
    (id: string) => deletePermit.mutate(id),
    [deletePermit],
  );

  const { user } = useAuth();

  const PERMIT_EMAIL_TOASTS: Partial<Record<PermitStatus, string>> = {
    submitted:
      "Permit submitted — email sent to Safety Officer and EHS Manager",
    underReview: "Permit under review — validation in progress",
    validated: "Permit validated — email sent to supervisor",
    approved: "Permit approved — email notification sent to permit raiser",
    rejected: "Permit rejected — email notification sent",
    active: "Permit is now active",
    closed: "Permit closed",
    expired: "Permit expired",
  };

  const handleStatusChange = useCallback(
    (id: string, status: PermitStatus) =>
      updateStatus.mutate(
        {
          id,
          status,
          callerId: user?.id ?? "",
          callerRole: user?.role ?? "",
        },
        {
          onSuccess: () => {
            const msg = PERMIT_EMAIL_TOASTS[status];
            if (msg) toast.success(msg);
          },
          onError: () => toast.error("Failed to update permit status"),
        },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateStatus, user],
  );

  const handleCreate = useCallback(
    (permit: PermitRecord) => {
      createPermit.mutate(permit, {
        onSuccess: () => {
          setView("list");
          // toast is shown by useCreatePermit's onSuccess in useBackend.ts
        },
        onError: () => toast.error("Failed to create permit"),
      });
    },
    [createPermit],
  );

  if (view === "create") {
    return (
      <PermitForm
        onBack={() => setView("list")}
        onSubmit={handleCreate}
        isPending={createPermit.isPending}
      />
    );
  }

  if (view === "detail" && selectedPermit) {
    return (
      <PermitDetailView
        permit={selectedPermit}
        onBack={() => {
          setView("list");
          setSelectedPermit(null);
        }}
        onStatusChange={handleStatusChange}
        isUpdating={updateStatus.isPending}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6"
      data-ocid="permits.page"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{
              background: "rgba(24,195,126,0.12)",
              border: "1px solid rgba(24,195,126,0.2)",
            }}
          >
            <FileCheck className="w-5 h-5" style={{ color: "#18C37E" }} />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-white">
              Permit To Work
            </h1>
            <p className="text-xs text-white/40">
              Manage hot work, electrical, confined space and other permits
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={() => setView("create")}
          className="gap-2 font-semibold"
          style={{ background: "#18C37E", color: "#081426" }}
          data-ocid="permits.create_button"
        >
          <Plus className="w-4 h-4" />
          Create New Permit
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Permits", value: stats.total, color: "#64748b" },
          { label: "Active", value: stats.active, color: "#18C37E" },
          { label: "Pending Approval", value: stats.pending, color: "#3b82f6" },
          { label: "Expired Today", value: stats.expired, color: "#ef4444" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl p-4"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <p className="text-xs text-white/40 mb-1">{s.label}</p>
            <p
              className="text-2xl font-display font-bold"
              style={{ color: s.color }}
            >
              {s.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Type filter tabs */}
      <div className="flex flex-wrap gap-2 mb-3">
        {PERMIT_TYPE_TABS.map((tab) => {
          const conf = tab === "all" ? null : PERMIT_TYPE_CONFIG[tab];
          const isActive = typeFilter === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setTypeFilter(tab)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-smooth"
              style={{
                background: isActive
                  ? "rgba(24,195,126,0.15)"
                  : "rgba(255,255,255,0.04)",
                border: `1px solid ${isActive ? "rgba(24,195,126,0.4)" : "rgba(255,255,255,0.08)"}`,
                color: isActive ? "#18C37E" : "rgba(255,255,255,0.5)",
              }}
              data-ocid={`permits.type_filter.${tab}`}
            >
              {conf && <span style={{ color: conf.color }}>{conf.icon}</span>}
              {conf ? conf.label : "All Types"}
            </button>
          );
        })}
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_TABS.map((tab) => {
          const isActive = statusFilter === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className="px-3 py-1 rounded-md text-xs font-medium transition-smooth"
              style={{
                background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
                border: `1px solid ${isActive ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)"}`,
                color: isActive
                  ? "rgba(255,255,255,0.9)"
                  : "rgba(255,255,255,0.4)",
              }}
              data-ocid={`permits.status_filter.${tab}`}
            >
              {tab === "underReview"
                ? "Under Review"
                : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          );
        })}
      </div>

      {/* Permit Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton, no stable id available
              key={`skeleton-${i}`}
              className="rounded-xl h-52 animate-pulse"
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
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
          data-ocid="permits.empty_state"
        >
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-white/20" />
          <p className="text-white/40 text-sm">
            No permits match your current filters
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-4"
            style={{ background: "#18C37E", color: "#081426" }}
            onClick={() => setView("create")}
          >
            Create First Permit
          </Button>
        </motion.div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          <AnimatePresence>
            {filtered.map((permit) => (
              <PermitCard
                key={permit.id}
                permit={permit}
                onView={(p) => {
                  setSelectedPermit(p);
                  setView("detail");
                }}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}
