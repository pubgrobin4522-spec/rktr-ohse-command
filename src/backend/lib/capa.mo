import Common "../types/common";
import Types "../types/capa";
import Map "mo:core/Map";
import Iter "mo:core/Iter";

module {
  public type State = {
    capas : Map.Map<Text, Types.CapaRecord>;
  };

  public func createCapa(
    state : State,
    capa : Types.CapaRecord,
  ) : Common.Result<Text, Text> {
    state.capas.add(capa.id, capa);
    #ok(capa.id);
  };

  public func getCapas(state : State) : [Types.CapaRecord] {
    state.capas.values().toArray();
  };

  public func updateCapaStatus(
    state : State,
    id : Text,
    status : Types.CapaStatus,
  ) : Common.Result<(), Text> {
    switch (state.capas.get(id)) {
      case null { #err("CAPA not found.") };
      case (?rec) {
        state.capas.add(id, { rec with status });
        #ok(());
      };
    };
  };

  public func updateCapa(
    state : State,
    id : Text,
    capa : Types.CapaRecord,
  ) : Common.Result<(), Text> {
    switch (state.capas.get(id)) {
      case null { #err("CAPA not found.") };
      case _ {
        state.capas.add(id, capa);
        #ok(());
      };
    };
  };

  public func deleteCapa(
    state : State,
    id : Text,
  ) : Common.Result<(), Text> {
    switch (state.capas.get(id)) {
      case null { #err("CAPA not found.") };
      case _ {
        state.capas.remove(id);
        #ok(());
      };
    };
  };
};
