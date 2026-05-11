import Common "../types/common";
import Types "../types/esg";
import ESGLib "../lib/esg";
import NotifLib "../lib/notifications";
import Map "mo:core/Map";
import UserTypes "../types/users";

mixin (
  esgRecords : Map.Map<Text, Types.ESGRecord>,
  usersV2 : Map.Map<Text, UserTypes.UserRecord>,
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
        if (status == #submitted) {
          ignore (async { await NotifLib.notifyESGSubmitted(usersV2, updated) });
        } else if (status == #approved) {
          ignore (async { await NotifLib.notifyESGApproved(usersV2, updated) });
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
