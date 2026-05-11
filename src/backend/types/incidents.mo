import Common "common";

module {
  public type IncidentStatus = {
    #draft;
    #submitted;
    #underReview;
    #approved;
    #closed;
    #rejected;
    #escalated;
    #overdue;
  };

  public type PersonInvolved = {
    name : Text;
    employeeId : Text;
    department : Text;
    role : Text;
    injuryType : Text;
  };

  public type AttachmentMeta = {
    id : Text;
    name : Text;
    contentType : Text;
    size : Nat;
    uploadedAt : Int;
    storageHash : Text;
  };

  public type IncidentRecord = {
    id : Common.RecordId;
    ticketNumber : Text;
    title : Text;
    location : Text;
    severity : Text;
    status : IncidentStatus;
    reportedBy : Text;
    department : Text;
    description : Text;
    rootCause : ?Text;
    correctiveAction : ?Text;
    createdAt : Common.Timestamp;
    updatedAt : Common.Timestamp;
    // Section 2 — Persons Involved
    personsInvolved : ?[PersonInvolved];
    // Section 3 — Injury Details
    bodyPartAffected : ?Text;
    natureOfInjury : ?Text;
    daysLost : ?Nat;
    medicalTreatment : ?Bool;
    firstAidGiven : ?Bool;
    // Section 4 — Root Cause
    rootCauseCategory : ?Text;
    contributingFactors : ?[Text];
    // Section 5 — Immediate Action
    actionsTaken : ?Text;
    areaBarricaded : ?Bool;
    // Section 6 — Corrective Action
    responsiblePerson : ?Text;
    targetDate : ?Text;
    // Section 7 — Investigation Team
    teamLead : ?Text;
    teamMembers : ?[Text];
    investigationDueDate : ?Text;
    // Section 8 — Attachments
    attachments : ?[AttachmentMeta];
  };
};
