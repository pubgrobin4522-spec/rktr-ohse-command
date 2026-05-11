import { IncidentStatus } from "@/backend";
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
import { Textarea } from "@/components/ui/textarea";
import { RKTR_DEPARTMENTS } from "@/constants/departments";
import { RKTR_LOCATIONS } from "@/constants/locations";
import {
  loadAttachments,
  removeAttachmentFromStorage,
  saveAttachments,
  useStorageUpload,
  validateFile,
} from "@/hooks/useAttachments";
import type { AttachmentMetadata } from "@/hooks/useAttachments";
import {
  useCreateIncident,
  useUpdateIncident,
  useUpdateIncidentStatus,
} from "@/hooks/useBackend";
import type { IncidentRecord } from "@/types";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  File,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

const LOCATIONS = RKTR_LOCATIONS;
const DEPARTMENTS = RKTR_DEPARTMENTS;

const INCIDENT_TYPES = [
  "Near Miss",
  "Minor Injury",
  "Major Injury",
  "Fatality",
  "Property Damage",
  "Environmental",
];

const ROOT_CAUSE_CATEGORIES = [
  "Human Error",
  "Equipment Failure",
  "Procedure",
  "Environment",
  "Management",
];

const CONTRIBUTING_FACTORS = [
  "Lack of training",
  "Inadequate supervision",
  "Poor housekeeping",
  "Defective equipment",
  "No PPE available",
  "Time pressure",
  "Fatigue",
  "Poor lighting",
];

const TEAM_MEMBERS = [
  "Rajesh Kumar – Safety Officer",
  "Amit Sharma – Production Engineer",
  "Priya Singh – EHS Manager",
  "Suresh Patel – Shift Incharge",
  "Vikram Das – Maintenance Lead",
];

const WORKFLOW_STEPS = [
  "Draft",
  "Submitted",
  "Under Review",
  "Approved",
  "Closed",
];
const WORKFLOW_STATUS_MAP: Record<string, number> = {
  draft: 0,
  submitted: 1,
  underReview: 2,
  approved: 3,
  closed: 4,
  rejected: 1,
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

interface PersonRow {
  id: string;
  name: string;
  employeeId: string;
  designation: string;
  injuryType: string;
}

interface FormData {
  title: string;
  incidentDate: string;
  incidentTime: string;
  location: string;
  department: string;
  incidentType: string;
  severity: string;
  description: string;
  persons: PersonRow[];
  bodyPartAffected: string;
  natureOfInjury: string;
  medicalTreatment: boolean;
  daysLost: string;
  rootCauseCategory: string;
  rootCauseDescription: string;
  contributingFactors: string[];
  actionsTaken: string;
  firstAidGiven: boolean;
  areaBarricaded: boolean;
  correctiveAction: string;
  responsiblePerson: string;
  targetDate: string;
  teamLead: string;
  teamMembers: Array<{ id: string; name: string }>;
  investigationDueDate: string;
  attachments: AttachmentMetadata[];
}

const EMPTY_FORM: FormData = {
  title: "",
  incidentDate: "",
  incidentTime: "",
  location: "",
  department: "",
  incidentType: "",
  severity: "",
  description: "",
  persons: [],
  bodyPartAffected: "",
  natureOfInjury: "",
  medicalTreatment: false,
  daysLost: "",
  rootCauseCategory: "",
  rootCauseDescription: "",
  contributingFactors: [],
  actionsTaken: "",
  firstAidGiven: false,
  areaBarricaded: false,
  correctiveAction: "",
  responsiblePerson: "",
  targetDate: "",
  teamLead: "",
  teamMembers: [] as Array<{ id: string; name: string }>,
  investigationDueDate: "",
  attachments: [],
};

function incidentToForm(inc: IncidentRecord): FormData {
  return {
    ...EMPTY_FORM,
    title: inc.title,
    location: inc.location,
    department: inc.department,
    description: inc.description,
    severity: inc.severity,
    correctiveAction: inc.correctiveAction ?? "",
    rootCauseDescription: inc.rootCause ?? "",
    // Extended fields
    persons: (inc.personsInvolved ?? []).map((p) => ({
      id: crypto.randomUUID(),
      name: p.name,
      employeeId: p.employeeId,
      designation: p.role,
      injuryType: p.injuryType,
    })),
    bodyPartAffected: inc.bodyPartAffected ?? "",
    natureOfInjury: inc.natureOfInjury ?? "",
    daysLost: inc.daysLost != null ? String(inc.daysLost) : "",
    medicalTreatment: inc.medicalTreatment ?? false,
    firstAidGiven: inc.firstAidGiven ?? false,
    areaBarricaded: inc.areaBarricaded ?? false,
    rootCauseCategory: inc.rootCauseCategory ?? "",
    contributingFactors: inc.contributingFactors ?? [],
    actionsTaken: inc.actionsTaken ?? "",
    responsiblePerson: inc.responsiblePerson ?? "",
    targetDate: inc.targetDate ?? "",
    teamLead: inc.teamLead ?? "",
    teamMembers: (inc.teamMembers ?? []).map((name) => ({
      id: crypto.randomUUID(),
      name,
    })),
    investigationDueDate: inc.investigationDueDate ?? "",
    attachments: loadAttachments(inc.ticketNumber),
  };
}

function generateTicketNumber(): string {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `INC-${year}-${seq}`;
}

function SectionHeader({
  label,
  step,
  open,
  onToggle,
}: { label: string; step: number; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="w-full flex items-center gap-3 py-3 text-left group transition-smooth"
      onClick={onToggle}
    >
      <span
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{
          background: "rgba(24,195,126,0.15)",
          border: "1px solid rgba(24,195,126,0.3)",
          color: "#18C37E",
        }}
      >
        {step}
      </span>
      <span className="font-display font-semibold text-white/90 flex-1">
        {label}
      </span>
      {open ? (
        <ChevronUp className="w-4 h-4 text-white/30 group-hover:text-white/60" />
      ) : (
        <ChevronDown className="w-4 h-4 text-white/30 group-hover:text-white/60" />
      )}
    </button>
  );
}

