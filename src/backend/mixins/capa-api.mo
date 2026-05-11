import Common "../types/common";
import Types "../types/capa";
import CapaLib "../lib/capa";
import Map "mo:core/Map";

mixin (capas : Map.Map<Text, Types.CapaRecord>) {
  public func createCapa(capa : Types.CapaRecord) : async Common.Result<Text, Text> {
    CapaLib.createCapa({ capas }, capa);
  };

  public query func getCapas() : async [Types.CapaRecord] {
    CapaLib.getCapas({ capas });
  };

  public func updateCapaStatus(id : Text, status : Types.CapaStatus) : async Common.Result<(), Text> {
    CapaLib.updateCapaStatus({ capas }, id, status);
  };

  public func updateCapa(id : Text, capa : Types.CapaRecord) : async Common.Result<(), Text> {
    CapaLib.updateCapa({ capas }, id, capa);
  };

  public func deleteCapa(id : Text) : async Common.Result<(), Text> {
    CapaLib.deleteCapa({ capas }, id);
  };
};
