import type { UserRecord, UserRole } from "@/backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RKTR_DEPARTMENTS } from "@/constants/departments";
import {
  useActivateUser,
  useCreateUser,
  useDeleteUser,
  useUpdateUser,
  useUsers,
} from "@/hooks/useBackend";
import { ROLE_LABELS } from "@/types";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  Crown,
  Edit2,
  Loader2,
  Lock,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

const ROLE_BADGE: Record<string, string> = {
  systemAdmin: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  ehsManager: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  safetyOfficer: "bg-[#18C37E]/20 text-[#18C37E] border-[#18C37E]/30",
  supervisor: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  areaInCharge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  departmentHOD: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  employee: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  contractorAdmin: "bg-orange-500/20 text-orange-300 border-orange-500/30",
};

const ROLES: UserRole[] = [
  "systemAdmin",
  "ehsManager",
  "safetyOfficer",
  "supervisor",
  "areaInCharge",
  "departmentHOD",
  "employee",
  "contractorAdmin",
] as UserRole[];

const DEPARTMENTS = RKTR_DEPARTMENTS;
const BOOTSTRAP_ADMIN_EMP = "230034";
const BOOTSTRAP_ADMIN_NAME_DISPLAY = "Sumesh J";

// Hardcoded fallback entries — always shown even if backend returns empty or fails
const BOOTSTRAP_USERS: UserRecord[] = [
  {
    id: "sumesh-bootstrap",
    name: "Sumesh J",
    employeeNumber: "230034",
    email: "sumesh.j@rktrwheels.com",
    role: "systemAdmin" as UserRole,
    department: "EHS",
    active: true,
    mobileNumber: "",
  },
  {
    id: "pramod-bootstrap",
    name: "Pramod",
    employeeNumber: "230035",
    email: "pramod@rktrwheels.com",
    role: "safetyOfficer" as UserRole,
    department: "EHS",
    active: true,
    mobileNumber: "",
  },
];

// Bootstrap/seeded user check — robust, case-insensitive
const isBootstrapUser = (u: UserRecord) =>
  u.employeeNumber === BOOTSTRAP_ADMIN_EMP ||
  u.name.toLowerCase().includes("pramod");

// A real registered user is one with active=false who is NOT a bootstrap user.
// These must NEVER be auto-deleted — they are waiting for admin approval.
const isPendingRegistration = (u: UserRecord) =>
  !u.active && !isBootstrapUser(u);

// Merge backend users with hardcoded bootstrap fallbacks.
// If a bootstrap user already exists in the fetched list, skip the fallback.
function mergeWithBootstrap(fetched: UserRecord[]): UserRecord[] {
  const merged = [...fetched];
  for (const bootstrap of BOOTSTRAP_USERS) {
    const alreadyPresent = fetched.some(
      (u) =>
        u.employeeNumber === bootstrap.employeeNumber ||
        u.name.toLowerCase().includes(bootstrap.name.toLowerCase()),
    );
    if (!alreadyPresent) {
      merged.unshift(bootstrap);
    }
  }
  return merged;
}

interface UserFormData {
  name: string;
  employeeNumber: string;
  password: string;
  role: UserRole;
  department: string;
  phone: string;
  active: boolean;
  empNumError: string;
}

const defaultForm: UserFormData = {
  name: "",
  employeeNumber: "",
  password: "",
  role: "employee" as UserRole,
  department: "EHS",
  phone: "",
  active: true,
  empNumError: "",
};

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-[#081426] flex-shrink-0"
      style={{ background: "#18C37E" }}
    >
      {initials}
    </div>
  );
}

