import { Check, Lock, X } from "lucide-react";
import { motion } from "motion/react";

const PERMISSIONS = [
  "View Dashboard",
  "Create Incident Report",
  "Approve Permits",
  "Manage Users",
  "Access Analytics",
  "Admin Panel",
  "Delete Records",
  "Assign CAPA",
  "Close Investigations",
  "Configure System",
  "View Audit Logs",
  "Contractor Management",
];

const ROLES = [
  { key: "employee", label: "Employee", color: "bg-zinc-500/20 text-zinc-300" },
  {
    key: "supervisor",
    label: "Supervisor",
    color: "bg-yellow-500/20 text-yellow-300",
  },
  {
    key: "areaInCharge",
    label: "Area In-Charge",
    color: "bg-cyan-500/20 text-cyan-300",
  },
  {
    key: "departmentHOD",
    label: "Department HOD",
    color: "bg-indigo-500/20 text-indigo-300",
  },
  {
    key: "safetyOfficer",
    label: "Safety Officer",
    color: "bg-[#18C37E]/20 text-[#18C37E]",
  },
  {
    key: "contractorAdmin",
    label: "Contractor Admin",
    color: "bg-orange-500/20 text-orange-300",
  },
  {
    key: "ehsManager",
    label: "EHS Manager",
    color: "bg-blue-500/20 text-blue-300",
  },
  {
    key: "systemAdmin",
    label: "System Admin",
    color: "bg-purple-500/20 text-purple-300",
  },
];

const PERM_MATRIX: Record<string, Record<string, boolean>> = {
  "View Dashboard": {
    employee: true,
    supervisor: true,
    areaInCharge: true,
    departmentHOD: true,
    safetyOfficer: true,
    contractorAdmin: true,
    ehsManager: true,
    systemAdmin: true,
  },
  "Create Incident Report": {
    employee: true,
    supervisor: true,
    areaInCharge: true,
    departmentHOD: true,
    safetyOfficer: true,
    contractorAdmin: true,
    ehsManager: true,
    systemAdmin: true,
  },
  "Approve Permits": {
    employee: false,
    supervisor: false,
    areaInCharge: false,
    departmentHOD: false,
    safetyOfficer: true,
    contractorAdmin: false,
    ehsManager: false,
    systemAdmin: true,
  },
  "Manage Users": {
    employee: false,
    supervisor: false,
    areaInCharge: false,
    departmentHOD: false,
    safetyOfficer: false,
    contractorAdmin: false,
    ehsManager: true,
    systemAdmin: true,
  },
  "Access Analytics": {
    employee: false,
    supervisor: false,
    areaInCharge: false,
    departmentHOD: true,
    safetyOfficer: true,
    contractorAdmin: false,
    ehsManager: true,
    systemAdmin: true,
  },
  "Admin Panel": {
    employee: false,
    supervisor: false,
    areaInCharge: false,
    departmentHOD: false,
    safetyOfficer: false,
    contractorAdmin: false,
    ehsManager: true,
    systemAdmin: true,
  },
  "Delete Records": {
    employee: false,
    supervisor: false,
    areaInCharge: false,
    departmentHOD: false,
    safetyOfficer: false,
    contractorAdmin: false,
    ehsManager: false,
    systemAdmin: true,
  },
  "Assign CAPA": {
    employee: false,
    supervisor: true,
    areaInCharge: true,
    departmentHOD: true,
    safetyOfficer: true,
    contractorAdmin: false,
    ehsManager: true,
    systemAdmin: true,
  },
  "Close Investigations": {
    employee: false,
    supervisor: false,
    areaInCharge: false,
    departmentHOD: true,
    safetyOfficer: true,
    contractorAdmin: false,
    ehsManager: true,
    systemAdmin: true,
  },
  "Configure System": {
    employee: false,
    supervisor: false,
    areaInCharge: false,
    departmentHOD: false,
    safetyOfficer: false,
    contractorAdmin: false,
    ehsManager: false,
    systemAdmin: true,
  },
  "View Audit Logs": {
    employee: false,
    supervisor: false,
    areaInCharge: false,
    departmentHOD: true,
    safetyOfficer: true,
    contractorAdmin: false,
    ehsManager: true,
    systemAdmin: true,
  },
  "Contractor Management": {
    employee: false,
    supervisor: false,
    areaInCharge: false,
    departmentHOD: false,
    safetyOfficer: false,
    contractorAdmin: true,
    ehsManager: true,
    systemAdmin: true,
  },
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  employee:
    "General floor employees. Can report incidents and submit observations. Read-only access to dashboards.",
  supervisor:
    "Floor supervisors. Raise and close permits, assign CAPA tasks, and review incident reports.",
  areaInCharge:
    "Area In-Charge personnel. Reviews submitted permits to confirm precautions are in place before HOD validation.",
  departmentHOD:
    "Validates permits for their department and manages departmental compliance. Confirms all controls before Safety Officer approval.",
  safetyOfficer:
    "Dedicated safety personnel. Final approver for permits. Full access to safety modules, analytics and audit logs.",
  contractorAdmin:
    "External contractor supervisors. Manages contractor safety compliance and reporting.",
  ehsManager:
    "EHS department managers. Full operational access including user management and admin panel.",
  systemAdmin:
    "IT / System administrators. Unrestricted access to all modules and system configuration.",
};

