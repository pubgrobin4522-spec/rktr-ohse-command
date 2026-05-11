import { createActor } from "@/backend";
import type { PermitRecord } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS } from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Container,
  ExternalLink,
  Flame,
  MapPin,
  MoveUp,
  QrCode,
  Shovel,
  Timer,
  User,
  Wrench,
  XCircle,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const TYPE_CONFIG: Record<
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
};

const WORKFLOW_STEPS = ["draft", "submitted", "approved", "active", "closed"];

function fmt(ts: bigint) {
  return new Date(Number(ts) / 1_000_000).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CountdownBadge({ endTime }: { endTime: bigint }) {
  const [remaining, setRemaining] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const update = () => {
      const diff = Number(endTime) / 1_000_000 - Date.now();
      if (diff <= 0) {
        setExpired(true);
        setRemaining("Expired");
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
      className="flex items-center gap-2 px-3 py-2 rounded-lg"
      style={{
        background: expired
          ? "rgba(239,68,68,0.12)"
          : isUrgent
            ? "rgba(239,68,68,0.12)"
            : "rgba(249,115,22,0.1)",
        border: `1px solid ${expired || isUrgent ? "rgba(239,68,68,0.3)" : "rgba(249,115,22,0.25)"}`,
      }}
    >
      <Timer
        className="w-4 h-4"
        style={{ color: expired || isUrgent ? "#ef4444" : "#f97316" }}
      />
      <div>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          Expires In
        </p>
        <p
          className="font-mono text-base font-bold"
          style={{ color: expired || isUrgent ? "#ef4444" : "#f97316" }}
        >
          {remaining}
        </p>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <p
        className="text-xs uppercase tracking-wider mb-3"
        style={{ color: "rgba(255,255,255,0.4)" }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex justify-between items-start gap-4 py-1.5"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
    >
      <span
        className="text-xs shrink-0"
        style={{ color: "rgba(255,255,255,0.4)" }}
      >
        {label}
      </span>
      <span
        className="text-sm text-right font-medium"
        style={{ color: "rgba(255,255,255,0.85)" }}
      >
        {value}
      </span>
    </div>
  );
}

function PermitView({ permit }: { permit: PermitRecord }) {
  const typeConf = TYPE_CONFIG[permit.permitType] ?? TYPE_CONFIG.hotWork;
  const currentIdx = WORKFLOW_STEPS.indexOf(permit.status);
  const isRejected =
    permit.status === "rejected" || permit.status === "expired";
  const showTimer = permit.status === "active";

  const statusBg: Record<string, string> = {
    active: "rgba(24,195,126,0.15)",
    approved: "rgba(59,130,246,0.15)",
    submitted: "rgba(249,115,22,0.15)",
    draft: "rgba(255,255,255,0.06)",
    closed: "rgba(100,116,139,0.15)",
    expired: "rgba(239,68,68,0.15)",
    rejected: "rgba(239,68,68,0.15)",
  };

  return (
    <div className="min-h-screen" style={{ background: "#081426" }}>
      {/* Mobile header */}
      <div
        className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{
          background: "rgba(8,20,38,0.95)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${typeConf.color}22`, color: typeConf.color }}
        >
          {typeConf.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="font-mono text-xs"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            {permit.permitNumber}
          </p>
          <p className="text-sm font-bold text-white truncate">
            {typeConf.label} Permit
          </p>
        </div>
        <Badge
          variant="outline"
          className={`text-xs shrink-0 border ${STATUS_COLORS[permit.status as string] ?? "bg-muted text-muted-foreground"}`}
        >
          {permit.status.charAt(0).toUpperCase() + permit.status.slice(1)}
        </Badge>
      </div>

      <div className="px-4 py-5 space-y-4 pb-20">
        {/* Status banner */}
        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{
            background: statusBg[permit.status] ?? "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
          data-ocid="permit_scan.status_banner"
        >
          {isRejected ? (
            <XCircle className="w-5 h-5 text-red-400 shrink-0" />
          ) : permit.status === "active" ? (
            <CheckCircle
              className="w-5 h-5 shrink-0"
              style={{ color: "#18C37E" }}
            />
          ) : (
            <QrCode
              className="w-5 h-5 shrink-0"
              style={{ color: typeConf.color }}
            />
          )}
          <div>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
              Current Status
            </p>
            <p className="text-sm font-semibold text-white">
              {permit.status === "active"
                ? "✅ This permit is ACTIVE and valid"
                : permit.status === "approved"
                  ? "👍 Permit approved — not yet started"
                  : permit.status === "submitted"
                    ? "⏳ Awaiting approval"
                    : permit.status === "closed"
                      ? "🔒 Permit closed"
                      : permit.status === "rejected"
                        ? "❌ Permit rejected"
                        : permit.status === "expired"
                          ? "⚠️ Permit expired"
                          : "📝 Draft permit"}
            </p>
          </div>
        </div>

        {/* Countdown timer for active permits */}
        {showTimer && <CountdownBadge endTime={permit.endTime} />}

        {/* Workflow steps */}
        <SectionCard title="Workflow Progress">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {WORKFLOW_STEPS.map((step, i) => {
              const isDone = !isRejected && i <= currentIdx;
              const isCurrent = step === permit.status;
              return (
                <div key={step} className="flex items-center gap-1 shrink-0">
                  <div
                    className="px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{
                      background: isDone
                        ? "rgba(24,195,126,0.2)"
                        : "rgba(255,255,255,0.05)",
                      border: `1px solid ${isDone ? "rgba(24,195,126,0.4)" : "rgba(255,255,255,0.1)"}`,
                      color: isCurrent
                        ? "#18C37E"
                        : isDone
                          ? "rgba(24,195,126,0.8)"
                          : "rgba(255,255,255,0.35)",
                    }}
                  >
                    {isDone && (
                      <CheckCircle className="w-2.5 h-2.5 inline mr-1" />
                    )}
                    {step.charAt(0).toUpperCase() + step.slice(1)}
                  </div>
                  {i < WORKFLOW_STEPS.length - 1 && (
                    <div
                      className="w-4 h-px"
                      style={{
                        background: isDone
                          ? "rgba(24,195,126,0.4)"
                          : "rgba(255,255,255,0.1)",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* Job Details */}
        <SectionCard title="Job Details">
          <div className="space-y-0.5">
            <InfoRow label="Job Description" value={permit.jobDescription} />
            <InfoRow label="Location" value={permit.location} />
            <InfoRow label="Requested By" value={permit.requestedBy} />
            {permit.approvedBy && (
              <InfoRow label="Approved By" value={permit.approvedBy} />
            )}
          </div>
        </SectionCard>

        {/* Validity */}
        <SectionCard title="Validity Period">
          <div className="space-y-0.5">
            <InfoRow label="Start Time" value={fmt(permit.startTime)} />
            <InfoRow label="End Time" value={fmt(permit.endTime)} />
            <InfoRow label="Created" value={fmt(permit.createdAt)} />
          </div>
          <div className="mt-3 flex items-start gap-2">
            <Clock
              className="w-3.5 h-3.5 mt-0.5 shrink-0"
              style={{ color: "rgba(255,255,255,0.3)" }}
            />
            <div>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                Permit Number
              </p>
              <p
                className="font-mono text-sm font-bold"
                style={{ color: "#18C37E" }}
              >
                {permit.permitNumber}
              </p>
            </div>
          </div>
        </SectionCard>

        {/* Hazard Controls */}
        {permit.hazards.length > 0 && (
          <SectionCard title="Identified Hazards">
            <ul className="space-y-2">
              {permit.hazards.map((h) => (
                <li
                  key={`h-${h.substring(0, 20)}`}
                  className="flex items-start gap-2"
                >
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-orange-400" />
                  <span
                    className="text-sm"
                    style={{ color: "rgba(255,255,255,0.75)" }}
                  >
                    {h}
                  </span>
                </li>
              ))}
            </ul>
          </SectionCard>
        )}

        {/* PPE Checklist */}
        {permit.ppeRequired.length > 0 && (
          <SectionCard title="Required PPE Checklist">
            <div className="grid grid-cols-2 gap-2">
              {permit.ppeRequired.map((ppe) => (
                <div
                  key={ppe}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg"
                  style={{
                    background: "rgba(24,195,126,0.08)",
                    border: "1px solid rgba(24,195,126,0.15)",
                  }}
                  data-ocid="permit_scan.ppe_item"
                >
                  <CheckCircle
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: "#18C37E" }}
                  />
                  <span
                    className="text-xs font-medium"
                    style={{ color: "rgba(255,255,255,0.8)" }}
                  >
                    {ppe}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Location info */}
        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <MapPin
            className="w-4 h-4 shrink-0"
            style={{ color: "rgba(255,255,255,0.3)" }}
          />
          <div>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Work Location
            </p>
            <p className="text-sm font-medium text-white">{permit.location}</p>
          </div>
          <User
            className="w-4 h-4 shrink-0ml-auto"
            style={{ color: "rgba(255,255,255,0.3)" }}
          />
          <div>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Requested By
            </p>
            <p className="text-sm font-medium text-white">
              {permit.requestedBy}
            </p>
          </div>
        </div>

        {/* Footer attribution */}
        <div className="text-center pt-2">
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            RKTR OHSE Command Center
          </p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
            Scan verified — read-only view
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PublicPermitScanPage() {
  const [searchParams] = useSearchParams();
  const permitId = searchParams.get("id");

  const { actor, isFetching } = useActor(createActor);
  const {
    data: permit,
    isLoading,
    isError,
  } = useQuery<PermitRecord | null>({
    queryKey: ["permit-scan", permitId],
    queryFn: async () => {
      if (!actor || !permitId) return null;
      return actor.getPermit(permitId);
    },
    enabled: !!actor && !isFetching && !!permitId,
    retry: 2,
  });

  // Loading skeleton
  if (!permitId) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ background: "#081426" }}
        data-ocid="permit_scan.error_state"
      >
        <QrCode
          className="w-12 h-12 mb-4"
          style={{ color: "rgba(255,255,255,0.2)" }}
        />
        <p className="text-white font-semibold mb-1">Invalid QR Code</p>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
          This QR code does not contain a valid permit ID.
        </p>
      </div>
    );
  }

  if (isLoading || isFetching) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: "#081426" }}
        data-ocid="permit_scan.loading_state"
      >
        <div
          className="w-10 h-10 rounded-full border-2 animate-spin"
          style={{ borderColor: "#18C37E", borderTopColor: "transparent" }}
        />
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
          Loading permit details…
        </p>
      </div>
    );
  }

  if (isError || !permit) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ background: "#081426" }}
        data-ocid="permit_scan.error_state"
      >
        <XCircle className="w-12 h-12 mb-4 text-red-400" />
        <p className="text-white font-semibold mb-1">Permit Not Found</p>
        <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
          The permit with ID <span className="font-mono">{permitId}</span> could
          not be found.
        </p>
        <a
          href="/"
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg"
          style={{
            background: "rgba(24,195,126,0.15)",
            color: "#18C37E",
            border: "1px solid rgba(24,195,126,0.3)",
          }}
        >
          <ExternalLink className="w-4 h-4" />
          Open OHSE Command Center
        </a>
      </div>
    );
  }

  return <PermitView permit={permit} />;
}
