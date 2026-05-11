import { IncidentFormPanel } from "@/components/IncidentFormPanel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteIncident, useIncidents } from "@/hooks/useBackend";
import type { IncidentRecord } from "@/types";
import { STATUS_COLORS } from "@/types";
import {
  AlertTriangle,
  ChevronDown,
  Eye,
  FileWarning,
  Filter,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  low: "bg-green-500/20 text-green-400 border border-green-500/30",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  underReview: "Under Review",
  approved: "Approved",
  closed: "Closed",
  rejected: "Rejected",
  escalated: "Escalated",
  overdue: "Overdue",
};

function StatCard({
  label,
  value,
  color,
}: { label: string; value: number; color: string }) {
  return (
    <div
      className="rounded-lg px-4 py-3 flex flex-col gap-1 min-w-[110px]"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <span className="text-xs text-white/40 font-body">{label}</span>
      <span className={`text-xl font-display font-bold ${color}`}>{value}</span>
    </div>
  );
}

export default function IncidentsPage() {
  const { data: incidents = [], isLoading } = useIncidents();
  const deleteIncident = useDeleteIncident();

  const [view, setView] = useState<"list" | "create" | "detail" | "edit">(
    "list",
  );
  const [selectedIncident, setSelectedIncident] =
    useState<IncidentRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IncidentRecord | null>(null);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterDept, setFilterDept] = useState("all");

  const filtered = useMemo(() => {
    return incidents.filter((inc) => {
      const matchSearch =
        !search ||
        inc.title.toLowerCase().includes(search.toLowerCase()) ||
        inc.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
        inc.location.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || inc.status === filterStatus;
      const matchSeverity =
        filterSeverity === "all" || inc.severity === filterSeverity;
      const matchDept = filterDept === "all" || inc.department === filterDept;
      return matchSearch && matchStatus && matchSeverity && matchDept;
    });
  }, [incidents, search, filterStatus, filterSeverity, filterDept]);

  const stats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    ).getTime();
    return {
      total: incidents.length,
      open: incidents.filter(
        (i) =>
          i.status === "submitted" ||
          i.status === "underReview" ||
          i.status === "escalated",
      ).length,
      underReview: incidents.filter((i) => i.status === "underReview").length,
      closedMonth: incidents.filter(
        (i) =>
          i.status === "closed" &&
          Number(i.updatedAt) / 1_000_000 >= startOfMonth,
      ).length,
    };
  }, [incidents]);

  const departments = useMemo(() => {
    const depts = new Set(incidents.map((i) => i.department).filter(Boolean));
    return Array.from(depts);
  }, [incidents]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteIncident.mutateAsync(deleteTarget.id);
      toast.success(`Incident ${deleteTarget.ticketNumber} deleted`);
    } catch {
      toast.error("Failed to delete incident");
    } finally {
      setDeleteTarget(null);
    }
  };

  const openDetail = (inc: IncidentRecord) => {
    setSelectedIncident(inc);
    setView("detail");
  };

  const openEdit = (inc: IncidentRecord) => {
    setSelectedIncident(inc);
    setView("edit");
  };

  const handleFormClose = () => {
    setSelectedIncident(null);
    setView("list");
  };

  const formatDate = (ts: bigint) => {
    const ms = Number(ts) / 1_000_000;
    if (!ms) return "—";
    return new Date(ms).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="relative min-h-full" data-ocid="incidents.page">
      <AnimatePresence mode="wait">
        {view === "list" && (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="p-6 space-y-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "rgba(239,68,68,0.12)",
                    border: "1px solid rgba(239,68,68,0.25)",
                  }}
                >
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h1 className="font-display font-bold text-xl text-white">
                    Incident Reporting
                  </h1>
                  <p className="text-xs text-white/40">
                    Report, track and investigate workplace incidents
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  setSelectedIncident(null);
                  setView("create");
                }}
                className="gap-2 font-semibold"
                style={{ background: "#18C37E", color: "#081426" }}
                data-ocid="incidents.create_button"
              >
                <Plus className="w-4 h-4" />
                Report New Incident
              </Button>
            </div>

            {/* Stats */}
            <div className="flex gap-3 flex-wrap">
              <StatCard
                label="Total Incidents"
                value={stats.total}
                color="text-white"
              />
              <StatCard
                label="Open"
                value={stats.open}
                color="text-orange-400"
              />
              <StatCard
                label="Under Review"
                value={stats.underReview}
                color="text-yellow-400"
              />
              <StatCard
                label="Closed This Month"
                value={stats.closedMonth}
                color="text-[#18C37E]"
              />
            </div>

            {/* Filters */}
            <div
              className="rounded-xl p-4 flex flex-wrap gap-3 items-center"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  id="incidents-search"
                  placeholder="Search by ticket, title, location…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-9"
                  data-ocid="incidents.search_input"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-white/30 self-center" />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger
                    className="w-[140px] h-9 bg-white/5 border-white/10 text-white/70 text-xs"
                    data-ocid="incidents.filter.status"
                  >
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {Object.keys(STATUS_LABEL).map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filterSeverity}
                  onValueChange={setFilterSeverity}
                >
                  <SelectTrigger
                    className="w-[130px] h-9 bg-white/5 border-white/10 text-white/70 text-xs"
                    data-ocid="incidents.filter.severity"
                  >
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterDept} onValueChange={setFilterDept}>
                  <SelectTrigger
                    className="w-[140px] h-9 bg-white/5 border-white/10 text-white/70 text-xs"
                    data-ocid="incidents.filter.department"
                  >
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Incident Table */}
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {isLoading ? (
                <div
                  className="p-4 space-y-3"
                  data-ocid="incidents.loading_state"
                >
                  {["r1", "r2", "r3", "r4", "r5"].map((k) => (
                    <Skeleton key={k} className="h-12 w-full bg-white/5" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div
                  className="py-16 flex flex-col items-center gap-4"
                  data-ocid="incidents.empty_state"
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <FileWarning className="w-7 h-7 text-white/20" />
                  </div>
                  <p className="text-white/40 text-sm font-body">
                    No incidents found
                  </p>
                  <p className="text-white/20 text-xs">
                    Report a new incident to get started
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1 border-white/10 text-white/60 hover:text-white"
                    onClick={() => {
                      setSelectedIncident(null);
                      setView("create");
                    }}
                    data-ocid="incidents.empty_state.create_button"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Report Incident
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-sm">
                    <thead>
                      <tr
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        {[
                          "Ticket #",
                          "Title",
                          "Location",
                          "Severity",
                          "Status",
                          "Reported By",
                          "Date",
                          "Actions",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((inc, i) => (
                        <motion.tr
                          key={inc.id}
                          data-ocid={`incidents.item.${i + 1}`}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="cursor-pointer transition-smooth hover:bg-white/5 group"
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                          }}
                          onClick={() => openDetail(inc)}
                        >
                          <td className="px-4 py-3 font-mono text-xs text-[#18C37E] whitespace-nowrap">
                            {inc.ticketNumber}
                          </td>
                          <td className="px-4 py-3 text-white/80 max-w-[200px]">
                            <span
                              className="truncate block font-medium"
                              title={inc.title}
                            >
                              {inc.title}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white/50 whitespace-nowrap text-xs">
                            {inc.location}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${SEVERITY_COLORS[inc.severity] ?? "text-white/50"}`}
                            >
                              {inc.severity}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                                STATUS_COLORS[inc.status] ?? "text-white/50"
                              }`}
                            >
                              {STATUS_LABEL[inc.status] ?? inc.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white/50 text-xs whitespace-nowrap">
                            {inc.reportedBy}
                          </td>
                          <td className="px-4 py-3 text-white/40 text-xs whitespace-nowrap">
                            {formatDate(inc.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <div
                              aria-label="Row actions"
                              className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-smooth"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                aria-label="View incident"
                                className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white transition-smooth"
                                onClick={() => openDetail(inc)}
                                data-ocid={`incidents.view_button.${i + 1}`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                aria-label="Edit incident"
                                className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-[#18C37E] transition-smooth"
                                onClick={() => openEdit(inc)}
                                data-ocid={`incidents.edit_button.${i + 1}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                aria-label="Delete incident"
                                className="p-1.5 rounded hover:bg-red-500/10 text-white/50 hover:text-red-400 transition-smooth"
                                onClick={() => setDeleteTarget(inc)}
                                data-ocid={`incidents.delete_button.${i + 1}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {(view === "create" || view === "edit" || view === "detail") && (
          <IncidentFormPanel
            key="form"
            mode={view as "create" | "edit" | "detail"}
            incident={selectedIncident}
            onClose={handleFormClose}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent
          style={{
            background: "rgba(8,20,38,0.97)",
            border: "1px solid rgba(239,68,68,0.2)",
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Delete Incident?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              This will permanently delete{" "}
              <span className="text-red-400 font-mono">
                {deleteTarget?.ticketNumber}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
              data-ocid="incidents.delete_dialog.cancel_button"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={handleDelete}
              data-ocid="incidents.delete_dialog.confirm_button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
