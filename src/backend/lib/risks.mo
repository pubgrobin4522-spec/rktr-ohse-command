import Common "../types/common";
import Types "../types/risks";
import Map "mo:core/Map";
import Iter "mo:core/Iter";

module {
  public type State = {
    risks : Map.Map<Text, Types.RiskRecord>;
  };

  public func createRisk(
    state : State,
    risk : Types.RiskRecord,
  ) : Common.Result<Text, Text> {
    state.risks.add(risk.id, risk);
    #ok(risk.id);
  };

  public func getRisks(state : State) : [Types.RiskRecord] {
    state.risks.values().toArray();
  };

  public func updateRiskStatus(
    state : State,
    id : Text,
    status : Types.RiskStatus,
  ) : Common.Result<(), Text> {
    switch (state.risks.get(id)) {
      case null { #err("Risk not found.") };
      case (?rec) {
        state.risks.add(id, { rec with status });
        #ok(());
      };
    };
  };

  public func deleteRisk(
    state : State,
    id : Text,
  ) : Common.Result<(), Text> {
    switch (state.risks.get(id)) {
      case null { #err("Risk not found.") };
      case _ {
        state.risks.remove(id);
        #ok(());
      };
    };
  };
};
