import Map "mo:core/Map";
import List "mo:core/List";
import Timer "mo:core/Timer";


import UsersMixin "mixins/users-api";
import IncidentsMixin "mixins/incidents-api";
import PermitsMixin "mixins/permits-api";
import RisksMixin "mixins/risks-api";
import InspectionsMixin "mixins/inspections-api";
import TrainingMixin "mixins/training-api";
import EnvironmentMixin "mixins/environment-api";
import CapaMixin "mixins/capa-api";
import ObservationsMixin "mixins/observations-api";
import DepartmentsMixin "mixins/departments-api";
import DashboardMixin "mixins/dashboard-api";
import NotificationsMixin "mixins/notifications-api";
import DashTypes "types/dashboard";
import IncidentTypes "types/incidents";
import PermitTypes "types/permits";
import RiskTypes "types/risks";
import TrainingTypes "types/training";
import ObsTypes "types/observations";
import UserTypes "types/users";
import CapaTypes "types/capa";
import InspectionTypes "types/inspections";
import EnvTypes "types/environment";
import DeptTypes "types/departments";
import UserLib "lib/users";
import ESGMixin "mixins/esg-api";
import ESGTypes "types/esg";
import Principal "mo:core/Principal";
import Time "mo:core/Time";



actor {
  // ── Legacy type declarations for stable migration ─────────────────────────────────────
  // The OLD IncidentRecord and PermitRecord types that were previously stored
  // in stable memory. These must match backend.most exactly for migration.
  type LegacyIncidentRecord = {
    id : Text; ticketNumber : Text; title : Text; location : Text;
    severity : Text; status : IncidentTypes.IncidentStatus;
    reportedBy : Text; department : Text; description : Text;
    rootCause : ?Text; correctiveAction : ?Text;
    createdAt : Int; updatedAt : Int;
  };
  // ── Legacy permit type — frozen at the 6-value shape from the .most snapshot ──
  // DO NOT add new values here — this keeps stable compatibility for `permits` and `permitsV2`.
  type LegacyPermitType = {
    #hotWork; #electrical; #excavation;
    #heightWork; #confinedSpace; #lineBreaking;
  };

  type LegacyPermitRecord = {
    id : Text; permitNumber : Text;
    permitType : LegacyPermitType; jobDescription : Text;
    location : Text; requestedBy : Text; reviewedBy : ?Text;
    approvedBy : ?Text; status : PermitTypes.PermitStatus;
    startTime : Int; endTime : Int;
    hazards : [Text]; ppeRequired : [Text]; createdAt : Int;
  };

  // IncidentRecord BEFORE the `attachments` field was added (v2 shape)
  type IncidentRecordV2 = {
    id : Text; ticketNumber : Text; title : Text; location : Text;
    severity : Text; status : IncidentTypes.IncidentStatus;
    reportedBy : Text; department : Text; description : Text;
    rootCause : ?Text; correctiveAction : ?Text;
    createdAt : Int; updatedAt : Int;
    personsInvolved : ?[IncidentTypes.PersonInvolved];
    bodyPartAffected : ?Text; natureOfInjury : ?Text;
    daysLost : ?Nat; medicalTreatment : ?Bool; firstAidGiven : ?Bool;
    rootCauseCategory : ?Text; contributingFactors : ?[Text];
    actionsTaken : ?Text; areaBarricaded : ?Bool;
    responsiblePerson : ?Text; targetDate : ?Text;
    teamLead : ?Text; teamMembers : ?[Text]; investigationDueDate : ?Text;
    // Note: no `attachments` field — this is what changed
  };

  // ObservationRecord BEFORE the `attachments` field was added
  type LegacyObservationRecord = {
    id : Text; obsType : ObsTypes.ObservationType;
    description : Text; location : Text; reportedBy : Text;
    status : ObsTypes.ObservationStatus; actions : [Text];
    createdAt : Int;
  };

  // LegacyPermitRecordV2: the old full PermitRecord shape using the frozen 6-value LegacyPermitType.
  // Keeps `permitsV2` stable-compatible with the .most snapshot.
  type LegacyPermitRecordV2 = {
    id : Text; permitNumber : Text;
    permitType : LegacyPermitType; jobDescription : Text;
    location : Text; requestedBy : Text; reviewedBy : ?Text;
    approvedBy : ?Text; status : PermitTypes.PermitStatus;
    startTime : Int; endTime : Int;
    hazards : [Text]; ppeRequired : [Text]; createdAt : Int;
    hazardControls : ?[PermitTypes.HazardControl];
    gasTestResults : ?PermitTypes.GasTestResults;
    isolationTypes : ?[Text]; isolationVerifiedBy : ?Text;
    lotoApplied : ?Bool; toolboxTalk : ?PermitTypes.ToolboxTalk;
    signatures : ?PermitTypes.PermitSignatures;
    emergencyContacts : ?[PermitTypes.EmergencyContact];
    supervisorOnDuty : ?Text;
  };

  // OLD stable maps (previous deployed types — kept for upgrade reading)
  let incidents : Map.Map<Text, LegacyIncidentRecord> = Map.empty();
  let permits : Map.Map<Text, LegacyPermitRecord> = Map.empty();

  // incidentsV2: preserved as old type to stay compatible with .most snapshot.
  // Do NOT change the type here — it must match IncidentRecord__367788537 in backend.most.
  let incidentsV2 : Map.Map<Text, IncidentRecordV2> = Map.empty();
  // permitsV2: FROZEN — uses LegacyPermitRecordV2 (6-value PermitType). Do NOT change.
  let permitsV2 : Map.Map<Text, LegacyPermitRecordV2> = Map.empty();
  let permitCounter = { var nextId : Nat = 0 };

  // permitsV3: NEW map — uses full PermitTypes.PermitRecord with 8-value PermitType (incl. liftingPermit, generalWorkPermit)
  let permitsV3 = Map.empty<Text, PermitTypes.PermitRecord>();

  // NEW stable map — incidentsV3 holds IncidentRecord with the `attachments` field
  let incidentsV3 = Map.empty<Text, IncidentTypes.IncidentRecord>();

  // OLD users map (legacy type without employeeNumber/mobileNumber — kept for postupgrade migration)
  type LegacyUserRecord = {
    id : Text; name : Text; email : Text;
    role : UserTypes.UserRole; department : Text; active : Bool;
  };
  let users : Map.Map<Text, LegacyUserRecord> = Map.empty();

  // NEW users map (current type with employeeNumber and mobileNumber)
  let usersV2 = Map.empty<Text, UserTypes.UserRecord>();
  // Bootstrap: ensure admin account is always available and unique
  do {
    if (usersV2.get("sumesh.j@rktrwheels.com") == null) {
      usersV2.add("sumesh.j@rktrwheels.com", { id = "user-6"; name = "Sumesh J"; email = "sumesh.j@rktrwheels.com"; role = #systemAdmin; department = "EHS"; active = true; employeeNumber = "RKTR-ADMIN-001"; mobileNumber = "" });
    };
    // Auto-downgrade any other user holding systemAdmin to ehsManager
    ignore UserLib.enforceSystemAdminUniqueness({ users = usersV2 });
  };
  let risks = Map.empty<Text, RiskTypes.RiskRecord>();
  let inspections = Map.empty<Text, InspectionTypes.InspectionRecord>();
  let trainingRecords = Map.empty<Text, TrainingTypes.TrainingRecord>();
  let environmentRecords = Map.empty<Text, EnvTypes.EnvironmentRecord>();
  let esgRecords = Map.empty<Text, ESGTypes.ESGRecord>();

  let capas = Map.empty<Text, CapaTypes.CapaRecord>();

  // OLD observations stable map (previous deployed type — kept for upgrade reading)
  let observations : Map.Map<Text, LegacyObservationRecord> = Map.empty();
  // NEW observations stable map — holds ObservationRecord with `attachments` field
  let observationsV2 = Map.empty<Text, ObsTypes.ObservationRecord>();

  let departments = Map.empty<Text, DeptTypes.DepartmentRecord>();
  let activityFeed = List.empty<DashTypes.ActivityFeedItem>();
  let registrationEvents = List.empty<DashTypes.ActivityFeedItem>();
  let notifLastRead = Map.empty<Principal, Time.Time>();
  let otpStore = Map.empty<Text, UserTypes.OtpRecord>();

  // Helper to convert frozen 6-value LegacyPermitType to the current 8-value PermitType
  func legacyPermitTypeToNew(pt : LegacyPermitType) : PermitTypes.PermitType {
    switch (pt) {
      case (#hotWork) { #hotWork };
      case (#electrical) { #electrical };
      case (#excavation) { #excavation };
      case (#heightWork) { #heightWork };
      case (#confinedSpace) { #confinedSpace };
      case (#lineBreaking) { #lineBreaking };
    };
  };

  // ── Stable migration: promote legacy and v2 incidents/permits/users/observations to current types ──
  system func postupgrade() {
    // Migrate legacy users to v2 Map with new required fields defaulted to ""
    for ((k, v) in users.entries()) {
      if (usersV2.get(k) == null) {
        usersV2.add(k, {
          id = v.id; name = v.name; email = v.email;
          role = v.role; department = v.department; active = v.active;
          employeeNumber = ""; mobileNumber = "";
        });
      };
    };
    // Always ensure admin account is correct after any upgrade
    usersV2.add("sumesh.j@rktrwheels.com", { id = "user-6"; name = "Sumesh J"; email = "sumesh.j@rktrwheels.com"; role = #systemAdmin; department = "EHS"; active = true; employeeNumber = "RKTR-ADMIN-001"; mobileNumber = "" });
    // Auto-downgrade any other user holding systemAdmin to ehsManager
    ignore UserLib.enforceSystemAdminUniqueness({ users = usersV2 });
    // Migrate legacy incidents (v1) to v3
    for ((k, v) in incidents.entries()) {
      if (incidentsV3.get(k) == null) {
        incidentsV3.add(k, {
          id = v.id; ticketNumber = v.ticketNumber; title = v.title;
          location = v.location; severity = v.severity; status = v.status;
          reportedBy = v.reportedBy; department = v.department;
          description = v.description; rootCause = v.rootCause;
          correctiveAction = v.correctiveAction;
          createdAt = v.createdAt; updatedAt = v.updatedAt;
          personsInvolved = null; bodyPartAffected = null;
          natureOfInjury = null; daysLost = null;
          medicalTreatment = null; firstAidGiven = null;
          rootCauseCategory = null; contributingFactors = null;
          actionsTaken = null; areaBarricaded = null;
          responsiblePerson = null; targetDate = null;
          teamLead = null; teamMembers = null;
          investigationDueDate = null;
          attachments = null;
        });
      };
    };
    // Migrate v2 incidents (with extended fields, but no attachments) to v3
    for ((k, v) in incidentsV2.entries()) {
      if (incidentsV3.get(k) == null) {
        incidentsV3.add(k, {
          id = v.id; ticketNumber = v.ticketNumber; title = v.title;
          location = v.location; severity = v.severity; status = v.status;
          reportedBy = v.reportedBy; department = v.department;
          description = v.description; rootCause = v.rootCause;
          correctiveAction = v.correctiveAction;
          createdAt = v.createdAt; updatedAt = v.updatedAt;
          personsInvolved = v.personsInvolved;
          bodyPartAffected = v.bodyPartAffected;
          natureOfInjury = v.natureOfInjury;
          daysLost = v.daysLost;
          medicalTreatment = v.medicalTreatment;
          firstAidGiven = v.firstAidGiven;
          rootCauseCategory = v.rootCauseCategory;
          contributingFactors = v.contributingFactors;
          actionsTaken = v.actionsTaken;
          areaBarricaded = v.areaBarricaded;
          responsiblePerson = v.responsiblePerson;
          targetDate = v.targetDate;
          teamLead = v.teamLead;
          teamMembers = v.teamMembers;
          investigationDueDate = v.investigationDueDate;
          attachments = null;
        });
      };
    };
    // Migrate legacy permits (v1, 6-value LegacyPermitType) to permitsV3
    for ((k, v) in permits.entries()) {
      if (permitsV3.get(k) == null) {
        permitsV3.add(k, {
          id = v.id; permitNumber = v.permitNumber;
          permitType = legacyPermitTypeToNew(v.permitType);
          jobDescription = v.jobDescription;
          location = v.location; requestedBy = v.requestedBy;
          reviewedBy = v.reviewedBy; approvedBy = v.approvedBy;
          status = v.status; startTime = v.startTime; endTime = v.endTime;
          hazards = v.hazards; ppeRequired = v.ppeRequired;
          createdAt = v.createdAt;
          hazardControls = null; gasTestResults = null;
          isolationTypes = null; isolationVerifiedBy = null;
          lotoApplied = null; toolboxTalk = null;
          signatures = null; emergencyContacts = null;
          supervisorOnDuty = null;
        });
      };
    };
    // Migrate permitsV2 (6-value LegacyPermitRecordV2) to permitsV3
    for ((k, v) in permitsV2.entries()) {
      if (permitsV3.get(k) == null) {
        permitsV3.add(k, {
          id = v.id; permitNumber = v.permitNumber;
          permitType = legacyPermitTypeToNew(v.permitType);
          jobDescription = v.jobDescription;
          location = v.location; requestedBy = v.requestedBy;
          reviewedBy = v.reviewedBy; approvedBy = v.approvedBy;
          status = v.status; startTime = v.startTime; endTime = v.endTime;
          hazards = v.hazards; ppeRequired = v.ppeRequired;
          createdAt = v.createdAt;
          hazardControls = v.hazardControls; gasTestResults = v.gasTestResults;
          isolationTypes = v.isolationTypes; isolationVerifiedBy = v.isolationVerifiedBy;
          lotoApplied = v.lotoApplied; toolboxTalk = v.toolboxTalk;
          signatures = v.signatures; emergencyContacts = v.emergencyContacts;
          supervisorOnDuty = v.supervisorOnDuty;
        });
      };
    };
    // Migrate legacy observations (without attachments) to observationsV2
    for ((k, v) in observations.entries()) {
      if (observationsV2.get(k) == null) {
        observationsV2.add(k, {
          id = v.id; obsType = v.obsType;
          description = v.description; location = v.location;
          reportedBy = v.reportedBy; status = v.status;
          actions = v.actions; createdAt = v.createdAt;
          attachments = null;
        });
      };
    };
  };

  // ── Mixin includes ───
  include UsersMixin(usersV2, registrationEvents, otpStore);
  include IncidentsMixin(incidentsV3, usersV2);
  include PermitsMixin(permitsV3, permitCounter, usersV2);
  include RisksMixin(risks);
  include InspectionsMixin(inspections, usersV2, activityFeed);
  include TrainingMixin(trainingRecords);
  include EnvironmentMixin(environmentRecords);
  include CapaMixin(capas);
  include ObservationsMixin(observationsV2);
  include DepartmentsMixin(departments);
  include ESGMixin(esgRecords, usersV2);
  include DashboardMixin(incidentsV3, permitsV3, risks, trainingRecords, observationsV2, activityFeed, usersV2, capas, inspections, environmentRecords, departments, notifLastRead, registrationEvents);
  include NotificationsMixin(usersV2, incidentsV3, permitsV3, capas, trainingRecords, inspections);

  // 24-hour deadline check timer — registered once at actor init
  ignore Timer.recurringTimer<system>(
    #seconds(86_400),
    func() : async () {
      await runDeadlineChecks();
    },
  );
};
