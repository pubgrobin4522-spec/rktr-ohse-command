import Common "../types/common";
import Types "../types/esg";
import DashTypes "../types/dashboard";
import ESGLib "../lib/esg";
import NotifLib "../lib/notifications";
import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";
import UserTypes "../types/users";

mixin (
  esgRecords : Map.Map<Text, Types.ESGRecord>,
  usersV2 : Map.Map<Text, UserTypes.UserRecord>,
  activityFeed : List.List<DashTypes.ActivityFeedItem>,
) {
  public query func getESGRecords() : async [Types.ESGRecord] {
    ESGLib.getESGRecords({ esgRecords });
  };

  public query func getESGRecordsByPeriod(period : Text) : async [Types.ESGRecord] {
    ESGLib.getESGRecordsByPeriod({ esgRecords }, period);
  };

  public func createESGRecord(record : Types.ESGRecord) : async Common.Result<Text, Text> {
    ESGLib.createESGRecord({ esgRecords }, record);
  };

  public func updateESGRecord(record : Types.ESGRecord) : async Common.Result<Text, Text> {
    ESGLib.updateESGRecord({ esgRecords }, record);
  };

  public func updateESGStatus(
    id : Text,
    status : Types.ESGStatus,
    approvedBy : Text,
    approvedAt : Common.Timestamp,
  ) : async Common.Result<Types.ESGRecord, Text> {
    let result = ESGLib.updateESGStatus({ esgRecords }, id, status, approvedBy, approvedAt);
    switch (result) {
      case (#ok(updated)) {
        let now = Time.now();
        let feedId = "feed-esg-" # id # "-" # debug_show(now);
        if (status == #submitted) {
          ignore (async { await NotifLib.notifyESGSubmitted(usersV2, updated) });
          activityFeed.add({ id = feedId # "_so"; message = "ESG Record Submitted: " # updated.period # " - " # updated.department; timestamp = now; category = "esg"; recipient = null; recipientRole = ?"safetyOfficer" });
          activityFeed.add({ id = feedId # "_ehs"; message = "ESG Record Submitted: " # updated.period # " - " # updated.department; timestamp = now; category = "esg"; recipient = null; recipientRole = ?"ehsManager" });
          activityFeed.add({ id = feedId # "_admin"; message = "ESG Record Submitted: " # updated.period # " - " # updated.department; timestamp = now; category = "esg"; recipient = ?"230034"; recipientRole = null });
        } else if (status == #approved) {
          ignore (async { await NotifLib.notifyESGApproved(usersV2, updated) });
          // Notify the recorder by employee number
          activityFeed.add({ id = feedId # "_rec"; message = "Your ESG record for " # updated.period # " has been approved"; timestamp = now; category = "esg"; recipient = ?updated.recordedBy; recipientRole = null });
          activityFeed.add({ id = feedId # "_admin"; message = "ESG Approved: " # updated.period # " - " # updated.department; timestamp = now; category = "esg"; recipient = ?"230034"; recipientRole = null });
        };
      };
      case (#err(_)) {};
    };
    result;
  };

  public func deleteESGRecord(id : Text) : async Common.Result<(), Text> {
    ESGLib.deleteESGRecord({ esgRecords }, id);
  };

  public query func calculateESGScore() : async Float {
    ESGLib.calculateESGScore({ esgRecords });
  };
};
