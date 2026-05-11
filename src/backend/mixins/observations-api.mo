import Common "../types/common";
import Types "../types/observations";
import ObsLib "../lib/observations";
import Map "mo:core/Map";

mixin (observations : Map.Map<Text, Types.ObservationRecord>) {
  public func createObservation(obs : Types.ObservationRecord) : async Common.Result<Text, Text> {
    ObsLib.createObservation({ observations }, obs);
  };

  public query func getObservations() : async [Types.ObservationRecord] {
    ObsLib.getObservations({ observations });
  };

  public func updateObservation(id : Text, obs : Types.ObservationRecord) : async Common.Result<(), Text> {
    ObsLib.updateObservation({ observations }, id, obs);
  };

  public func updateObservationStatus(id : Text, status : Types.ObservationStatus) : async Common.Result<(), Text> {
    ObsLib.updateObservationStatus({ observations }, id, status);
  };

  public func deleteObservation(id : Text) : async Common.Result<(), Text> {
    ObsLib.deleteObservation({ observations }, id);
  };
};
