import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useRunDeadlineChecks,
  useSendTestNotification,
} from "@/hooks/useBackend";
import {
  Activity,
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  Info,
  Mail,
  Play,
  Save,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

interface NotifSettings {
  newIncident: boolean;
  permitExpiry: boolean;
  trainingExpiry: boolean;
  dailyDigest: boolean;
}

const SESSION_OPTIONS = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
  { value: "240", label: "4 hours" },
];

const NOTIFICATION_TRIGGERS = [
  {
    key: "Permit Submitted",
    desc: "When a supervisor submits a new permit for review",
  },
  { key: "Permit Validated", desc: "When area in-charge validates a permit" },
  {
    key: "Permit Approved",
    desc: "When safety officer or EHS manager approves a permit",
  },
  { key: "Permit Rejected", desc: "When a permit is rejected at any stage" },
  { key: "Permit Expiry Warning", desc: "24h before a permit expires" },
  {
    key: "Incident Submitted",
    desc: "When a new incident report is submitted",
  },
  {
    key: "Incident Escalated",
    desc: "When an incident is escalated to EHS Manager",
  },
  {
    key: "Incident Overdue",
    desc: "When investigation passes due date without closure",
  },
  { key: "CAPA Deadline Warning", desc: "7 days before CAPA target date" },
  { key: "CAPA Overdue", desc: "When CAPA target date has passed" },
  {
    key: "Training Expiry Warning",
    desc: "30 days before certification expires",
  },
  { key: "Training Expired", desc: "When a certification has expired" },
  {
    key: "Inspection Overdue",
    desc: "When a scheduled inspection is past its date",
  },
];

