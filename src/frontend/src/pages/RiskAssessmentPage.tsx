import type { RiskRecord } from "@/backend";
import { RiskLevel, RiskStatus } from "@/backend";
import { ControlHierarchyPyramid } from "@/components/ControlHierarchyPyramid";
import { RiskForm } from "@/components/RiskForm";
import { RiskMatrixGrid } from "@/components/RiskMatrixGrid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCreateRisk,
  useDeleteRisk,
  useRisks,
  useUpdateRiskStatus,
} from "@/hooks/useBackend";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Flame,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

type SortedRisk = RiskRecord & { score: number };

export function getRiskColors(level: RiskLevel | string) {
  switch (level) {
    case RiskLevel.critical:
      return {
        bg: "rgba(239,68,68,0.15)",
        border: "rgba(239,68,68,0.3)",
        text: "#ef4444",
        badge: "bg-red-500/20 text-red-400 border-red-500/30",
      };
    case RiskLevel.high:
      return {
        bg: "rgba(249,115,22,0.15)",
        border: "rgba(249,115,22,0.3)",
        text: "#f97316",
        badge: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      };
    case RiskLevel.medium:
      return {
        bg: "rgba(234,179,8,0.15)",
        border: "rgba(234,179,8,0.3)",
        text: "#eab308",
        badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      };
    default:
      return {
        bg: "rgba(34,197,94,0.15)",
        border: "rgba(34,197,94,0.3)",
        text: "#22c55e",
        badge: "bg-green-500/20 text-green-400 border-green-500/30",
      };
  }
}

