import Common "../types/common";
import Types "../types/inspections";
import Map "mo:core/Map";
import Iter "mo:core/Iter";

module {
  public type State = {
    inspections : Map.Map<Text, Types.InspectionRecord>;
  };

  public func createInspection(
    state : State,
    inspection : Types.InspectionRecord,
  ) : Common.Result<Text, Text> {
    state.inspections.add(inspection.id, inspection);
    #ok(inspection.id);
  };

  public func getInspections(state : State) : [Types.InspectionRecord] {
    state.inspections.values().toArray();
  };

  public func updateInspectionStatus(
    state : State,
    id : Text,
    status : Types.InspectionStatus,
  ) : Common.Result<(), Text> {
    switch (state.inspections.get(id)) {
      case null { #err("Inspection not found.") };
      case (?rec) {
        state.inspections.add(id, { rec with status });
        #ok(());
      };
    };
  };

  public func deleteInspection(
    state : State,
    id : Text,
  ) : Common.Result<(), Text> {
    switch (state.inspections.get(id)) {
      case null { #err("Inspection not found.") };
      case _ {
        state.inspections.remove(id);
        #ok(());
      };
    };
  };
};
