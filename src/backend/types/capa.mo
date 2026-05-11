import Common "common";

module {
  public type CapaStatus = {
    #open;
    #inProgress;
    #closed;
    #verified;
  };

  public type CapaRecord = {
    id : Common.RecordId;
    title : Text;
    rootCause : Text;
    actionPlan : Text;
    owner : Text;
    department : Text;
    targetDate : Common.Timestamp;
    status : CapaStatus;
    verificationDetails : ?Text;
    createdAt : Common.Timestamp;
    updatedAt : Common.Timestamp;
  };
};
