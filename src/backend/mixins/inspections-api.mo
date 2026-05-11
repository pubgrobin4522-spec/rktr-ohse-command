import Common "../types/common";
import Types "../types/inspections";
import DashTypes "../types/dashboard";
import UserTypes "../types/users";
import InspectionLib "../lib/inspections";
import NotifLib "../lib/notifications";
import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";

mixin (
  inspections : Map.Map<Text, Types.InspectionRecord>,
  users : Map.Map<Text, UserTypes.UserRecord>,
  activityFeed : List.List<DashTypes.ActivityFeedItem>,
) {
  public func createInspection(inspection : Types.InspectionRecord) : async Common.Result<Text, Text> {
    let result = InspectionLib.createInspection({ inspections }, inspection);
    switch (result) {
      case (#ok(_)) {
        // Fire email to all Safety Officers + System Admin (fire-and-forget)
        ignore NotifLib.notifyInspectionScheduled(users, inspection);
        // Prepend a new activity feed entry so the notification bell shows it immediately
        activityFeed.add({
          id = "feed-insp-" # inspection.id;
          message = "New Inspection Scheduled: " # inspection.title # " at " # inspection.area;
          timestamp = Time.now();
          category = "inspection";
        });
      };
      case (#err(_)) {};
    };
    result;
  };

  public query func getInspections() : async [Types.InspectionRecord] {
    InspectionLib.getInspections({ inspections });
  };

  public func updateInspectionStatus(id : Text, status : Types.InspectionStatus) : async Common.Result<(), Text> {
    InspectionLib.updateInspectionStatus({ inspections }, id, status);
  };

  public func deleteInspection(id : Text) : async Common.Result<(), Text> {
    InspectionLib.deleteInspection({ inspections }, id);
  };
};
