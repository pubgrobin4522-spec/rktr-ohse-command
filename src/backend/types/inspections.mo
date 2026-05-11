import Common "common";

module {
  public type InspectionStatus = {
    #scheduled;
    #inProgress;
    #completed;
    #overdue;
  };

  public type InspectionRecord = {
    id : Common.RecordId;
    title : Text;
    area : Text;
    inspectionDate : Common.Timestamp;
    inspector : Text;
    status : InspectionStatus;
    findings : [Text];
    score : Nat;
    createdAt : Common.Timestamp;
  };
};
