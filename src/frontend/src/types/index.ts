export type {
  UserRole,
  IncidentStatus,
  PermitStatus,
  PermitType,
  CapaStatus,
  ObservationType,
  ObservationStatus,
  InspectionStatus,
  RiskLevel,
  RiskStatus,
  TrainingStatus,
  IncidentRecord,
  PermitRecord,
  PersonInvolved,
  HazardControl,
  GasTestResults,
  ToolboxTalk,
  PermitSignatures,
  EmergencyContact,
  UserRecord,
  DepartmentRecord,
  ActivityFeedItem,
  DashboardStats,
  CapaRecord,
  ObservationRecord,
  RiskRecord,
  InspectionRecord,
  EnvironmentRecord,
  TrainingRecord,
  AuthSession,
  RecordId,
  UserId,
  Timestamp,
  Result,
  Result_1,
  Result_2,
  Option,
  Some,
  None,
  IncidentTrendMonth,
  HighRiskAlertDetail,
  ModuleOpenCounts,
  SafetyScoreSplit,
  ComplianceBreakdown,
} from "@/backend";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  employeeNumber?: string;
  mobileNumber?: string;
}

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  adminOnly?: boolean;
}

export type WorkflowStatus =
  | "draft"
  | "submitted"
  | "underReview"
  | "validated"
  | "approved"
  | "active"
  | "closed"
  | "rejected"
  | "escalated"
  | "overdue"
  | "inProgress";

export const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  underReview: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  validated: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  approved: "bg-green-500/20 text-green-400 border-green-500/30",
  active: "bg-[#18C37E]/20 text-[#18C37E] border-[#18C37E]/30",
  closed: "bg-muted text-muted-foreground",
  rejected: "bg-destructive/20 text-destructive border-destructive/30",
  escalated: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  overdue: "bg-red-500/20 text-red-400 border-red-500/30",
  inProgress: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  scheduled: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  open: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  expired: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400",
  critical: "bg-red-500/20 text-red-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  low: "bg-green-500/20 text-green-400",
  veryLow: "bg-[#18C37E]/20 text-[#18C37E]",
};

export const ROLE_LABELS: Record<string, string> = {
  employee: "Employee",
  supervisor: "Supervisor",
  areaInCharge: "Area In-Charge",
  departmentHOD: "Department HOD",
  safetyOfficer: "Safety Officer",
  ehsManager: "EHS Manager",
  contractorAdmin: "Contractor Admin",
  systemAdmin: "System Admin",
};

export type { AttachmentMetadata } from "@/hooks/useAttachments";
