import { type PermitRecord, PermitStatus } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { STATUS_COLORS } from "@/types";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Container,
  Flame,
  MapPin,
  MoveUp,
  PlayCircle,
  Printer,
  QrCode,
  Shovel,
  StopCircle,
  Timer,
  Truck,
  User,
  Wrench,
  XCircle,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

const PERMIT_TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  hotWork: {
    label: "Hot Work",
    icon: <Flame className="w-5 h-5" />,
    color: "#f97316",
  },
  electrical: {
    label: "Electrical",
    icon: <Zap className="w-5 h-5" />,
    color: "#eab308",
  },
  excavation: {
    label: "Excavation",
    icon: <Shovel className="w-5 h-5" />,
    color: "#8b5cf6",
  },
  heightWork: {
    label: "Height Work",
    icon: <MoveUp className="w-5 h-5" />,
    color: "#3b82f6",
  },
  confinedSpace: {
    label: "Confined Space",
    icon: <Container className="w-5 h-5" />,
    color: "#ef4444",
  },
  lineBreaking: {
    label: "Line Breaking",
    icon: <Wrench className="w-5 h-5" />,
    color: "#06b6d4",
  },
  liftingPermit: {
    label: "Lifting Permit",
    icon: <Truck className="w-5 h-5" />,
    color: "#a855f7",
  },
  generalWorkPermit: {
    label: "General Work Permit",
    icon: <Wrench className="w-5 h-5" />,
    color: "#64748b",
  },
};

const WORKFLOW_STEPS = [
  { key: "draft", label: "Draft", sub: "Raised by Supervisor" },
  { key: "submitted", label: "Submitted", sub: "Awaiting area review" },
  {
    key: "underReview",
    label: "Under Review",
    sub: "Area In-Charge confirms precautions",
  },
  { key: "validated", label: "Validated", sub: "Department HOD confirmed" },
  { key: "approved", label: "Approved", sub: "Safety Officer approved" },
  { key: "active", label: "Active", sub: "Permit in progress" },
  { key: "closed", label: "Closed", sub: "Work completed" },
];

