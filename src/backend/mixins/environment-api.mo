import Common "../types/common";
import Types "../types/environment";
import EnvLib "../lib/environment";
import Map "mo:core/Map";

mixin (environmentRecords : Map.Map<Text, Types.EnvironmentRecord>) {
  public func createEnvironmentRecord(record : Types.EnvironmentRecord) : async Common.Result<Text, Text> {
    EnvLib.createEnvironmentRecord({ environmentRecords }, record);
  };

  public query func getEnvironmentRecords() : async [Types.EnvironmentRecord] {
    EnvLib.getEnvironmentRecords({ environmentRecords });
  };

  public func deleteEnvironmentRecord(id : Text) : async Common.Result<(), Text> {
    EnvLib.deleteEnvironmentRecord({ environmentRecords }, id);
  };
};
