import type { DepartmentRecord } from "@/backend";
import { createActor } from "@/backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDepartments } from "@/hooks/useBackend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Edit2,
  Loader2,
  MapPin,
  Plus,
  Trash2,
  User,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

const MOCK_COUNTS: Record<string, number> = {
  "Design & Engineering": 12,
  "Accounts & Finance": 8,
  Operations: 24,
  "Machine Shop": 18,
  Project: 6,
  "Projects - Civil": 5,
  Forging: 32,
  "Heat Treatment": 15,
  "Purchase & Stores": 10,
  "Maintenance- Automation": 9,
  "Utility Maintenance": 11,
  Maintenance: 20,
  "Metallurgy & LAB": 7,
  EHS: 5,
  "Sales & Marketing": 6,
  "IT & Infrastructure": 4,
  Admin: 8,
  "Human Capital": 6,
  "Design & CAD CAM": 9,
  "Utility Maintenance - EMS": 7,
  Quality: 14,
  "Die Shop": 16,
};

interface DeptForm {
  name: string;
  head: string;
  location: string;
}

const defaultForm: DeptForm = { name: "", head: "", location: "" };

function useCreateDepartment() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dept: DepartmentRecord) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.createDepartment(dept);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
  });
}

function useDeleteDepartment() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.deleteDepartment(id);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
  });
}

export default function AdminDepartmentsTab() {
  const { data: departments = [], isLoading } = useDepartments();
  const createDept = useCreateDepartment();
  const deleteDept = useDeleteDepartment();

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<DepartmentRecord | null>(null);
  const [form, setForm] = useState<DeptForm>(defaultForm);
  const [deleteTarget, setDeleteTarget] = useState<DepartmentRecord | null>(
    null,
  );

  function openCreate() {
    setEditTarget(null);
    setForm(defaultForm);
    setShowModal(true);
  }

  function openEdit(d: DepartmentRecord) {
    setEditTarget(d);
    setForm({ name: d.name, head: d.head, location: d.location });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name || !form.head) {
      toast.error("Name and head are required");
      return;
    }
    const record: DepartmentRecord = {
      id: editTarget?.id ?? `dept_${Date.now()}`,
      name: form.name,
      head: form.head,
      location: form.location,
    };
    try {
      await createDept.mutateAsync(record);
      toast.success(editTarget ? "Department updated" : "Department created");
      setShowModal(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function handleDelete(d: DepartmentRecord) {
    try {
      await deleteDept.mutateAsync(d.id);
      toast.success(`${d.name} removed`);
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div className="space-y-5" data-ocid="admin.departments.section">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-semibold text-foreground">
          Department Management
        </h2>
        <Button
          data-ocid="admin.departments.add_button"
          onClick={openCreate}
          className="flex items-center gap-2 text-[#081426] font-semibold"
          style={{ background: "#18C37E" }}
        >
          <Plus className="w-4 h-4" />
          Add Department
        </Button>
      </div>

      {isLoading ? (
        <div
          className="flex justify-center py-16"
          data-ocid="admin.departments.loading_state"
        >
          <Loader2
            className="w-8 h-8 animate-spin"
            style={{ color: "#18C37E" }}
          />
        </div>
      ) : departments.length === 0 ? (
        <div
          className="text-center py-16"
          data-ocid="admin.departments.empty_state"
        >
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground">No departments found</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept, i) => (
            <motion.div
              key={dept.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="glass rounded-xl p-4 hover:bg-white/5 transition-smooth"
              style={{ background: "rgba(8,20,38,0.5)" }}
              data-ocid={`admin.departments.item.${i + 1}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{
                    background: "rgba(24,195,126,0.15)",
                    border: "1px solid rgba(24,195,126,0.3)",
                  }}
                >
                  <Building2 className="w-5 h-5" style={{ color: "#18C37E" }} />
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    data-ocid={`admin.departments.edit_button.${i + 1}`}
                    onClick={() => openEdit(dept)}
                    className="p-1.5 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-smooth"
                    aria-label="Edit department"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    data-ocid={`admin.departments.delete_button.${i + 1}`}
                    onClick={() => setDeleteTarget(dept)}
                    className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-smooth"
                    aria-label="Delete department"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                {dept.name}
              </h3>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="w-3 h-3" />
                  <span>{dept.head}</span>
                </div>
                {dept.location && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>{dept.location}</span>
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Employees</span>
                <span
                  className="text-sm font-bold"
                  style={{ color: "#18C37E" }}
                >
                  {MOCK_COUNTS[dept.name] ?? Math.floor(Math.random() * 20) + 5}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Dept Form Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
            data-ocid="admin.departments.dialog"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="glass-elevated rounded-2xl p-6 w-full max-w-md"
              style={{
                background: "rgba(8,20,38,0.95)",
                borderColor: "rgba(24,195,126,0.2)",
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-display font-bold text-foreground">
                  {editTarget ? "Edit Department" : "Add Department"}
                </h3>
                <button
                  type="button"
                  data-ocid="admin.departments.close_button"
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label
                    className="block text-xs text-muted-foreground mb-1.5"
                    htmlFor="dept-name"
                  >
                    Department Name *
                  </label>
                  <Input
                    id="dept-name"
                    data-ocid="admin.departments.name_input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Forge Shop"
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <label
                    className="block text-xs text-muted-foreground mb-1.5"
                    htmlFor="dept-head"
                  >
                    Department Head *
                  </label>
                  <Input
                    id="dept-head"
                    data-ocid="admin.departments.head_input"
                    value={form.head}
                    onChange={(e) => setForm({ ...form, head: e.target.value })}
                    placeholder="e.g. Suresh Patel"
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <label
                    className="block text-xs text-muted-foreground mb-1.5"
                    htmlFor="dept-location"
                  >
                    Location
                  </label>
                  <Input
                    id="dept-location"
                    data-ocid="admin.departments.location_input"
                    value={form.location}
                    onChange={(e) =>
                      setForm({ ...form, location: e.target.value })
                    }
                    placeholder="e.g. Block A, Floor 2"
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  data-ocid="admin.departments.cancel_button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border-white/10"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  data-ocid="admin.departments.submit_button"
                  onClick={handleSave}
                  disabled={createDept.isPending}
                  className="flex-1 text-[#081426] font-semibold"
                  style={{ background: "#18C37E" }}
                >
                  {createDept.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editTarget ? (
                    "Update"
                  ) : (
                    "Create"
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}
            data-ocid="admin.departments.delete_dialog"
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
              <h3 className="text-lg font-bold text-center mb-2">
                Remove Department?
              </h3>
              <p className="text-sm text-muted-foreground text-center">
                Are you sure you want to remove{" "}
                <span className="text-foreground font-medium">
                  {deleteTarget.name}
                </span>
                ? This cannot be undone.
              </p>
              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  data-ocid="admin.departments.delete_cancel_button"
                  variant="outline"
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 border-white/10"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  data-ocid="admin.departments.delete_confirm_button"
                  onClick={() => handleDelete(deleteTarget)}
                  disabled={deleteDept.isPending}
                  variant="destructive"
                  className="flex-1"
                >
                  {deleteDept.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Remove"
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