function WorkflowStepper({ currentStatus }: { currentStatus: string }) {
  const stepKeys = WORKFLOW_STEPS.map((s) => s.key);
  const currentIdx = stepKeys.indexOf(currentStatus);
  const isRejected =
    currentStatus === "rejected" || currentStatus === "expired";

  return (
    <div className="flex items-start gap-1 overflow-x-auto pb-1">
      {WORKFLOW_STEPS.map((step, i) => {
        const isDone = !isRejected && i <= currentIdx;
        const isCurrent = step.key === currentStatus;
        return (
          <div key={step.key} className="flex items-start gap-1 shrink-0">
            <div className="flex flex-col items-center gap-0.5">
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-smooth"
                style={{
                  background: isDone
                    ? "rgba(24,195,126,0.2)"
                    : "rgba(255,255,255,0.05)",
                  border: `1px solid ${
                    isDone ? "rgba(24,195,126,0.4)" : "rgba(255,255,255,0.1)"
                  }`,
                  color: isCurrent
                    ? "#18C37E"
                    : isDone
                      ? "rgba(24,195,126,0.8)"
                      : "rgba(255,255,255,0.35)",
                }}
              >
                {isDone && <CheckCircle className="w-3 h-3" />}
                {step.label}
              </div>
              {step.sub && (
                <p
                  className="text-[10px] text-center leading-tight px-1"
                  style={{
                    color: isCurrent
                      ? "rgba(24,195,126,0.7)"
                      : "rgba(255,255,255,0.2)",
                    maxWidth: "90px",
                  }}
                >
                  {step.sub}
                </p>
              )}
            </div>
            {i < WORKFLOW_STEPS.length - 1 && (
              <div
                className="w-5 h-px mt-3 shrink-0"
                style={{
                  background:
                    isDone && !isRejected
                      ? "rgba(24,195,126,0.4)"
                      : "rgba(255,255,255,0.1)",
                }}
              />
            )}
          </div>
        );
      })}
      {isRejected && (
        <Badge
          variant="outline"
          className="ml-2 border-red-500/30 text-red-400 bg-red-500/10"
        >
          {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
        </Badge>
      )}
    </div>
  );
}

function PermitQrCard({ permit }: { permit: PermitRecord }) {
  const conf = PERMIT_TYPE_CONFIG[permit.permitType];
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);

  const fmt = (ts: bigint) =>
    new Date(Number(ts) / 1_000_000).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const qrPayload = `${window.location.origin}/permit-scan?id=${encodeURIComponent(permit.id)}`;

  useEffect(() => {
    QRCode.toDataURL(qrPayload, {
      width: 224,
      margin: 2,
      color: { dark: "#081426", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrError(true));
  }, [qrPayload]);

  // Top 3 hazards for the QR card summary
  const topHazards = (permit.hazardControls ?? []).slice(0, 3);
  const extraHazards = (permit.hazardControls?.length ?? 0) - 3;

  const handleDownloadPdf = async () => {
    if (!qrDataUrl) return;
    const { jsPDF } = await import("jspdf");

    // Calculate dynamic height based on number of hazards
    const hazardRows = permit.hazardControls ?? [];
    const extraHeight =
      hazardRows.length > 0 ? 10 + hazardRows.length * 8 + 6 : 0;
    const pageH = 120 + extraHeight;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [85, pageH],
    });

    doc.setFillColor(8, 20, 38);
    doc.rect(0, 0, 85, pageH, "F");

    doc.setFillColor(24, 195, 126);
    doc.rect(0, 0, 85, 18, "F");

    doc.setTextColor(8, 20, 38);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text("RKTR WHEELS \u2014 PERMIT TO WORK", 42.5, 7, { align: "center" });
    doc.setFontSize(10);
    doc.text((conf?.label ?? permit.permitType).toUpperCase(), 42.5, 14, {
      align: "center",
    });

    doc.addImage(qrDataUrl, "PNG", 22.5, 22, 40, 40);

    doc.setTextColor(24, 195, 126);
    doc.setFontSize(9);
    doc.setFont("courier", "bold");
    doc.text(permit.permitNumber, 42.5, 68, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const rows: [string, string][] = [
      ["Job:", permit.jobDescription.substring(0, 32)],
      ["Location:", permit.location],
      ["Requested By:", permit.requestedBy],
      ["Valid From:", fmt(permit.startTime)],
      ["Valid To:", fmt(permit.endTime)],
      ["Status:", permit.status.toUpperCase()],
    ];
    let y = 76;
    for (const [label, value] of rows) {
      doc.setTextColor(100, 150, 190);
      doc.text(label, 8, y);
      doc.setTextColor(210, 230, 250);
      doc.text(value, 30, y);
      y += 6;
    }

    // Hazard Controls section
    if (hazardRows.length > 0) {
      y += 2;
      // Section header bar
      doc.setFillColor(234, 179, 8);
      doc.rect(8, y, 69, 5, "F");
      doc.setTextColor(8, 20, 38);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.text(`KEY HAZARDS & CONTROLS (${hazardRows.length})`, 42.5, y + 3.5, {
        align: "center",
      });
      y += 7;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      for (const hc of hazardRows) {
        const riskLabel = hc.residualRisk ?? "Low";
        const riskColor: [number, number, number] =
          riskLabel === "High"
            ? [239, 68, 68]
            : riskLabel === "Medium"
              ? [234, 179, 8]
              : [24, 195, 126];
        doc.setTextColor(riskColor[0], riskColor[1], riskColor[2]);
        doc.text("\u2022", 9, y);
        doc.setTextColor(210, 230, 250);
        doc.text(hc.hazard.substring(0, 36), 13, y);
        doc.setTextColor(riskColor[0], riskColor[1], riskColor[2]);
        doc.text(`[${riskLabel}]`, 77, y, { align: "right" });
        if (hc.control) {
          y += 4;
          doc.setTextColor(140, 160, 180);
          doc.text(`  Controls: ${hc.control.substring(0, 42)}`, 13, y);
        }
        y += 5;
      }
    }

    // Footer
    const footerY = pageH - 5;
    doc.setDrawColor(24, 195, 126);
    doc.setLineWidth(0.3);
    doc.line(8, footerY - 3, 77, footerY - 3);
    doc.setTextColor(24, 195, 126);
    doc.setFontSize(6);
    doc.text("Scan QR to view full permit details", 42.5, footerY, {
      align: "center",
    });

    doc.save(`permit-${permit.permitNumber}.pdf`);
  };

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <QrCode className="w-4 h-4" style={{ color: "#18C37E" }} />
        <h4 className="text-sm font-semibold text-white">Permit QR Card</h4>
        <span
          className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium"
          style={{
            background: "rgba(24,195,126,0.15)",
            color: "#18C37E",
            border: "1px solid rgba(24,195,126,0.3)",
          }}
        >
          {permit.status.toUpperCase()}
        </span>
      </div>

      {/* Physical card preview */}
      <div
        className="rounded-lg overflow-hidden mb-4 mx-auto"
        style={{
          background: "#081426",
          border: "2px solid #18C37E",
          maxWidth: "220px",
          boxShadow: "0 0 24px rgba(24,195,126,0.18)",
        }}
      >
        {/* Card header band */}
        <div
          className="px-3 py-2 text-center"
          style={{ background: "#18C37E" }}
        >
          <p className="font-bold text-xs" style={{ color: "#081426" }}>
            RKTR WHEELS \u2014 PERMIT TO WORK
          </p>
          <p className="font-bold text-sm" style={{ color: "#081426" }}>
            {(conf?.label ?? permit.permitType).toUpperCase()}
          </p>
        </div>

        {/* QR code area */}
        <div className="flex justify-center py-4 px-4">
          {qrError ? (
            <div
              className="w-28 h-28 flex items-center justify-center rounded-lg"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              <p className="text-xs text-center">QR unavailable</p>
            </div>
          ) : qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR code for permit ${permit.permitNumber}`}
              className="rounded-lg"
              style={{ width: 112, height: 112 }}
            />
          ) : (
            <div
              className="w-28 h-28 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <div
                className="w-6 h-6 rounded-full border-2 animate-spin"
                style={{
                  borderColor: "#18C37E",
                  borderTopColor: "transparent",
                }}
              />
            </div>
          )}
        </div>

        {/* Permit number */}
        <div className="text-center pb-2">
          <p
            className="font-mono text-sm font-bold"
            style={{ color: "#18C37E" }}
          >
            {permit.permitNumber}
          </p>
        </div>

        {/* Details strip */}
        <div
          className="px-3 pb-3 space-y-1"
          style={{ borderTop: "1px solid rgba(24,195,126,0.2)" }}
        >
          <div className="flex justify-between items-center pt-2">
            <span
              className="text-xs"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Location
            </span>
            <span
              className="text-xs font-medium"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              {permit.location}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span
              className="text-xs"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Requested By
            </span>
            <span
              className="text-xs font-medium"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              {permit.requestedBy}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span
              className="text-xs"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Valid To
            </span>
            <span className="text-xs font-medium" style={{ color: "#18C37E" }}>
              {fmt(permit.endTime)}
            </span>
          </div>
        </div>

        {/* Key Hazards summary on card */}
        {topHazards.length > 0 && (
          <div
            style={{
              borderTop: "1px solid rgba(234,179,8,0.3)",
              background: "rgba(234,179,8,0.06)",
              padding: "8px 12px",
            }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-wide mb-1"
              style={{ color: "rgba(234,179,8,0.8)" }}
            >
              Key Hazards
            </p>
            <ul className="space-y-0.5">
              {topHazards.map((hc) => {
                const riskColor =
                  hc.residualRisk === "High"
                    ? "#ef4444"
                    : hc.residualRisk === "Medium"
                      ? "#eab308"
                      : "#18C37E";
                return (
                  <li
                    key={hc.hazard}
                    className="flex items-center justify-between gap-1"
                  >
                    <span
                      className="text-[10px] truncate"
                      style={{ color: "rgba(255,255,255,0.7)" }}
                    >
                      • {hc.hazard}
                    </span>
                    <span
                      className="text-[9px] font-semibold flex-shrink-0"
                      style={{ color: riskColor }}
                    >
                      {hc.residualRisk ?? "Low"}
                    </span>
                  </li>
                );
              })}
            </ul>
            {extraHazards > 0 && (
              <p
                className="text-[10px] mt-0.5"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                +{extraHazards} more hazard{extraHazards !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div
          className="px-3 py-1.5 text-center"
          style={{
            background: "rgba(24,195,126,0.08)",
            borderTop: "1px solid rgba(24,195,126,0.2)",
          }}
        >
          <p className="text-xs" style={{ color: "rgba(24,195,126,0.7)" }}>
            Scan to view full permit details
          </p>
        </div>
      </div>

      <Button
        type="button"
        size="sm"
        className="w-full gap-2 font-semibold"
        style={{ background: "#18C37E", color: "#081426" }}
        onClick={handleDownloadPdf}
        disabled={!qrDataUrl}
        data-ocid="permits.download_qr_button"
      >
        <Printer className="w-3.5 h-3.5" />
        Download QR Card (PDF)
      </Button>
    </div>
  );
}

function CountdownTimer({ endTime }: { endTime: bigint }) {
  const [remaining, setRemaining] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const update = () => {
      const end = Number(endTime) / 1_000_000;
      const now = Date.now();
      const diff = end - now;
      if (diff <= 0) {
        setRemaining("EXPIRED");
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setIsUrgent(diff < 3_600_000);
      setRemaining(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
      );
    };
    update();
    const id = setInterval(update, 1_000);
    return () => clearInterval(id);
  }, [endTime]);

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{
        background: isUrgent ? "rgba(239,68,68,0.12)" : "rgba(249,115,22,0.1)",
        border: `1px solid ${isUrgent ? "rgba(239,68,68,0.3)" : "rgba(249,115,22,0.25)"}`,
      }}
    >
      <Timer
        className="w-5 h-5"
        style={{ color: isUrgent ? "#ef4444" : "#f97316" }}
      />
      <div>
        <p className="text-xs text-white/40">Permit Expires In</p>
        <p
          className="font-mono text-lg font-bold"
          style={{ color: isUrgent ? "#ef4444" : "#f97316" }}
        >
          {remaining}
        </p>
      </div>
    </div>
  );
}

// Role-based action rules per status
// Returns list of allowed actions for the given role at the given status
// Role-based action rules per status
// Returns list of allowed actions for the given role at the given status
function getRoleActions(
  status: string,
  role: string,
  userEmail?: string,
): {
  label: string;
  nextStatus: PermitStatus;
  icon: React.ReactNode;
  color: string;
  variant: "default" | "destructive" | "outline";
}[] {
  const isSumesh = userEmail === "sumesh.j@rktrwheels.com";
  const canApprove = role === "safetyOfficer" || isSumesh;
  // Only supervisor or systemAdmin can close (not employee)
  const canClose = role === "supervisor" || isSumesh;

  const rejectAction = {
    label: "Reject",
    nextStatus: PermitStatus.rejected,
    icon: <XCircle className="w-4 h-4" />,
    color: "#ef4444",
    variant: "destructive" as const,
  };

  switch (status) {
    case "draft":
      // Only supervisors (and systemAdmin) can submit from draft
      if (role === "supervisor" || isSumesh) {
        return [
          {
            label: "Submit for Review",
            nextStatus: PermitStatus.submitted,
            icon: <CheckCircle className="w-4 h-4" />,
            color: "#18C37E",
            variant: "default",
          },
        ];
      }
      return [];

    case "submitted":
      // Area In-Charge takes for review and confirms precautions
      if (role === "areaInCharge" || isSumesh) {
        return [
          {
            label: "Take for Review",
            nextStatus: PermitStatus.underReview,
            icon: <PlayCircle className="w-4 h-4" />,
            color: "#eab308",
            variant: "default",
          },
          rejectAction,
        ];
      }
      return [];

    case "underReview":
      // Department HOD validates — confirms all precautions in place
      if (role === "departmentHOD" || isSumesh) {
        return [
          {
            label: "Validate — Precautions Confirmed",
            nextStatus: PermitStatus.validated,
            icon: <CheckCircle className="w-4 h-4" />,
            color: "#06b6d4",
            variant: "default",
          },
          rejectAction,
        ];
      }
      return [];

    case "validated":
      // Safety Officer or Sumesh J approves
      if (canApprove) {
        return [
          {
            label: "Approve Permit",
            nextStatus: PermitStatus.approved,
            icon: <CheckCircle className="w-4 h-4" />,
            color: "#18C37E",
            variant: "default",
          },
          rejectAction,
        ];
      }
      return [];

    case "approved":
      // Safety Officer or Sumesh J activates
      if (canApprove) {
        return [
          {
            label: "Activate Permit",
            nextStatus: PermitStatus.active,
            icon: <PlayCircle className="w-4 h-4" />,
            color: "#18C37E",
            variant: "default",
          },
          rejectAction,
        ];
      }
      return [];

    case "active":
      // Only supervisor or systemAdmin can close
      if (canClose) {
        return [
          {
            label: "Close Permit",
            nextStatus: PermitStatus.closed,
            icon: <StopCircle className="w-4 h-4" />,
            color: "#64748b",
            variant: "outline",
          },
        ];
      }
      return [];

    default:
      return [];
  }
}

// Friendly waiting message for users who can't act at this step
// Friendly waiting message for users who can't act at this step
function getWaitingMessage(status: string): string {
  switch (status) {
    case "draft":
      return "Waiting for Supervisor to submit for review";
    case "submitted":
      return "Waiting for Area In-Charge to review precautions";
    case "underReview":
      return "Waiting for Department HOD to validate";
    case "validated":
      return "Waiting for Safety Officer or System Admin to approve";
    case "approved":
      return "Waiting for Safety Officer to activate the permit";
    case "active":
      return "Waiting for Supervisor to close the permit";
    default:
      return "No further action required";
  }
}

export default function PermitDetailView({
  permit,
  onBack,
  onStatusChange,
  isUpdating,
}: {
  permit: PermitRecord;
  onBack: () => void;
  onStatusChange: (id: string, status: PermitStatus) => void;
  isUpdating: boolean;
}) {
  const { user } = useAuth();
  const userRole = user?.role ?? "";
  const userEmail = user?.email ?? "";
  const actions = getRoleActions(permit.status, userRole, userEmail);
  const canAct = actions.length > 0;
  const isTerminal = ["closed", "rejected", "expired"].includes(permit.status);
  const showWaiting = !canAct && !isTerminal;

  const typeConf =
    PERMIT_TYPE_CONFIG[permit.permitType] ?? PERMIT_TYPE_CONFIG.hotWork;
  const showQR = [
    "submitted",
    "underReview",
    "validated",
    "approved",
    "active",
    "closed",
  ].includes(permit.status);
  const showTimer = permit.status === "active";

  const fmt = (ts: bigint) =>
    new Date(Number(ts) / 1_000_000).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const statusLabel =
    permit.status === "underReview"
      ? "Under Review"
      : permit.status === "validated"
        ? "Validated"
        : permit.status.charAt(0).toUpperCase() + permit.status.slice(1);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6"
      data-ocid="permits.detail"
    >
      {/* Header */}
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
        <div className="w-px h-5 bg-white/10" />
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${typeConf.color}22`, color: typeConf.color }}
        >
          {typeConf.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-mono text-xs text-white/40">
              {permit.permitNumber}
            </p>
            <Badge
              variant="outline"
              className={`text-xs border ${
                STATUS_COLORS[permit.status as string] ??
                "bg-muted text-muted-foreground"
              }`}
            >
              {statusLabel}
            </Badge>
          </div>
          <h2 className="font-display font-bold text-lg text-white">
            {typeConf.label} Permit
          </h2>
        </div>
      </div>

      {/* Workflow Stepper */}
      <div
        className="p-4 rounded-xl mb-6"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <p className="text-xs text-white/40 mb-3 uppercase tracking-wider">
          Workflow Progress
        </p>
        <WorkflowStepper currentStatus={permit.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-4">
          {showTimer && <CountdownTimer endTime={permit.endTime} />}

          {/* Key details */}
          <div
            className="rounded-xl p-5"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <h4 className="text-sm font-semibold text-white mb-4">
              Permit Details
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-white/40 mb-1">Job Description</p>
                <p className="text-sm text-white/80">{permit.jobDescription}</p>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-1">Location</p>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-white/40" />
                  <p className="text-sm text-white/80">{permit.location}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-1">Requested By</p>
                <div className="flex items-center gap-1.5">
                  <User className="w-3 h-3 text-white/40" />
                  <p className="text-sm text-white/80">{permit.requestedBy}</p>
                </div>
              </div>
              {permit.approvedBy && (
                <div>
                  <p className="text-xs text-white/40 mb-1">Approved By</p>
                  <p className="text-sm text-white/80">{permit.approvedBy}</p>
                </div>
              )}
              {permit.reviewedBy && (
                <div>
                  <p className="text-xs text-white/40 mb-1">Reviewed By</p>
                  <p className="text-sm text-white/80">{permit.reviewedBy}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-white/40 mb-1">Start Time</p>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-white/40" />
                  <p className="text-sm text-white/80">
                    {fmt(permit.startTime)}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-1">End Time</p>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-white/40" />
                  <p className="text-sm text-white/80">{fmt(permit.endTime)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Identified Hazards & Control Measures — prominent section for all non-draft statuses */}
          {permit.status !== "draft" && (
            <>
              {/* Hazard Controls — detailed view with residual risk badges */}
              {permit.hazardControls && permit.hazardControls.length > 0 && (
                <div
                  className="rounded-xl overflow-hidden"
                  style={{
                    border: "2px solid rgba(234,179,8,0.4)",
                    background: "rgba(234,179,8,0.04)",
                  }}
                  data-ocid="permits.hazard_controls_section"
                >
                  {/* Section header */}
                  <div
                    className="flex items-center gap-2 px-5 py-3"
                    style={{
                      background: "rgba(234,179,8,0.12)",
                      borderBottom: "1px solid rgba(234,179,8,0.25)",
                    }}
                  >
                    <AlertTriangle
                      className="w-4 h-4 shrink-0"
                      style={{ color: "#eab308" }}
                    />
                    <h4
                      className="text-sm font-bold"
                      style={{ color: "#eab308" }}
                    >
                      Identified Hazards &amp; Control Measures
                    </h4>
                    <span
                      className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(234,179,8,0.2)",
                        color: "#eab308",
                        border: "1px solid rgba(234,179,8,0.3)",
                      }}
                    >
                      {permit.hazardControls.length} hazard
                      {permit.hazardControls.length !== 1 ? "s" : ""} identified
                    </span>
                  </div>
                  {/* Hazard rows */}
                  <div
                    className="divide-y"
                    style={{ borderColor: "rgba(234,179,8,0.12)" }}
                  >
                    {permit.hazardControls.map((hc, idx) => {
                      const riskColor =
                        hc.residualRisk === "High"
                          ? {
                              bg: "rgba(239,68,68,0.2)",
                              text: "#ef4444",
                              border: "rgba(239,68,68,0.35)",
                            }
                          : hc.residualRisk === "Medium"
                            ? {
                                bg: "rgba(234,179,8,0.2)",
                                text: "#eab308",
                                border: "rgba(234,179,8,0.35)",
                              }
                            : {
                                bg: "rgba(24,195,126,0.2)",
                                text: "#18C37E",
                                border: "rgba(24,195,126,0.35)",
                              };
                      return (
                        <div
                          // biome-ignore lint/suspicious/noArrayIndexKey: static display list
                          key={`hc-${idx}`}
                          className="px-5 py-3"
                          data-ocid={`permits.hazard_control_item.${idx + 1}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2 min-w-0 flex-1">
                              <AlertTriangle
                                className="w-3.5 h-3.5 mt-0.5 shrink-0"
                                style={{ color: "#f97316" }}
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-white leading-snug">
                                  {hc.hazard}
                                </p>
                                {hc.control && (
                                  <p
                                    className="text-xs mt-1 leading-relaxed"
                                    style={{ color: "rgba(255,255,255,0.55)" }}
                                  >
                                    <span
                                      style={{
                                        color: "rgba(255,255,255,0.35)",
                                      }}
                                    >
                                      Controls:{" "}
                                    </span>
                                    {hc.control}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span
                              className="text-xs font-semibold px-2 py-1 rounded-full shrink-0"
                              style={{
                                background: riskColor.bg,
                                color: riskColor.text,
                                border: `1px solid ${riskColor.border}`,
                              }}
                            >
                              {hc.residualRisk ?? "Low"} Risk
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Fallback: plain hazards list if no detailed hazardControls */}
              {(!permit.hazardControls || permit.hazardControls.length === 0) &&
                permit.hazards.length > 0 && (
                  <div
                    className="rounded-xl p-5"
                    style={{
                      border: "2px solid rgba(234,179,8,0.3)",
                      background: "rgba(234,179,8,0.04)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle
                        className="w-4 h-4"
                        style={{ color: "#eab308" }}
                      />
                      <p
                        className="text-sm font-bold"
                        style={{ color: "#eab308" }}
                      >
                        Identified Hazards
                      </p>
                    </div>
                    <ul className="space-y-1">
                      {permit.hazards.map((h) => (
                        <li
                          key={`hazard-${h.substring(0, 15)}`}
                          className="flex items-start gap-2 text-sm text-white/70"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Required PPE */}
              {permit.ppeRequired.length > 0 && (
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <p className="text-xs text-white/40 mb-2 uppercase tracking-wider">
                    Required PPE
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {permit.ppeRequired.map((p) => (
                      <span
                        key={p}
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: "rgba(24,195,126,0.1)",
                          color: "#18C37E",
                          border: "1px solid rgba(24,195,126,0.2)",
                        }}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Workflow Actions */}
          <div
            className="rounded-xl p-5"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <p className="text-xs text-white/40 mb-3 uppercase tracking-wider">
              Workflow Actions
            </p>
            {canAct ? (
              <div className="flex flex-wrap gap-3">
                {actions.map((action) => (
                  <Button
                    key={action.label}
                    type="button"
                    variant={action.variant}
                    className="gap-2 font-semibold"
                    style={
                      action.variant === "default"
                        ? { background: action.color, color: "#081426" }
                        : {}
                    }
                    onClick={() => onStatusChange(permit.id, action.nextStatus)}
                    disabled={isUpdating}
                    data-ocid={`permits.workflow_${action.nextStatus}_button`}
                  >
                    {action.icon}
                    {action.label}
                  </Button>
                ))}
              </div>
            ) : showWaiting ? (
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-lg"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                data-ocid="permits.workflow_waiting"
              >
                <Clock
                  className="w-4 h-4 shrink-0"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                />
                <p className="text-sm text-white/50">
                  {getWaitingMessage(permit.status)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-white/30 italic">
                No further actions available.
              </p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {showQR && <PermitQrCard permit={permit} />}
          <div
            className="rounded-xl p-4"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <p className="text-xs text-white/40 mb-3 uppercase tracking-wider">
              Permit Timeline
            </p>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div
                  className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                  style={{ background: "#18C37E" }}
                />
                <div>
                  <p className="text-xs text-white/60">Created</p>
                  <p className="text-xs text-white/40">
                    {fmt(permit.createdAt)}
                  </p>
                </div>
              </div>
              {permit.status !== "draft" && (
                <div className="flex gap-3">
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                    style={{ background: "#3b82f6" }}
                  />
                  <div>
                    <p className="text-xs text-white/60">Submitted</p>
                    <p className="text-xs text-white/40">–</p>
                  </div>
                </div>
              )}
              {[
                "underReview",
                "validated",
                "approved",
                "active",
                "closed",
              ].includes(permit.status) && (
                <div className="flex gap-3">
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                    style={{ background: "#eab308" }}
                  />
                  <div>
                    <p className="text-xs text-white/60">Under Review</p>
                    <p className="text-xs text-white/40">
                      {permit.reviewedBy ?? "–"}
                    </p>
                  </div>
                </div>
              )}
              {["validated", "approved", "active", "closed"].includes(
                permit.status,
              ) && (
                <div className="flex gap-3">
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                    style={{ background: "#06b6d4" }}
                  />
                  <div>
                    <p className="text-xs text-white/60">Validated</p>
                    <p className="text-xs text-white/40">–</p>
                  </div>
                </div>
              )}
              {(permit.status === "approved" ||
                permit.status === "active" ||
                permit.status === "closed") && (
                <div className="flex gap-3">
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                    style={{ background: "#22c55e" }}
                  />
                  <div>
                    <p className="text-xs text-white/60">Approved</p>
                    <p className="text-xs text-white/40">
                      {permit.approvedBy ?? "–"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
