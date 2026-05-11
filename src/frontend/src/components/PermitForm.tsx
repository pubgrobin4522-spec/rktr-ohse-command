import { type PermitRecord, PermitStatus, PermitType } from "@/backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  HAZARD_LIBRARY,
  PERMIT_TYPE_HAZARD_IDS,
} from "@/constants/hazardLibrary";
import type { HazardLibraryEntry } from "@/constants/hazardLibrary";
import { RKTR_LOCATIONS } from "@/constants/locations";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft,
  ChevronRight,
  Container,
  Flame,
  MoveUp,
  Plus,
  Save,
  Search,
  Send,
  Shovel,
  Trash2,
  Truck,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const PERMIT_TYPES: {
  key: PermitType;
  label: string;
  icon: React.ReactNode;
  color: string;
  desc: string;
}[] = [
  {
    key: PermitType.hotWork,
    label: "Hot Work",
    icon: <Flame className="w-6 h-6" />,
    color: "#f97316",
    desc: "Welding, cutting, grinding, open flames",
  },
  {
    key: PermitType.electrical,
    label: "Electrical",
    icon: <Zap className="w-6 h-6" />,
    color: "#eab308",
    desc: "HV/LV electrical isolation and work",
  },
  {
    key: PermitType.excavation,
    label: "Excavation",
    icon: <Shovel className="w-6 h-6" />,
    color: "#8b5cf6",
    desc: "Digging, trenching, soil disturbance",
  },
  {
    key: PermitType.heightWork,
    label: "Height Work",
    icon: <MoveUp className="w-6 h-6" />,
    color: "#3b82f6",
    desc: "Work above 2m elevation",
  },
  {
    key: PermitType.confinedSpace,
    label: "Confined Space",
    icon: <Container className="w-6 h-6" />,
    color: "#ef4444",
    desc: "Enclosed area atmospheric hazards",
  },
  {
    key: PermitType.lineBreaking,
    label: "Line Breaking",
    icon: <Wrench className="w-6 h-6" />,
    color: "#06b6d4",
    desc: "Pipeline, process line operations",
  },
  {
    key: "liftingPermit" as PermitType,
    label: "Lifting Permit",
    icon: <Truck className="w-6 h-6" />,
    color: "#a855f7",
    desc: "Crane/hoist lifts over 8 tonnes",
  },
  {
    key: "generalWorkPermit" as PermitType,
    label: "General Work Permit",
    icon: <Wrench className="w-6 h-6" />,
    color: "#64748b",
    desc: "General maintenance and work activities",
  },
];

const LOCATIONS = RKTR_LOCATIONS;

const PPE_OPTIONS = [
  "Hard Hat",
  "Safety Glasses",
  "Gloves",
  "Safety Shoes",
  "Harness",
  "Fire Suit",
  "Respirator",
  "Hearing Protection",
  "Face Shield",
  "Hi-Vis Vest",
];

const ISOLATION_TYPES = ["Electrical", "Mechanical", "Process", "Pressure"];

function generatePermitNumber(): string {
  const year = new Date().getFullYear();
  const num = String(Math.floor(Math.random() * 9000) + 1000);
  return `PTW-${year}-${num}`;
}

function SectionHeader({
  title,
  icon,
  step,
}: { title: string; icon: React.ReactNode; step: number }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-mono"
        style={{
          background: "rgba(24,195,126,0.15)",
          color: "#18C37E",
          border: "1px solid rgba(24,195,126,0.25)",
        }}
      >
        {step}
      </div>
      <div className="flex items-center gap-2">
        <span style={{ color: "#18C37E" }}>{icon}</span>
        <h3 className="font-display font-semibold text-white">{title}</h3>
      </div>
    </div>
  );
}

function GlassSection({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-5 mb-4"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {children}
    </div>
  );
}

interface LocalEmergencyContact {
  name: string;
  role: string;
  phone: string;
}