export default function AdminUserTab() {
  const { data: rawUsers, isLoading } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const activateUser = useActivateUser();
  const deleteUser = useDeleteUser();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [form, setForm] = useState<UserFormData>(defaultForm);
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [rejectTarget, setRejectTarget] = useState<UserRecord | null>(null);

  // Merge backend users with bootstrap fallbacks — bootstrap users always visible
  // even when backend returns empty, is loading, or errors out.
  const users = mergeWithBootstrap(rawUsers ?? []);

  // ─── Segment users ─────────────────────────────────────────────────────────
  // pendingUsers: real self-registrations waiting for admin approval (active=false, non-bootstrap)
  const pendingUsers = users.filter(isPendingRegistration);

  // activeUsers: bootstrap users + any user who has been activated (active=true)
  // We deliberately exclude pending registrations from this table so the admin
  // sees a clean separation: pending queue at top, activated users below.
  const activeUsers = users.filter((u) => isBootstrapUser(u) || u.active);

  const filtered = activeUsers.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && u.active) ||
      (statusFilter === "inactive" && !u.active);
    return matchSearch && matchRole && matchStatus;
  });

  const roleCounts = ROLES.reduce<Record<string, number>>((acc, r) => {
    acc[r] = activeUsers.filter((u) => u.role === r).length;
    return acc;
  }, {});

  function openCreate() {
    setEditingUser(null);
    setForm(defaultForm);
    setShowModal(true);
  }

  function openEdit(u: UserRecord) {
    if (u.employeeNumber === BOOTSTRAP_ADMIN_EMP) return;
    setEditingUser(u);
    setForm({
      name: u.name,
      employeeNumber: u.employeeNumber ?? "",
      password: "",
      role: u.role as UserRole,
      department: u.department,
      phone: u.mobileNumber ?? "",
      active: u.active,
      empNumError: "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (!/^23\d{4}$/.test(form.employeeNumber.trim())) {
      toast.error("Employee number must start with 23 and be exactly 6 digits");
      return;
    }
    if (
      form.role === "systemAdmin" &&
      form.employeeNumber.trim() !== BOOTSTRAP_ADMIN_EMP
    ) {
      toast.error(
        `System Admin role is reserved exclusively for ${BOOTSTRAP_ADMIN_NAME_DISPLAY} (Employee #${BOOTSTRAP_ADMIN_EMP}).`,
      );
      return;
    }
    const record: UserRecord = {
      id: editingUser?.id ?? `u_${Date.now()}`,
      name: form.name,
      email: "",
      role: form.role,
      department: form.department,
      employeeNumber: form.employeeNumber.trim(),
      mobileNumber: form.phone,
      active: form.active,
    };
    try {
      if (editingUser) {
        await updateUser.mutateAsync({ id: editingUser.id, user: record });
        toast.success("User updated successfully");
      } else {
        await createUser.mutateAsync(record);
        toast.success("User created successfully");
      }
      setShowModal(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save user");
    }
  }

  async function handleActivate(u: UserRecord) {
    try {
      await activateUser.mutateAsync(u.id);
      toast.success(
        `${u.name}'s account has been activated — they can now sign in`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Activation failed");
    }
  }

  async function handleApprovePending(u: UserRecord) {
    try {
      await activateUser.mutateAsync(u.id);
      toast.success(`${u.name} approved — account is now active`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approval failed");
    }
  }

  async function handleRejectPending(u: UserRecord) {
    try {
      await deleteUser.mutateAsync(u.id);
      toast.success(`Registration for ${u.name} has been rejected`);
      setRejectTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rejection failed");
    }
  }

  async function handleDelete(u: UserRecord) {
    try {
      await deleteUser.mutateAsync(u.id);
      toast.success(`User ${u.name} removed`);
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div className="space-y-5" data-ocid="admin.users.section">
      {/* System Admin Notice Banner */}
      <div
        className="flex items-start gap-3 rounded-xl px-4 py-3 text-sm"
        style={{
          background: "rgba(168,85,247,0.08)",
          border: "1px solid rgba(168,85,247,0.25)",
        }}
        data-ocid="admin.users.sysadmin_notice"
      >
        <span
          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5"
          style={{
            background: "rgba(168,85,247,0.2)",
            border: "1px solid rgba(168,85,247,0.4)",
          }}
        >
          <Crown className="w-3.5 h-3.5" style={{ color: "#a855f7" }} />
        </span>
        <div className="min-w-0">
          <span className="font-semibold" style={{ color: "#a855f7" }}>
            System Admin is permanently reserved:
          </span>{" "}
          <span className="text-muted-foreground">
            Only{" "}
            <span
              className="font-mono text-xs px-1.5 py-0.5 rounded"
              style={{ background: "rgba(168,85,247,0.15)", color: "#c084fc" }}
            >
              Employee #230034 (Sumesh J)
            </span>{" "}
            holds the System Admin role. This cannot be changed, duplicated, or
            assigned to any other user.
          </span>
        </div>
      </div>

      {/* ── PENDING REGISTRATIONS SECTION ─────────────────────────────────── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "rgba(8,20,38,0.6)",
          border:
            pendingUsers.length > 0
              ? "1px solid rgba(245,158,11,0.35)"
              : "1px solid rgba(255,255,255,0.08)",
        }}
        data-ocid="admin.pending.section"
      >
        {/* Section header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{
            background:
              pendingUsers.length > 0
                ? "rgba(245,158,11,0.08)"
                : "rgba(255,255,255,0.03)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background:
                  pendingUsers.length > 0
                    ? "rgba(245,158,11,0.18)"
                    : "rgba(255,255,255,0.06)",
              }}
            >
              <Bell
                className="w-3.5 h-3.5"
                style={{
                  color: pendingUsers.length > 0 ? "#f59e0b" : "#6b7280",
                }}
              />
            </div>
            <span
              className="font-semibold text-sm"
              style={{ color: pendingUsers.length > 0 ? "#f59e0b" : "#9ca3af" }}
            >
              Pending Registrations
            </span>
            {pendingUsers.length > 0 && (
              <span
                className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-bold"
                style={{
                  background: "rgba(245,158,11,0.25)",
                  color: "#f59e0b",
                  border: "1px solid rgba(245,158,11,0.4)",
                }}
                data-ocid="admin.pending.count_badge"
              >
                {pendingUsers.length}
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {pendingUsers.length === 0
              ? "No pending registrations"
              : `${pendingUsers.length} awaiting approval`}
          </span>
        </div>

        {/* Pending users list */}
        {pendingUsers.length === 0 ? (
          <div
            className="flex items-center gap-3 px-4 py-5 text-sm text-muted-foreground"
            data-ocid="admin.pending.empty_state"
          >
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 opacity-50" />
            <span>
              All registrations have been reviewed. New sign-ups will appear
              here automatically.
            </span>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {pendingUsers.map((u, i) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5"
                data-ocid={`admin.pending.item.${i + 1}`}
              >
                {/* Avatar + info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <UserAvatar name={u.name} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm text-foreground truncate">
                        {u.name}
                      </p>
                      <span
                        className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                        style={{
                          background: "rgba(245,158,11,0.15)",
                          color: "#f59e0b",
                          border: "1px solid rgba(245,158,11,0.3)",
                        }}
                      >
                        <Clock className="w-2.5 h-2.5" />
                        Pending
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground font-mono">
                        #{u.employeeNumber}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {u.department}
                      </span>
                      {u.mobileNumber && (
                        <span className="text-xs text-muted-foreground">
                          {u.mobileNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-shrink-0 pl-11 sm:pl-0">
                  <button
                    type="button"
                    data-ocid={`admin.pending.approve_button.${i + 1}`}
                    onClick={() => handleApprovePending(u)}
                    disabled={activateUser.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-smooth hover:opacity-90 disabled:opacity-50"
                    style={{
                      background: "rgba(24,195,126,0.18)",
                      color: "#18C37E",
                      border: "1px solid rgba(24,195,126,0.35)",
                    }}
                    aria-label={`Approve registration for ${u.name}`}
                  >
                    {activateUser.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    Approve
                  </button>
                  <button
                    type="button"
                    data-ocid={`admin.pending.reject_button.${i + 1}`}
                    onClick={() => setRejectTarget(u)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-smooth hover:opacity-90"
                    style={{
                      background: "rgba(220,38,38,0.12)",
                      color: "#f87171",
                      border: "1px solid rgba(220,38,38,0.3)",
                    }}
                    aria-label={`Reject registration for ${u.name}`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total Users"
          value={activeUsers.length}
          color="#18C37E"
        />
        <StatCard
          label="Active"
          value={activeUsers.filter((u) => u.active).length}
          color="#3b82f6"
        />
        <StatCard label="Pending" value={pendingUsers.length} color="#f59e0b" />
        <div
          className="glass rounded-xl p-3"
          style={{ background: "rgba(8,20,38,0.5)" }}
        >
          <p className="text-xs text-muted-foreground mb-1.5">By Role</p>
          <div className="flex flex-wrap gap-1">
            {ROLES.slice(0, 3).map((r) => (
              <span
                key={r}
                className={`text-[10px] px-1.5 py-0.5 rounded border ${ROLE_BADGE[r]}`}
              >
                {ROLE_LABELS[r]}: {roleCounts[r] ?? 0}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              data-ocid="admin.users.search_input"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-56 bg-white/5 border-white/10"
            />
          </div>
          <select
            data-ocid="admin.users.role_filter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-foreground"
          >
            <option value="all">All Roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <select
            data-ocid="admin.users.status_filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-foreground"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <Button
          data-ocid="admin.users.add_button"
          onClick={openCreate}
          className="flex items-center gap-2 text-[#081426] font-semibold"
          style={{ background: "#18C37E" }}
        >
          <Plus className="w-4 h-4" />
          Add User
        </Button>
      </div>

      {/* Table */}
      <div
        className="glass rounded-xl overflow-hidden"
        style={{ background: "rgba(8,20,38,0.5)" }}
      >
        {/* Subtle loading bar when backend is still fetching — does NOT hide bootstrap users */}
        {isLoading && (
          <div
            className="h-0.5 w-full overflow-hidden"
            data-ocid="admin.users.loading_state"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <div
              className="h-full animate-pulse"
              style={{ background: "#18C37E", width: "60%" }}
            />
          </div>
        )}
        {filtered.length === 0 ? (
          <div
            className="text-center py-16 text-muted-foreground"
            data-ocid="admin.users.empty_state"
          >
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No users found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {["User", "Role", "Department", "Status", "Actions"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <motion.tr
                  key={u.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-b border-white/5 hover:bg-white/5 transition-smooth"
                  data-ocid={`admin.users.item.${i + 1}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        name={
                          u.employeeNumber === BOOTSTRAP_ADMIN_EMP
                            ? BOOTSTRAP_ADMIN_NAME_DISPLAY
                            : u.name
                        }
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground truncate">
                            {u.employeeNumber === BOOTSTRAP_ADMIN_EMP
                              ? BOOTSTRAP_ADMIN_NAME_DISPLAY
                              : u.name}
                          </p>
                          {u.employeeNumber === BOOTSTRAP_ADMIN_EMP && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0"
                              style={{
                                background:
                                  "linear-gradient(135deg, rgba(234,179,8,0.25), rgba(168,85,247,0.25))",
                                color: "#f59e0b",
                                border: "1px solid rgba(234,179,8,0.4)",
                              }}
                              title="Permanent System Administrator — protected account"
                            >
                              <Crown className="w-2.5 h-2.5" />
                              System Admin
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {u.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {u.role === "systemAdmin" &&
                    u.employeeNumber !== BOOTSTRAP_ADMIN_EMP ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border font-medium bg-destructive/20 text-destructive border-destructive/30">
                        <AlertTriangle className="w-3 h-3" />
                        Role Error
                      </span>
                    ) : u.employeeNumber === BOOTSTRAP_ADMIN_EMP ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border font-medium bg-purple-500/20 text-purple-300 border-purple-500/30">
                        <ShieldCheck className="w-3 h-3" />
                        System Admin
                        <Lock className="w-2.5 h-2.5 opacity-70" />
                      </span>
                    ) : (
                      <span
                        className={`text-xs px-2 py-1 rounded border font-medium ${
                          ROLE_BADGE[u.role] ?? "bg-muted text-muted-foreground"
                        }`}
                      >
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {u.department}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {u.active ? (
                        <UserCheck className="w-4 h-4 text-[#18C37E]" />
                      ) : (
                        <UserX className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span
                        className={`text-xs ${
                          u.active ? "text-[#18C37E]" : "text-muted-foreground"
                        }`}
                      >
                        {u.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {u.employeeNumber === BOOTSTRAP_ADMIN_EMP ? (
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium"
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(234,179,8,0.15), rgba(168,85,247,0.15))",
                            color: "#f59e0b",
                            border: "1px solid rgba(234,179,8,0.35)",
                          }}
                        >
                          <Crown className="w-3 h-3" />
                          System Administrator
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {!u.active && (
                          <button
                            type="button"
                            data-ocid={`admin.users.activate_button.${i + 1}`}
                            onClick={() => handleActivate(u)}
                            disabled={activateUser.isPending}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-smooth hover:opacity-90 disabled:opacity-50"
                            style={{
                              background: "rgba(24,195,126,0.15)",
                              color: "#18C37E",
                              border: "1px solid rgba(24,195,126,0.3)",
                            }}
                            aria-label="Activate user"
                          >
                            {activateUser.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <UserCheck className="w-3 h-3" />
                            )}
                            Activate
                          </button>
                        )}
                        <button
                          type="button"
                          data-ocid={`admin.users.edit_button.${i + 1}`}
                          onClick={() => openEdit(u)}
                          className="p-1.5 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-smooth"
                          aria-label="Edit user"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          data-ocid={`admin.users.delete_button.${i + 1}`}
                          onClick={() => setDeleteTarget(u)}
                          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-smooth"
                          aria-label="Delete user"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* User Form Modal */}
      <AnimatePresence>
        {showModal && (
          <UserFormModal
            form={form}
            setForm={setForm}
            isEditing={!!editingUser}
            onSave={handleSave}
            onClose={() => setShowModal(false)}
            isPending={createUser.isPending || updateUser.isPending}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirmModal
            name={deleteTarget.name}
            isPending={deleteUser.isPending}
            onConfirm={() => handleDelete(deleteTarget)}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* Reject Registration Confirm */}
      <AnimatePresence>
        {rejectTarget && (
          <RejectConfirmModal
            name={rejectTarget.name}
            isPending={deleteUser.isPending}
            onConfirm={() => handleRejectPending(rejectTarget)}
            onCancel={() => setRejectTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className="glass rounded-xl p-3"
      style={{ background: "rgba(8,20,38,0.5)" }}
    >
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-display font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function UserFormModal({
  form,
  setForm,
  isEditing,
  onSave,
  onClose,
  isPending,
}: {
  form: UserFormData;
  setForm: (f: UserFormData) => void;
  isEditing: boolean;
  onSave: () => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const isBootstrapAdmin = form.employeeNumber === BOOTSTRAP_ADMIN_EMP;
  const systemAdminBlocked = form.role === "systemAdmin" && !isBootstrapAdmin;

  function handleEmpNumChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    let error = "";
    if (value.length > 0 && !/^23/.test(value) && value.length >= 2) {
      error = "Employee number must start with 23 and be exactly 6 digits";
    } else if (
      value.length > 0 &&
      value.length < 6 &&
      value.length >= 2 &&
      /^23/.test(value)
    ) {
      error = "";
    } else if (value.length === 6 && !/^23\d{4}$/.test(value)) {
      error = "Employee number must start with 23 and be exactly 6 digits";
    }
    // Reset systemAdmin role if employee number no longer matches bootstrap admin
    if (value !== BOOTSTRAP_ADMIN_EMP && form.role === "systemAdmin") {
      setForm({
        ...form,
        employeeNumber: value,
        role: "employee" as UserRole,
        empNumError: error,
      });
    } else {
      setForm({ ...form, employeeNumber: value, empNumError: error });
    }
  }

  function handleEmpNumBlur() {
    const value = form.employeeNumber.trim();
    if (value.length > 0 && !/^23\d{4}$/.test(value)) {
      setForm({
        ...form,
        empNumError:
          "Employee number must start with 23 and be exactly 6 digits",
      });
    } else {
      setForm({ ...form, empNumError: "" });
    }
  }

  function field(key: keyof UserFormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm({ ...form, [key]: e.target.value });
    };
  }

  function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = e.target.value as UserRole;
    if (selected === "systemAdmin" && !isBootstrapAdmin) return;
    setForm({ ...form, role: selected });
  }

  const availableRoles = ROLES.filter(
    (r) => r !== "systemAdmin" || isBootstrapAdmin,
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-ocid="admin.users.dialog"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        className="glass-elevated rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin"
        style={{
          background: "rgba(8,20,38,0.95)",
          borderColor: "rgba(24,195,126,0.2)",
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-display font-bold text-foreground">
            {isEditing ? "Edit User" : "Add New User"}
          </h3>
          <button
            type="button"
            data-ocid="admin.users.close_button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground transition-smooth"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Full Name */}
          <FormField label="Full Name *">
            <Input
              data-ocid="admin.users.name_input"
              value={form.name}
              onChange={field("name")}
              placeholder="e.g. Rajesh Kumar"
              className="bg-white/5 border-white/10"
            />
          </FormField>

          {/* Employee Number */}
          <FormField label="Employee Number *">
            <Input
              data-ocid="admin.users.employee_number_input"
              value={form.employeeNumber}
              onChange={handleEmpNumChange}
              onBlur={handleEmpNumBlur}
              placeholder="e.g. 230034"
              maxLength={6}
              inputMode="numeric"
              className={`bg-white/5 ${
                form.empNumError ? "border-destructive" : "border-white/10"
              }`}
            />
            {form.empNumError && (
              <p
                className="mt-1.5 flex items-center gap-1 text-[11px] text-destructive"
                data-ocid="admin.users.emp_number.field_error"
              >
                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                {form.empNumError}
              </p>
            )}
          </FormField>

          {/* Password (create only) */}
          {!isEditing && (
            <FormField label="Password *">
              <Input
                data-ocid="admin.users.password_input"
                type="password"
                value={form.password}
                onChange={field("password")}
                placeholder="••••••••"
                className="bg-white/5 border-white/10"
              />
            </FormField>
          )}

          {/* Role & Department */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Role">
              <select
                data-ocid="admin.users.role_select"
                value={form.role}
                onChange={handleRoleChange}
                className="w-full px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-foreground"
              >
                {availableRoles.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              {isBootstrapAdmin && (
                <p
                  className="mt-1.5 flex items-center gap-1 text-[11px]"
                  style={{ color: "#f59e0b" }}
                >
                  <Lock className="w-3 h-3" />
                  Protected role — reserved for Sumesh J only
                </p>
              )}
              {systemAdminBlocked && (
                <p className="mt-1.5 flex items-start gap-1 text-[11px] text-destructive">
                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  System Admin role is reserved exclusively for Sumesh J. Only
                  one System Admin is allowed.
                </p>
              )}
            </FormField>

            <FormField label="Department">
              <select
                data-ocid="admin.users.dept_select"
                value={form.department}
                onChange={field("department")}
                className="w-full px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-foreground"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {/* Phone */}
          <FormField label="Phone">
            <Input
              data-ocid="admin.users.phone_input"
              value={form.phone}
              onChange={field("phone")}
              placeholder="+91 XXXXXXXXXX"
              className="bg-white/5 border-white/10"
            />
          </FormField>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-ocid="admin.users.active_toggle"
              onClick={() => setForm({ ...form, active: !form.active })}
              className={`relative w-11 h-6 rounded-full transition-smooth ${
                form.active ? "bg-[#18C37E]" : "bg-white/20"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-smooth ${
                  form.active ? "left-5" : "left-0.5"
                }`}
              />
            </button>
            <span className="text-sm text-foreground">Active user account</span>
          </div>
        </div>

        {/* Form-level System Admin error banner */}
        {systemAdminBlocked && (
          <div
            className="mt-4 flex items-start gap-2 rounded-xl p-3 text-sm"
            style={{
              background: "rgba(220,38,38,0.12)",
              border: "1px solid rgba(220,38,38,0.35)",
              color: "#f87171",
            }}
            data-ocid="admin.users.role_error_state"
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Role assignment blocked.</strong> System Admin is reserved
              exclusively for{" "}
              <span className="font-mono">Employee #230034 (Sumesh J)</span>.
              Only one System Admin is allowed in this application.
            </span>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <Button
            type="button"
            data-ocid="admin.users.cancel_button"
            variant="outline"
            onClick={onClose}
            className="flex-1 border-white/10 hover:bg-white/5"
          >
            Cancel
          </Button>
          <Button
            type="button"
            data-ocid="admin.users.submit_button"
            onClick={onSave}
            disabled={isPending || systemAdminBlocked}
            className="flex-1 text-[#081426] font-semibold disabled:opacity-50"
            style={{ background: systemAdminBlocked ? undefined : "#18C37E" }}
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isEditing ? (
              "Update User"
            ) : (
              "Create User"
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DeleteConfirmModal({
  name,
  isPending,
  onConfirm,
  onCancel,
}: {
  name: string;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      data-ocid="admin.users.delete_dialog"
    >
      <motion.div
        initial={{ scale: 0.92 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.92 }}
        className="glass-elevated rounded-2xl p-6 w-full max-w-sm"
        style={{
          background: "rgba(8,20,38,0.95)",
          borderColor: "rgba(220,38,38,0.3)",
        }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: "rgba(220,38,38,0.15)" }}
        >
          <Trash2 className="w-6 h-6 text-destructive" />
        </div>
        <h3 className="text-lg font-bold text-foreground text-center mb-2">
          Remove User?
        </h3>
        <p className="text-sm text-muted-foreground text-center">
          Are you sure you want to remove{" "}
          <span className="text-foreground font-medium">{name}</span>? This
          cannot be undone.
        </p>
        <div className="flex gap-3 mt-6">
          <Button
            type="button"
            data-ocid="admin.users.delete_cancel_button"
            variant="outline"
            onClick={onCancel}
            className="flex-1 border-white/10"
          >
            Cancel
          </Button>
          <Button
            type="button"
            data-ocid="admin.users.delete_confirm_button"
            onClick={onConfirm}
            disabled={isPending}
            variant="destructive"
            className="flex-1"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Remove"
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function RejectConfirmModal({
  name,
  isPending,
  onConfirm,
  onCancel,
}: {
  name: string;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      data-ocid="admin.pending.reject_dialog"
    >
      <motion.div
        initial={{ scale: 0.92 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.92 }}
        className="glass-elevated rounded-2xl p-6 w-full max-w-sm"
        style={{
          background: "rgba(8,20,38,0.95)",
          borderColor: "rgba(245,158,11,0.35)",
        }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: "rgba(245,158,11,0.12)" }}
        >
          <XCircle className="w-6 h-6" style={{ color: "#f59e0b" }} />
        </div>
        <h3 className="text-lg font-bold text-foreground text-center mb-2">
          Reject Registration?
        </h3>
        <p className="text-sm text-muted-foreground text-center">
          Rejecting <span className="text-foreground font-medium">{name}</span>
          's registration will permanently delete their account. This cannot be
          undone.
        </p>
        <div className="flex gap-3 mt-6">
          <Button
            type="button"
            data-ocid="admin.pending.reject_cancel_button"
            variant="outline"
            onClick={onCancel}
            className="flex-1 border-white/10"
          >
            Cancel
          </Button>
          <Button
            type="button"
            data-ocid="admin.pending.reject_confirm_button"
            onClick={onConfirm}
            disabled={isPending}
            variant="destructive"
            className="flex-1"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Reject Registration"
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
}

function FormField({ label, children }: FormFieldProps) {
  return (
    <div>
      <p className="block text-xs text-muted-foreground mb-1.5">{label}</p>
      {children}
    </div>
  );
}