export default function AdminRolesTab() {
  return (
    <div className="space-y-6" data-ocid="admin.roles.section">
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground mb-1">
          Roles & Permissions
        </h2>
        <p className="text-sm text-muted-foreground">
          Permission matrix is fixed and reflects system policy. Contact System
          Admin to request changes.
        </p>
      </div>

      {/* Permission Matrix */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass rounded-xl overflow-hidden"
        style={{ background: "rgba(8,20,38,0.5)" }}
      >
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wide min-w-[180px]">
                  Permission
                </th>
                {ROLES.map((r) => (
                  <th
                    key={r.key}
                    className="px-4 py-3 text-center min-w-[120px]"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={`text-xs px-2 py-1 rounded font-medium ${r.color}`}
                      >
                        {r.label}
                      </span>
                      {r.key === "systemAdmin" && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded"
                          style={{
                            background: "rgba(168,85,247,0.15)",
                            color: "#a855f7",
                            border: "1px solid rgba(168,85,247,0.3)",
                          }}
                          title="Read-only — System Admin always has full access"
                        >
                          <Lock className="w-2.5 h-2.5" />
                          Full Access
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((perm, i) => (
                <motion.tr
                  key={perm}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-b border-white/5 hover:bg-white/3 transition-smooth"
                >
                  <td className="px-4 py-3 text-foreground font-medium">
                    {perm}
                  </td>
                  {ROLES.map((role) => {
                    // systemAdmin always has all permissions — locked read-only
                    const isSystemAdmin = role.key === "systemAdmin";
                    const allowed = isSystemAdmin
                      ? true
                      : (PERM_MATRIX[perm]?.[role.key] ?? false);
                    return (
                      <td key={role.key} className="px-4 py-3 text-center">
                        {isSystemAdmin ? (
                          <span
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full"
                            style={{
                              background: "rgba(168,85,247,0.25)",
                              border: "1px solid rgba(168,85,247,0.4)",
                            }}
                            title="System Admin — all permissions locked"
                          >
                            <Check
                              className="w-3.5 h-3.5"
                              style={{ color: "#a855f7" }}
                            />
                          </span>
                        ) : allowed ? (
                          <span
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full"
                            style={{ background: "rgba(24,195,126,0.2)" }}
                          >
                            <Check
                              className="w-3.5 h-3.5"
                              style={{ color: "#18C37E" }}
                            />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/5">
                            <X className="w-3.5 h-3.5 text-muted-foreground" />
                          </span>
                        )}
                      </td>
                    );
                  })}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Role Description Cards */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Role Descriptions
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ROLES.map((role, i) => (
            <motion.div
              key={role.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="glass rounded-xl p-4"
              style={{ background: "rgba(8,20,38,0.5)" }}
            >
              <span
                className={`text-xs px-2 py-1 rounded font-medium ${role.color} mb-2 inline-block`}
              >
                {role.label}
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {ROLE_DESCRIPTIONS[role.key]}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
