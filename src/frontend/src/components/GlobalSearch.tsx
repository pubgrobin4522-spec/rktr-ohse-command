import {
  useCapas,
  useIncidents,
  useInspections,
  useObservations,
  usePermits,
  useRisks,
  useTrainingRecords,
  useUsers,
} from "@/hooks/useBackend";
import {
  AlertTriangle,
  BookOpen,
  CheckSquare,
  ClipboardList,
  Eye,
  FileText,
  Loader2,
  Search,
  Shield,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

interface SearchResult {
  id: string;
  category: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  path: string;
  accent?: string;
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark
        style={{
          background: "rgba(24,195,126,0.25)",
          color: "#18C37E",
          borderRadius: "2px",
          padding: "0 1px",
        }}
      >
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearch({ open, onClose }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setDebouncedQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const { data: incidents = [], isLoading: loadingIncidents } = useIncidents();
  const { data: permits = [], isLoading: loadingPermits } = usePermits();
  const { data: users = [], isLoading: loadingUsers } = useUsers();
  const { data: capas = [], isLoading: loadingCapas } = useCapas();
  const { data: observations = [], isLoading: loadingObs } = useObservations();
  const { data: inspections = [], isLoading: loadingInspections } =
    useInspections();
  const { data: trainings = [], isLoading: loadingTraining } =
    useTrainingRecords();
  const { data: risks = [], isLoading: loadingRisks } = useRisks();

  const isLoading =
    loadingIncidents ||
    loadingPermits ||
    loadingUsers ||
    loadingCapas ||
    loadingObs ||
    loadingInspections ||
    loadingTraining ||
    loadingRisks;

  const results: SearchResult[] = useMemo(() => {
    const q = debouncedQuery.toLowerCase().trim();
    if (!q) return [];
    const matches: SearchResult[] = [];

    for (const inc of incidents) {
      if (
        inc.title?.toLowerCase().includes(q) ||
        inc.ticketNumber?.toLowerCase().includes(q) ||
        inc.location?.toLowerCase().includes(q) ||
        inc.description?.toLowerCase().includes(q)
      ) {
        matches.push({
          id: inc.id,
          category: "Incidents",
          icon: <AlertTriangle className="w-4 h-4" />,
          label: inc.title || inc.ticketNumber,
          description: `${inc.ticketNumber} · ${inc.location} · ${inc.severity}`,
          path: "/incidents",
          accent: "#f97316",
        });
      }
    }

    for (const p of permits) {
      if (
        p.jobDescription?.toLowerCase().includes(q) ||
        p.permitNumber?.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q) ||
        p.permitType?.toLowerCase().includes(q)
      ) {
        matches.push({
          id: p.id,
          category: "Permits",
          icon: <FileText className="w-4 h-4" />,
          label: p.jobDescription || p.permitNumber,
          description: `${p.permitNumber} · ${p.location} · ${p.permitType}`,
          path: "/permits",
          accent: "#3b82f6",
        });
      }
    }

    for (const u of users) {
      if (
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q)
      ) {
        matches.push({
          id: u.id,
          category: "Users",
          icon: <Users className="w-4 h-4" />,
          label: u.name,
          description: `${u.email} · ${u.department} · ${u.role}`,
          path: "/admin",
          accent: "#8b5cf6",
        });
      }
    }

    for (const c of capas) {
      if (
        c.title?.toLowerCase().includes(q) ||
        c.department?.toLowerCase().includes(q) ||
        c.owner?.toLowerCase().includes(q)
      ) {
        matches.push({
          id: c.id,
          category: "CAPA",
          icon: <CheckSquare className="w-4 h-4" />,
          label: c.title,
          description: `${c.department} · Owner: ${c.owner} · ${c.status}`,
          path: "/capa",
          accent: "#eab308",
        });
      }
    }

    for (const o of observations) {
      if (
        o.description?.toLowerCase().includes(q) ||
        o.location?.toLowerCase().includes(q) ||
        o.reportedBy?.toLowerCase().includes(q)
      ) {
        matches.push({
          id: o.id,
          category: "Observations",
          icon: <Eye className="w-4 h-4" />,
          label:
            o.description.slice(0, 60) + (o.description.length > 60 ? "…" : ""),
          description: `${o.location} · ${o.obsType} · ${o.status}`,
          path: "/observations",
          accent: "#06b6d4",
        });
      }
    }

    for (const ins of inspections) {
      if (
        ins.title?.toLowerCase().includes(q) ||
        ins.area?.toLowerCase().includes(q) ||
        ins.inspector?.toLowerCase().includes(q)
      ) {
        matches.push({
          id: ins.id,
          category: "Inspections",
          icon: <ClipboardList className="w-4 h-4" />,
          label: ins.title,
          description: `${ins.area} · Inspector: ${ins.inspector} · ${ins.status}`,
          path: "/inspections",
          accent: "#10b981",
        });
      }
    }

    for (const t of trainings) {
      if (
        t.course?.toLowerCase().includes(q) ||
        t.employeeName?.toLowerCase().includes(q) ||
        t.employeeId?.toLowerCase().includes(q)
      ) {
        matches.push({
          id: t.id,
          category: "Training",
          icon: <BookOpen className="w-4 h-4" />,
          label: t.course,
          description: `Employee: ${t.employeeName} · ${t.status}`,
          path: "/training",
          accent: "#f59e0b",
        });
      }
    }

    for (const r of risks) {
      if (
        r.hazard?.toLowerCase().includes(q) ||
        r.location?.toLowerCase().includes(q) ||
        r.createdBy?.toLowerCase().includes(q)
      ) {
        matches.push({
          id: r.id,
          category: "Risk Assessments",
          icon: <Shield className="w-4 h-4" />,
          label: r.hazard,
          description: `${r.location} · Level: ${r.riskLevel} · ${r.status}`,
          path: "/risk-assessment",
          accent: "#ef4444",
        });
      }
    }

    return matches.slice(0, 40);
  }, [
    debouncedQuery,
    incidents,
    permits,
    users,
    capas,
    observations,
    inspections,
    trainings,
    risks,
  ]);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    for (const r of results) {
      if (!map.has(r.category)) map.set(r.category, []);
      map.get(r.category)!.push(r);
    }
    return map;
  }, [results]);

  const flatResults = useMemo(() => results, [results]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, flatResults.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && flatResults[selectedIdx]) {
        navigate(flatResults[selectedIdx].path);
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, flatResults, selectedIdx, navigate, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(
      `[data-idx="${selectedIdx}"]`,
    ) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path);
      onClose();
    },
    [navigate, onClose],
  );

  let globalIdx = 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100]"
            style={{
              background: "rgba(4,8,16,0.8)",
              backdropFilter: "blur(4px)",
            }}
            onClick={onClose}
            data-ocid="global_search.backdrop"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed top-[10vh] left-1/2 -translate-x-1/2 z-[101] w-full max-w-2xl px-4"
            data-ocid="global_search.dialog"
          >
            <div
              className="rounded-2xl overflow-hidden shadow-2xl"
              style={{
                background: "rgba(8,20,38,0.97)",
                border: "1px solid rgba(24,195,126,0.2)",
                backdropFilter: "blur(20px)",
                boxShadow:
                  "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(24,195,126,0.08)",
              }}
            >
              {/* Search Input Row */}
              <div
                className="flex items-center gap-3 px-4 py-3.5"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                {isLoading ? (
                  <Loader2
                    className="w-5 h-5 flex-shrink-0 animate-spin"
                    style={{ color: "#18C37E" }}
                  />
                ) : (
                  <Search
                    className="w-5 h-5 flex-shrink-0"
                    style={{ color: "#18C37E" }}
                  />
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIdx(0);
                  }}
                  placeholder="Search incidents, permits, users, risks…"
                  className="flex-1 bg-transparent outline-none text-base placeholder:text-white/30"
                  style={{ color: "rgba(255,255,255,0.9)" }}
                  data-ocid="global_search.search_input"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={onClose}
                  data-ocid="global_search.close_button"
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                  aria-label="Close search"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Results */}
              <div
                ref={listRef}
                className="overflow-y-auto"
                style={{ maxHeight: "60vh" }}
                data-ocid="global_search.results_list"
              >
                {/* Empty: no query */}
                {!debouncedQuery.trim() && (
                  <div
                    className="px-4 py-10 text-center"
                    data-ocid="global_search.empty_state"
                  >
                    <Search
                      className="w-10 h-10 mx-auto mb-3"
                      style={{ color: "rgba(255,255,255,0.1)" }}
                    />
                    <p
                      className="text-sm"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      Type to search across incidents, permits, users, and more
                    </p>
                    <div className="flex items-center justify-center gap-4 mt-4">
                      {["Incidents", "Permits", "Users", "CAPA", "Risks"].map(
                        (cat) => (
                          <span
                            key={cat}
                            className="text-xs px-2 py-1 rounded-md"
                            style={{
                              background: "rgba(255,255,255,0.04)",
                              color: "rgba(255,255,255,0.3)",
                              border: "1px solid rgba(255,255,255,0.06)",
                            }}
                          >
                            {cat}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* No results */}
                {debouncedQuery.trim() &&
                  results.length === 0 &&
                  !isLoading && (
                    <div
                      className="px-4 py-10 text-center"
                      data-ocid="global_search.empty_state"
                    >
                      <Search
                        className="w-10 h-10 mx-auto mb-3"
                        style={{ color: "rgba(255,255,255,0.1)" }}
                      />
                      <p
                        className="text-sm font-medium"
                        style={{ color: "rgba(255,255,255,0.5)" }}
                      >
                        No results for &ldquo;{debouncedQuery}&rdquo;
                      </p>
                      <p
                        className="text-xs mt-1"
                        style={{ color: "rgba(255,255,255,0.25)" }}
                      >
                        Try a different keyword or check the spelling
                      </p>
                    </div>
                  )}

                {/* Grouped results */}
                {Array.from(grouped.entries()).map(([category, items]) => (
                  <div key={category}>
                    <div
                      className="px-4 py-2 text-xs font-semibold uppercase tracking-wider"
                      style={{
                        color: "rgba(255,255,255,0.3)",
                        background: "rgba(255,255,255,0.02)",
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      {category}
                      <span
                        className="ml-2 px-1.5 py-0.5 rounded text-xs font-normal"
                        style={{
                          background: "rgba(24,195,126,0.12)",
                          color: "#18C37E",
                        }}
                      >
                        {items.length}
                      </span>
                    </div>
                    {items.map((item) => {
                      const myIdx = globalIdx++;
                      const isSelected = selectedIdx === myIdx;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          data-idx={myIdx}
                          data-ocid={`global_search.result.item.${myIdx + 1}`}
                          onClick={() => handleNavigate(item.path)}
                          onMouseEnter={() => setSelectedIdx(myIdx)}
                          className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors"
                          style={{
                            background: isSelected
                              ? "rgba(24,195,126,0.07)"
                              : "transparent",
                            borderBottom: "1px solid rgba(255,255,255,0.03)",
                          }}
                        >
                          <span
                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{
                              background: `${item.accent ?? "#18C37E"}18`,
                              color: item.accent ?? "#18C37E",
                              border: `1px solid ${item.accent ?? "#18C37E"}30`,
                            }}
                          >
                            {item.icon}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span
                              className="block text-sm font-medium truncate"
                              style={{ color: "rgba(255,255,255,0.85)" }}
                            >
                              {highlight(item.label, debouncedQuery)}
                            </span>
                            <span
                              className="block text-xs mt-0.5 truncate"
                              style={{ color: "rgba(255,255,255,0.35)" }}
                            >
                              {highlight(item.description, debouncedQuery)}
                            </span>
                          </span>
                          {isSelected && (
                            <span
                              className="self-center text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                              style={{
                                background: "rgba(24,195,126,0.12)",
                                color: "#18C37E",
                                border: "1px solid rgba(24,195,126,0.2)",
                              }}
                            >
                              ↵
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Footer hints */}
              {results.length > 0 && (
                <div
                  className="flex items-center gap-4 px-4 py-2.5 text-xs"
                  style={{
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                    color: "rgba(255,255,255,0.25)",
                  }}
                >
                  <span className="flex items-center gap-1">
                    <kbd
                      className="px-1 py-0.5 rounded text-xs"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.35)",
                      }}
                    >
                      ↑↓
                    </kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd
                      className="px-1 py-0.5 rounded text-xs"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.35)",
                      }}
                    >
                      ↵
                    </kbd>
                    Open
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd
                      className="px-1 py-0.5 rounded text-xs"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.35)",
                      }}
                    >
                      Esc
                    </kbd>
                    Close
                  </span>
                  <span
                    className="ml-auto"
                    style={{ color: "rgba(24,195,126,0.5)" }}
                  >
                    {results.length} result{results.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
