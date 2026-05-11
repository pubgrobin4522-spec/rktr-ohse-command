import AdminAuditLogTab from "@/components/admin/AdminAuditLogTab";
import AdminDepartmentsTab from "@/components/admin/AdminDepartmentsTab";
import AdminRolesTab from "@/components/admin/AdminRolesTab";
import AdminSettingsTab from "@/components/admin/AdminSettingsTab";
import AdminUserTab from "@/components/admin/AdminUserTab";
import { useAuth } from "@/contexts/AuthContext";
import {
  Building2,
  ClipboardList,
  Lock,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

const TABS = [
  { id: "users", label: "User Management", icon: Users },
  { id: "departments", label: "Departments", icon: Building2 },
  { id: "roles", label: "Roles & Permissions", icon: Shield },
  { id: "settings", label: "System Settings", icon: Settings },
  { id: "auditlog", label: "Audit Log", icon: ClipboardList },
];

export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("users");

  const hasAccess = user?.role === "systemAdmin" || user?.role === "ehsManager";

  if (!hasAccess) {
    return (
      <div
        className="flex items-center justify-center min-h-[60vh]"
        data-ocid="admin.page"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-elevated rounded-xl p-12 text-center max-w-md"
          style={{
            background: "rgba(220,38,38,0.08)",
            borderColor: "rgba(220,38,38,0.3)",
          }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(220,38,38,0.15)" }}
          >
            <Lock className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">
            Access Denied
          </h2>
          <p className="text-muted-foreground">
            This panel is restricted to System Administrators and EHS Managers
            only.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Your current role:{" "}
            <span className="text-foreground font-medium">
              {user?.role ?? "Unknown"}
            </span>
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-ocid="admin.page">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{
            background: "rgba(24,195,126,0.15)",
            border: "1px solid rgba(24,195,126,0.3)",
          }}
        >
          <Settings className="w-5 h-5" style={{ color: "#18C37E" }} />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Admin Panel
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage users, departments, settings and system configuration
          </p>
        </div>
      </motion.div>

      {/* Tab Bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-xl p-1 flex gap-1 flex-wrap"
        style={{ background: "rgba(8,20,38,0.6)" }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            data-ocid={`admin.${tab.id}.tab`}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-smooth flex-1 justify-center ${
              activeTab === tab.id
                ? "text-[#081426] font-semibold shadow-md"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
            style={activeTab === tab.id ? { background: "#18C37E" } : {}}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "users" && <AdminUserTab />}
          {activeTab === "departments" && <AdminDepartmentsTab />}
          {activeTab === "roles" && <AdminRolesTab />}
          {activeTab === "settings" && <AdminSettingsTab />}
          {activeTab === "auditlog" && <AdminAuditLogTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
