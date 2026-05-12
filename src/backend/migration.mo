import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import DashTypes "./types/dashboard";

module {
  // Old ActivityFeedItem — matches the deployed .old type exactly (including recipient/recipientRole
  // which were added in the previous migration round).
  type OldActivityFeedItem = DashTypes.ActivityFeedItem;

  // Old actor stable state shape — must match .old/src/backend/main.mo field-for-field.
  type OldActor = {
    activityFeed : List.List<OldActivityFeedItem>;
    registrationEvents : List.List<OldActivityFeedItem>;
    principalToEmployee : Map.Map<Principal, Text>;
  };

  // New actor stable state shape (pass-through — types are unchanged)
  type NewActor = {
    activityFeed : List.List<DashTypes.ActivityFeedItem>;
    registrationEvents : List.List<DashTypes.ActivityFeedItem>;
    principalToEmployee : Map.Map<Principal, Text>;
  };

  public func run(old : OldActor) : NewActor {
    // Types are identical — pass through directly.
    {
      activityFeed = old.activityFeed;
      registrationEvents = old.registrationEvents;
      principalToEmployee = old.principalToEmployee;
    };
  };
};
