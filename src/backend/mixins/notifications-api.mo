import Map "mo:core/Map";
import UserTypes "../types/users";
import IncidentTypes "../types/incidents";
import PermitTypes "../types/permits";
import CapaTypes "../types/capa";
import TrainingTypes "../types/training";
import InspectionTypes "../types/inspections";
import NotifLib "../lib/notifications";

mixin (
  users : Map.Map<Text, UserTypes.UserRecord>,
  incidentsV2 : Map.Map<Text, IncidentTypes.IncidentRecord>,
  permitsV2 : Map.Map<Text, PermitTypes.PermitRecord>,
  capas : Map.Map<Text, CapaTypes.CapaRecord>,
  trainingRecords : Map.Map<Text, TrainingTypes.TrainingRecord>,
  inspections : Map.Map<Text, InspectionTypes.InspectionRecord>,
) {
  /// Admin-only: trigger a test email to all Safety Officers and EHS Managers.
  public func sendTestNotification() : async Text {
    let officers = NotifLib.getEmailsByRole(users, #safetyOfficer);
    let mgrs = NotifLib.getEmailsByRole(users, #ehsManager);
    let admins = NotifLib.getEmailsByRole(users, #systemAdmin);
    let total = officers.size() + mgrs.size() + admins.size();
    if (total == 0) {
      return "No Safety Officers, EHS Managers, or System Admins found to notify.";
    };
    await NotifLib.notifyIncidentSubmitted(users, {
      id = "test";
      ticketNumber = "TEST-001";
      title = "Test Notification";
      location = "System";
      severity = "Low";
      status = #submitted;
      reportedBy = "System Admin";
      department = "EHS";
      description = "This is a test notification from the RKTR OHSE Command Center.";
      rootCause = null;
      correctiveAction = null;
      createdAt = 0;
      updatedAt = 0;
      personsInvolved = null;
      bodyPartAffected = null;
      natureOfInjury = null;
      daysLost = null;
      medicalTreatment = null;
      firstAidGiven = null;
      rootCauseCategory = null;
      contributingFactors = null;
      actionsTaken = null;
      areaBarricaded = null;
      responsiblePerson = null;
      targetDate = null;
      teamLead = null;
      teamMembers = null;
      investigationDueDate = null;
      attachments = null;
    });
    "Test notification sent to " # debug_show(total) # " recipients (including system admin).";
  };

  /// Called by the 24h timer — checks all deadlines and sends alerts.
  public func runDeadlineChecks() : async () {
    await NotifLib.runDeadlineChecks(
      users,
      capas,
      trainingRecords,
      permitsV2,
      inspections,
    );
  };
};