interface FormState {
  permitType: PermitType | "";
  permitNumber: string;
  jobDescription: string;
  location: string;
  requestedBy: string;
  startTime: string;
  endTime: string;
  supervisorOnDuty: string;
  hazards: string[];
  controls: string[];
  emergencyContacts: LocalEmergencyContact[];
  oxygenLevel: string;
  flammableGas: string;
  toxicGas: string;
  testedBy: string;
  testTime: string;
  isolationTypes: string[];
  isolationVerifiedBy: string;
  lotoApplied: boolean;
  ppeSelected: string[];
  additionalPpe: string;
  toolboxConductedBy: string;
  toolboxDateTime: string;
  attendeesCount: string;
  toolboxKeyPoints: string;
  signatures: Record<string, boolean>;
}

const INITIAL_STATE: FormState = {
  permitType: "",
  permitNumber: generatePermitNumber(),
  jobDescription: "",
  location: "",
  requestedBy: "EHS Manager",
  startTime: "",
  endTime: "",
  supervisorOnDuty: "",
  hazards: [""],
  controls: [""],
  emergencyContacts: [{ name: "", role: "", phone: "" }],
  oxygenLevel: "",
  flammableGas: "",
  toxicGas: "",
  testedBy: "",
  testTime: "",
  isolationTypes: [],
  isolationVerifiedBy: "",
  lotoApplied: false,
  ppeSelected: ["Hard Hat", "Safety Shoes"],
  additionalPpe: "",
  toolboxConductedBy: "",
  toolboxDateTime: "",
  attendeesCount: "",
  toolboxKeyPoints: "",
  signatures: {
    requester: false,
    safetyOfficer: false,
    areaSupervisor: false,
    ehsManager: false,
  },
};

interface HazardControlRow {
  id: string;
  libraryId?: number;
  hazardType: string;
  examples: string;
  controlMeasures: string;
  residualRisk: string;
  selected: boolean;
  isCustom: boolean;
}

