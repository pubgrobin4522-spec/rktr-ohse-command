import { Input } from "@/components/ui/input";
import { ClipboardList, Filter } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

type AuditAction =
  | "Created"
  | "Updated"
  | "Deleted"
  | "Login"
  | "Logout"
  | "Approved"
  | "Rejected";

interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: AuditAction;
  module: string;
  recordId: string;
  ip: string;
}

const ACTION_COLORS: Record<AuditAction, string> = {
  Created: "bg-[#18C37E]/20 text-[#18C37E]",
  Updated: "bg-blue-500/20 text-blue-300",
  Deleted: "bg-red-500/20 text-red-300",
  Login: "bg-yellow-500/20 text-yellow-300",
  Logout: "bg-zinc-500/20 text-zinc-400",
  Approved: "bg-green-500/20 text-green-300",
  Rejected: "bg-orange-500/20 text-orange-300",
};

const MOCK_AUDIT: AuditEntry[] = [
  {
    id: "a1",
    timestamp: "2026-05-10 08:42:11",
    user: "admin@rktrwheels.com",
    action: "Login",
    module: "Auth",
    recordId: "—",
    ip: "10.0.1.12",
  },
  {
    id: "a2",
    timestamp: "2026-05-10 08:47:03",
    user: "rajesh@rktrwheels.com",
    action: "Created",
    module: "Incidents",
    recordId: "INC-0047",
    ip: "10.0.1.34",
  },
  {
    id: "a3",
    timestamp: "2026-05-10 09:01:55",
    user: "sunil@rktrwheels.com",
    action: "Approved",
    module: "Permits",
    recordId: "PTW-0012",
    ip: "10.0.1.18",
  },
  {
    id: "a4",
    timestamp: "2026-05-10 09:14:30",
    user: "priya@rktrwheels.com",
    action: "Updated",
    module: "CAPA",
    recordId: "CAPA-008",
    ip: "10.0.2.05",
  },
  {
    id: "a5",
    timestamp: "2026-05-10 09:32:44",
    user: "admin@rktrwheels.com",
    action: "Created",
    module: "Users",
    recordId: "USR-0023",
    ip: "10.0.1.12",
  },
  {
    id: "a6",
    timestamp: "2026-05-10 09:48:22",
    user: "amit@rktrwheels.com",
    action: "Created",
    module: "Observations",
    recordId: "OBS-0031",
    ip: "10.0.3.77",
  },
  {
    id: "a7",
    timestamp: "2026-05-10 10:05:17",
    user: "rajesh@rktrwheels.com",
    action: "Updated",
    module: "Incidents",
    recordId: "INC-0045",
    ip: "10.0.1.34",
  },
  {
    id: "a8",
    timestamp: "2026-05-10 10:22:38",
    user: "sunil@rktrwheels.com",
    action: "Rejected",
    module: "Permits",
    recordId: "PTW-0014",
    ip: "10.0.1.18",
  },
  {
    id: "a9",
    timestamp: "2026-05-10 10:41:09",
    user: "priya@rktrwheels.com",
    action: "Deleted",
    module: "Risks",
    recordId: "RSK-0006",
    ip: "10.0.2.05",
  },
  {
    id: "a10",
    timestamp: "2026-05-10 11:00:00",
    user: "admin@rktrwheels.com",
    action: "Logout",
    module: "Auth",
    recordId: "—",
    ip: "10.0.1.12",
  },
];

const ALL_MODULES = [
  "All Modules",
  ...Array.from(new Set(MOCK_AUDIT.map((a) => a.module))),
];
const ALL_ACTIONS: ("All Actions" | AuditAction)[] = [
  "All Actions",
  "Created",
  "Updated",
  "Deleted",
  "Login",
  "Logout",
  "Approved",
  "Rejected",
];

export default function AdminAuditLogTab() {
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("All Modules");
  const [actionFilter, setActionFilter] = useState<"All Actions" | AuditAction>(
    "All Actions",
  );

  const filtered = MOCK_AUDIT.filter((entry) => {
    const matchSearch =
      entry.user.toLowerCase().includes(search.toLowerCase()) ||
      entry.recordId.toLowerCase().includes(search.toLowerCase());
    const matchModule =
      moduleFilter === "All Modules" || entry.module === moduleFilter;
    const matchAction =
      actionFilter === "All Actions" || entry.action === actionFilter;
    return matchSearch && matchModule && matchAction;
  });

  return (
    <div className="space-y-5" data-ocid="admin.auditlog.section">
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground mb-1">
          System Audit Log
        </h2>
        <p className="text-sm text-muted-foreground">
          Tracks all user actions across the system for security and compliance.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-ocid="admin.auditlog.search_input"
            placeholder="Search user, record..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-52 bg-white/5 border-white/10"
          />
        </div>
        <select
          data-ocid="admin.auditlog.module_filter"
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-foreground"
        >
          {ALL_MODULES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          data-ocid="admin.auditlog.action_filter"
          value={actionFilter}
          onChange={(e) =>
            setActionFilter(e.target.value as "All Actions" | AuditAction)
          }
          className="px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-foreground"
        >
          {ALL_ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass rounded-xl overflow-hidden"
        style={{ background: "rgba(8,20,38,0.5)" }}
      >
        {filtered.length === 0 ? (
          <div
            className="text-center py-16"
            data-ocid="admin.auditlog.empty_state"
          >
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground">
              No audit entries match your filters
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {[
                    "Timestamp",
                    "User",
                    "Action",
                    "Module",
                    "Record ID",
                    "IP Address",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, i) => (
                  <motion.tr
                    key={entry.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-white/5 hover:bg-white/5 transition-smooth"
                    data-ocid={`admin.auditlog.item.${i + 1}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {entry.timestamp}
                    </td>
                    <td className="px-4 py-3 text-foreground text-xs whitespace-nowrap">
                      {entry.user}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${
                          ACTION_COLORS[entry.action]
                        }`}
                      >
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {entry.module}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {entry.recordId}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {entry.ip}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
