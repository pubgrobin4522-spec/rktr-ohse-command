import Common "common";

module {
  public type PermitType = {
    #hotWork;
    #electrical;
    #excavation;
    #heightWork;
    #confinedSpace;
    #lineBreaking;
    #liftingPermit;
    #generalWorkPermit;
  };

  public type PermitStatus = {
    #draft;
    #submitted;
    #underReview;
    #validated;
    #approved;
    #active;
    #closed;
    #rejected;
    #expired;
  };

  public type HazardControl = {
    hazard : Text;
    control : Text;
    residualRisk : Text;
  };

  public type GasTestResults = {
    oxygenLevel : Text;
    flammableGas : Text;
    toxicGas : Text;
    testedBy : Text;
    testTime : Text;
  };

  public type ToolboxTalk = {
    conductedBy : Text;
    conductedAt : Text;
    attendeesCount : Nat;
    keyPoints : Text;
  };

  public type PermitSignatures = {
    requestedBySignature : Text;
    supervisorSignature : Text;
    safetyOfficerSignature : Text;
  };

  public type EmergencyContact = {
    name : Text;
    role : Text;
    phone : Text;
  };

  public type PermitRecord = {
    id : Common.RecordId;
    permitNumber : Text;
    permitType : PermitType;
    jobDescription : Text;
    location : Text;
    requestedBy : Text;
    reviewedBy : ?Text;
    approvedBy : ?Text;
    status : PermitStatus;
    startTime : Common.Timestamp;
    endTime : Common.Timestamp;
    hazards : [Text];
    ppeRequired : [Text];
    createdAt : Common.Timestamp;
    // Extended fields
    hazardControls : ?[HazardControl];
    gasTestResults : ?GasTestResults;
    isolationTypes : ?[Text];
    isolationVerifiedBy : ?Text;
    lotoApplied : ?Bool;
    toolboxTalk : ?ToolboxTalk;
    signatures : ?PermitSignatures;
    emergencyContacts : ?[EmergencyContact];
    supervisorOnDuty : ?Text;
  };
};
