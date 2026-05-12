import DashTypes "../types/dashboard";
import IncidentTypes "../types/incidents";
import PermitTypes "../types/permits";
import RiskTypes "../types/risks";
import TrainingTypes "../types/training";
import ObsTypes "../types/observations";
import UserTypes "../types/users";
import CapaTypes "../types/capa";
import InspectionTypes "../types/inspections";
import EnvTypes "../types/environment";
import DeptTypes "../types/departments";
import DashLib "../lib/dashboard";
import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";
import Principal "mo:core/Principal";

mixin (
  incidents : Map.Map<Text, IncidentTypes.IncidentRecord>,
  permits : Map.Map<Text, PermitTypes.PermitRecord>,
  risks : Map.Map<Text, RiskTypes.RiskRecord>,
  trainingRecords : Map.Map<Text, TrainingTypes.TrainingRecord>,
  observations : Map.Map<Text, ObsTypes.ObservationRecord>,
  activityFeed : List.List<DashTypes.ActivityFeedItem>,
  users : Map.Map<Text, UserTypes.UserRecord>,
  capas : Map.Map<Text, CapaTypes.CapaRecord>,
  inspections : Map.Map<Text, InspectionTypes.InspectionRecord>,
  environmentRecords : Map.Map<Text, EnvTypes.EnvironmentRecord>,
  departments : Map.Map<Text, DeptTypes.DepartmentRecord>,
  notifLastRead : Map.Map<Principal, Time.Time>,
  registrationEvents : List.List<DashTypes.ActivityFeedItem>,
  principalToEmployee : Map.Map<Principal, Text>,
) {
  public query func getDashboardStats() : async DashTypes.DashboardStats {
    DashLib.getDashboardStats({
      incidents; permits; risks; trainingRecords; observations; activityFeed;
      users; capas; inspections; environmentRecords; departments;
      registrationEvents;
    });
  };

  /// Returns activity feed items filtered to the calling user.
  /// System Admin (employee 230034) always receives all items.
  /// Other users see only items targeted at their employee number or role.
  public shared query ({ caller }) func getActivityFeed() : async [DashTypes.ActivityFeedItem] {
    var callerEmployeeNumber = "";
    var callerRole = "";
    var isAdmin = false;
    switch (principalToEmployee.get(caller)) {
      case (?empNum) {
        callerEmployeeNumber := empNum;
        isAdmin := empNum == "230034";
        for ((_, u) in users.entries()) {
          if (u.employeeNumber == empNum) {
            callerRole := DashLib.roleToText(u.role);
          };
        };
      };
      case null {
        // Unknown principal — return empty to avoid leaking data
        return [];
      };
    };
    DashLib.getActivityFeed({
      incidents; permits; risks; trainingRecords; observations; activityFeed;
      users; capas; inspections; environmentRecords; departments;
      registrationEvents;
    }, callerEmployeeNumber, callerRole, isAdmin);
  };

  /// Registers the caller's Internet Computer principal to their employee number.
  /// Must be called once after login so getActivityFeed can filter correctly.
  public shared ({ caller }) func registerCallerPrincipal(employeeNumber : Text) : async () {
    principalToEmployee.add(caller, employeeNumber);
  };

  /// Records the current timestamp as the caller's last-read time for notifications.
  public shared ({ caller }) func markNotificationsRead() : async () {
    notifLastRead.add(caller, Time.now());
  };

  /// Returns the caller's last-read timestamp for notifications, or null if never read.
  public shared query ({ caller }) func getNotifLastRead() : async ?Int {
    notifLastRead.get(caller);
  };

  public func seedMockData() : async Text {
    DashLib.seedMockData({
      incidents; permits; risks; trainingRecords; observations; activityFeed;
      users; capas; inspections; environmentRecords; departments;
      registrationEvents;
    });
  };
};