function ToggleSwitch({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="w-10 h-5 rounded-full transition-smooth flex-shrink-0 relative"
        style={{
          background: checked ? "#18C37E" : "rgba(255,255,255,0.1)",
          border: `1px solid ${checked ? "#18C37E" : "rgba(255,255,255,0.15)"}`,
        }}
        data-ocid={`incidents.${id}`}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-smooth"
          style={{ left: checked ? "calc(100% - 18px)" : "2px" }}
        />
      </button>
      <label htmlFor={id} className="text-sm text-white/60 cursor-pointer">
        {label}
      </label>
    </div>
  );
}

function WorkflowStepper({ status }: { status: string }) {
  const currentStep = WORKFLOW_STATUS_MAP[status] ?? 0;
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {WORKFLOW_STEPS.map((step, i) => (
        <div key={step} className="flex items-center gap-1">
          <div className="flex items-center gap-1.5">
            {i < currentStep ? (
              <CheckCircle2 className="w-4 h-4 text-[#18C37E]" />
            ) : i === currentStep ? (
              <div className="w-4 h-4 rounded-full border-2 border-[#18C37E] flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-[#18C37E]" />
              </div>
            ) : (
              <Circle className="w-4 h-4 text-white/20" />
            )}
            <span
              className={`text-xs font-medium ${
                i === currentStep
                  ? "text-[#18C37E]"
                  : i < currentStep
                    ? "text-white/50"
                    : "text-white/20"
              }`}
            >
              {step}
            </span>
          </div>
          {i < WORKFLOW_STEPS.length - 1 && (
            <div
              className="w-6 h-px mx-1"
              style={{
                background:
                  i < currentStep ? "#18C37E" : "rgba(255,255,255,0.1)",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function TimelineItem({
  label,
  time,
  active,
}: { label: string; time: string; active: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center gap-1 mt-0.5">
        <div
          className="w-3 h-3 rounded-full border-2 flex-shrink-0"
          style={{
            borderColor: active ? "#18C37E" : "rgba(255,255,255,0.2)",
            background: active ? "rgba(24,195,126,0.2)" : "transparent",
          }}
        />
        <div
          className="w-px h-8"
          style={{ background: "rgba(255,255,255,0.08)" }}
        />
      </div>
      <div className="pb-4">
        <p
          className={`text-sm font-medium ${active ? "text-white" : "text-white/40"}`}
        >
          {label}
        </p>
        <p className="text-xs text-white/30 mt-0.5">{time}</p>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileTypeIcon({ contentType }: { contentType: string }) {
  if (contentType.startsWith("image/"))
    return <ImageIcon className="w-4 h-4 text-blue-400" />;
  if (contentType === "application/pdf")
    return <FileText className="w-4 h-4 text-red-400" />;
  if (contentType.includes("word"))
    return <FileText className="w-4 h-4 text-blue-500" />;
  if (contentType.includes("excel") || contentType.includes("spreadsheet"))
    return <FileSpreadsheet className="w-4 h-4 text-green-400" />;
  return <File className="w-4 h-4 text-white/40" />;
}

function AttachmentChip({
  attachment,
  readOnly,
  onRemove,
  onOpen,
}: {
  attachment: AttachmentMetadata;
  readOnly: boolean;
  onRemove: () => void;
  onOpen: () => void;
}) {
  const isImage = attachment.contentType.startsWith("image/");
  return (
    <div
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 group"
      style={{
        background: attachment.error
          ? "rgba(239,68,68,0.08)"
          : "rgba(255,255,255,0.04)",
        border: attachment.error
          ? "1px solid rgba(239,68,68,0.2)"
          : "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Thumbnail or icon */}
      <div
        className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0 overflow-hidden"
        style={{ background: "rgba(255,255,255,0.05)" }}
      >
        {isImage && attachment.previewUrl ? (
          <img
            src={attachment.previewUrl}
            alt={attachment.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <FileTypeIcon contentType={attachment.contentType} />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={onOpen}
          className="text-sm text-white/80 hover:text-white font-medium truncate block max-w-full text-left transition-colors duration-150"
          title={attachment.name}
        >
          {attachment.name}
        </button>
        <p className="text-xs text-white/30 mt-0.5">
          {formatBytes(attachment.size)}
          {attachment.uploading && (
            <span className="ml-2 text-[#18C37E]">
              Uploading… {attachment.uploadProgress ?? 0}%
            </span>
          )}
          {attachment.error && (
            <span className="ml-2 text-red-400">{attachment.error}</span>
          )}
          {!attachment.uploading &&
            !attachment.error &&
            attachment.storageHash && (
              <span className="ml-2 text-[#18C37E]/60">Uploaded</span>
            )}
        </p>
        {/* Upload progress bar */}
        {attachment.uploading && (
          <div
            className="mt-1.5 h-1 rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${attachment.uploadProgress ?? 0}%`,
                background: "#18C37E",
              }}
            />
          </div>
        )}
      </div>

      {/* Remove button */}
      {!readOnly && (
        <button
          type="button"
          onClick={onRemove}
          className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all duration-150 flex-shrink-0"
          aria-label="Remove attachment"
          data-ocid="incidents.form.remove_attachment_button"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

interface IncidentFormPanelProps {
  mode: "create" | "edit" | "detail";
  incident: IncidentRecord | null;
  onClose: () => void;
}

export function IncidentFormPanel({
  mode,
  incident,
  onClose,
}: IncidentFormPanelProps) {
  const createIncident = useCreateIncident();
  const updateIncident = useUpdateIncident();
  const updateStatus = useUpdateIncidentStatus();
  const { upload, getUrl } = useStorageUpload();

  const ticketNumber = incident?.ticketNumber ?? generateTicketNumber();
  const [form, setForm] = useState<FormData>(
    incident ? incidentToForm(incident) : EMPTY_FORM,
  );
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({
    1: true,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
    7: false,
    8: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newMember, setNewMember] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSection = (n: number) =>
    setOpenSections((prev) => ({ ...prev, [n]: !prev[n] }));

  const set = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      for (const file of fileArray) {
        const err = validateFile(file);
        if (err) {
          toast.error(err);
          continue;
        }
        const id = crypto.randomUUID();
        const pending: AttachmentMetadata = {
          id,
          name: file.name,
          contentType: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          uploading: true,
          uploadProgress: 0,
        };
        setForm((prev) => ({
          ...prev,
          attachments: [...prev.attachments, pending],
        }));
        try {
          const { hash, previewUrl } = await upload(file, (pct) => {
            setForm((prev) => ({
              ...prev,
              attachments: prev.attachments.map((a) =>
                a.id === id ? { ...a, uploadProgress: pct } : a,
              ),
            }));
          });
          setForm((prev) => {
            const updated = prev.attachments.map((a) =>
              a.id === id
                ? {
                    ...a,
                    uploading: false,
                    uploadProgress: 100,
                    storageHash: hash,
                    previewUrl,
                  }
                : a,
            );
            saveAttachments(ticketNumber, updated);
            return { ...prev, attachments: updated };
          });
          toast.success(`"${file.name}" uploaded`);
        } catch {
          setForm((prev) => ({
            ...prev,
            attachments: prev.attachments.map((a) =>
              a.id === id
                ? { ...a, uploading: false, error: "Upload failed" }
                : a,
            ),
          }));
          toast.error(`Failed to upload "${file.name}"`);
        }
      }
    },
    [upload, ticketNumber],
  );

  const removeAttachment = useCallback(
    (id: string) => {
      setForm((prev) => {
        const updated = prev.attachments.filter((a) => a.id !== id);
        saveAttachments(ticketNumber, updated);
        return { ...prev, attachments: updated };
      });
      removeAttachmentFromStorage(ticketNumber, id);
    },
    [ticketNumber],
  );

  const openAttachment = useCallback(
    async (att: AttachmentMetadata) => {
      if (att.previewUrl) {
        window.open(att.previewUrl, "_blank");
        return;
      }
      if (att.storageHash) {
        try {
          const url = await getUrl(att.storageHash);
          window.open(url, "_blank");
        } catch {
          toast.error("Could not open file");
        }
      }
    },
    [getUrl],
  );

  const addPerson = () => {
    set("persons", [
      ...form.persons,
      {
        id: crypto.randomUUID(),
        name: "",
        employeeId: "",
        designation: "",
        injuryType: "",
      },
    ]);
  };

  const updatePerson = (
    i: number,
    field: Exclude<keyof PersonRow, "id">,
    value: string,
  ) => {
    const updated = form.persons.map((p, idx) =>
      idx === i ? { ...p, [field]: value } : p,
    );
    set("persons", updated);
  };

  const removePerson = (i: number) => {
    set(
      "persons",
      form.persons.filter((_, idx) => idx !== i),
    );
  };

  const toggleFactor = (f: string) => {
    set(
      "contributingFactors",
      form.contributingFactors.includes(f)
        ? form.contributingFactors.filter((x) => x !== f)
        : [...form.contributingFactors, f],
    );
  };

  const buildRecord = (status: IncidentStatus): IncidentRecord => ({
    id: incident?.id ?? "",
    ticketNumber,
    title: form.title,
    status,
    description: form.description,
    location: form.location,
    department: form.department,
    severity: form.severity,
    reportedBy: incident?.reportedBy ?? "Current User",
    createdAt: incident?.createdAt ?? BigInt(Date.now() * 1_000_000),
    updatedAt: BigInt(Date.now() * 1_000_000),
    correctiveAction: form.correctiveAction || undefined,
    rootCause: form.rootCauseDescription || undefined,
    // Persons Involved
    personsInvolved:
      form.persons.length > 0
        ? form.persons.map((p) => ({
            name: p.name,
            employeeId: p.employeeId,
            department: form.department,
            role: p.designation,
            injuryType: p.injuryType,
          }))
        : undefined,
    // Injury Details
    bodyPartAffected: form.bodyPartAffected || undefined,
    natureOfInjury: form.natureOfInjury || undefined,
    daysLost: form.daysLost !== "" ? BigInt(Number(form.daysLost)) : undefined,
    medicalTreatment: form.medicalTreatment,
    firstAidGiven: form.firstAidGiven,
    areaBarricaded: form.areaBarricaded,
    // Root Cause
    rootCauseCategory: form.rootCauseCategory || undefined,
    contributingFactors:
      form.contributingFactors.length > 0
        ? form.contributingFactors
        : undefined,
    // Immediate Action
    actionsTaken: form.actionsTaken || undefined,
    // Corrective Action
    responsiblePerson: form.responsiblePerson || undefined,
    targetDate: form.targetDate || undefined,
    // Investigation Team
    teamLead: form.teamLead || undefined,
    teamMembers:
      form.teamMembers.length > 0
        ? form.teamMembers.map((m) => m.name)
        : undefined,
    investigationDueDate: form.investigationDueDate || undefined,
  });

  const handleSave = async (status: IncidentStatus) => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Description is required");
      return;
    }
    setIsSubmitting(true);
    try {
      const record = buildRecord(status);
      if (mode === "edit" && incident) {
        await updateIncident.mutateAsync({ id: incident.id, incident: record });
        toast.success("Incident updated successfully");
      } else {
        // useCreateIncident's onSuccess handles the toast for create flows
        await createIncident.mutateAsync(record);
      }
      onClose();
    } catch (_err) {
      toast.error("Failed to save incident");
    } finally {
      setIsSubmitting(false);
    }
  };

  const INCIDENT_EMAIL_TOASTS: Partial<Record<IncidentStatus, string>> = {
    submitted:
      "Incident submitted — Admin and Safety Officers notified by email",
    underReview: "Incident under investigation — reporter notified by email",
    approved: "Investigation approved — Admin and Safety Officers notified",
    escalated: "Incident escalated — EHS Manager alerted by email",
    closed: "Incident closed successfully",
    rejected: "Incident rejected — reporter notified",
  };

  const handleStatusTransition = async (newStatus: IncidentStatus) => {
    if (!incident) return;
    setIsSubmitting(true);
    try {
      await updateStatus.mutateAsync({ id: incident.id, status: newStatus });
      const emailMsg = INCIDENT_EMAIL_TOASTS[newStatus];
      toast.success(emailMsg ?? `Status updated to ${STATUS_LABEL[newStatus]}`);
      onClose();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReadOnly = mode === "detail";
  const currentStatus = incident?.status ?? "draft";

  const sectionClass = "rounded-xl p-5 space-y-4";
  const sectionStyle = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
  };

  const fieldClass =
    "bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#18C37E]/50";

  return (
    <motion.div
      key="form"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="p-6 space-y-5"
      data-ocid="incidents.form.panel"
    >
      {/* Panel header */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white/50 hover:text-white hover:bg-white/10 h-8 w-8"
          data-ocid="incidents.form.back_button"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="font-display font-bold text-lg text-white">
            {mode === "create"
              ? "Report New Incident"
              : mode === "edit"
                ? `Edit: ${incident?.title}`
                : incident?.title}
          </h2>
          <p className="font-mono text-xs text-[#18C37E] mt-0.5">
            {ticketNumber}
          </p>
        </div>
        {incident && (
          <Badge
            className="text-xs capitalize border"
            style={{
              background: "rgba(255,255,255,0.05)",
              borderColor: "rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            {STATUS_LABEL[currentStatus] ?? currentStatus}
          </Badge>
        )}
      </div>

      {/* Workflow stepper */}
      <div
        className="rounded-xl px-5 py-4"
        style={{
          background: "rgba(24,195,126,0.04)",
          border: "1px solid rgba(24,195,126,0.12)",
        }}
      >
        <WorkflowStepper status={currentStatus} />
      </div>

      {/* SECTION 1 — Incident Information */}
      <div className={sectionClass} style={sectionStyle}>
        <SectionHeader
          label="Incident Information"
          step={1}
          open={openSections[1]}
          onToggle={() => toggleSection(1)}
        />
        {openSections[1] && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label
                htmlFor="inc-ticket"
                className="text-xs text-white/50 font-medium"
              >
                Ticket Number
              </label>
              <Input
                id="inc-ticket"
                value={ticketNumber}
                readOnly
                className="bg-white/5 border-white/10 text-[#18C37E] font-mono opacity-70 cursor-not-allowed"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="inc-title"
                className="text-xs text-white/50 font-medium"
              >
                Title <span className="text-red-400">*</span>
              </label>
              <Input
                id="inc-title"
                placeholder="Brief incident title"
                value={form.title}
                readOnly={isReadOnly}
                onChange={(e) => set("title", e.target.value)}
                className={fieldClass}
                data-ocid="incidents.form.title_input"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="inc-date"
                className="text-xs text-white/50 font-medium"
              >
                Incident Date <span className="text-red-400">*</span>
              </label>
              <Input
                id="inc-date"
                type="date"
                value={form.incidentDate}
                readOnly={isReadOnly}
                onChange={(e) => set("incidentDate", e.target.value)}
                className={fieldClass}
                data-ocid="incidents.form.date_input"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="inc-time"
                className="text-xs text-white/50 font-medium"
              >
                Incident Time
              </label>
              <Input
                id="inc-time"
                type="time"
                value={form.incidentTime}
                readOnly={isReadOnly}
                onChange={(e) => set("incidentTime", e.target.value)}
                className={fieldClass}
                data-ocid="incidents.form.time_input"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="inc-location"
                className="text-xs text-white/50 font-medium"
              >
                Location <span className="text-red-400">*</span>
              </label>
              {isReadOnly ? (
                <Input
                  id="inc-location"
                  value={form.location}
                  readOnly
                  className={`${fieldClass} opacity-60`}
                />
              ) : (
                <Select
                  value={form.location}
                  onValueChange={(v) => set("location", v)}
                >
                  <SelectTrigger
                    id="inc-location"
                    className={fieldClass}
                    data-ocid="incidents.form.location_select"
                  >
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATIONS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="inc-dept"
                className="text-xs text-white/50 font-medium"
              >
                Department
              </label>
              {isReadOnly ? (
                <Input
                  id="inc-dept"
                  value={form.department}
                  readOnly
                  className={`${fieldClass} opacity-60`}
                />
              ) : (
                <Select
                  value={form.department}
                  onValueChange={(v) => set("department", v)}
                >
                  <SelectTrigger
                    id="inc-dept"
                    className={fieldClass}
                    data-ocid="incidents.form.dept_select"
                  >
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="inc-type"
                className="text-xs text-white/50 font-medium"
              >
                Incident Type
              </label>
              {isReadOnly ? (
                <Input
                  id="inc-type"
                  value={form.incidentType}
                  readOnly
                  className={`${fieldClass} opacity-60`}
                />
              ) : (
                <Select
                  value={form.incidentType}
                  onValueChange={(v) => set("incidentType", v)}
                >
                  <SelectTrigger
                    id="inc-type"
                    className={fieldClass}
                    data-ocid="incidents.form.type_select"
                  >
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {INCIDENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="inc-severity"
                className="text-xs text-white/50 font-medium"
              >
                Severity
              </label>
              {isReadOnly ? (
                <Input
                  id="inc-severity"
                  value={form.severity}
                  readOnly
                  className={`${fieldClass} opacity-60`}
                />
              ) : (
                <Select
                  value={form.severity}
                  onValueChange={(v) => set("severity", v)}
                >
                  <SelectTrigger
                    id="inc-severity"
                    className={fieldClass}
                    data-ocid="incidents.form.severity_select"
                  >
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label
                htmlFor="inc-description"
                className="text-xs text-white/50 font-medium"
              >
                Description <span className="text-red-400">*</span>
              </label>
              <Textarea
                id="inc-description"
                placeholder="Describe what happened in detail…"
                value={form.description}
                readOnly={isReadOnly}
                onChange={(e) => set("description", e.target.value)}
                rows={4}
                className={fieldClass}
                data-ocid="incidents.form.description_textarea"
              />
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2 — Persons Involved */}
      <div className={sectionClass} style={sectionStyle}>
        <SectionHeader
          label="Persons Involved"
          step={2}
          open={openSections[2]}
          onToggle={() => toggleSection(2)}
        />
        {openSections[2] && (
          <div className="space-y-3 pt-1">
            {form.persons.map((p, i) => (
              <div
                key={p.id}
                className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-lg relative"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
                data-ocid={`incidents.person.${i + 1}`}
              >
                <div className="space-y-1">
                  <label
                    htmlFor={`person-name-${i}`}
                    className="text-xs text-white/40"
                  >
                    Name
                  </label>
                  <Input
                    id={`person-name-${i}`}
                    value={p.name}
                    readOnly={isReadOnly}
                    onChange={(e) => updatePerson(i, "name", e.target.value)}
                    className={`${fieldClass} h-8 text-xs`}
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor={`person-empid-${i}`}
                    className="text-xs text-white/40"
                  >
                    Employee ID
                  </label>
                  <Input
                    id={`person-empid-${i}`}
                    value={p.employeeId}
                    readOnly={isReadOnly}
                    onChange={(e) =>
                      updatePerson(i, "employeeId", e.target.value)
                    }
                    className={`${fieldClass} h-8 text-xs`}
                    placeholder="EMP-XXXX"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor={`person-desig-${i}`}
                    className="text-xs text-white/40"
                  >
                    Designation
                  </label>
                  <Input
                    id={`person-desig-${i}`}
                    value={p.designation}
                    readOnly={isReadOnly}
                    onChange={(e) =>
                      updatePerson(i, "designation", e.target.value)
                    }
                    className={`${fieldClass} h-8 text-xs`}
                    placeholder="Role / Title"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor={`person-injury-${i}`}
                    className="text-xs text-white/40"
                  >
                    Injury Type
                  </label>
                  <div className="flex gap-1">
                    <Input
                      id={`person-injury-${i}`}
                      value={p.injuryType}
                      readOnly={isReadOnly}
                      onChange={(e) =>
                        updatePerson(i, "injuryType", e.target.value)
                      }
                      className={`${fieldClass} h-8 text-xs`}
                      placeholder="e.g. Burn"
                    />
                    {!isReadOnly && (
                      <button
                        type="button"
                        aria-label="Remove person"
                        className="p-1.5 rounded hover:bg-red-500/10 text-white/30 hover:text-red-400 flex-shrink-0 transition-smooth"
                        onClick={() => removePerson(i)}
                        data-ocid={`incidents.person.remove_button.${i + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {!isReadOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-dashed border-white/20 text-white/50 hover:text-white hover:border-[#18C37E]/50 gap-1.5"
                onClick={addPerson}
                data-ocid="incidents.persons.add_button"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Person
              </Button>
            )}
          </div>
        )}
      </div>

      {/* SECTION 3 — Injury Details */}
      <div className={sectionClass} style={sectionStyle}>
        <SectionHeader
          label="Injury Details"
          step={3}
          open={openSections[3]}
          onToggle={() => toggleSection(3)}
        />
        {openSections[3] && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label
                htmlFor="inc-body-part"
                className="text-xs text-white/50 font-medium"
              >
                Body Part Affected
              </label>
              <Input
                id="inc-body-part"
                placeholder="e.g. Right hand, Left foot"
                value={form.bodyPartAffected}
                readOnly={isReadOnly}
                onChange={(e) => set("bodyPartAffected", e.target.value)}
                className={fieldClass}
                data-ocid="incidents.form.body_part_input"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="inc-days-lost"
                className="text-xs text-white/50 font-medium"
              >
                Days Lost
              </label>
              <Input
                id="inc-days-lost"
                type="number"
                min="0"
                placeholder="0"
                value={form.daysLost}
                readOnly={isReadOnly}
                onChange={(e) => set("daysLost", e.target.value)}
                className={fieldClass}
                data-ocid="incidents.form.days_lost_input"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label
                htmlFor="inc-injury-nature"
                className="text-xs text-white/50 font-medium"
              >
                Nature of Injury
              </label>
              <Textarea
                id="inc-injury-nature"
                placeholder="Describe the nature and extent of the injury"
                value={form.natureOfInjury}
                readOnly={isReadOnly}
                onChange={(e) => set("natureOfInjury", e.target.value)}
                rows={3}
                className={fieldClass}
              />
            </div>
            <ToggleSwitch
              id="medical-treatment"
              checked={form.medicalTreatment}
              onChange={(v) => set("medicalTreatment", v)}
              label="Medical treatment required"
            />
          </div>
        )}
      </div>

      {/* SECTION 4 — Root Cause Analysis */}
      <div className={sectionClass} style={sectionStyle}>
        <SectionHeader
          label="Root Cause Analysis"
          step={4}
          open={openSections[4]}
          onToggle={() => toggleSection(4)}
        />
        {openSections[4] && (
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label
                htmlFor="inc-root-category"
                className="text-xs text-white/50 font-medium"
              >
                Root Cause Category
              </label>
              {isReadOnly ? (
                <Input
                  id="inc-root-category"
                  value={form.rootCauseCategory}
                  readOnly
                  className={`${fieldClass} opacity-60`}
                />
              ) : (
                <Select
                  value={form.rootCauseCategory}
                  onValueChange={(v) => set("rootCauseCategory", v)}
                >
                  <SelectTrigger
                    id="inc-root-category"
                    className={fieldClass}
                    data-ocid="incidents.form.root_cause_select"
                  >
                    <SelectValue placeholder="Select root cause category" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOT_CAUSE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="inc-root-desc"
                className="text-xs text-white/50 font-medium"
              >
                Root Cause Description
              </label>
              <Textarea
                id="inc-root-desc"
                placeholder="Describe the underlying root cause"
                value={form.rootCauseDescription}
                readOnly={isReadOnly}
                onChange={(e) => set("rootCauseDescription", e.target.value)}
                rows={3}
                className={fieldClass}
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-white/50 font-medium">
                Contributing Factors
              </p>
              <div className="grid grid-cols-2 gap-2">
                {CONTRIBUTING_FACTORS.map((f) => (
                  <label
                    key={f}
                    className="flex items-center gap-2 text-sm text-white/60 cursor-pointer hover:text-white transition-smooth"
                  >
                    <input
                      type="checkbox"
                      disabled={isReadOnly}
                      checked={form.contributingFactors.includes(f)}
                      onChange={() => toggleFactor(f)}
                      className="accent-[#18C37E] w-3.5 h-3.5"
                      data-ocid={`incidents.factor.${f.toLowerCase().replace(/\s+/g, "_")}`}
                    />
                    {f}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 5 — Immediate Action */}
      <div className={sectionClass} style={sectionStyle}>
        <SectionHeader
          label="Immediate Action Taken"
          step={5}
          open={openSections[5]}
          onToggle={() => toggleSection(5)}
        />
        {openSections[5] && (
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label
                htmlFor="inc-actions"
                className="text-xs text-white/50 font-medium"
              >
                Actions Taken
              </label>
              <Textarea
                id="inc-actions"
                placeholder="Describe the immediate actions taken after the incident"
                value={form.actionsTaken}
                readOnly={isReadOnly}
                onChange={(e) => set("actionsTaken", e.target.value)}
                rows={3}
                className={fieldClass}
                data-ocid="incidents.form.actions_taken_textarea"
              />
            </div>
            <div className="flex gap-6 flex-wrap">
              <ToggleSwitch
                id="first-aid"
                checked={form.firstAidGiven}
                onChange={(v) => set("firstAidGiven", v)}
                label="First aid given"
              />
              <ToggleSwitch
                id="area-barricaded"
                checked={form.areaBarricaded}
                onChange={(v) => set("areaBarricaded", v)}
                label="Area barricaded"
              />
            </div>
          </div>
        )}
      </div>

      {/* SECTION 6 — Corrective Action */}
      <div className={sectionClass} style={sectionStyle}>
        <SectionHeader
          label="Corrective Action"
          step={6}
          open={openSections[6]}
          onToggle={() => toggleSection(6)}
        />
        {openSections[6] && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5 md:col-span-2">
              <label
                htmlFor="inc-corrective"
                className="text-xs text-white/50 font-medium"
              >
                Action Description
              </label>
              <Textarea
                id="inc-corrective"
                placeholder="Describe the corrective actions to be taken"
                value={form.correctiveAction}
                readOnly={isReadOnly}
                onChange={(e) => set("correctiveAction", e.target.value)}
                rows={3}
                className={fieldClass}
                data-ocid="incidents.form.corrective_action_textarea"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="inc-responsible"
                className="text-xs text-white/50 font-medium"
              >
                Responsible Person
              </label>
              {isReadOnly ? (
                <Input
                  id="inc-responsible"
                  value={form.responsiblePerson}
                  readOnly
                  className={`${fieldClass} opacity-60`}
                />
              ) : (
                <Select
                  value={form.responsiblePerson}
                  onValueChange={(v) => set("responsiblePerson", v)}
                >
                  <SelectTrigger
                    id="inc-responsible"
                    className={fieldClass}
                    data-ocid="incidents.form.responsible_select"
                  >
                    <SelectValue placeholder="Assign to" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_MEMBERS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="inc-target-date"
                className="text-xs text-white/50 font-medium"
              >
                Target Date
              </label>
              <Input
                id="inc-target-date"
                type="date"
                value={form.targetDate}
                readOnly={isReadOnly}
                onChange={(e) => set("targetDate", e.target.value)}
                className={fieldClass}
                data-ocid="incidents.form.target_date_input"
              />
            </div>
          </div>
        )}
      </div>

      {/* SECTION 7 — Investigation Team */}
      <div className={sectionClass} style={sectionStyle}>
        <SectionHeader
          label="Investigation Team"
          step={7}
          open={openSections[7]}
          onToggle={() => toggleSection(7)}
        />
        {openSections[7] && (
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="inc-team-lead"
                  className="text-xs text-white/50 font-medium"
                >
                  Team Lead
                </label>
                <Input
                  id="inc-team-lead"
                  placeholder="Investigation team lead name"
                  value={form.teamLead}
                  readOnly={isReadOnly}
                  onChange={(e) => set("teamLead", e.target.value)}
                  className={fieldClass}
                  data-ocid="incidents.form.team_lead_input"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="inc-inv-date"
                  className="text-xs text-white/50 font-medium"
                >
                  Investigation Due Date
                </label>
                <Input
                  id="inc-inv-date"
                  type="date"
                  value={form.investigationDueDate}
                  readOnly={isReadOnly}
                  onChange={(e) => set("investigationDueDate", e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-white/50 font-medium">Team Members</p>
              {form.teamMembers.map((m, i) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2"
                  data-ocid={`incidents.team_member.${i + 1}`}
                >
                  <span className="flex-1 text-sm text-white/70 bg-white/5 border border-white/10 rounded px-3 py-1.5">
                    {m.name}
                  </span>
                  {!isReadOnly && (
                    <button
                      type="button"
                      aria-label="Remove team member"
                      className="p-1 hover:text-red-400 text-white/30 transition-smooth"
                      onClick={() =>
                        set(
                          "teamMembers",
                          form.teamMembers.filter((_, idx) => idx !== i),
                        )
                      }
                      data-ocid={`incidents.team_member.remove_button.${i + 1}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {!isReadOnly && (
                <div className="flex gap-2">
                  <Input
                    id="inc-new-member"
                    placeholder="Add team member name"
                    value={newMember}
                    onChange={(e) => setNewMember(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newMember.trim()) {
                        set("teamMembers", [
                          ...form.teamMembers,
                          { id: crypto.randomUUID(), name: newMember.trim() },
                        ]);
                        setNewMember("");
                      }
                    }}
                    className={`${fieldClass} flex-1`}
                    data-ocid="incidents.form.team_member_input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-white/10 text-white/60 hover:border-[#18C37E]/50 hover:text-white"
                    onClick={() => {
                      if (newMember.trim()) {
                        set("teamMembers", [
                          ...form.teamMembers,
                          { id: crypto.randomUUID(), name: newMember.trim() },
                        ]);
                        setNewMember("");
                      }
                    }}
                    data-ocid="incidents.form.team_member_add_button"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 8 — Attachments */}
      <div className={sectionClass} style={sectionStyle}>
        <SectionHeader
          label="Attachments"
          step={8}
          open={openSections[8]}
          onToggle={() => toggleSection(8)}
        />
        {openSections[8] && (
          <div className="space-y-3 pt-1">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              multiple
              className="sr-only"
              onChange={(e) => {
                if (e.target.files) processFiles(e.target.files);
                e.target.value = "";
              }}
              data-ocid="incidents.form.file_input"
            />

            {/* Dropzone */}
            {!isReadOnly && (
              <div
                className="rounded-xl border-2 border-dashed flex flex-col items-center gap-3 py-10 px-6 transition-all duration-200"
                style={{
                  borderColor: isDragOver
                    ? "rgba(24,195,126,0.6)"
                    : "rgba(255,255,255,0.1)",
                  background: isDragOver
                    ? "rgba(24,195,126,0.06)"
                    : "transparent",
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
                }}
                data-ocid="incidents.form.dropzone"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200"
                  style={{
                    background: isDragOver
                      ? "rgba(24,195,126,0.2)"
                      : "rgba(24,195,126,0.1)",
                    border: "1px solid rgba(24,195,126,0.2)",
                  }}
                >
                  <Upload className="w-5 h-5 text-[#18C37E]" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-white/60 font-medium">
                    Drag &amp; drop or click to upload
                  </p>
                  <p className="text-xs text-white/30 mt-1">
                    Images, PDF, Word, Excel — max 10 MB each
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-white/10 text-white/50 hover:text-white"
                  onClick={() => fileInputRef.current?.click()}
                  data-ocid="incidents.form.upload_button"
                >
                  Browse Files
                </Button>
              </div>
            )}

            {/* Uploaded file chips */}
            {form.attachments.length > 0 && (
              <div className="space-y-2">
                {form.attachments.map((att) => (
                  <AttachmentChip
                    key={att.id}
                    attachment={att}
                    readOnly={isReadOnly}
                    onRemove={() => removeAttachment(att.id)}
                    onOpen={() => openAttachment(att)}
                  />
                ))}
              </div>
            )}

            {form.attachments.length === 0 && isReadOnly && (
              <p className="text-sm text-white/30 text-center py-4">
                No attachments
              </p>
            )}
          </div>
        )}
      </div>

      {/* Timeline (detail mode only) */}
      {mode === "detail" && incident && (
        <div className={sectionClass} style={sectionStyle}>
          <h3 className="font-display font-semibold text-white/80 text-sm mb-4">
            Timeline History
          </h3>
          <div className="space-y-0">
            <TimelineItem
              label="Incident Created"
              time={new Date(
                Number(incident.createdAt) / 1_000_000,
              ).toLocaleString()}
              active={true}
            />
            {incident.status !== "draft" && (
              <TimelineItem
                label="Submitted for Review"
                time={new Date(
                  Number(incident.updatedAt) / 1_000_000,
                ).toLocaleString()}
                active={true}
              />
            )}
            {(incident.status === "underReview" ||
              incident.status === "approved" ||
              incident.status === "closed") && (
              <TimelineItem
                label="Under Review"
                time={new Date(
                  Number(incident.updatedAt) / 1_000_000,
                ).toLocaleString()}
                active={true}
              />
            )}
            {(incident.status === "approved" ||
              incident.status === "closed") && (
              <TimelineItem
                label="Approved"
                time={new Date(
                  Number(incident.updatedAt) / 1_000_000,
                ).toLocaleString()}
                active={true}
              />
            )}
            {incident.status === "closed" && (
              <TimelineItem
                label="Closed"
                time={new Date(
                  Number(incident.updatedAt) / 1_000_000,
                ).toLocaleString()}
                active={true}
              />
            )}
          </div>
        </div>
      )}

      {/* Workflow Actions + Form Submit */}
      <div
        className="sticky bottom-0 pt-4 pb-2 flex flex-wrap items-center gap-3"
        style={{
          background:
            "linear-gradient(to top, rgba(8,20,38,0.98) 70%, transparent)",
        }}
      >
        {/* Edit/Create mode: Save + Submit */}
        {(mode === "create" || mode === "edit") && (
          <>
            <Button
              type="button"
              variant="outline"
              className="border-white/10 text-white/60 hover:text-white hover:border-white/20"
              onClick={() => handleSave(IncidentStatus.draft)}
              disabled={isSubmitting}
              data-ocid="incidents.form.save_draft_button"
            >
              Save as Draft
            </Button>
            <Button
              type="button"
              className="font-semibold gap-2"
              style={{ background: "#18C37E", color: "#081426" }}
              onClick={() => handleSave(IncidentStatus.submitted)}
              disabled={isSubmitting}
              data-ocid="incidents.form.submit_button"
            >
              {isSubmitting ? "Saving…" : "Submit for Review"}
            </Button>
          </>
        )}

        {/* Detail mode: workflow transitions */}
        {mode === "detail" && incident && (
          <>
            {currentStatus === "draft" && (
              <Button
                type="button"
                className="font-semibold"
                style={{ background: "#18C37E", color: "#081426" }}
                onClick={() => handleStatusTransition(IncidentStatus.submitted)}
                disabled={isSubmitting}
                data-ocid="incidents.workflow.submit_button"
              >
                Submit for Review
              </Button>
            )}
            {currentStatus === "submitted" && (
              <Button
                type="button"
                className="font-semibold"
                style={{
                  background: "rgba(234,179,8,0.15)",
                  border: "1px solid rgba(234,179,8,0.3)",
                  color: "#fbbf24",
                }}
                onClick={() =>
                  handleStatusTransition(IncidentStatus.underReview)
                }
                disabled={isSubmitting}
                data-ocid="incidents.workflow.review_button"
              >
                Mark Under Review
              </Button>
            )}
            {currentStatus === "underReview" && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  className="font-semibold"
                  style={{ background: "#18C37E", color: "#081426" }}
                  onClick={() =>
                    handleStatusTransition(IncidentStatus.approved)
                  }
                  disabled={isSubmitting}
                  data-ocid="incidents.workflow.approve_button"
                >
                  Approve
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="font-semibold border-red-500/30 text-red-400 hover:bg-red-500/10"
                  onClick={() =>
                    handleStatusTransition(IncidentStatus.rejected)
                  }
                  disabled={isSubmitting}
                  data-ocid="incidents.workflow.reject_button"
                >
                  Reject
                </Button>
              </div>
            )}
            {currentStatus === "approved" && (
              <Button
                type="button"
                variant="outline"
                className="font-semibold border-white/20 text-white/60 hover:text-white"
                onClick={() => handleStatusTransition(IncidentStatus.closed)}
                disabled={isSubmitting}
                data-ocid="incidents.workflow.close_button"
              >
                Close Incident
              </Button>
            )}
          </>
        )}

        <Button
          type="button"
          variant="ghost"
          className="text-white/40 hover:text-white ml-auto"
          onClick={onClose}
          data-ocid="incidents.form.cancel_button"
        >
          Cancel
        </Button>
      </div>
    </motion.div>
  );
}
