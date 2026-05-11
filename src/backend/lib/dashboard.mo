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

  public func getActivityFeed(state : State) : [DashTypes.ActivityFeedItem] {
    state.activityFeed.toArray();
  };

  public func seedMockData(state : State) : Text {
    // Idempotency check — skip if both users and incidents are already populated
    if (state.users.size() > 0 or state.incidents.size() > 0) {
      // Always ensure admin user exists even if other data is seeded
      // Always upsert the admin record to ensure correct fields
      state.users.add("sumesh.j@rktrwheels.com", { id = "user-6"; name = "Sumesh J"; email = "sumesh.j@rktrwheels.com"; role = #systemAdmin; department = "EHS"; active = true; employeeNumber = "RKTR-ADMIN-001"; mobileNumber = "" });
      return "Already seeded.";
    };

    // --- Departments (8) ---
    let depts : [(Text, DeptTypes.DepartmentRecord)] = [
      ("dept-1", { id = "dept-1"; name = "Forge Shop"; head = "Arjun Singh"; location = "Block A" }),
      ("dept-2", { id = "dept-2"; name = "RHF Furnace"; head = "Sunil Sharma"; location = "Block B" }),
      ("dept-3", { id = "dept-3"; name = "HTL Area"; head = "Rajesh Kumar"; location = "Block C" }),
      ("dept-4", { id = "dept-4"; name = "Rolling Mill"; head = "Priya Patel"; location = "Block D" }),
      ("dept-5", { id = "dept-5"; name = "Utility Area"; head = "Mehul Contractor"; location = "Block E" }),
      ("dept-6", { id = "dept-6"; name = "Maintenance Workshop"; head = "Arjun Singh"; location = "Block F" }),
      ("dept-7", { id = "dept-7"; name = "Quality Control"; head = "Sunil Sharma"; location = "Block G" }),
      ("dept-8", { id = "dept-8"; name = "HR"; head = "Priya Patel"; location = "Main Office" }),
    ];
    for ((k, v) in depts.values()) { state.departments.add(k, v) };

    // --- Users (6) ---
    let users : [(Text, UserTypes.UserRecord)] = [
      ("rajesh.kumar@rktrwheels.com", { id = "user-1"; name = "Rajesh Kumar"; email = "rajesh.kumar@rktrwheels.com"; role = #safetyOfficer; department = "HTL Area"; active = true; employeeNumber = ""; mobileNumber = "" }),
      ("sunil.sharma@rktrwheels.com", { id = "user-2"; name = "Sunil Sharma"; email = "sunil.sharma@rktrwheels.com"; role = #ehsManager; department = "RHF Furnace"; active = true; employeeNumber = ""; mobileNumber = "" }),
      ("arjun.singh@rktrwheels.com", { id = "user-3"; name = "Arjun Singh"; email = "arjun.singh@rktrwheels.com"; role = #supervisor; department = "Forge Shop"; active = true; employeeNumber = ""; mobileNumber = "" }),
      ("priya.patel@rktrwheels.com", { id = "user-4"; name = "Priya Patel"; email = "priya.patel@rktrwheels.com"; role = #employee; department = "Rolling Mill"; active = true; employeeNumber = ""; mobileNumber = "" }),
      ("mehul.contractor@rktrwheels.com", { id = "user-5"; name = "Mehul Contractor"; email = "mehul.contractor@rktrwheels.com"; role = #contractorAdmin; department = "Utility Area"; active = true; employeeNumber = ""; mobileNumber = "" }),
      ("sumesh.j@rktrwheels.com", { id = "user-6"; name = "Sumesh J"; email = "sumesh.j@rktrwheels.com"; role = #systemAdmin; department = "EHS"; active = true; employeeNumber = "RKTR-ADMIN-001"; mobileNumber = "" }),
    ];
    for ((k, v) in users.values()) { state.users.add(k, v) };

    // --- Incidents (10) ---
    let incidents : [(Text, IncidentTypes.IncidentRecord)] = [
      ("inc-1", { id = "inc-1"; ticketNumber = "INC-2024-001"; title = "Forklift Near Miss - Forge Shop"; location = "Forge Shop"; severity = "High"; status = #submitted; reportedBy = "Arjun Singh"; department = "Forge Shop"; description = "Forklift came within 0.5m of a pedestrian in the loading bay."; rootCause = ?"Lack of designated pedestrian walkway markings."; correctiveAction = ?"Install safety barriers and floor markings."; createdAt = 1_700_000_000_000_000_000; updatedAt = 1_700_100_000_000_000_000; personsInvolved = null; bodyPartAffected = null; natureOfInjury = null; daysLost = null; medicalTreatment = null; firstAidGiven = null; rootCauseCategory = null; contributingFactors = null; actionsTaken = null; areaBarricaded = null; responsiblePerson = null; targetDate = null; teamLead = null; teamMembers = null; investigationDueDate = null; attachments = null }),

      ("inc-2", { id = "inc-2"; ticketNumber = "INC-2024-002"; title = "Chemical Spill - HTL Area"; location = "HTL Area"; severity = "Critical"; status = #underReview; reportedBy = "Rajesh Kumar"; department = "HTL Area"; description = "Hydraulic oil spill of approx 20 litres near HTL-3 machine."; rootCause = ?"Worn hydraulic hose coupling."; correctiveAction = ?"Replace all hydraulic hoses older than 2 years."; createdAt = 1_700_200_000_000_000_000; updatedAt = 1_700_300_000_000_000_000; personsInvolved = null; bodyPartAffected = null; natureOfInjury = null; daysLost = null; medicalTreatment = null; firstAidGiven = null; rootCauseCategory = null; contributingFactors = null; actionsTaken = null; areaBarricaded = null; responsiblePerson = null; targetDate = null; teamLead = null; teamMembers = null; investigationDueDate = null; attachments = null }),

      ("inc-3", { id = "inc-3"; ticketNumber = "INC-2024-003"; title = "Hand Injury - Rolling Mill"; location = "Rolling Mill"; severity = "Medium"; status = #approved; reportedBy = "Priya Patel"; department = "Rolling Mill"; description = "Operator sustained laceration on right hand while adjusting mill guide."; rootCause = ?"PPE not worn - gloves removed for better grip."; correctiveAction = ?"Mandatory PPE audit before shift start."; createdAt = 1_700_400_000_000_000_000; updatedAt = 1_700_500_000_000_000_000; personsInvolved = null; bodyPartAffected = null; natureOfInjury = null; daysLost = null; medicalTreatment = null; firstAidGiven = null; rootCauseCategory = null; contributingFactors = null; actionsTaken = null; areaBarricaded = null; responsiblePerson = null; targetDate = null; teamLead = null; teamMembers = null; investigationDueDate = null; attachments = null }),

      ("inc-4", { id = "inc-4"; ticketNumber = "INC-2024-004"; title = "Fall From Height - Maintenance Workshop"; location = "Maintenance Workshop"; severity = "Critical"; status = #escalated; reportedBy = "Arjun Singh"; department = "Maintenance Workshop"; description = "Technician fell from 3m elevated platform while replacing light fixture."; rootCause = ?"Safety harness not used."; correctiveAction = ?"Enforce fall protection procedure for all work above 2m."; createdAt = 1_700_600_000_000_000_000; updatedAt = 1_700_700_000_000_000_000; personsInvolved = null; bodyPartAffected = null; natureOfInjury = null; daysLost = null; medicalTreatment = null; firstAidGiven = null; rootCauseCategory = null; contributingFactors = null; actionsTaken = null; areaBarricaded = null; responsiblePerson = null; targetDate = null; teamLead = null; teamMembers = null; investigationDueDate = null; attachments = null }),

      ("inc-5", { id = "inc-5"; ticketNumber = "INC-2024-005"; title = "Electrical Fault - RHF Furnace"; location = "RHF Furnace"; severity = "High"; status = #closed; reportedBy = "Sunil Sharma"; department = "RHF Furnace"; description = "Short circuit in panel PLC-7 caused brief power interruption."; rootCause = ?"Water ingress in cable conduit."; correctiveAction = ?"Seal all conduit entry points and inspect panel waterproofing."; createdAt = 1_700_800_000_000_000_000; updatedAt = 1_700_900_000_000_000_000; personsInvolved = null; bodyPartAffected = null; natureOfInjury = null; daysLost = null; medicalTreatment = null; firstAidGiven = null; rootCauseCategory = null; contributingFactors = null; actionsTaken = null; areaBarricaded = null; responsiblePerson = null; targetDate = null; teamLead = null; teamMembers = null; investigationDueDate = null; attachments = null }),

      ("inc-6", { id = "inc-6"; ticketNumber = "INC-2024-006"; title = "Gas Leak Suspected - Utility Area"; location = "Utility Area"; severity = "High"; status = #draft; reportedBy = "Mehul Contractor"; department = "Utility Area"; description = "Faint smell of LP gas detected near compressor house."; rootCause = null; correctiveAction = null; createdAt = 1_701_000_000_000_000_000; updatedAt = 1_701_000_000_000_000_000; personsInvolved = null; bodyPartAffected = null; natureOfInjury = null; daysLost = null; medicalTreatment = null; firstAidGiven = null; rootCauseCategory = null; contributingFactors = null; actionsTaken = null; areaBarricaded = null; responsiblePerson = null; targetDate = null; teamLead = null; teamMembers = null; investigationDueDate = null; attachments = null }),

      ("inc-7", { id = "inc-7"; ticketNumber = "INC-2024-007"; title = "Eye Injury - Forge Shop"; location = "Forge Shop"; severity = "Medium"; status = #closed; reportedBy = "Arjun Singh"; department = "Forge Shop"; description = "Metal fragment entered operator's left eye during forging operation."; rootCause = ?"Face shield damaged and not replaced."; correctiveAction = ?"Daily PPE inspection before shift commencement."; createdAt = 1_701_200_000_000_000_000; updatedAt = 1_701_300_000_000_000_000; personsInvolved = null; bodyPartAffected = null; natureOfInjury = null; daysLost = null; medicalTreatment = null; firstAidGiven = null; rootCauseCategory = null; contributingFactors = null; actionsTaken = null; areaBarricaded = null; responsiblePerson = null; targetDate = null; teamLead = null; teamMembers = null; investigationDueDate = null; attachments = null }),

      ("inc-8", { id = "inc-8"; ticketNumber = "INC-2024-008"; title = "Crane Overload Alert - Rolling Mill"; location = "Rolling Mill"; severity = "High"; status = #submitted; reportedBy = "Priya Patel"; department = "Rolling Mill"; description = "EOT crane alarm triggered at 98% rated load during bloom lifting."; rootCause = ?"Load cell calibration drift."; correctiveAction = ?"Recalibrate all crane load cells quarterly."; createdAt = 1_701_400_000_000_000_000; updatedAt = 1_701_500_000_000_000_000; personsInvolved = null; bodyPartAffected = null; natureOfInjury = null; daysLost = null; medicalTreatment = null; firstAidGiven = null; rootCauseCategory = null; contributingFactors = null; actionsTaken = null; areaBarricaded = null; responsiblePerson = null; targetDate = null; teamLead = null; teamMembers = null; investigationDueDate = null; attachments = null }),

      ("inc-9", { id = "inc-9"; ticketNumber = "INC-2024-009"; title = "Unsafe Act Observed - HTL Area"; location = "HTL Area"; severity = "Low"; status = #closed; reportedBy = "Rajesh Kumar"; department = "HTL Area"; description = "Worker observed riding on forklift forks without authorisation."; rootCause = ?"Insufficient safety awareness training."; correctiveAction = ?"Conduct refresher training and toolbox talk."; createdAt = 1_701_600_000_000_000_000; updatedAt = 1_701_700_000_000_000_000; personsInvolved = null; bodyPartAffected = null; natureOfInjury = null; daysLost = null; medicalTreatment = null; firstAidGiven = null; rootCauseCategory = null; contributingFactors = null; actionsTaken = null; areaBarricaded = null; responsiblePerson = null; targetDate = null; teamLead = null; teamMembers = null; investigationDueDate = null; attachments = null }),

      ("inc-10", { id = "inc-10"; ticketNumber = "INC-2024-010"; title = "Heat Stress Case - Forge Shop"; location = "Forge Shop"; severity = "Medium"; status = #underReview; reportedBy = "Sunil Sharma"; department = "Forge Shop"; description = "Operator reported dizziness and nausea during summer peak shift."; rootCause = ?"Inadequate rest breaks and hydration station access."; correctiveAction = ?"Install cooling fans and mandatory 15-min break every 2 hours."; createdAt = 1_701_800_000_000_000_000; updatedAt = 1_701_900_000_000_000_000; personsInvolved = null; bodyPartAffected = null; natureOfInjury = null; daysLost = null; medicalTreatment = null; firstAidGiven = null; rootCauseCategory = null; contributingFactors = null; actionsTaken = null; areaBarricaded = null; responsiblePerson = null; targetDate = null; teamLead = null; teamMembers = null; investigationDueDate = null; attachments = null }),

    ];
    for ((k, v) in incidents.values()) { state.incidents.add(k, v) };

    // --- Permits (8) ---
    let permits : [(Text, PermitTypes.PermitRecord)] = [
      ("perm-1", { id = "perm-1"; permitNumber = "PTW-2024-001"; permitType = #hotWork; jobDescription = "Welding of support bracket at Forge Shop Bay 3"; location = "Forge Shop"; requestedBy = "Arjun Singh"; reviewedBy = ?"Rajesh Kumar"; approvedBy = ?"Rajesh Kumar"; status = #active; startTime = 1_701_900_000_000_000_000; endTime = 1_701_936_000_000_000_000; hazards = ["Fire", "Burns", "Fumes"]; ppeRequired = ["Welding Helmet", "Gloves", "Fire-retardant Suit"]; createdAt = 1_701_880_000_000_000_000; hazardControls = null; gasTestResults = null; isolationTypes = null; isolationVerifiedBy = null; lotoApplied = null; toolboxTalk = null; signatures = null; emergencyContacts = null; supervisorOnDuty = null }),
      ("perm-2", { id = "perm-2"; permitNumber = "PTW-2024-002"; permitType = #electrical; jobDescription = "Panel shutdown and cable replacement at RHF Furnace"; location = "RHF Furnace"; requestedBy = "Sunil Sharma"; reviewedBy = ?"Rajesh Kumar"; approvedBy = ?"Rajesh Kumar"; status = #approved; startTime = 1_702_000_000_000_000_000; endTime = 1_702_028_800_000_000_000; hazards = ["Electrocution", "Arc Flash"]; ppeRequired = ["Insulated Gloves", "Face Shield", "HV Rated PPE"]; createdAt = 1_701_980_000_000_000_000; hazardControls = null; gasTestResults = null; isolationTypes = null; isolationVerifiedBy = null; lotoApplied = null; toolboxTalk = null; signatures = null; emergencyContacts = null; supervisorOnDuty = null }),
      ("perm-3", { id = "perm-3"; permitNumber = "PTW-2024-003"; permitType = #confinedSpace; jobDescription = "Cleaning of water tank at Utility Area"; location = "Utility Area"; requestedBy = "Mehul Contractor"; reviewedBy = ?"Rajesh Kumar"; approvedBy = null; status = #validated; startTime = 1_702_100_000_000_000_000; endTime = 1_702_114_400_000_000_000; hazards = ["Asphyxiation", "Toxic Gas", "Engulfment"]; ppeRequired = ["SCBA", "Safety Harness", "Lifeline"]; createdAt = 1_702_080_000_000_000_000; hazardControls = null; gasTestResults = null; isolationTypes = null; isolationVerifiedBy = null; lotoApplied = null; toolboxTalk = null; signatures = null; emergencyContacts = null; supervisorOnDuty = null }),
      ("perm-4", { id = "perm-4"; permitNumber = "PTW-2024-004"; permitType = #heightWork; jobDescription = "Replacement of roof panel at Maintenance Workshop"; location = "Maintenance Workshop"; requestedBy = "Arjun Singh"; reviewedBy = ?"Priya Patel"; approvedBy = ?"Sunil Sharma"; status = #closed; startTime = 1_700_500_000_000_000_000; endTime = 1_700_520_000_000_000_000; hazards = ["Fall from height", "Falling objects"]; ppeRequired = ["Safety Harness", "Helmet", "Safety Boots"]; createdAt = 1_700_480_000_000_000_000; hazardControls = null; gasTestResults = null; isolationTypes = null; isolationVerifiedBy = null; lotoApplied = null; toolboxTalk = null; signatures = null; emergencyContacts = null; supervisorOnDuty = null }),
      ("perm-5", { id = "perm-5"; permitNumber = "PTW-2024-005"; permitType = #hotWork; jobDescription = "Cutting of redundant piping at HTL Area"; location = "HTL Area"; requestedBy = "Priya Patel"; reviewedBy = null; approvedBy = null; status = #draft; startTime = 1_702_200_000_000_000_000; endTime = 1_702_228_800_000_000_000; hazards = ["Fire", "Burns"]; ppeRequired = ["Cutting Goggles", "Gloves", "Apron"]; createdAt = 1_702_180_000_000_000_000; hazardControls = null; gasTestResults = null; isolationTypes = null; isolationVerifiedBy = null; lotoApplied = null; toolboxTalk = null; signatures = null; emergencyContacts = null; supervisorOnDuty = null }),
      ("perm-6", { id = "perm-6"; permitNumber = "PTW-2024-006"; permitType = #excavation; jobDescription = "Foundation trench for new equipment base at Rolling Mill"; location = "Rolling Mill"; requestedBy = "Priya Patel"; reviewedBy = ?"Rajesh Kumar"; approvedBy = ?"Rajesh Kumar"; status = #active; startTime = 1_702_300_000_000_000_000; endTime = 1_702_386_400_000_000_000; hazards = ["Cave-in", "Underground services"]; ppeRequired = ["Hard Hat", "Safety Boots", "High-vis Vest"]; createdAt = 1_702_280_000_000_000_000; hazardControls = null; gasTestResults = null; isolationTypes = null; isolationVerifiedBy = null; lotoApplied = null; toolboxTalk = null; signatures = null; emergencyContacts = null; supervisorOnDuty = null }),
      ("perm-7", { id = "perm-7"; permitNumber = "PTW-2024-007"; permitType = #lineBreaking; jobDescription = "Steam line isolation for annual maintenance at RHF Furnace"; location = "RHF Furnace"; requestedBy = "Sunil Sharma"; reviewedBy = null; approvedBy = null; status = #underReview; startTime = 1_702_400_000_000_000_000; endTime = 1_702_428_800_000_000_000; hazards = ["Steam burn", "Pressure release"]; ppeRequired = ["Heat-resistant Gloves", "Face Shield", "Coverall"]; createdAt = 1_702_380_000_000_000_000; hazardControls = null; gasTestResults = null; isolationTypes = null; isolationVerifiedBy = null; lotoApplied = null; toolboxTalk = null; signatures = null; emergencyContacts = null; supervisorOnDuty = null }),
      ("perm-8", { id = "perm-8"; permitNumber = "PTW-2024-008"; permitType = #confinedSpace; jobDescription = "Inspection of furnace interior at RHF Furnace"; location = "RHF Furnace"; requestedBy = "Sunil Sharma"; reviewedBy = null; approvedBy = null; status = #submitted; startTime = 1_702_500_000_000_000_000; endTime = 1_702_514_400_000_000_000; hazards = ["Heat", "Asphyxiation", "Toxic residue"]; ppeRequired = ["SCBA", "Heat-resistant Suit", "Safety Harness"]; createdAt = 1_702_480_000_000_000_000; hazardControls = null; gasTestResults = null; isolationTypes = null; isolationVerifiedBy = null; lotoApplied = null; toolboxTalk = null; signatures = null; emergencyContacts = null; supervisorOnDuty = null }),
    ];
    for ((k, v) in permits.values()) { state.permits.add(k, v) };

    // --- Risk Assessments (6) ---
    let risks : [(Text, RiskTypes.RiskRecord)] = [
      ("risk-1", { id = "risk-1"; hazard = "Molten metal splash during forging"; location = "Forge Shop"; likelihood = 4; severity = 5; riskLevel = #critical; controls = ["Face shield", "Fire-retardant PPE", "Splash guards"]; residualLikelihood = 2; residualSeverity = 4; status = #approved; createdBy = "Rajesh Kumar"; createdAt = 1_699_000_000_000_000_000 }),
      ("risk-2", { id = "risk-2"; hazard = "Electrical hazard during furnace maintenance"; location = "RHF Furnace"; likelihood = 3; severity = 5; riskLevel = #high; controls = ["LOTO procedure", "Insulated tools", "HV gloves"]; residualLikelihood = 1; residualSeverity = 5; status = #approved; createdBy = "Sunil Sharma"; createdAt = 1_699_100_000_000_000_000 }),
      ("risk-3", { id = "risk-3"; hazard = "Fall from height during roof maintenance"; location = "Maintenance Workshop"; likelihood = 3; severity = 4; riskLevel = #high; controls = ["Safety harness", "Guard rails", "PTW required"]; residualLikelihood = 2; residualSeverity = 3; status = #submitted; createdBy = "Arjun Singh"; createdAt = 1_699_200_000_000_000_000 }),
      ("risk-4", { id = "risk-4"; hazard = "Chemical exposure – hydraulic oil"; location = "HTL Area"; likelihood = 3; severity = 3; riskLevel = #medium; controls = ["Chemical gloves", "Eye wash station", "Spill kit"]; residualLikelihood = 2; residualSeverity = 2; status = #approved; createdBy = "Rajesh Kumar"; createdAt = 1_699_300_000_000_000_000 }),
      ("risk-5", { id = "risk-5"; hazard = "Crane overloading"; location = "Rolling Mill"; likelihood = 2; severity = 5; riskLevel = #critical; controls = ["Load cell calibration", "Rated capacity display", "Slinger-signaller"]; residualLikelihood = 1; residualSeverity = 4; status = #approved; createdBy = "Priya Patel"; createdAt = 1_699_400_000_000_000_000 }),
      ("risk-6", { id = "risk-6"; hazard = "Confined space oxygen deficiency"; location = "Utility Area"; likelihood = 3; severity = 5; riskLevel = #critical; controls = ["Gas testing before entry", "SCBA", "Standby person"]; residualLikelihood = 1; residualSeverity = 5; status = #draft; createdBy = "Mehul Contractor"; createdAt = 1_699_500_000_000_000_000 }),
    ];
    for ((k, v) in risks.values()) { state.risks.add(k, v) };

    // --- Inspections (6) ---
    let inspections : [(Text, InspectionTypes.InspectionRecord)] = [
      ("insp-1", { id = "insp-1"; title = "Fire Safety Inspection – Forge Shop"; area = "Forge Shop"; inspectionDate = 1_701_000_000_000_000_000; inspector = "Rajesh Kumar"; status = #completed; findings = ["Fire extinguisher pressure low at Bay 2", "Emergency exit partially blocked"]; score = 78; createdAt = 1_700_900_000_000_000_000 }),
      ("insp-2", { id = "insp-2"; title = "Electrical Safety Audit – RHF Furnace"; area = "RHF Furnace"; inspectionDate = 1_701_500_000_000_000_000; inspector = "Sunil Sharma"; status = #completed; findings = ["Cable tray covers missing in panel room", "Earthing connection loose on Motor-7"]; score = 82; createdAt = 1_701_400_000_000_000_000 }),
      ("insp-3", { id = "insp-3"; title = "PPE Compliance Check – Rolling Mill"; area = "Rolling Mill"; inspectionDate = 1_702_000_000_000_000_000; inspector = "Priya Patel"; status = #inProgress; findings = ["3 workers found without hearing protection"]; score = 70; createdAt = 1_701_900_000_000_000_000 }),
      ("insp-4", { id = "insp-4"; title = "Housekeeping Audit – Maintenance Workshop"; area = "Maintenance Workshop"; inspectionDate = 1_699_000_000_000_000_000; inspector = "Arjun Singh"; status = #overdue; findings = ["Oil spillage not cleaned", "Tools left on floor"]; score = 55; createdAt = 1_698_900_000_000_000_000 }),
      ("insp-5", { id = "insp-5"; title = "Environmental Compliance – Utility Area"; area = "Utility Area"; inspectionDate = 1_702_500_000_000_000_000; inspector = "Mehul Contractor"; status = #scheduled; findings = []; score = 0; createdAt = 1_702_400_000_000_000_000 }),
      ("insp-6", { id = "insp-6"; title = "ISO 45001 Internal Audit – HTL Area"; area = "HTL Area"; inspectionDate = 1_702_600_000_000_000_000; inspector = "Rajesh Kumar"; status = #scheduled; findings = []; score = 0; createdAt = 1_702_500_000_000_000_000 }),
    ];
    for ((k, v) in inspections.values()) { state.inspections.add(k, v) };

    // --- Training Records (20) ---
    let trainingData : [(Text, TrainingTypes.TrainingRecord)] = [
      ("tr-1",  { id = "tr-1";  employeeId = "user-1"; employeeName = "Rajesh Kumar"; course = "Fire Safety";    completionDate = ?(1_698_000_000_000_000_000); expiryDate = ?(1_729_536_000_000_000_000); status = #completed;  score = ?88 }),
      ("tr-2",  { id = "tr-2";  employeeId = "user-1"; employeeName = "Rajesh Kumar"; course = "LOTO";          completionDate = ?(1_698_100_000_000_000_000); expiryDate = ?(1_729_636_000_000_000_000); status = #completed;  score = ?92 }),
      ("tr-3",  { id = "tr-3";  employeeId = "user-1"; employeeName = "Rajesh Kumar"; course = "Work At Height"; completionDate = null;                           expiryDate = null;                           status = #overdue;    score = null }),
      ("tr-4",  { id = "tr-4";  employeeId = "user-2"; employeeName = "Sunil Sharma";  course = "Fire Safety";    completionDate = ?(1_697_000_000_000_000_000); expiryDate = ?(1_728_536_000_000_000_000); status = #completed;  score = ?95 }),
      ("tr-5",  { id = "tr-5";  employeeId = "user-2"; employeeName = "Sunil Sharma";  course = "First Aid";      completionDate = ?(1_697_200_000_000_000_000); expiryDate = ?(1_728_736_000_000_000_000); status = #completed;  score = ?80 }),
      ("tr-6",  { id = "tr-6";  employeeId = "user-2"; employeeName = "Sunil Sharma";  course = "PPE";            completionDate = null;                           expiryDate = null;                           status = #pending;    score = null }),
      ("tr-7",  { id = "tr-7";  employeeId = "user-2"; employeeName = "Sunil Sharma";  course = "Crane Safety";   completionDate = null;                           expiryDate = null;                           status = #notStarted; score = null }),
      ("tr-8",  { id = "tr-8";  employeeId = "user-3"; employeeName = "Arjun Singh";   course = "LOTO";          completionDate = ?(1_696_000_000_000_000_000); expiryDate = ?(1_627_536_000_000_000_000); status = #overdue;    score = ?75 }),
      ("tr-9",  { id = "tr-9";  employeeId = "user-3"; employeeName = "Arjun Singh";   course = "Work At Height"; completionDate = ?(1_699_000_000_000_000_000); expiryDate = ?(1_730_536_000_000_000_000); status = #completed;  score = ?90 }),
      ("tr-10", { id = "tr-10"; employeeId = "user-3"; employeeName = "Arjun Singh";   course = "Crane Safety";   completionDate = ?(1_699_200_000_000_000_000); expiryDate = ?(1_730_736_000_000_000_000); status = #completed;  score = ?85 }),
      ("tr-11", { id = "tr-11"; employeeId = "user-3"; employeeName = "Arjun Singh";   course = "Fire Safety";    completionDate = null;                           expiryDate = null;                           status = #pending;    score = null }),
      ("tr-12", { id = "tr-12"; employeeId = "user-4"; employeeName = "Priya Patel";   course = "PPE";            completionDate = ?(1_698_500_000_000_000_000); expiryDate = ?(1_730_036_000_000_000_000); status = #completed;  score = ?78 }),
      ("tr-13", { id = "tr-13"; employeeId = "user-4"; employeeName = "Priya Patel";   course = "First Aid";      completionDate = ?(1_698_600_000_000_000_000); expiryDate = ?(1_730_136_000_000_000_000); status = #completed;  score = ?83 }),
      ("tr-14", { id = "tr-14"; employeeId = "user-4"; employeeName = "Priya Patel";   course = "Crane Safety";   completionDate = null;                           expiryDate = null;                           status = #notStarted; score = null }),
      ("tr-15", { id = "tr-15"; employeeId = "user-5"; employeeName = "Mehul Contractor"; course = "Fire Safety";  completionDate = ?(1_697_500_000_000_000_000); expiryDate = ?(1_629_036_000_000_000_000); status = #overdue;    score = ?72 }),
      ("tr-16", { id = "tr-16"; employeeId = "user-5"; employeeName = "Mehul Contractor"; course = "LOTO";        completionDate = null;                           expiryDate = null;                           status = #notStarted; score = null }),
      ("tr-17", { id = "tr-17"; employeeId = "user-5"; employeeName = "Mehul Contractor"; course = "Work At Height"; completionDate = ?(1_699_800_000_000_000_000); expiryDate = ?(1_731_336_000_000_000_000); status = #completed;  score = ?91 }),
      ("tr-18", { id = "tr-18"; employeeId = "user-6"; employeeName = "Sumesh J";     course = "Fire Safety";    completionDate = ?(1_698_700_000_000_000_000); expiryDate = ?(1_730_236_000_000_000_000); status = #completed;  score = ?94 }),
      ("tr-19", { id = "tr-19"; employeeId = "user-6"; employeeName = "Sumesh J";     course = "First Aid";      completionDate = ?(1_698_800_000_000_000_000); expiryDate = ?(1_730_336_000_000_000_000); status = #completed;  score = ?87 }),
      ("tr-20", { id = "tr-20"; employeeId = "user-6"; employeeName = "Sumesh J";     course = "PPE";            completionDate = null;                           expiryDate = null;                           status = #pending;    score = null }),
    ];
    for ((k, v) in trainingData.values()) { state.trainingRecords.add(k, v) };

    // --- Environment Records (8) ---
    let envRecords : [(Text, EnvTypes.EnvironmentRecord)] = [
      ("env-1", { id = "env-1"; recordType = "CO2 Emissions"; value = 124.5; unit = "tonnes"; location = "RHF Furnace"; recordedBy = "Sunil Sharma"; notes = ?"Monthly measurement"; createdAt = 1_700_000_000_000_000_000 }),
      ("env-2", { id = "env-2"; recordType = "Water Usage"; value = 45200.0; unit = "litres"; location = "Utility Area"; recordedBy = "Mehul Contractor"; notes = ?"Weekly consumption"; createdAt = 1_700_200_000_000_000_000 }),
      ("env-3", { id = "env-3"; recordType = "Energy Consumption"; value = 87350.0; unit = "kWh"; location = "Forge Shop"; recordedBy = "Arjun Singh"; notes = ?"Monthly total"; createdAt = 1_700_400_000_000_000_000 }),
      ("env-4", { id = "env-4"; recordType = "Hazardous Waste"; value = 325.0; unit = "kg"; location = "HTL Area"; recordedBy = "Rajesh Kumar"; notes = ?"Includes used hydraulic oil"; createdAt = 1_700_600_000_000_000_000 }),
      ("env-5", { id = "env-5"; recordType = "CO2 Emissions"; value = 118.2; unit = "tonnes"; location = "RHF Furnace"; recordedBy = "Sunil Sharma"; notes = ?"Monthly measurement"; createdAt = 1_701_000_000_000_000_000 }),
      ("env-6", { id = "env-6"; recordType = "Water Usage"; value = 47800.0; unit = "litres"; location = "Utility Area"; recordedBy = "Mehul Contractor"; notes = ?"Weekly consumption"; createdAt = 1_701_200_000_000_000_000 }),
      ("env-7", { id = "env-7"; recordType = "Energy Consumption"; value = 91200.0; unit = "kWh"; location = "Rolling Mill"; recordedBy = "Priya Patel"; notes = ?"Monthly total including overtime"; createdAt = 1_701_400_000_000_000_000 }),
      ("env-8", { id = "env-8"; recordType = "Hazardous Waste"; value = 280.0; unit = "kg"; location = "Maintenance Workshop"; recordedBy = "Arjun Singh"; notes = ?"Includes waste lubricants and solvents"; createdAt = 1_701_600_000_000_000_000 }),
    ];
    for ((k, v) in envRecords.values()) { state.environmentRecords.add(k, v) };

    // --- CAPAs (6) ---
    let capas : [(Text, CapaTypes.CapaRecord)] = [
      ("capa-1", { id = "capa-1"; title = "Install pedestrian walkway markings"; rootCause = "No designated safe walking zones in Forge Shop loading bay"; actionPlan = "Paint floor markings and install safety barriers by 15-Dec-2024"; owner = "Arjun Singh"; department = "Forge Shop"; targetDate = 1_702_512_000_000_000_000; status = #inProgress; verificationDetails = null; createdAt = 1_700_000_000_000_000_000; updatedAt = 1_701_000_000_000_000_000 }),
      ("capa-2", { id = "capa-2"; title = "Replace worn hydraulic hoses – HTL"; rootCause = "Hydraulic hose coupling wear caused oil spill"; actionPlan = "Inspect and replace all hoses older than 2 years. Complete by 30-Nov-2024"; owner = "Rajesh Kumar"; department = "HTL Area"; targetDate = 1_701_388_800_000_000_000; status = #closed; verificationDetails = ?"All 12 hoses replaced and documented on 28-Nov-2024"; createdAt = 1_700_200_000_000_000_000; updatedAt = 1_701_388_800_000_000_000 }),
      ("capa-3", { id = "capa-3"; title = "PPE mandatory audit procedure – Rolling Mill"; rootCause = "PPE compliance gap observed during shift handover"; actionPlan = "Daily PPE checklist to be signed by shift incharge before production"; owner = "Priya Patel"; department = "Rolling Mill"; targetDate = 1_702_000_000_000_000_000; status = #verified; verificationDetails = ?"Procedure implemented and verified effective on 05-Dec-2024"; createdAt = 1_700_400_000_000_000_000; updatedAt = 1_702_000_000_000_000_000 }),
      ("capa-4", { id = "capa-4"; title = "Fall protection enforcement – Maintenance"; rootCause = "Safety harness not worn during height work"; actionPlan = "Mandatory harness check by supervisor. PTW to include harness verification checklist"; owner = "Arjun Singh"; department = "Maintenance Workshop"; targetDate = 1_702_200_000_000_000_000; status = #open; verificationDetails = null; createdAt = 1_700_600_000_000_000_000; updatedAt = 1_700_600_000_000_000_000 }),
      ("capa-5", { id = "capa-5"; title = "Crane load cell calibration schedule"; rootCause = "Load cell calibration drift caused overload alarm"; actionPlan = "Quarterly calibration of all 6 EOT crane load cells. First calibration by 20-Dec-2024"; owner = "Priya Patel"; department = "Rolling Mill"; targetDate = 1_703_030_400_000_000_000; status = #inProgress; verificationDetails = null; createdAt = 1_701_400_000_000_000_000; updatedAt = 1_702_000_000_000_000_000 }),
      ("capa-6", { id = "capa-6"; title = "Safety awareness refresher – HTL"; rootCause = "Insufficient safety training leading to unsafe acts"; actionPlan = "Monthly toolbox talk and quarterly safety refresher for all HTL personnel"; owner = "Rajesh Kumar"; department = "HTL Area"; targetDate = 1_703_116_800_000_000_000; status = #open; verificationDetails = null; createdAt = 1_701_600_000_000_000_000; updatedAt = 1_701_600_000_000_000_000 }),
    ];
    for ((k, v) in capas.values()) { state.capas.add(k, v) };

    // --- Safety Observations (8) ---
    let observations : [(Text, ObsTypes.ObservationRecord)] = [
      ("obs-1", { id = "obs-1"; obsType = #unsafeAct; description = "Worker observed bypassing lockout procedure on press machine"; location = "Forge Shop"; reportedBy = "Rajesh Kumar"; status = #closed; actions = ["Immediate stop-work issued", "Toolbox talk conducted", "Disciplinary action recorded"]; createdAt = 1_699_800_000_000_000_000; attachments = null }),
      ("obs-2", { id = "obs-2"; obsType = #unsafeCondition; description = "Oil leak on floor near HTL-5 creating slip hazard"; location = "HTL Area"; reportedBy = "Priya Patel"; status = #inProgress; actions = ["Warning cones placed", "Maintenance work order raised"]; createdAt = 1_700_200_000_000_000_000; attachments = null }),
      ("obs-3", { id = "obs-3"; obsType = #nearMiss; description = "Rolling bloom almost struck maintenance worker in aisle – Rolling Mill"; location = "Rolling Mill"; reportedBy = "Arjun Singh"; status = #closed; actions = ["Aisle barrier installed", "Coordination procedure updated"]; createdAt = 1_700_500_000_000_000_000; attachments = null }),
      ("obs-4", { id = "obs-4"; obsType = #nearMiss; description = "Crane hook swung unexpectedly during load positioning"; location = "Forge Shop"; reportedBy = "Sunil Sharma"; status = #open; actions = ["Load secured and operation halted"]; createdAt = 1_700_800_000_000_000_000; attachments = null }),
      ("obs-5", { id = "obs-5"; obsType = #unsafeCondition; description = "Fire extinguisher missing from marked location at RHF Furnace"; location = "RHF Furnace"; reportedBy = "Rajesh Kumar"; status = #closed; actions = ["Replacement extinguisher installed same day", "Monthly check schedule updated"]; createdAt = 1_701_000_000_000_000_000; attachments = null }),
      ("obs-6", { id = "obs-6"; obsType = #unsafeAct; description = "Contractor personnel working in confined space without gas test"; location = "Utility Area"; reportedBy = "Mehul Contractor"; status = #closed; actions = ["Work stopped immediately", "Gas test conducted", "Contractor briefed on PTW requirements"]; createdAt = 1_701_300_000_000_000_000; attachments = null }),
      ("obs-7", { id = "obs-7"; obsType = #nearMiss; description = "Electrical panel door left open near water spray area"; location = "RHF Furnace"; reportedBy = "Sunil Sharma"; status = #inProgress; actions = ["Panel secured", "Fault reported to electrical team"]; createdAt = 1_701_600_000_000_000_000; attachments = null }),
      ("obs-8", { id = "obs-8"; obsType = #unsafeCondition; description = "Emergency exit sign not illuminated at Maintenance Workshop"; location = "Maintenance Workshop"; reportedBy = "Arjun Singh"; status = #open; actions = ["Electrician notified for replacement"]; createdAt = 1_701_900_000_000_000_000; attachments = null }),
    ];
    for ((k, v) in observations.values()) { state.observations.add(k, v) };

    // --- Activity Feed (5) ---
    state.activityFeed.add({ id = "feed-1"; message = "Hot Work Permit PTW-2024-001 Approved – Forge Shop Bay 3"; timestamp = 1_701_880_000_000_000_000; category = "permit" });
    state.activityFeed.add({ id = "feed-2"; message = "Near Miss Reported – Forge Shop: Crane hook swing incident"; timestamp = 1_700_800_000_000_000_000; category = "incident" });
    state.activityFeed.add({ id = "feed-3"; message = "Unsafe Act Closed – HTL Area: Confined space entry without gas test"; timestamp = 1_701_300_000_000_000_000; category = "observation" });
    state.activityFeed.add({ id = "feed-4"; message = "Audit Scheduled – ISO 45001 Internal Audit for HTL Area"; timestamp = 1_702_500_000_000_000_000; category = "inspection" });
    state.activityFeed.add({ id = "feed-5"; message = "CAPA Verified – PPE mandatory audit procedure implemented at Rolling Mill"; timestamp = 1_702_000_000_000_000_000; category = "capa" });

    "Seed complete.";
  };
};
