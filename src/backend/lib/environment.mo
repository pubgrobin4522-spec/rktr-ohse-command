import Common "../types/common";
import Types "../types/environment";
import Map "mo:core/Map";
import Iter "mo:core/Iter";

module {
  public type State = {
    environmentRecords : Map.Map<Text, Types.EnvironmentRecord>;
  };

  public func createEnvironmentRecord(
    state : State,
    record : Types.EnvironmentRecord,
  ) : Common.Result<Text, Text> {
    state.environmentRecords.add(record.id, record);
    #ok(record.id);
  };

  public func getEnvironmentRecords(state : State) : [Types.EnvironmentRecord] {
    state.environmentRecords.values().toArray();
  };

  public func deleteEnvironmentRecord(
    state : State,
    id : Text,
  ) : Common.Result<(), Text> {
    switch (state.environmentRecords.get(id)) {
      case null { #err("Environment record not found.") };
      case _ {
        state.environmentRecords.remove(id);
        #ok(());
      };
    };
  };
};
