import type { UserRecord, UserRole } from "@/backend";
import { Badge } from "@/components/ui/badge";
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
const BOOTSTRAP_ADMIN_EMAIL = "sumesh.j@rktrwheels.com";

interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department: string;
  employeeId: string;
  phone: string;
  active: boolean;
}

const defaultForm: UserFormData = {
  name: "",
  email: "",
  password: "",
  role: "employee" as UserRole,
  department: "EHS",
  employeeId: "",
  phone: "",
  active: true,
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
  const { data: users = [], isLoading } = useUsers();
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

  const filtered = users.filter((u) => {
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
    acc[r] = users.filter((u) => u.role === r).length;
    return acc;
  }, {});

  function openCreate() {
    setEditingUser(null);
    setForm(defaultForm);
    setShowModal(true);
  }

  function openEdit(u: UserRecord) {
    // Block editing the bootstrap admin
    if (u.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL) return;
    setEditingUser(u);
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      role: u.role as UserRole,
      department: u.department,
      employeeId: "",
      phone: "",
      active: u.active,
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name || !form.email) {
      toast.error("Name and email are required");
      return;
    }
    if (!form.email.endsWith("@rktrwheels.com")) {
      toast.error("Email must end with @rktrwheels.com");
      return;
    }
    // CRITICAL: Block assigning systemAdmin to anyone except the designated admin
    if (
      form.role === "systemAdmin" &&
      form.email.toLowerCase() !== BOOTSTRAP_ADMIN_EMAIL
    ) {
      toast.error(
        "System Admin role is reserved exclusively for Sumesh J (sumesh.j@rktrwheels.com). Only one System Admin is allowed.",
      );
      return;
    }
    const record: UserRecord = {
      id: editingUser?.id ?? `u_${Date.now()}`,
      name: form.name,
      email: form.email,
      role: form.role,
      department: form.department,
      employeeNumber: "",
      mobileNumber: "",
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
      toast.success(`${u.name}'s account has been activated`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Activation failed");
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
              sumesh.j@rktrwheels.com
            </span>{" "}
            holds the System Admin role. This cannot be changed, duplicated, or
            assigned to any other user.
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Users" value={users.length} color="#18C37E" />
        <StatCard
          label="Active"
          value={users.filter((u) => u.active).length}
          color="#3b82f6"
        />
        <StatCard
          label="Inactive"
          value={users.filter((u) => !u.active).length}
          color="#f59e0b"
        />
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
        {isLoading ? (
          <div
            className="flex items-center justify-center py-16"
            data-ocid="admin.users.loading_state"
          >
            <Loader2
              className="w-8 h-8 animate-spin"
              style={{ color: "#18C37E" }}
            />
          </div>
        ) : filtered.length === 0 ? (
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
                          u.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL
                            ? "Sumesh J"
                            : u.name
                        }
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground truncate">
                            {u.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL
                              ? "Sumesh J"
                              : u.name}
                          </p>
                          {u.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL && (
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
                    {/* If a non-Sumesh user somehow has systemAdmin role — show a Role Error warning */}
                    {u.role === "systemAdmin" &&
                    u.email.toLowerCase() !== BOOTSTRAP_ADMIN_EMAIL ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border font-medium bg-destructive/20 text-destructive border-destructive/30">
                        <AlertTriangle className="w-3 h-3" />
                        Role Error
                      </span>
                    ) : u.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL ? (
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
                    {u.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL ? (
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
  // Whether the email in the form matches the protected admin email
  const isBootstrapAdmin = form.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL;

  // systemAdmin is only selectable if the email matches the bootstrap admin
  const systemAdminBlocked = form.role === "systemAdmin" && !isBootstrapAdmin;

  function field(key: keyof UserFormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value;
      // If someone clears the email away from BOOTSTRAP_ADMIN_EMAIL but role is systemAdmin, reset role
      if (
        key === "email" &&
        value.toLowerCase() !== BOOTSTRAP_ADMIN_EMAIL &&
        form.role === "systemAdmin"
      ) {
        setForm({ ...form, email: value, role: "employee" as UserRole });
      } else {
        setForm({ ...form, [key]: value });
      }
    };
  }

  function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = e.target.value as UserRole;
    if (selected === "systemAdmin" && !isBootstrapAdmin) {
      // Silently block — the option is disabled, but guard here too
      return;
    }
    setForm({ ...form, role: selected });
  }

  // Roles shown in dropdown — systemAdmin is only shown when email matches
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
          <FormField label="Full Name *">
            <Input
              data-ocid="admin.users.name_input"
              value={form.name}
              onChange={field("name")}
              placeholder="e.g. Rajesh Kumar"
              className="bg-white/5 border-white/10"
            />
          </FormField>

          <FormField label="Email *">
            <Input
              data-ocid="admin.users.email_input"
              type="email"
              value={form.email}
              onChange={field("email")}
              placeholder="name@rktrwheels.com"
              className="bg-white/5 border-white/10"
            />
          </FormField>

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
              {/* Protected role notice when System Admin is already selected (editing Sumesh) */}
              {isBootstrapAdmin && (
                <p
                  className="mt-1.5 flex items-center gap-1 text-[11px]"
                  style={{ color: "#f59e0b" }}
                >
                  <Lock className="w-3 h-3" />
                  Protected role — reserved for Sumesh J only
                </p>
              )}
              {/* Safety net: if somehow systemAdmin is selected for wrong email, show inline error */}
              {systemAdminBlocked && (
                <p className="mt-1.5 flex items-start gap-1 text-[11px] text-destructive">
                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  System Admin role is reserved exclusively for Sumesh J
                  (sumesh.j@rktrwheels.com). Only one System Admin is allowed.
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

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Employee ID">
              <Input
                data-ocid="admin.users.employee_id_input"
                value={form.employeeId}
                onChange={field("employeeId")}
                placeholder="EMP-001"
                className="bg-white/5 border-white/10"
              />
            </FormField>

            <FormField label="Phone">
              <Input
                data-ocid="admin.users.phone_input"
                value={form.phone}
                onChange={field("phone")}
                placeholder="+91 XXXXXXXXXX"
                className="bg-white/5 border-white/10"
              />
            </FormField>
          </div>

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
              <span className="font-mono">sumesh.j@rktrwheels.com</span>. Only
              one System Admin is allowed in this application.
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