export default function PermitForm({
  onBack,
  onSubmit,
  isPending,
}: {
  onBack: () => void;
  onSubmit: (permit: PermitRecord) => void;
  isPending: boolean;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>({
    ...INITIAL_STATE,
    requestedBy: user?.name ?? "EHS Manager",
  });
  const [hazardRows, setHazardRows] = useState<HazardControlRow[]>([]);
  const [hazardSearch, setHazardSearch] = useState("");
  const [showAllHazards, setShowAllHazards] = useState(false);
  const [customCount, setCustomCount] = useState(0);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const syncHazardRowsToForm = (rows: HazardControlRow[]) => {
    const selected = rows.filter((r) => r.selected);
    setForm((prev) => ({
      ...prev,
      hazards: selected.map((r) => r.hazardType),
      controls: selected.map((r) => r.controlMeasures),
    }));
  };

  useEffect(() => {
    const permitType = form.permitType as string;
    const preSelectedIds: number[] = PERMIT_TYPE_HAZARD_IDS[permitType] ?? [];
    const rows: HazardControlRow[] = HAZARD_LIBRARY.map(
      (entry: HazardLibraryEntry) => ({
        id: String(entry.id),
        libraryId: entry.id,
        hazardType: entry.hazardType,
        examples: entry.examples,
        controlMeasures: entry.defaultControls,
        residualRisk: "Low",
        selected: preSelectedIds.includes(entry.id),
        isCustom: false,
      }),
    );
    setHazardRows(rows);
    const selected = rows.filter((r) => r.selected);
    setForm((prev) => ({
      ...prev,
      hazards: selected.map((r) => r.hazardType),
      controls: selected.map((r) => r.controlMeasures),
    }));
  }, [form.permitType]);

  const toggleHazardRow = (rowId: string, checked: boolean) => {
    setHazardRows((prev) => {
      const next = prev.map((r) =>
        r.id === rowId ? { ...r, selected: checked } : r,
      );
      syncHazardRowsToForm(next);
      return next;
    });
  };

  const updateHazardControl = (rowId: string, controlMeasures: string) => {
    setHazardRows((prev) => {
      const next = prev.map((r) =>
        r.id === rowId ? { ...r, controlMeasures } : r,
      );
      syncHazardRowsToForm(next);
      return next;
    });
  };

  const updateHazardResidualRisk = (rowId: string, residualRisk: string) => {
    setHazardRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, residualRisk } : r)),
    );
  };

  const addCustomHazard = () => {
    const n = customCount + 1;
    setCustomCount(n);
    setHazardRows((prev) => [
      ...prev,
      {
        id: `custom-${n}`,
        hazardType: "",
        examples: "",
        controlMeasures: "",
        residualRisk: "Low",
        selected: true,
        isCustom: true,
      },
    ]);
  };

  const removeCustomHazard = (rowId: string) => {
    setHazardRows((prev) => {
      const next = prev.filter((r) => r.id !== rowId);
      syncHazardRowsToForm(next);
      return next;
    });
  };

  const updateCustomHazardType = (rowId: string, hazardType: string) => {
    setHazardRows((prev) => {
      const next = prev.map((r) => (r.id === rowId ? { ...r, hazardType } : r));
      syncHazardRowsToForm(next);
      return next;
    });
  };

  const userRole = user?.role ?? "";
  // Only supervisors and system admin can raise/draft permits
  const canRaiseDraft = userRole === "supervisor" || userRole === "systemAdmin";

  const needsGasTesting =
    form.permitType === PermitType.hotWork ||
    form.permitType === PermitType.confinedSpace;

  const buildRecord = (status: PermitStatus): PermitRecord => ({
    id: "",
    permitNumber: form.permitNumber,
    permitType: form.permitType as PermitType,
    jobDescription: form.jobDescription,
    location: form.location,
    requestedBy: user?.name ?? form.requestedBy,
    startTime: BigInt(
      form.startTime
        ? new Date(form.startTime).getTime() * 1_000_000
        : Date.now() * 1_000_000,
    ),
    endTime: BigInt(
      form.endTime
        ? new Date(form.endTime).getTime() * 1_000_000
        : (Date.now() + 86_400_000) * 1_000_000,
    ),
    status,
    hazards: form.hazards.filter(Boolean),
    ppeRequired: form.ppeSelected,
    createdAt: BigInt(Date.now() * 1_000_000),
    approvedBy: undefined,
    reviewedBy: undefined,
    // Hazard controls — pair each hazard with its matching control measure
    hazardControls:
      form.hazards.filter(Boolean).length > 0
        ? form.hazards.filter(Boolean).map((hazard, i) => ({
            hazard,
            control: form.controls[i] ?? "",
            residualRisk: "Low",
          }))
        : undefined,
    // Gas testing results
    gasTestResults:
      needsGasTesting &&
      (form.oxygenLevel || form.flammableGas || form.toxicGas)
        ? {
            oxygenLevel: form.oxygenLevel,
            flammableGas: form.flammableGas,
            toxicGas: form.toxicGas,
            testedBy: form.testedBy,
            testTime: form.testTime,
          }
        : undefined,
    // Isolation
    isolationTypes:
      form.isolationTypes.length > 0 ? form.isolationTypes : undefined,
    isolationVerifiedBy: form.isolationVerifiedBy || undefined,
    lotoApplied: form.lotoApplied,
    // Toolbox talk
    toolboxTalk:
      form.toolboxConductedBy || form.toolboxKeyPoints
        ? {
            conductedBy: form.toolboxConductedBy,
            conductedAt: form.toolboxDateTime,
            attendeesCount: BigInt(Number(form.attendeesCount) || 0),
            keyPoints: form.toolboxKeyPoints,
          }
        : undefined,
    // Authorization signatures
    signatures: {
      requestedBySignature: form.signatures.requester ? "signed" : "",
      supervisorSignature: form.signatures.areaSupervisor ? "signed" : "",
      safetyOfficerSignature: form.signatures.safetyOfficer ? "signed" : "",
    },
    // Emergency contacts
    emergencyContacts:
      form.emergencyContacts.filter((ec) => ec.name).length > 0
        ? form.emergencyContacts
            .filter((ec) => ec.name)
            .map((ec) => ({ name: ec.name, role: ec.role, phone: ec.phone }))
        : undefined,
    // Supervisor on duty
    supervisorOnDuty: form.supervisorOnDuty || undefined,
  });

  const SIGNER_LABELS: Record<string, string> = {
    requester: "Permit Requester",
    safetyOfficer: "Safety Officer",
    areaSupervisor: "Area Supervisor",
    ehsManager: "EHS Manager",
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 max-w-4xl mx-auto"
      data-ocid="permits.form"
    >
      {/* Form header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-white/50 hover:text-white gap-2"
          onClick={onBack}
          data-ocid="permits.back_button"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <ChevronRight className="w-4 h-4 text-white/20" />
        <h2 className="font-display font-bold text-lg text-white">
          Create New Permit
        </h2>
        <div
          className="ml-auto font-mono text-xs px-3 py-1 rounded-md"
          style={{
            background: "rgba(24,195,126,0.1)",
            color: "#18C37E",
            border: "1px solid rgba(24,195,126,0.2)",
          }}
        >
          {form.permitNumber}
        </div>
      </div>

      {/* Section 1 — Permit Type */}
      <GlassSection>
        <SectionHeader
          title="Permit Type"
          icon={<Flame className="w-4 h-4" />}
          step={1}
        />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {PERMIT_TYPES.map((pt) => {
            const selected = form.permitType === pt.key;
            return (
              <button
                key={pt.key}
                type="button"
                onClick={() => setField("permitType", pt.key)}
                className="text-left p-4 rounded-xl transition-smooth"
                style={{
                  background: selected
                    ? `${pt.color}18`
                    : "rgba(255,255,255,0.03)",
                  border: `2px solid ${selected ? pt.color : "rgba(255,255,255,0.08)"}`,
                }}
                data-ocid={`permits.type_select.${pt.key}`}
              >
                <div
                  className="flex items-center gap-2 mb-1.5"
                  style={{ color: pt.color }}
                >
                  {pt.icon}
                  <span className="font-semibold text-white text-sm">
                    {pt.label}
                  </span>
                </div>
                <p className="text-xs text-white/40 leading-snug">{pt.desc}</p>
              </button>
            );
          })}
        </div>
      </GlassSection>

      {/* Section 2 — Job Details */}
      <GlassSection>
        <SectionHeader
          title="Job Details"
          icon={<Save className="w-4 h-4" />}
          step={2}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="jobDesc" className="text-white/60 text-xs">
              Job Description *
            </Label>
            <Textarea
              id="jobDesc"
              value={form.jobDescription}
              onChange={(e) => setField("jobDescription", e.target.value)}
              placeholder="Describe the work to be performed..."
              rows={3}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
              data-ocid="permits.job_description_input"
            />
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="location" className="text-white/60 text-xs">
                Work Location *
              </Label>
              <select
                id="location"
                value={form.location}
                onChange={(e) => setField("location", e.target.value)}
                className="w-full h-9 px-3 rounded-md text-sm bg-white/5 border border-white/10 text-white"
                data-ocid="permits.location_select"
              >
                <option value="" className="bg-[#081426]">
                  Select location…
                </option>
                {LOCATIONS.map((l) => (
                  <option key={l} value={l} className="bg-[#081426]">
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="supervisor" className="text-white/60 text-xs">
                Supervisor on Duty
              </Label>
              <Input
                id="supervisor"
                value={form.supervisorOnDuty}
                onChange={(e) => setField("supervisorOnDuty", e.target.value)}
                placeholder="Supervisor name"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                data-ocid="permits.supervisor_input"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="requestedBy" className="text-white/60 text-xs">
              Requested By
            </Label>
            <Input
              id="requestedBy"
              value={form.requestedBy}
              onChange={(e) => setField("requestedBy", e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              data-ocid="permits.requested_by_input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="permitNum" className="text-white/60 text-xs">
              Permit Number (auto)
            </Label>
            <Input
              id="permitNum"
              value={form.permitNumber}
              readOnly
              className="bg-white/5 border-white/10 text-white/50 font-mono cursor-not-allowed"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="startTime" className="text-white/60 text-xs">
              Start Date &amp; Time *
            </Label>
            <Input
              id="startTime"
              type="datetime-local"
              value={form.startTime}
              onChange={(e) => setField("startTime", e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              data-ocid="permits.start_time_input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="endTime" className="text-white/60 text-xs">
              End Date &amp; Time *
            </Label>
            <Input
              id="endTime"
              type="datetime-local"
              value={form.endTime}
              onChange={(e) => setField("endTime", e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              data-ocid="permits.end_time_input"
            />
          </div>
        </div>
      </GlassSection>

      {/* Section 3 — Hazard Controls */}
      <GlassSection>
        {/* Header row with count badge */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-mono"
            style={{
              background: "rgba(24,195,126,0.15)",
              color: "#18C37E",
              border: "1px solid rgba(24,195,126,0.25)",
            }}
          >
            3
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span style={{ color: "#18C37E" }}>
              <Wrench className="w-4 h-4" />
            </span>
            <h3 className="font-display font-semibold text-white">
              Hazard Controls
            </h3>
          </div>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: "rgba(24,195,126,0.2)", color: "#18C37E" }}
          >
            {hazardRows.filter((r) => r.selected).length} hazards identified
          </span>
        </div>

        {/* Search + toggle row */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              type="text"
              value={hazardSearch}
              onChange={(e) => setHazardSearch(e.target.value)}
              placeholder="Search hazards…"
              className="w-full h-8 pl-8 pr-3 rounded-md text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#18C37E]/50"
              data-ocid="permits.hazard_search_input"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowAllHazards((v) => !v)}
            className="h-8 px-3 rounded-md text-xs font-medium transition-colors"
            style={{
              background: showAllHazards
                ? "rgba(24,195,126,0.2)"
                : "rgba(255,255,255,0.06)",
              color: showAllHazards ? "#18C37E" : "rgba(255,255,255,0.5)",
              border: `1px solid ${showAllHazards ? "rgba(24,195,126,0.4)" : "rgba(255,255,255,0.1)"}`,
            }}
            data-ocid="permits.hazard_toggle_button"
          >
            {showAllHazards
              ? "Show selected only"
              : `Show all ${HAZARD_LIBRARY.length} hazards`}
          </button>
        </div>

        {/* Hazard rows list */}
        <div
          className="max-h-96 overflow-y-auto space-y-1.5 pr-1"
          data-ocid="permits.hazard_list"
        >
          {(() => {
            const search = hazardSearch.trim().toLowerCase();
            const visible = hazardRows.filter((row) => {
              if (search) {
                return (
                  row.hazardType.toLowerCase().includes(search) ||
                  row.examples.toLowerCase().includes(search) ||
                  row.controlMeasures.toLowerCase().includes(search)
                );
              }
              return showAllHazards || row.selected || row.isCustom;
            });

            if (visible.length === 0 && form.permitType) {
              return (
                <p className="text-xs text-white/30 italic py-3 text-center">
                  No hazards match your search.
                </p>
              );
            }
            if (!form.permitType) {
              return (
                <p className="text-xs text-white/30 italic py-3 text-center">
                  Select a permit type above to load pre-selected hazards.
                </p>
              );
            }

            return visible.map((row) => (
              <div
                key={row.id}
                className="rounded-lg p-3 transition-colors"
                style={{
                  background: row.selected
                    ? "rgba(24,195,126,0.08)"
                    : "rgba(255,255,255,0.03)",
                  borderLeft: `4px solid ${
                    row.selected ? "#18C37E" : "transparent"
                  }`,
                  border: `1px solid ${
                    row.selected
                      ? "rgba(24,195,126,0.2)"
                      : "rgba(255,255,255,0.06)"
                  }`,
                  borderLeftWidth: "4px",
                }}
                data-ocid={`permits.hazard_row.${row.id}`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={row.selected}
                    onChange={(e) => toggleHazardRow(row.id, e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded accent-[#18C37E] flex-shrink-0"
                    data-ocid={`permits.hazard_checkbox.${row.id}`}
                  />
                  <div className="flex-1 min-w-0">
                    {row.isCustom ? (
                      <input
                        type="text"
                        value={row.hazardType}
                        onChange={(e) =>
                          updateCustomHazardType(row.id, e.target.value)
                        }
                        placeholder="Hazard type…"
                        className="w-full bg-transparent border-b border-white/20 text-sm font-semibold text-white placeholder:text-white/30 focus:outline-none focus:border-[#18C37E]/60 pb-0.5 mb-1"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-white leading-snug">
                        {row.hazardType}
                      </p>
                    )}
                    {!row.isCustom && row.examples && (
                      <p className="text-xs text-white/40 italic mt-0.5 mb-2">
                        {row.examples}
                      </p>
                    )}
                    {/* Control Measures editable input */}
                    <div className="mt-1.5 flex items-center gap-2">
                      <label
                        htmlFor={`ctrl-${row.id}`}
                        className="text-xs text-white/40 whitespace-nowrap flex-shrink-0"
                      >
                        Controls:
                      </label>
                      <input
                        id={`ctrl-${row.id}`}
                        type="text"
                        value={row.controlMeasures}
                        onChange={(e) =>
                          updateHazardControl(row.id, e.target.value)
                        }
                        placeholder="Enter control measures…"
                        className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#18C37E]/50"
                        data-ocid={`permits.hazard_control_input.${row.id}`}
                      />
                      {/* Residual Risk */}
                      <select
                        value={row.residualRisk}
                        onChange={(e) =>
                          updateHazardResidualRisk(row.id, e.target.value)
                        }
                        className="h-7 px-2 rounded text-xs bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#18C37E]/50"
                        data-ocid={`permits.hazard_risk_select.${row.id}`}
                      >
                        <option value="Low" className="bg-[#081426]">
                          Low
                        </option>
                        <option value="Medium" className="bg-[#081426]">
                          Medium
                        </option>
                        <option value="High" className="bg-[#081426]">
                          High
                        </option>
                      </select>
                    </div>
                  </div>
                  {/* Delete button for custom rows */}
                  {row.isCustom && (
                    <button
                      type="button"
                      onClick={() => removeCustomHazard(row.id)}
                      className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/20 text-red-400/60 hover:text-red-400 transition-colors"
                      data-ocid={`permits.hazard_delete_button.${row.id}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ));
          })()}
        </div>

        {/* Add Custom Hazard */}
        {form.permitType && (
          <button
            type="button"
            onClick={addCustomHazard}
            className="mt-2 flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
            data-ocid="permits.add_custom_hazard_button"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Custom Hazard
          </button>
        )}

        {/* Emergency Contacts — kept in Section 3 as before */}
        <div className="mt-5">
          <p className="text-xs text-white/40 mb-2 uppercase tracking-wide">
            Emergency Contacts
          </p>
          <div className="space-y-2">
            {form.emergencyContacts.map((ec, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: dynamic list, no stable id
              <div key={`ec-${i}`} className="flex gap-2">
                <Input
                  value={ec.name}
                  onChange={(e) =>
                    setField(
                      "emergencyContacts",
                      form.emergencyContacts.map((c, idx) =>
                        idx === i ? { ...c, name: e.target.value } : c,
                      ),
                    )
                  }
                  placeholder="Contact name"
                  className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
                <Input
                  value={ec.role}
                  onChange={(e) =>
                    setField(
                      "emergencyContacts",
                      form.emergencyContacts.map((c, idx) =>
                        idx === i ? { ...c, role: e.target.value } : c,
                      ),
                    )
                  }
                  placeholder="Role (e.g. EHS Manager)"
                  className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
                <Input
                  value={ec.phone}
                  onChange={(e) =>
                    setField(
                      "emergencyContacts",
                      form.emergencyContacts.map((c, idx) =>
                        idx === i ? { ...c, phone: e.target.value } : c,
                      ),
                    )
                  }
                  placeholder="Phone number"
                  className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-red-400/60 hover:text-red-400 px-2"
                  onClick={() =>
                    setField(
                      "emergencyContacts",
                      form.emergencyContacts.filter((_, idx) => idx !== i),
                    )
                  }
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-white/40 hover:text-white/70 gap-1"
              onClick={() =>
                setField("emergencyContacts", [
                  ...form.emergencyContacts,
                  { name: "", role: "", phone: "" },
                ])
              }
            >
              <Plus className="w-3 h-3" />
              Add Contact
            </Button>
          </div>
        </div>
      </GlassSection>

      {/* Section 4 — Gas Testing (conditional) */}
      <AnimatePresence>
        {needsGasTesting && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <GlassSection>
              <SectionHeader
                title="Gas Testing"
                icon={<Zap className="w-4 h-4" />}
                step={4}
              />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="o2" className="text-white/60 text-xs">
                    Oxygen Level (%)
                  </Label>
                  <Input
                    id="o2"
                    type="number"
                    value={form.oxygenLevel}
                    onChange={(e) => setField("oxygenLevel", e.target.value)}
                    placeholder="20.9"
                    className="bg-white/5 border-white/10 text-white"
                    data-ocid="permits.oxygen_input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="flam" className="text-white/60 text-xs">
                    Flammable Gas (%LEL)
                  </Label>
                  <Input
                    id="flam"
                    type="number"
                    value={form.flammableGas}
                    onChange={(e) => setField("flammableGas", e.target.value)}
                    placeholder="0"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="toxic" className="text-white/60 text-xs">
                    Toxic Gas (ppm)
                  </Label>
                  <Input
                    id="toxic"
                    type="number"
                    value={form.toxicGas}
                    onChange={(e) => setField("toxicGas", e.target.value)}
                    placeholder="0"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="testedBy" className="text-white/60 text-xs">
                    Tested By
                  </Label>
                  <Input
                    id="testedBy"
                    value={form.testedBy}
                    onChange={(e) => setField("testedBy", e.target.value)}
                    placeholder="Name"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="testTime" className="text-white/60 text-xs">
                    Test Time
                  </Label>
                  <Input
                    id="testTime"
                    type="time"
                    value={form.testTime}
                    onChange={(e) => setField("testTime", e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>
            </GlassSection>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Section 5 — Isolation */}
      <GlassSection>
        <SectionHeader
          title="Isolation Verification"
          icon={<Container className="w-4 h-4" />}
          step={needsGasTesting ? 5 : 4}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-white/40 mb-2 uppercase tracking-wide">
              Isolation Types
            </p>
            <div className="grid grid-cols-2 gap-2">
              {ISOLATION_TYPES.map((iso) => (
                <label
                  key={iso}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={form.isolationTypes.includes(iso)}
                    onChange={(e) =>
                      setField(
                        "isolationTypes",
                        e.target.checked
                          ? [...form.isolationTypes, iso]
                          : form.isolationTypes.filter((t) => t !== iso),
                      )
                    }
                    className="w-4 h-4 rounded accent-[#18C37E]"
                    data-ocid={`permits.isolation_${iso.toLowerCase()}_checkbox`}
                  />
                  <span className="text-sm text-white/70">{iso}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="isoVerifiedBy" className="text-white/60 text-xs">
                Verified By
              </Label>
              <Input
                id="isoVerifiedBy"
                value={form.isolationVerifiedBy}
                onChange={(e) =>
                  setField("isolationVerifiedBy", e.target.value)
                }
                placeholder="Name"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.lotoApplied}
                onChange={(e) => setField("lotoApplied", e.target.checked)}
                className="w-4 h-4 rounded accent-[#18C37E]"
                data-ocid="permits.loto_checkbox"
              />
              <span className="text-sm text-white/70">LOTO Applied</span>
            </label>
          </div>
        </div>
      </GlassSection>

      {/* Section 6 — PPE Checklist */}
      <GlassSection>
        <SectionHeader
          title="PPE Checklist"
          icon={<MoveUp className="w-4 h-4" />}
          step={needsGasTesting ? 6 : 5}
        />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
          {PPE_OPTIONS.map((ppe) => (
            <label
              key={ppe}
              className="flex items-center gap-1.5 cursor-pointer p-2 rounded-lg transition-smooth"
              style={{
                background: form.ppeSelected.includes(ppe)
                  ? "rgba(24,195,126,0.12)"
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${
                  form.ppeSelected.includes(ppe)
                    ? "rgba(24,195,126,0.3)"
                    : "rgba(255,255,255,0.06)"
                }`,
              }}
            >
              <input
                type="checkbox"
                checked={form.ppeSelected.includes(ppe)}
                onChange={(e) =>
                  setField(
                    "ppeSelected",
                    e.target.checked
                      ? [...form.ppeSelected, ppe]
                      : form.ppeSelected.filter((p) => p !== ppe),
                  )
                }
                className="w-3.5 h-3.5 accent-[#18C37E]"
                data-ocid={`permits.ppe_${ppe.toLowerCase().replace(/ /g, "_")}_checkbox`}
              />
              <span className="text-xs text-white/70">{ppe}</span>
            </label>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="addPpe" className="text-white/60 text-xs">
            Additional PPE
          </Label>
          <Input
            id="addPpe"
            value={form.additionalPpe}
            onChange={(e) => setField("additionalPpe", e.target.value)}
            placeholder="Specify any additional PPE..."
            className="bg-white/5 border-white/10 text-white"
          />
        </div>
      </GlassSection>

      {/* Section 7 — Toolbox Talk */}
      <GlassSection>
        <SectionHeader
          title="Toolbox Talk"
          icon={<Wrench className="w-4 h-4" />}
          step={needsGasTesting ? 7 : 6}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="toolboxConductedBy"
              className="text-white/60 text-xs"
            >
              Conducted By
            </Label>
            <Input
              id="toolboxConductedBy"
              value={form.toolboxConductedBy}
              onChange={(e) => setField("toolboxConductedBy", e.target.value)}
              placeholder="Name"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="toolboxDT" className="text-white/60 text-xs">
              Date &amp; Time
            </Label>
            <Input
              id="toolboxDT"
              type="datetime-local"
              value={form.toolboxDateTime}
              onChange={(e) => setField("toolboxDateTime", e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="attendees" className="text-white/60 text-xs">
              Attendees Count
            </Label>
            <Input
              id="attendees"
              type="number"
              value={form.attendeesCount}
              onChange={(e) => setField("attendeesCount", e.target.value)}
              placeholder="0"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="keyPoints" className="text-white/60 text-xs">
              Key Points Discussed
            </Label>
            <Textarea
              id="keyPoints"
              value={form.toolboxKeyPoints}
              onChange={(e) => setField("toolboxKeyPoints", e.target.value)}
              rows={3}
              placeholder="Key safety points discussed..."
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
            />
          </div>
        </div>
      </GlassSection>

      {/* Section 8 — Authorization Signatures */}
      <GlassSection>
        <SectionHeader
          title="Authorization Signatures"
          icon={<Send className="w-4 h-4" />}
          step={needsGasTesting ? 8 : 7}
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(SIGNER_LABELS).map(([key, label]) => (
            <div
              key={key}
              className="rounded-xl p-4 text-center"
              style={{
                background: form.signatures[key]
                  ? "rgba(24,195,126,0.08)"
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${
                  form.signatures[key]
                    ? "rgba(24,195,126,0.25)"
                    : "rgba(255,255,255,0.08)"
                }`,
              }}
            >
              <p className="text-xs text-white/40 mb-3 leading-tight">
                {label}
              </p>
              {form.signatures[key] ? (
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      background: "rgba(24,195,126,0.2)",
                      color: "#18C37E",
                    }}
                  >
                    ✓
                  </div>
                  <span className="text-xs" style={{ color: "#18C37E" }}>
                    Signed
                  </span>
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-xs text-white/40 hover:text-white border border-white/10 hover:border-white/20"
                  onClick={() =>
                    setField("signatures", { ...form.signatures, [key]: true })
                  }
                  data-ocid={`permits.sign_${key}_button`}
                >
                  Sign
                </Button>
              )}
            </div>
          ))}
        </div>
      </GlassSection>

      {/* Form Actions */}
      <div
        className="flex items-center justify-between gap-3 p-4 rounded-xl sticky bottom-4"
        style={{
          background: "rgba(8,20,38,0.9)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(12px)",
        }}
      >
        <Button
          type="button"
          variant="ghost"
          className="text-white/50 hover:text-white"
          onClick={onBack}
        >
          Cancel
        </Button>
        <div className="flex gap-2">
          {canRaiseDraft && (
            <Button
              type="button"
              variant="outline"
              className="gap-2 border-white/20 text-white/70 hover:text-white"
              onClick={() => onSubmit(buildRecord(PermitStatus.draft))}
              disabled={!form.permitType || !form.jobDescription || isPending}
              data-ocid="permits.save_draft_button"
            >
              <Save className="w-4 h-4" />
              Save as Draft
            </Button>
          )}
          {canRaiseDraft && (
            <Button
              type="button"
              className="gap-2 font-semibold"
              style={{ background: "#18C37E", color: "#081426" }}
              onClick={() => onSubmit(buildRecord(PermitStatus.submitted))}
              disabled={
                !form.permitType ||
                !form.jobDescription ||
                !form.location ||
                isPending
              }
              data-ocid="permits.submit_button"
            >
              <Send className="w-4 h-4" />
              {isPending ? "Submitting…" : "Submit for Review"}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