function StatusBadge({ status }: { status: RiskStatus }) {
  const styles: Record<RiskStatus, string> = {
    [RiskStatus.draft]: "bg-white/10 text-white/60 border-white/15",
    [RiskStatus.submitted]: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    [RiskStatus.approved]: "bg-green-500/20 text-green-400 border-green-500/30",
  };
  const labels: Record<RiskStatus, string> = {
    [RiskStatus.draft]: "Draft",
    [RiskStatus.submitted]: "Review Pending",
    [RiskStatus.approved]: "Approved",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

const WORKFLOW_STEPS = [
  { key: RiskStatus.draft, label: "Draft" },
  { key: RiskStatus.submitted, label: "Review Pending" },
  { key: RiskStatus.approved, label: "Approved" },
];

function WorkflowStepper({ current }: { current: RiskStatus }) {
  const idx = WORKFLOW_STEPS.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center gap-1 mt-2">
      {WORKFLOW_STEPS.map((step, i) => (
        <div key={step.key} className="flex items-center gap-1">
          <div
            className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
            style={{
              background: i <= idx ? "#18C37E" : "rgba(255,255,255,0.1)",
              color: i <= idx ? "#081426" : "rgba(255,255,255,0.4)",
            }}
          >
            {i < idx ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
          </div>
          <span
            className={`text-xs ${i <= idx ? "text-white/80" : "text-white/30"}`}
          >
            {step.label}
          </span>
          {i < WORKFLOW_STEPS.length - 1 && (
            <ChevronRight className="w-3 h-3 text-white/20" />
          )}
        </div>
      ))}
    </div>
  );
}

const SYSTEM_ADMIN_EMAIL = "sumesh.j@rktrwheels.com";

export default function RiskAssessmentPage() {
  const { data: risks = [], isLoading } = useRisks();
  const createRisk = useCreateRisk();
  const deleteRisk = useDeleteRisk();
  const updateStatus = useUpdateRiskStatus();
  const { user } = useAuth();

  // Only Safety Officers and the system admin may approve risk assessments
  const canApprove =
    user?.role === "safetyOfficer" ||
    user?.email?.toLowerCase() === SYSTEM_ADMIN_EMAIL;

  const [showForm, setShowForm] = useState(false);
  const [editRisk, setEditRisk] = useState<RiskRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [highlightedCell, setHighlightedCell] = useState<{
    l: number;
    s: number;
  } | null>(null);

  const enriched = useMemo(
    (): SortedRisk[] =>
      risks.map((r) => ({
        ...r,
        score: Number(r.likelihood) * Number(r.severity),
      })),
    [risks],
  );

  const stats = useMemo(
    () => ({
      total: enriched.length,
      critical: enriched.filter((r) => r.riskLevel === RiskLevel.critical)
        .length,
      high: enriched.filter((r) => r.riskLevel === RiskLevel.high).length,
      medium: enriched.filter((r) => r.riskLevel === RiskLevel.medium).length,
      low: enriched.filter(
        (r) =>
          r.riskLevel === RiskLevel.low || r.riskLevel === RiskLevel.veryLow,
      ).length,
    }),
    [enriched],
  );

  const handleSave = useCallback(
    async (risk: RiskRecord) => {
      try {
        await createRisk.mutateAsync(risk);
        toast.success("Risk assessment saved as draft");
        setShowForm(false);
        setEditRisk(null);
      } catch {
        toast.error("Failed to save risk assessment");
      }
    },
    [createRisk],
  );

  const handleSubmit = useCallback(
    async (risk: RiskRecord) => {
      try {
        const saved = await createRisk.mutateAsync({
          ...risk,
          status: RiskStatus.submitted,
        });
        void saved;
        toast.success(
          "Risk submitted for review — Safety Officer notified by email",
        );
        setShowForm(false);
        setEditRisk(null);
      } catch {
        toast.error("Failed to submit risk assessment");
      }
    },
    [createRisk],
  );

  const handlePromote = useCallback(
    (id: string, current: RiskStatus) => {
      const next =
        current === RiskStatus.draft
          ? RiskStatus.submitted
          : RiskStatus.approved;
      updateStatus.mutate(
        { id, status: next },
        {
          // Toast is handled by useUpdateRiskStatus onSuccess in useBackend.ts
          onError: () => toast.error("Failed to update risk status"),
        },
      );
    },
    [updateStatus],
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteRisk.mutate(id, {
        onSuccess: () => toast.success("Risk record deleted"),
        onError: () => toast.error("Failed to delete risk record"),
      });
      setConfirmDelete(null);
    },
    [deleteRisk],
  );

  const filteredRisks = useMemo(() => {
    if (!highlightedCell) return enriched;
    return enriched.filter(
      (r) =>
        Number(r.likelihood) === highlightedCell.l &&
        Number(r.severity) === highlightedCell.s,
    );
  }, [enriched, highlightedCell]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 space-y-6"
      data-ocid="risk_assessment.page"
    >
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{
              background: "rgba(245,158,11,0.12)",
              border: "1px solid rgba(245,158,11,0.2)",
            }}
          >
            <ShieldAlert className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-white">
              Risk Assessment
            </h1>
            <p className="text-xs text-white/40">
              Hazard identification, risk matrix and control measures
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setEditRisk(null);
            setShowForm(true);
          }}
          className="gap-2 text-sm"
          style={{ background: "#18C37E", color: "#081426" }}
          data-ocid="risk_assessment.add_risk_button"
        >
          <Plus className="w-4 h-4" />
          Add New Risk
        </Button>
      </div>

      {/* Top row: Matrix + Pyramid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RiskMatrixGrid
          risks={enriched}
          highlighted={highlightedCell}
          onCellClick={(l, s) =>
            setHighlightedCell((prev) =>
              prev?.l === l && prev?.s === s ? null : { l, s },
            )
          }
        />
        <ControlHierarchyPyramid />
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total Risks", value: stats.total, color: "text-white" },
          { label: "Critical", value: stats.critical, color: "text-red-400" },
          { label: "High", value: stats.high, color: "text-orange-400" },
          { label: "Medium", value: stats.medium, color: "text-yellow-400" },
          { label: "Low", value: stats.low, color: "text-green-400" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-lg p-3 text-center"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
            data-ocid={`risk_assessment.stat_${stat.label.toLowerCase().replace(" ", "_")}`}
          >
            <div className={`text-2xl font-display font-bold ${stat.color}`}>
              {stat.value}
            </div>
            <div className="text-xs text-white/40 mt-0.5">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Risk Register */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
        data-ocid="risk_assessment.register_section"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-amber-400" />
            <h2 className="font-display font-semibold text-white text-sm">
              Risk Register
              {highlightedCell && (
                <span className="ml-2 text-xs text-white/40">
                  — filtered: L{highlightedCell.l} × S{highlightedCell.s}
                </span>
              )}
            </h2>
          </div>
          {highlightedCell && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-white/40 hover:text-white"
              onClick={() => setHighlightedCell(null)}
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Clear filter
            </Button>
          )}
        </div>

        {isLoading ? (
          <div
            className="p-8 space-y-3"
            data-ocid="risk_assessment.loading_state"
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 rounded animate-pulse"
                style={{ background: "rgba(255,255,255,0.05)" }}
              />
            ))}
          </div>
        ) : filteredRisks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-12 text-center"
            data-ocid="risk_assessment.empty_state"
          >
            <Flame className="w-10 h-10 text-white/15 mx-auto mb-3" />
            <p className="text-white/40 text-sm">
              No risks found. Click "Add New Risk" to get started.
            </p>
          </motion.div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm" data-ocid="risk_assessment.table">
              <thead>
                <tr className="border-b border-white/5 text-white/40 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Hazard</th>
                  <th className="text-left px-3 py-3">Location</th>
                  <th className="text-center px-3 py-3">L</th>
                  <th className="text-center px-3 py-3">S</th>
                  <th className="text-center px-3 py-3">Score</th>
                  <th className="text-left px-3 py-3">Level</th>
                  <th className="text-left px-3 py-3">Controls</th>
                  <th className="text-left px-3 py-3">Status</th>
                  <th className="text-left px-3 py-3">Workflow</th>
                  <th className="text-right px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredRisks.map((risk, idx) => {
                    const colors = getRiskColors(risk.riskLevel);
                    return (
                      <motion.tr
                        key={risk.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ delay: idx * 0.03 }}
                        className="border-b border-white/5 hover:bg-white/[0.02] transition-smooth"
                        data-ocid={`risk_assessment.item.${idx + 1}`}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <AlertTriangle
                              className="w-3.5 h-3.5 flex-shrink-0"
                              style={{ color: colors.text }}
                            />
                            <div className="min-w-0">
                              {(() => {
                                const sepIdx =
                                  risk.hazard.indexOf(" || Activity: ");
                                const hazardText =
                                  sepIdx >= 0
                                    ? risk.hazard.slice(0, sepIdx)
                                    : risk.hazard;
                                const activityText =
                                  sepIdx >= 0
                                    ? risk.hazard.slice(
                                        sepIdx + " || Activity: ".length,
                                      )
                                    : null;
                                return (
                                  <>
                                    <span
                                      className="text-white/85 font-medium truncate max-w-[180px] block"
                                      title={hazardText}
                                    >
                                      {hazardText}
                                    </span>
                                    {activityText && (
                                      <span
                                        className="text-white/40 text-xs truncate max-w-[180px] block"
                                        title={activityText}
                                      >
                                        {activityText}
                                      </span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-white/55 text-xs">
                            {risk.location}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-white/70">
                            {String(risk.likelihood)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-white/70">
                            {String(risk.severity)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold"
                            style={{
                              background: colors.bg,
                              color: colors.text,
                              border: `1px solid ${colors.border}`,
                            }}
                          >
                            {risk.score}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs border capitalize ${colors.badge}`}
                          >
                            {risk.riskLevel}
                          </span>
                        </td>
                        <td className="px-3 py-3 max-w-[160px]">
                          <span
                            className="text-white/50 text-xs truncate block"
                            title={risk.controls.join("; ")}
                          >
                            {risk.controls.slice(0, 2).join("; ")}
                            {risk.controls.length > 2 ? " …" : ""}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge status={risk.status} />
                        </td>
                        <td className="px-3 py-3">
                          <WorkflowStepper current={risk.status} />
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {risk.status === RiskStatus.draft && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7 px-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                onClick={() =>
                                  handlePromote(risk.id, risk.status)
                                }
                                data-ocid={`risk_assessment.promote_button.${idx + 1}`}
                              >
                                Submit
                              </Button>
                            )}
                            {risk.status === RiskStatus.submitted &&
                              canApprove && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs h-7 px-2 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                                  onClick={() =>
                                    handlePromote(risk.id, risk.status)
                                  }
                                  data-ocid={`risk_assessment.approve_button.${idx + 1}`}
                                >
                                  Approve
                                </Button>
                              )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7 px-2 text-white/40 hover:text-white hover:bg-white/10"
                              onClick={() => {
                                setEditRisk(risk);
                                setShowForm(true);
                              }}
                              data-ocid={`risk_assessment.edit_button.${idx + 1}`}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-400/50 hover:text-red-400 hover:bg-red-500/10"
                              onClick={() => setConfirmDelete(risk.id)}
                              data-ocid={`risk_assessment.delete_button.${idx + 1}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form panel */}
      <AnimatePresence>
        {showForm && (
          <RiskForm
            initial={editRisk}
            onSave={handleSave}
            onSubmit={handleSubmit}
            onClose={() => {
              setShowForm(false);
              setEditRisk(null);
            }}
            isSaving={createRisk.isPending}
          />
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(8,20,38,0.85)" }}
            data-ocid="risk_assessment.dialog"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="rounded-xl p-6 w-80 space-y-4"
              style={{
                background: "#0d1f36",
                border: "1px solid rgba(239,68,68,0.3)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(239,68,68,0.12)" }}
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">
                    Delete Risk?
                  </p>
                  <p className="text-white/40 text-xs">
                    This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1 text-sm border border-white/10"
                  onClick={() => setConfirmDelete(null)}
                  data-ocid="risk_assessment.cancel_button"
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 text-sm bg-red-500 hover:bg-red-600 text-white"
                  onClick={() => handleDelete(confirmDelete)}
                  disabled={deleteRisk.isPending}
                  data-ocid="risk_assessment.confirm_button"
                >
                  {deleteRisk.isPending ? "Deleting…" : "Delete"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
