import type { RiskRecord } from "@/backend";
import { ShieldAlert } from "lucide-react";
import { motion } from "motion/react";

const LIKELIHOOD_LABELS = [
  "Almost Certain",
  "Likely",
  "Possible",
  "Unlikely",
  "Rare",
];
const SEVERITY_LABELS = [
  "Insignificant",
  "Minor",
  "Moderate",
  "Major",
  "Catastrophic",
];

function getCellColor(score: number): {
  bg: string;
  text: string;
  border: string;
} {
  if (score >= 16)
    return {
      bg: "rgba(239,68,68,0.25)",
      text: "#ef4444",
      border: "rgba(239,68,68,0.4)",
    };
  if (score >= 10)
    return {
      bg: "rgba(249,115,22,0.22)",
      text: "#f97316",
      border: "rgba(249,115,22,0.35)",
    };
  if (score >= 5)
    return {
      bg: "rgba(234,179,8,0.22)",
      text: "#eab308",
      border: "rgba(234,179,8,0.35)",
    };
  return {
    bg: "rgba(34,197,94,0.2)",
    text: "#22c55e",
    border: "rgba(34,197,94,0.3)",
  };
}

interface Props {
  risks: (RiskRecord & { score: number })[];
  highlighted: { l: number; s: number } | null;
  onCellClick: (l: number, s: number) => void;
}

export function RiskMatrixGrid({ risks, highlighted, onCellClick }: Props) {
  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
      data-ocid="risk_assessment.matrix_section"
    >
      <div className="flex items-center gap-2 mb-2">
        <ShieldAlert className="w-4 h-4 text-amber-400" />
        <h2 className="font-display font-semibold text-white text-sm">
          Risk Assessment Matrix
        </h2>
      </div>

      {/* Axis labels */}
      <div className="flex gap-2 items-end">
        {/* Y-axis label (vertical) */}
        <div
          className="flex flex-col items-center justify-center"
          style={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            minWidth: 20,
          }}
        >
          <span className="text-white/30 text-xs tracking-widest uppercase">
            Likelihood →
          </span>
        </div>

        <div className="flex-1">
          {/* Matrix rows: likelihood 5 (top) → 1 (bottom) */}
          {[5, 4, 3, 2, 1].map((l, li) => (
            <div key={l} className="flex gap-1 mb-1 items-center">
              {/* Row label */}
              <div className="w-20 flex-shrink-0 text-right">
                <span className="text-white/35 text-xs leading-tight">
                  {LIKELIHOOD_LABELS[li]}
                </span>
              </div>
              {/* Cells */}
              {[1, 2, 3, 4, 5].map((s) => {
                const score = l * s;
                const colors = getCellColor(score);
                const isHighlighted =
                  highlighted?.l === l && highlighted?.s === s;
                const riskCount = risks.filter(
                  (r) => Number(r.likelihood) === l && Number(r.severity) === s,
                ).length;
                return (
                  <motion.button
                    key={s}
                    type="button"
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onCellClick(l, s)}
                    className="flex-1 aspect-square flex flex-col items-center justify-center rounded cursor-pointer transition-smooth relative"
                    style={{
                      background: isHighlighted
                        ? colors.bg.replace("0.2", "0.45")
                        : colors.bg,
                      border: `1px solid ${isHighlighted ? colors.text : colors.border}`,
                      boxShadow: isHighlighted
                        ? `0 0 8px ${colors.text}40`
                        : undefined,
                      minHeight: 48,
                    }}
                    title={`L${l} × S${s} = ${score}`}
                    data-ocid={`risk_assessment.matrix_cell.l${l}_s${s}`}
                  >
                    <span
                      className="text-sm font-bold"
                      style={{ color: colors.text }}
                    >
                      {score}
                    </span>
                    {riskCount > 0 && (
                      <span
                        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: colors.text, color: "#081426" }}
                      >
                        {riskCount}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          ))}

          {/* X-axis labels */}
          <div className="flex gap-1 mt-1">
            <div className="w-20 flex-shrink-0" />
            {SEVERITY_LABELS.map((label) => (
              <div key={label} className="flex-1 text-center">
                <span className="text-white/30 text-xs leading-tight block">
                  {label.split(" ")[0]}
                </span>
              </div>
            ))}
          </div>
          <div className="text-center mt-1">
            <span className="text-white/30 text-xs uppercase tracking-widest">
              ← Severity →
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-2">
        {[
          { label: "Low (1–4)", bg: "rgba(34,197,94,0.2)", text: "#22c55e" },
          {
            label: "Medium (5–9)",
            bg: "rgba(234,179,8,0.22)",
            text: "#eab308",
          },
          {
            label: "High (10–15)",
            bg: "rgba(249,115,22,0.22)",
            text: "#f97316",
          },
          {
            label: "Critical (16–25)",
            bg: "rgba(239,68,68,0.25)",
            text: "#ef4444",
          },
        ].map((zone) => (
          <div key={zone.label} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded"
              style={{
                background: zone.bg,
                border: `1px solid ${zone.text}60`,
              }}
            />
            <span className="text-xs" style={{ color: zone.text }}>
              {zone.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
