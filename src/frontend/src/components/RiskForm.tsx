import type { RiskRecord } from "@/backend";
import { RiskLevel, RiskStatus } from "@/backend";
import { Button } from "@/components/ui/button";
import { RKTR_LOCATIONS } from "@/constants/locations";
import { ChevronDown, Plus, Save, Send, Trash2, X } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";

const LOCATIONS = RKTR_LOCATIONS;

const LIKELIHOOD_LABELS = [
  "1 – Rare",
  "2 – Unlikely",
  "3 – Possible",
  "4 – Likely",
  "5 – Almost Certain",
];
const SEVERITY_LABELS = [
  "1 – Insignificant",
  "2 – Minor",
  "3 – Moderate",
  "4 – Major",
  "5 – Catastrophic",
];

function getRiskLevel(score: number): RiskLevel {
  if (score <= 4) return RiskLevel.low;
  if (score <= 9) return RiskLevel.medium;
  if (score <= 15) return RiskLevel.high;
  return RiskLevel.critical;
}

function getRiskLevelColors(level: RiskLevel) {
  switch (level) {
    case RiskLevel.critical:
      return {
        bg: "rgba(239,68,68,0.15)",
        text: "#ef4444",
        border: "rgba(239,68,68,0.3)",
      };
    case RiskLevel.high:
      return {
        bg: "rgba(249,115,22,0.15)",
        text: "#f97316",
        border: "rgba(249,115,22,0.3)",
      };
    case RiskLevel.medium:
      return {
        bg: "rgba(234,179,8,0.15)",
        text: "#eab308",
        border: "rgba(234,179,8,0.3)",
      };
    default:
      return {
        bg: "rgba(34,197,94,0.15)",
        text: "#22c55e",
        border: "rgba(34,197,94,0.3)",
      };
  }
}

interface Props {
  initial: RiskRecord | null;
  onSave: (risk: RiskRecord) => Promise<void>;
  onSubmit: (risk: RiskRecord) => Promise<void>;
  onClose: () => void;
  isSaving: boolean;
}

function genId() {
  return `RISK-${Date.now().toString(36).toUpperCase()}`;
}

