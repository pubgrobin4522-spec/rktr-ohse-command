import { Layers } from "lucide-react";
import { motion } from "motion/react";

const LEVELS = [
  {
    rank: 1,
    label: "Elimination",
    desc: "Remove the hazard entirely from the workplace",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.18)",
    border: "rgba(239,68,68,0.35)",
    widthPct: 38,
  },
  {
    rank: 2,
    label: "Substitution",
    desc: "Replace the hazard with something less dangerous",
    color: "#f97316",
    bg: "rgba(249,115,22,0.18)",
    border: "rgba(249,115,22,0.3)",
    widthPct: 55,
  },
  {
    rank: 3,
    label: "Engineering Controls",
    desc: "Isolate people from hazard via physical modifications",
    color: "#eab308",
    bg: "rgba(234,179,8,0.18)",
    border: "rgba(234,179,8,0.3)",
    widthPct: 70,
  },
  {
    rank: 4,
    label: "Administrative Controls",
    desc: "Change how people work via procedures and training",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.18)",
    border: "rgba(59,130,246,0.3)",
    widthPct: 85,
  },
  {
    rank: 5,
    label: "PPE",
    desc: "Protect workers with personal protective equipment",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.18)",
    border: "rgba(34,197,94,0.3)",
    widthPct: 100,
  },
];

export function ControlHierarchyPyramid() {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
      data-ocid="risk_assessment.pyramid_section"
    >
      <div className="flex items-center gap-2 mb-4">
        <Layers className="w-4 h-4 text-blue-400" />
        <h2 className="font-display font-semibold text-white text-sm">
          Hierarchy of Controls
        </h2>
        <span className="ml-auto text-xs text-white/30">Most effective ↑</span>
      </div>

      <div className="flex flex-col items-center gap-1.5">
        {LEVELS.map((level, i) => (
          <motion.div
            key={level.label}
            initial={{ opacity: 0, scaleX: 0.7 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: i * 0.08, duration: 0.4, ease: "easeOut" }}
            className="flex items-center gap-3 rounded-lg px-4 py-2.5 cursor-default hover:brightness-110 transition-smooth"
            style={{
              width: `${level.widthPct}%`,
              background: level.bg,
              border: `1px solid ${level.border}`,
            }}
            whileHover={{ scale: 1.015 }}
          >
            {/* Rank badge */}
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
              style={{ background: level.color, color: "#081426" }}
            >
              {level.rank}
            </div>
            <div className="min-w-0">
              <p
                className="text-sm font-semibold"
                style={{ color: level.color }}
              >
                {level.label}
              </p>
              <p className="text-xs text-white/40 truncate">{level.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="text-center mt-3">
        <span className="text-xs text-white/25">Least effective ↓</span>
      </div>
    </div>
  );
}
