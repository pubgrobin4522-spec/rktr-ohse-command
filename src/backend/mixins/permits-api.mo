import Common "../types/common";
import Types "../types/permits";
import UserTypes "../types/users";
import PermitLib "../lib/permits";
import NotifLib "../lib/notifications";
import Map "mo:core/Map";

mixin (
  permits : Map.Map<Text, Types.PermitRecord>,
  permitCounter : { var nextId : Nat },
  users : Map.Map<Text, UserTypes.UserRecord>,
) {
  public func createPermit(permit : Types.PermitRecord) : async Common.Result<Text, Text> {
    PermitLib.createPermit({ permits; counter = permitCounter }, permit);
  };

  public query func getPermits() : async [Types.PermitRecord] {
    PermitLib.getPermits({ permits; counter = permitCounter });
  };

  public query func getPermit(id : Text) : async ?Types.PermitRecord {
    PermitLib.getPermit({ permits; counter = permitCounter }, id);
  };

  public func updatePermitStatus(
    id : Text,
    status : Types.PermitStatus,
    callerId : Text,
    callerRole : Text,
  ) : async Common.Result<(), Text> {
    let result = PermitLib.updatePermitStatus({ permits; counter = permitCounter }, id, status, callerId, callerRole);
    switch (result) {
      case (#ok(())) {
        switch (permits.get(id)) {
          case (?permit) {
            switch (status) {
              case (#submitted) { ignore NotifLib.notifyPermitSubmitted(users, permit) };
              case (#underReview) { ignore NotifLib.notifyPermitUnderReview(users, permit) };
              case (#validated) { ignore NotifLib.notifyPermitValidated(users, permit) };
              case (#approved) { ignore NotifLib.notifyPermitApproved(users, permit) };
              case (#expired) { ignore NotifLib.notifyPermitExpired(users, permit) };
              case (#rejected) { ignore NotifLib.notifyPermitRejected(users, permit, "Permit rejected") };
              case _ {};
            };
          };
          case null {};
        };
      };
      case (#err(_)) {};
    };
    result;
  };

  public func deletePermit(id : Text) : async Common.Result<(), Text> {
    PermitLib.deletePermit({ permits; counter = permitCounter }, id);
  };
};

