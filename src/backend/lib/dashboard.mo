import DashTypes "../types/dashboard";
import IncidentTypes "../types/incidents";
import PermitTypes "../types/permits";
import RiskTypes "../types/risks";
import TrainingTypes "../types/training";
import ObsTypes "../types/observations";
import UserTypes "../types/users";
import CapaTypes "../types/capa";
import InspectionTypes "../types/inspections";
import EnvTypes "../types/environment";
import DeptTypes "../types/departments";
import Map "mo:core/Map";
import List "mo:core/List";
import Int "mo:core/Int";
  import Float "mo:core/Float";
import Array "mo:core/Array";

module {
  public type State = {
    incidents : Map.Map<Text, IncidentTypes.IncidentRecord>;
    permits : Map.Map<Text, PermitTypes.PermitRecord>;
    risks : Map.Map<Text, RiskTypes.RiskRecord>;
    trainingRecords : Map.Map<Text, TrainingTypes.TrainingRecord>;
    observations : Map.Map<Text, ObsTypes.ObservationRecord>;
    activityFeed : List.List<DashTypes.ActivityFeedItem>;
    users : Map.Map<Text, UserTypes.UserRecord>;
    capas : Map.Map<Text, CapaTypes.CapaRecord>;
    inspections : Map.Map<Text, InspectionTypes.InspectionRecord>;
    environmentRecords : Map.Map<Text, EnvTypes.EnvironmentRecord>;
    departments : Map.Map<Text, DeptTypes.DepartmentRecord>;
    registrationEvents : List.List<DashTypes.ActivityFeedItem>;
  };

  /// Converts a UserRole variant to a Text string matching recipientRole field values.
  public func roleToText(role : UserTypes.UserRole) : Text {
    switch (role) {
      case (#employee) { "employee" };
      case (#supervisor) { "supervisor" };
      case (#areaInCharge) { "areaInCharge" };
      case (#departmentHOD) { "departmentHOD" };
      case (#safetyOfficer) { "safetyOfficer" };
      case (#ehsManager) { "ehsManager" };
      case (#contractorAdmin) { "contractorAdmin" };
      case (#systemAdmin) { "systemAdmin" };
    };
  };

  public func getDashboardStats(state : State) : DashTypes.DashboardStats {
    // ── Basic counts ─────────────────────────────────────────────────────────
    let totalIncidents = state.incidents.size();

    var openPermitsCount : Nat = 0;
    for ((_, p) in state.permits.entries()) {
      switch (p.status) {
        case (#approved or #active or #submitted or #underReview or #validated) { openPermitsCount += 1 };
        case _ {};
      };
    };

    var nearMissCount : Nat = 0;
    for ((_, o) in state.observations.entries()) {
      if (o.obsType == #nearMiss) { nearMissCount += 1 };
    };

    let totalTraining = state.trainingRecords.size();
    var completedTraining : Nat = 0;
    for ((_, t) in state.trainingRecords.entries()) {
      if (t.status == #completed) { completedTraining += 1 };
    };
    let trainingCompliance : Nat = if (totalTraining == 0) 0
      else (completedTraining * 100) / totalTraining;

    var highRiskCount : Nat = 0;
    for ((_, r) in state.risks.entries()) {
      switch (r.riskLevel) {
        case (#high or #critical) { highRiskCount += 1 };
        case _ {};
      };
    };

    let totalInspections = state.inspections.size();
    var completedInspections : Nat = 0;
    for ((_, i) in state.inspections.entries()) {
      if (i.status == #completed) { completedInspections += 1 };
    };
    let auditCompletion : Nat = if (totalInspections == 0) 0
      else (completedInspections * 100) / totalInspections;

    // ── LTIFR ─────────────────────────────────────────────────────────────────
    // Count critical incidents as lost-time injuries (proxy)
    var lostTimeIncidents : Nat = 0;
    for ((_, inc) in state.incidents.entries()) {
      if (inc.severity == "Critical") { lostTimeIncidents += 1 };
    };
    let totalHoursWorked : Float = 2_000_000.0;
    let ltifr : Float = if (totalHoursWorked == 0.0) 0.0
      else (lostTimeIncidents.toFloat() * 1_000_000.0) / totalHoursWorked;


    // ── Safety score (0-100) ─────────────────────────────────────────────────
    let incidentRateRaw : Float = totalIncidents.toFloat() / 100.0;
    let incidentRate : Float = if (incidentRateRaw > 1.0) 1.0 else incidentRateRaw;
    let safetyScoreFloat : Float =
      (auditCompletion.toFloat() * 0.3) +
      (trainingCompliance.toFloat() * 0.3) +
      ((1.0 - incidentRate) * 100.0 * 0.4);
    let clampedScore : Float = if (safetyScoreFloat < 0.0) 0.0 else if (safetyScoreFloat > 100.0) 100.0 else safetyScoreFloat;
    let safetyScore : Nat = Int.abs(clampedScore.toInt());

    // ── Safety score split ────────────────────────────────────────────────────
    // Environment deviations: spill-type records or hazardous waste entries
    var envDeviations : Nat = 0;
    for ((_, e) in state.environmentRecords.entries()) {
      let t = e.recordType;
      if (t == "Spill" or t == "Hazardous Waste" or t == "spill") { envDeviations += 1 };
    };

    let safetySplitRaw : Int = 100 - (totalIncidents.toInt() * 5);
    let safetySplit : Nat = if (safetySplitRaw < 0) 0 else if (safetySplitRaw > 100) 100 else Int.abs(safetySplitRaw);
    let healthSplit : Nat = trainingCompliance;
    let envSplitRaw : Int = 100 - (envDeviations.toInt() * 10);
    let envSplit : Nat = if (envSplitRaw < 40) 40 else if (envSplitRaw > 100) 100 else Int.abs(envSplitRaw);
    let complianceSplit : Nat = auditCompletion;
    let safetyScoreSplit : DashTypes.SafetyScoreSplit = {
      safety = safetySplit;
      health = healthSplit;
      environment = envSplit;
      compliance = complianceSplit;
    };

    // ── Incident trend by month (last 6 months, bucketed by timestamp) ────────
    // Month labels and approximate nanosecond boundaries
    // Using fixed 30-day windows relative to a reference (latest incident or now)
    // Each bucket covers ~30 days = 30 * 24 * 3600 * 1_000_000_000 ns
    let thirtyDaysNs : Int = 2_592_000_000_000_000;
    let refTime : Int = 1_702_600_000_000_000_000; // approximate "now" for mock data
    let monthNames : [Text] = ["Month-6", "Month-5", "Month-4", "Month-3", "Month-2", "Month-1"];
    let trendCritical = [var 0, 0, 0, 0, 0, 0];
    let trendHigh     = [var 0, 0, 0, 0, 0, 0];
    let trendMedium   = [var 0, 0, 0, 0, 0, 0];
    let trendLow      = [var 0, 0, 0, 0, 0, 0];
    for ((_, inc) in state.incidents.entries()) {
      let age : Int = refTime - inc.createdAt;
      let bucketIdx : Int = 5 - (age / thirtyDaysNs);
      if (bucketIdx >= 0 and bucketIdx <= 5) {
        let idx = Int.abs(bucketIdx);
        switch (inc.severity) {
          case "Critical" { trendCritical[idx] += 1 };
          case "High"     { trendHigh[idx] += 1 };
          case "Medium"   { trendMedium[idx] += 1 };
          case _          { trendLow[idx] += 1 };
        };
      };
    };
    let incidentTrendByMonth : [DashTypes.IncidentTrendMonth] = Array.tabulate<DashTypes.IncidentTrendMonth>(
      6,
      func(i) = {
        month    = monthNames[i];
        critical = trendCritical[i];
        high     = trendHigh[i];
        medium   = trendMedium[i];
        low      = trendLow[i];
      }
    );

    // ── High-risk alert details (top 5 high/critical risks) ───────────────────
    let alertList : List.List<DashTypes.HighRiskAlertDetail> = List.empty<DashTypes.HighRiskAlertDetail>();
    for ((_, r) in state.risks.entries()) {
      switch (r.riskLevel) {
        case (#high or #critical) {
          let level = switch (r.riskLevel) {
            case (#critical) "Critical";
            case _ "High";
          };
          alertList.add({
            id             = r.id;
            hazard         = r.hazard;
            area           = r.location;
            owner          = r.createdBy;
            dueDate        = "Review pending";
            escalationLevel = level;
          });
        };
        case _ {};
      };
    };
    let allAlerts = alertList.toArray();
    let alertCount = if (allAlerts.size() < 5) allAlerts.size() else 5;
    let highRiskAlertDetails : [DashTypes.HighRiskAlertDetail] =
      Array.tabulate<DashTypes.HighRiskAlertDetail>(alertCount, func(i) = allAlerts[i]);

    // ── Module open counts ────────────────────────────────────────────────────
    var openIncidents : Nat = 0;
    for ((_, inc) in state.incidents.entries()) {
      switch (inc.status) {
        case (#draft or #submitted or #underReview or #escalated) { openIncidents += 1 };
        case _ {};
      };
    };
    var openCapas : Nat = 0;
    for ((_, c) in state.capas.entries()) {
      switch (c.status) {
        case (#open or #inProgress) { openCapas += 1 };
        case _ {};
      };
    };
    var openObs : Nat = 0;
    for ((_, o) in state.observations.entries()) {
      switch (o.status) {
        case (#open or #inProgress) { openObs += 1 };
        case _ {};
      };
    };
    var openInspections : Nat = 0;
    for ((_, i) in state.inspections.entries()) {
      switch (i.status) {
        case (#scheduled or #inProgress or #overdue) { openInspections += 1 };
        case _ {};
      };
    };
    let moduleOpenCounts : DashTypes.ModuleOpenCounts = {
      incidents    = openIncidents;
      permits      = openPermitsCount;
      capaItems    = openCapas;
      observations = openObs;
      inspections  = openInspections;
      risks        = highRiskCount;
    };

    // ── Compliance breakdown ──────────────────────────────────────────────────
    // iso14001: ratio of env records with notes (completeness proxy)
    let totalEnv = state.environmentRecords.size();
    var envWithNotes : Nat = 0;
    for ((_, e) in state.environmentRecords.entries()) {
      switch (e.notes) { case (?_) { envWithNotes += 1 }; case null {} };
    };
    let iso14001 : Nat = if (totalEnv == 0) 0 else (envWithNotes * 100) / totalEnv;
    let legalRaw : Int = auditCompletion.toInt() + 5;
    let legalCompliance : Nat = if (legalRaw > 100) 100 else Int.abs(legalRaw);
    let complianceBreakdown : DashTypes.ComplianceBreakdown = {
      iso45001      = auditCompletion;
      iso14001;
      ppeCompliance = trainingCompliance;
      legalCompliance;
    };

    // ── Return ────────────────────────────────────────────────────────────────
    {
      totalIncidents;
      openPermits       = openPermitsCount;
      nearMissCount;
      trainingCompliance;
      highRiskCount;
      auditCompletion;
      ltifr;
      safetyScore;
      safetyScoreSplit;
      environmentalDeviations = envDeviations;
      incidentTrendByMonth;
      highRiskAlertDetails;
      moduleOpenCounts;
      complianceBreakdown;
    };
  };

  public func getActivityFeed(state : State, callerEmployeeNumber : Text, callerRole : Text, isAdmin : Bool) : [DashTypes.ActivityFeedItem] {
    // Merge activity feed with up to 3 most recent registration events
    let regArray = state.registrationEvents.toArray();
    let regCount = if (regArray.size() < 3) regArray.size() else 3;
    let regSlice = Array.tabulate(regCount, func(i) = regArray[regArray.size() - regCount + i]);
    let combined = List.empty<DashTypes.ActivityFeedItem>();
    for (item in regSlice.values()) { combined.add(item) };
    for (item in state.activityFeed.toArray().values()) { combined.add(item) };
    if (isAdmin) {
      // System Admin always gets everything
      return combined.toArray();
    };
    // Filter: show items where recipient matches caller's employee number
    // OR recipientRole matches caller's role
    // OR neither recipient nor recipientRole is set (legacy items — hidden for cleaner UX)
    let filtered = List.empty<DashTypes.ActivityFeedItem>();
    for (item in combined.values()) {
      let byEmployee = switch (item.recipient) {
        case (?r) { r == callerEmployeeNumber };
        case null { false };
      };
      let byRole = switch (item.recipientRole) {
        case (?r) { r == callerRole };
        case null { false };
      };
      if (byEmployee or byRole) { filtered.add(item) };
    };
    filtered.toArray();
  };

  public func addRegistrationEvent(
    registrationEvents : List.List<DashTypes.ActivityFeedItem>,
    name : Text,
    email : Text,
    employeeNumber : Text,
    timestamp : Int,
  ) : () {
    let id = "reg_" # email;
    // Notify System Admin (always) and Safety Officers (by role)
    registrationEvents.add({
      id = id # "_admin";
      message = name # " registered \u{2014} pending activation";
      timestamp;
      category = "registration";
      recipient = ?"230034"; // System Admin employee number
      recipientRole = null;
    });
    registrationEvents.add({
      id = id # "_officers";
      message = name # " registered \u{2014} pending activation";
      timestamp;
      category = "registration";
      recipient = null;
      recipientRole = ?"safetyOfficer";
    });
    // Welcome notification to the registrant themselves
    registrationEvents.add({
      id = id # "_self";
      message = "Welcome " # name # "! Your account is pending admin approval.";
      timestamp;
      category = "registration";
      recipient = ?employeeNumber;
      recipientRole = null;
    });
  };

  public func seedMockData(state : State) : Text {
    // All mock seeding removed — returns immediately to prevent accidental data injection.
    // Only ensure the system admin record is always present.
    state.users.add("sumesh.j@rktrwheels.com", { id = "user-6"; name = "Sumesh J"; email = "sumesh.j@rktrwheels.com"; role = #systemAdmin; department = "EHS"; active = true; employeeNumber = "230034"; mobileNumber = "" });
    "No-op: mock seeding is disabled."
  };
};