export function RiskForm({
  initial,
  onSave,
  onSubmit,
  onClose,
  isSaving,
}: Props) {
  const [hazard, setHazard] = useState(() => {
    if (!initial?.hazard) return "";
    // Strip the encoded activity suffix when editing
    const sepIdx = initial.hazard.indexOf(" || Activity: ");
    return sepIdx >= 0 ? initial.hazard.slice(0, sepIdx) : initial.hazard;
  });
  const [location, setLocation] = useState(initial?.location ?? LOCATIONS[0]);
  const [activity, setActivity] = useState(() => {
    if (!initial?.hazard) return "";
    const sepIdx = initial.hazard.indexOf(" || Activity: ");
    return sepIdx >= 0
      ? initial.hazard.slice(sepIdx + " || Activity: ".length)
      : "";
  });
  const [likelihood, setLikelihood] = useState(
    Number(initial?.likelihood ?? 3),
  );
  const [severity, setSeverity] = useState(Number(initial?.severity ?? 3));
  const [resLikelihood, setResLikelihood] = useState(
    Number(initial?.residualLikelihood ?? 2),
  );
  const [resSeverity, setResSeverity] = useState(
    Number(initial?.residualSeverity ?? 2),
  );
  const [controls, setControls] = useState<string[]>(initial?.controls ?? [""]);
  const [addlControls, setAddlControls] = useState<string[]>([""]);
  const [createdBy, setCreatedBy] = useState(
    initial?.createdBy ?? "Safety Officer",
  );

  useEffect(() => {
    if (initial) {
      const sepIdx = initial.hazard.indexOf(" || Activity: ");
      setHazard(sepIdx >= 0 ? initial.hazard.slice(0, sepIdx) : initial.hazard);
      setActivity(
        sepIdx >= 0
          ? initial.hazard.slice(sepIdx + " || Activity: ".length)
          : "",
      );
      setLocation(initial.location);
      setLikelihood(Number(initial.likelihood));
      setSeverity(Number(initial.severity));
      setResLikelihood(Number(initial.residualLikelihood));
      setResSeverity(Number(initial.residualSeverity));
      setControls(initial.controls.length ? initial.controls : [""]);
      setCreatedBy(initial.createdBy);
    }
  }, [initial]);

  const score = useMemo(() => likelihood * severity, [likelihood, severity]);
  const riskLevel = useMemo(() => getRiskLevel(score), [score]);
  const resScore = useMemo(
    () => resLikelihood * resSeverity,
    [resLikelihood, resSeverity],
  );
  const resLevel = useMemo(() => getRiskLevel(resScore), [resScore]);
  const levelColors = useMemo(() => getRiskLevelColors(riskLevel), [riskLevel]);
  const resLevelColors = useMemo(
    () => getRiskLevelColors(resLevel),
    [resLevel],
  );

  const buildRecord = useCallback(
    (status: RiskStatus): RiskRecord => ({
      id: initial?.id ?? genId(),
      hazard: activity.trim()
        ? `${hazard}${activity.trim() ? ` || Activity: ${activity.trim()}` : ""}`
        : hazard,
      location,
      likelihood: BigInt(likelihood),
      severity: BigInt(severity),
      residualLikelihood: BigInt(resLikelihood),
      residualSeverity: BigInt(resSeverity),
      controls: controls.filter(Boolean),
      riskLevel,
      status,
      createdBy,
      createdAt: initial?.createdAt ?? BigInt(Date.now()),
    }),
    [
      initial,
      hazard,
      activity,
      location,
      likelihood,
      severity,
      resLikelihood,
      resSeverity,
      controls,
      riskLevel,
      createdBy,
    ],
  );

  const handleSave = async () => {
    await onSave(buildRecord(RiskStatus.draft));
  };
  const handleSubmit = async () => {
    await onSubmit(buildRecord(RiskStatus.submitted));
  };

  const updateControl = (i: number, val: string) =>
    setControls((prev) => prev.map((c, idx) => (idx === i ? val : c)));
  const removeControl = (i: number) =>
    setControls((prev) => prev.filter((_, idx) => idx !== i));
  const addControl = () => setControls((prev) => [...prev, ""]);

  const updateAddl = (i: number, val: string) =>
    setAddlControls((prev) => prev.map((c, idx) => (idx === i ? val : c)));
  const removeAddl = (i: number) =>
    setAddlControls((prev) => prev.filter((_, idx) => idx !== i));
  const addAddlControl = () => setAddlControls((prev) => [...prev, ""]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: "rgba(8,20,38,0.7)" }}
      data-ocid="risk_assessment.dialog"
    >
      <motion.div
        initial={{ x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="w-full max-w-lg h-full overflow-y-auto scrollbar-thin"
        style={{
          background: "#0a1828",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-5 py-4"
          style={{
            background: "#0a1828",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div>
            <h2 className="font-display font-bold text-white text-base">
              {initial ? "Edit Risk" : "New Risk Assessment"}
            </h2>
            <p className="text-xs text-white/40">
              Fill in details and save or submit for approval
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-smooth"
            aria-label="Close form"
            data-ocid="risk_assessment.close_button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Hazard description */}
          <div className="space-y-1.5">
            <label
              htmlFor="hazard"
              className="text-xs text-white/60 uppercase tracking-wider"
            >
              Hazard Description *
            </label>
            <textarea
              id="hazard"
              rows={3}
              placeholder="Describe the hazard or unsafe condition…"
              value={hazard}
              onChange={(e) => setHazard(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm text-white/85 placeholder-white/20 resize-none transition-smooth"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                outline: "none",
              }}
              data-ocid="risk_assessment.textarea"
            />
          </div>

          {/* Location + Activity row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="location"
                className="text-xs text-white/60 uppercase tracking-wider"
              >
                Location
              </label>
              <div className="relative">
                <select
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-white/85 appearance-none transition-smooth"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    outline: "none",
                  }}
                  data-ocid="risk_assessment.select"
                >
                  {LOCATIONS.map((loc) => (
                    <option
                      key={loc}
                      value={loc}
                      style={{ background: "#0a1828" }}
                    >
                      {loc}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="activity"
                className="text-xs text-white/60 uppercase tracking-wider"
              >
                Activity / Task
              </label>
              <input
                id="activity"
                type="text"
                placeholder="e.g. Crane lift operation"
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-sm text-white/85 placeholder-white/20 transition-smooth"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  outline: "none",
                }}
                data-ocid="risk_assessment.input"
              />
            </div>
          </div>

          {/* Initial risk scoring */}
          <div
            className="rounded-lg p-4 space-y-4"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p className="text-xs text-white/60 uppercase tracking-wider font-semibold">
              Initial Risk Score
            </p>

            <ScoreSelector
              id="likelihood"
              label="Likelihood"
              value={likelihood}
              onChange={setLikelihood}
              labels={LIKELIHOOD_LABELS}
            />
            <ScoreSelector
              id="severity"
              label="Severity"
              value={severity}
              onChange={setSeverity}
              labels={SEVERITY_LABELS}
            />

            {/* Computed score */}
            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs text-white/50">Risk Score:</span>
              <span
                className="px-3 py-1 rounded-lg text-sm font-bold"
                style={{
                  background: levelColors.bg,
                  color: levelColors.text,
                  border: `1px solid ${levelColors.border}`,
                }}
              >
                {score}
              </span>
              <span
                className="px-2.5 py-1 rounded text-xs font-semibold capitalize"
                style={{
                  background: levelColors.bg,
                  color: levelColors.text,
                  border: `1px solid ${levelColors.border}`,
                }}
              >
                {riskLevel}
              </span>
            </div>
          </div>

          {/* Existing controls */}
          <DynamicList
            id="controls"
            label="Existing Controls"
            items={controls}
            onChange={updateControl}
            onRemove={removeControl}
            onAdd={addControl}
            placeholder="e.g. Safety guards installed"
          />

          {/* Additional controls proposed */}
          <DynamicList
            id="addlControls"
            label="Additional Controls Proposed"
            items={addlControls}
            onChange={updateAddl}
            onRemove={removeAddl}
            onAdd={addAddlControl}
            placeholder="e.g. Implement LOTO procedure"
          />

          {/* Residual risk */}
          <div
            className="rounded-lg p-4 space-y-4"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p className="text-xs text-white/60 uppercase tracking-wider font-semibold">
              Residual Risk (after controls)
            </p>

            <ScoreSelector
              id="resLikelihood"
              label="Residual Likelihood"
              value={resLikelihood}
              onChange={setResLikelihood}
              labels={LIKELIHOOD_LABELS}
            />
            <ScoreSelector
              id="resSeverity"
              label="Residual Severity"
              value={resSeverity}
              onChange={setResSeverity}
              labels={SEVERITY_LABELS}
            />

            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs text-white/50">Residual Score:</span>
              <span
                className="px-3 py-1 rounded-lg text-sm font-bold"
                style={{
                  background: resLevelColors.bg,
                  color: resLevelColors.text,
                  border: `1px solid ${resLevelColors.border}`,
                }}
              >
                {resScore}
              </span>
              <span
                className="px-2.5 py-1 rounded text-xs font-semibold capitalize"
                style={{
                  background: resLevelColors.bg,
                  color: resLevelColors.text,
                  border: `1px solid ${resLevelColors.border}`,
                }}
              >
                {resLevel}
              </span>
            </div>
          </div>

          {/* Created by */}
          <div className="space-y-1.5">
            <label
              htmlFor="createdBy"
              className="text-xs text-white/60 uppercase tracking-wider"
            >
              Assessed By
            </label>
            <input
              id="createdBy"
              type="text"
              value={createdBy}
              onChange={(e) => setCreatedBy(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm text-white/85 placeholder-white/20 transition-smooth"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                outline: "none",
              }}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 pb-6">
            <Button
              type="button"
              variant="ghost"
              className="flex-1 gap-2 border border-white/10 text-sm"
              onClick={handleSave}
              disabled={!hazard || isSaving}
              data-ocid="risk_assessment.save_button"
            >
              <Save className="w-3.5 h-3.5" />
              Save Draft
            </Button>
            <Button
              type="button"
              className="flex-1 gap-2 text-sm font-semibold"
              style={{ background: "#18C37E", color: "#081426" }}
              onClick={handleSubmit}
              disabled={!hazard || isSaving}
              data-ocid="risk_assessment.submit_button"
            >
              <Send className="w-3.5 h-3.5" />
              {isSaving ? "Saving…" : "Submit"}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                       */
/* ------------------------------------------------------------------ */

interface ScoreSelectorProps {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  labels: string[];
}

function ScoreSelector({
  id,
  label,
  value,
  onChange,
  labels,
}: ScoreSelectorProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-xs text-white/55">
        {label}: <strong className="text-white/80">{labels[value - 1]}</strong>
      </label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="flex-1 h-9 rounded text-sm font-bold transition-smooth"
            style={{
              background: value === n ? "#18C37E" : "rgba(255,255,255,0.06)",
              color: value === n ? "#081426" : "rgba(255,255,255,0.45)",
              border:
                value === n
                  ? "1px solid #18C37E"
                  : "1px solid rgba(255,255,255,0.08)",
            }}
            aria-label={`${label} ${labels[n - 1]}`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

interface DynamicListProps {
  id: string;
  label: string;
  items: string[];
  onChange: (i: number, val: string) => void;
  onRemove: (i: number) => void;
  onAdd: () => void;
  placeholder: string;
}

function DynamicList({
  id,
  label,
  items,
  onChange,
  onRemove,
  onAdd,
  placeholder,
}: DynamicListProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor={`${id}-0`}
          className="text-xs text-white/60 uppercase tracking-wider"
        >
          {label}
        </label>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-smooth"
        >
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: dynamic list without stable IDs
          <div key={`${id}-${i}`} className="flex gap-2">
            <input
              id={i === 0 ? `${id}-0` : undefined}
              type="text"
              value={item}
              placeholder={placeholder}
              onChange={(e) => onChange(i, e.target.value)}
              className="flex-1 rounded-lg px-3 py-2 text-sm text-white/85 placeholder-white/20 transition-smooth"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                outline: "none",
              }}
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="w-8 h-8 flex items-center justify-center rounded text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-smooth"
                aria-label="Remove item"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
