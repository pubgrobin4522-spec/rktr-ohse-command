import Common "common";

module {
  public type TrainingStatus = {
    #completed;
    #pending;
    #overdue;
    #notStarted;
  };

  public type TrainingRecord = {
    id : Common.RecordId;
    employeeId : Text;
    employeeName : Text;
    course : Text;
    completionDate : ?Common.Timestamp;
    expiryDate : ?Common.Timestamp;
    status : TrainingStatus;
    score : ?Nat;
  };
};
