import Common "common";

module {
  public type EnvironmentRecord = {
    id : Common.RecordId;
    recordType : Text;
    value : Float;
    unit : Text;
    location : Text;
    recordedBy : Text;
    notes : ?Text;
    createdAt : Common.Timestamp;
  };
};
