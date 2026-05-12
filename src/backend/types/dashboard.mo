import Common "common";

module {
  public type IncidentTrendMonth = {
    month : Text;
    critical : Nat;
    high : Nat;
    medium : Nat;
    low : Nat;
  };

  public type HighRiskAlertDetail = {
    id : Text;
    hazard : Text;
    area : Text;
    owner : Text;
    dueDate : Text;
    escalationLevel : Text;
  };

  public type ModuleOpenCounts = {
    incidents : Nat;
    permits : Nat;
    capaItems : Nat;
    observations : Nat;
    inspections : Nat;
    risks : Nat;
  };

  public type SafetyScoreSplit = {
    safety : Nat;
    health : Nat;
    environment : Nat;
    compliance : Nat;
  };

  public type ComplianceBreakdown = {
    iso45001 : Nat;
    iso14001 : Nat;
    ppeCompliance : Nat;
    legalCompliance : Nat;
  };

  public type DashboardStats = {
    totalIncidents : Nat;
    openPermits : Nat;
    nearMissCount : Nat;
    trainingCompliance : Nat;
    highRiskCount : Nat;
    auditCompletion : Nat;
    ltifr : Float;
    safetyScore : Nat;
    safetyScoreSplit : SafetyScoreSplit;
    environmentalDeviations : Nat;
    incidentTrendByMonth : [IncidentTrendMonth];
    highRiskAlertDetails : [HighRiskAlertDetail];
    moduleOpenCounts : ModuleOpenCounts;
    complianceBreakdown : ComplianceBreakdown;
  };

  public type ActivityFeedItem = {
    id : Common.RecordId;
    message : Text;
    timestamp : Common.Timestamp;
    category : Text;
    /// Employee number of the intended recipient (e.g. "230034"), or null for legacy items.
    recipient : ?Text;
    /// Role that should receive this item (e.g. #safetyOfficer). null means no role filter.
    recipientRole : ?Text;
  };
};
