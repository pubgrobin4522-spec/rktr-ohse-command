import Common "common";

module {
  public type RiskLevel = {
    #veryLow;
    #low;
    #medium;
    #high;
    #critical;
  };

  public type RiskStatus = {
    #draft;
    #submitted;
    #approved;
  };

  public type RiskRecord = {
    id : Common.RecordId;
    hazard : Text;
    location : Text;
    likelihood : Nat;
    severity : Nat;
    riskLevel : RiskLevel;
    controls : [Text];
    residualLikelihood : Nat;
    residualSeverity : Nat;
    status : RiskStatus;
    createdBy : Text;
    createdAt : Common.Timestamp;
  };
};
