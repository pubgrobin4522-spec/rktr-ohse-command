import Common "../types/common";
import Types "../types/risks";
import RiskLib "../lib/risks";
import Map "mo:core/Map";

mixin (risks : Map.Map<Text, Types.RiskRecord>) {
  public func createRisk(risk : Types.RiskRecord) : async Common.Result<Text, Text> {
    RiskLib.createRisk({ risks }, risk);
  };

  public query func getRisks() : async [Types.RiskRecord] {
    RiskLib.getRisks({ risks });
  };

  public func updateRiskStatus(id : Text, status : Types.RiskStatus) : async Common.Result<(), Text> {
    RiskLib.updateRiskStatus({ risks }, id, status);
  };

  public func deleteRisk(id : Text) : async Common.Result<(), Text> {
    RiskLib.deleteRisk({ risks }, id);
  };
};
