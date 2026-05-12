import Common "../types/common";
import Types "../types/permits";
import DashTypes "../types/dashboard";
import UserTypes "../types/users";
import PermitLib "../lib/permits";
import NotifLib "../lib/notifications";
import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";

mixin (
  permits : Map.Map<Text, Types.PermitRecord>,
  permitCounter : { var nextId : Nat },
  users : Map.Map<Text, UserTypes.UserRecord>,
  activityFeed : List.List<DashTypes.ActivityFeedItem>,
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
            // Resolve supervisor employee number from the permit's requestedBy name
            var supervisorEmpNum : ?Text = null;
            for ((_, u) in users.entries()) {
              if (u.name == permit.requestedBy or u.employeeNumber == permit.requestedBy) {
                supervisorEmpNum := ?u.employeeNumber;
              };
            };
            let now = Time.now();
            let feedId = "feed-permit-" # id # "-" # debug_show(now);
            switch (status) {
              case (#submitted) {
                ignore NotifLib.notifyPermitSubmitted(users, permit);
                // Notify Safety Officers + EHS Managers + Admin
                activityFeed.add({ id = feedId # "_so"; message = "Permit Submitted: " # permit.permitNumber # " at " # permit.location; timestamp = now; category = "permit"; recipient = null; recipientRole = ?"safetyOfficer" });
                activityFeed.add({ id = feedId # "_ehs"; message = "Permit Submitted: " # permit.permitNumber # " at " # permit.location; timestamp = now; category = "permit"; recipient = null; recipientRole = ?"ehsManager" });
                activityFeed.add({ id = feedId # "_admin"; message = "Permit Submitted: " # permit.permitNumber # " at " # permit.location; timestamp = now; category = "permit"; recipient = ?"230034"; recipientRole = null });
              };
              case (#underReview) {
                ignore NotifLib.notifyPermitUnderReview(users, permit);
                switch (supervisorEmpNum) {
                  case (?empNum) { activityFeed.add({ id = feedId # "_sup"; message = "Your Permit " # permit.permitNumber # " is under review"; timestamp = now; category = "permit"; recipient = ?empNum; recipientRole = null }) };
                  case null {};
                };
                activityFeed.add({ id = feedId # "_admin"; message = "Permit Under Review: " # permit.permitNumber; timestamp = now; category = "permit"; recipient = ?"230034"; recipientRole = null });
              };
              case (#validated) {
                ignore NotifLib.notifyPermitValidated(users, permit);
                activityFeed.add({ id = feedId # "_so"; message = "Permit Validated - Awaiting Approval: " # permit.permitNumber; timestamp = now; category = "permit"; recipient = null; recipientRole = ?"safetyOfficer" });
                activityFeed.add({ id = feedId # "_ehs"; message = "Permit Validated - Awaiting Approval: " # permit.permitNumber; timestamp = now; category = "permit"; recipient = null; recipientRole = ?"ehsManager" });
                activityFeed.add({ id = feedId # "_admin"; message = "Permit Validated - Awaiting Approval: " # permit.permitNumber; timestamp = now; category = "permit"; recipient = ?"230034"; recipientRole = null });
              };
              case (#approved) {
                ignore NotifLib.notifyPermitApproved(users, permit);
                switch (supervisorEmpNum) {
                  case (?empNum) { activityFeed.add({ id = feedId # "_sup"; message = "Your Permit " # permit.permitNumber # " has been approved"; timestamp = now; category = "permit"; recipient = ?empNum; recipientRole = null }) };
                  case null {};
                };
                activityFeed.add({ id = feedId # "_admin"; message = "Permit Approved: " # permit.permitNumber; timestamp = now; category = "permit"; recipient = ?"230034"; recipientRole = null });
              };
              case (#rejected) {
                ignore NotifLib.notifyPermitRejected(users, permit, "Permit rejected");
                switch (supervisorEmpNum) {
                  case (?empNum) { activityFeed.add({ id = feedId # "_sup"; message = "Your Permit " # permit.permitNumber # " was rejected"; timestamp = now; category = "permit"; recipient = ?empNum; recipientRole = null }) };
                  case null {};
                };
                activityFeed.add({ id = feedId # "_admin"; message = "Permit Rejected: " # permit.permitNumber; timestamp = now; category = "permit"; recipient = ?"230034"; recipientRole = null });
              };
              case (#expired) {
                ignore NotifLib.notifyPermitExpired(users, permit);
                switch (supervisorEmpNum) {
                  case (?empNum) { activityFeed.add({ id = feedId # "_sup"; message = "Your Permit " # permit.permitNumber # " has expired"; timestamp = now; category = "permit"; recipient = ?empNum; recipientRole = null }) };
                  case null {};
                };
                activityFeed.add({ id = feedId # "_so"; message = "Permit Expired: " # permit.permitNumber; timestamp = now; category = "permit"; recipient = null; recipientRole = ?"safetyOfficer" });
                activityFeed.add({ id = feedId # "_admin"; message = "Permit Expired: " # permit.permitNumber; timestamp = now; category = "permit"; recipient = ?"230034"; recipientRole = null });
              };
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