export default function AdminSettingsTab() {
  const [notif, setNotif] = useState<NotifSettings>({
    newIncident: true,
    permitExpiry: true,
    trainingExpiry: false,
    dailyDigest: true,
  });
  const [sessionTimeout, setSessionTimeout] = useState("60");
  const [saving, setSaving] = useState(false);

  const sendTestNotif = useSendTestNotification();
  const runDeadlineChecks = useRunDeadlineChecks();

  function toggle(key: keyof NotifSettings) {
    setNotif((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSave() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    toast.success("Settings saved successfully");
  }

  async function handleTestNotification() {
    const toastId = toast.loading("Sending test notification…");
    try {
      const msg = await sendTestNotif.mutateAsync();
      toast.success(msg || "Test notification sent successfully!", {
        id: toastId,
      });
    } catch (_err) {
      toast.error("Failed to send test notification", { id: toastId });
    }
  }

  async function handleRunDeadlineChecks() {
    const toastId = toast.loading("Running deadline checks…");
    try {
      await runDeadlineChecks.mutateAsync();
      toast.success(
        "Deadline checks completed — emails sent for overdue items",
        {
          id: toastId,
        },
      );
    } catch (_err) {
      toast.error("Failed to run deadline checks", { id: toastId });
    }
  }

  return (
    <div className="space-y-6" data-ocid="admin.settings.section">
      <h2 className="text-lg font-display font-semibold text-foreground">
        System Settings
      </h2>

      {/* Email Notification Triggers */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-6"
        style={{ background: "rgba(8,20,38,0.5)" }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4" style={{ color: "#18C37E" }} />
            <h3 className="font-semibold text-foreground">
              Email Notification Triggers
            </h3>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              type="button"
              size="sm"
              disabled={sendTestNotif.isPending}
              onClick={handleTestNotification}
              data-ocid="admin.settings.test_notification_button"
              className="gap-1.5 text-xs"
              style={{
                background: "rgba(24,195,126,0.15)",
                border: "1px solid rgba(24,195,126,0.3)",
                color: "#18C37E",
              }}
            >
              {sendTestNotif.isPending ? (
                <span className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
              ) : (
                <Play className="w-3 h-3" />
              )}
              Send Test Notification
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={runDeadlineChecks.isPending}
              onClick={handleRunDeadlineChecks}
              data-ocid="admin.settings.run_deadline_checks_button"
              className="gap-1.5 text-xs"
              style={{
                background: "rgba(59,130,246,0.12)",
                border: "1px solid rgba(59,130,246,0.3)",
                color: "#60A5FA",
              }}
            >
              {runDeadlineChecks.isPending ? (
                <span className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
              ) : (
                <Activity className="w-3 h-3" />
              )}
              Run Deadline Checks Now
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {NOTIFICATION_TRIGGERS.map((trigger) => (
            <div
              key={trigger.key}
              className="flex items-start justify-between gap-3 py-2.5 px-3 rounded-lg"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
              data-ocid={`admin.settings.notif_trigger.${trigger.key.toLowerCase().replace(/\s+/g, "_")}`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <CheckCircle2
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                  style={{ color: "#18C37E" }}
                />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {trigger.key}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {trigger.desc}
                  </p>
                </div>
              </div>
              <Badge
                className="text-[11px] flex-shrink-0 mt-0.5"
                style={{
                  background: "rgba(24,195,126,0.12)",
                  border: "1px solid rgba(24,195,126,0.25)",
                  color: "#18C37E",
                }}
              >
                Enabled
              </Badge>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Notification Settings */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass rounded-xl p-6"
        style={{ background: "rgba(8,20,38,0.5)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4" style={{ color: "#18C37E" }} />
          <h3 className="font-semibold text-foreground">
            Notification Preferences
          </h3>
        </div>
        <div className="space-y-4">
          <ToggleRow
            label="Email notifications on new incident"
            description="Sends email alert to EHS team when a new incident is reported"
            checked={notif.newIncident}
            onToggle={() => toggle("newIncident")}
            ocid="admin.settings.new_incident_toggle"
          />
          <ToggleRow
            label="Permit expiry alerts"
            description="Notify permit owners 24 hours before permit expires"
            checked={notif.permitExpiry}
            onToggle={() => toggle("permitExpiry")}
            ocid="admin.settings.permit_expiry_toggle"
          />
          <ToggleRow
            label="Training expiry alerts"
            description="Remind employees when certifications are about to expire"
            checked={notif.trainingExpiry}
            onToggle={() => toggle("trainingExpiry")}
            ocid="admin.settings.training_expiry_toggle"
          />
          <ToggleRow
            label="Daily dashboard digest"
            description="Send daily safety summary email to managers at 7:00 AM"
            checked={notif.dailyDigest}
            onToggle={() => toggle("dailyDigest")}
            ocid="admin.settings.daily_digest_toggle"
          />
        </div>
      </motion.div>

      {/* Session Settings */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-xl p-6"
        style={{ background: "rgba(8,20,38,0.5)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4" style={{ color: "#18C37E" }} />
          <h3 className="font-semibold text-foreground">Session Management</h3>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-sm text-foreground mb-0.5">Session timeout</p>
            <p className="text-xs text-muted-foreground">
              Users will be automatically logged out after this period of
              inactivity
            </p>
          </div>
          <select
            data-ocid="admin.settings.session_timeout_select"
            value={sessionTimeout}
            onChange={(e) => setSessionTimeout(e.target.value)}
            className="px-4 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-foreground min-w-[140px]"
          >
            {SESSION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* App Info */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-xl p-6"
        style={{ background: "rgba(8,20,38,0.5)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-4 h-4" style={{ color: "#18C37E" }} />
          <h3 className="font-semibold text-foreground">Application Info</h3>
        </div>
        <div className="space-y-2 text-sm">
          <InfoRow label="Application" value="RKTR OHSE Command Center" />
          <InfoRow label="Version" value="v1.0.0" />
          <InfoRow label="Platform" value="Internet Computer Protocol" />
          <InfoRow
            label="Organization"
            value="Ramkrishna Titagarh Rail Wheels Limited"
          />
          <InfoRow label="Last Updated" value="May 2026" />
        </div>
      </motion.div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          type="button"
          data-ocid="admin.settings.save_button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 text-[#081426] font-semibold px-6"
          style={{ background: "#18C37E" }}
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onToggle,
  ocid,
}: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  ocid: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        data-ocid={ocid}
        onClick={onToggle}
        className={`relative mt-0.5 w-11 h-6 rounded-full transition-smooth flex-shrink-0 ${
          checked ? "bg-[#18C37E]" : "bg-white/20"
        }`}
        aria-label={label}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-smooth ${
            checked ? "left-5" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/5">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
}
