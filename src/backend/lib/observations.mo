import Common "../types/common";
import Types "../types/observations";
import Map "mo:core/Map";
import Iter "mo:core/Iter";

module {
  public type State = {
    observations : Map.Map<Text, Types.ObservationRecord>;
  };

  public func createObservation(
    state : State,
    obs : Types.ObservationRecord,
  ) : Common.Result<Text, Text> {
    state.observations.add(obs.id, obs);
    #ok(obs.id);
  };

  public func getObservations(state : State) : [Types.ObservationRecord] {
    state.observations.values().toArray();
  };

  public func updateObservationStatus(
    state : State,
    id : Text,
    status : Types.ObservationStatus,
  ) : Common.Result<(), Text> {
    switch (state.observations.get(id)) {
      case null { #err("Observation not found.") };
      case (?rec) {
        state.observations.add(id, { rec with status });
        #ok(());
      };
    };
  };

  public func deleteObservation(
    state : State,
    id : Text,
  ) : Common.Result<(), Text> {
    switch (state.observations.get(id)) {
      case null { #err("Observation not found.") };
      case _ {
        state.observations.remove(id);
        #ok(());
      };
    };
  };
};
