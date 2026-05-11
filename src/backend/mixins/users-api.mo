import Common "../types/common";
import Types "../types/users";
import UserLib "../lib/users";
import DashLib "../lib/dashboard";
import Notifications "../lib/notifications";
import DashTypes "../types/dashboard";
import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";

mixin (
  users : Map.Map<Text, Types.UserRecord>,
  registrationEvents : List.List<DashTypes.ActivityFeedItem>,
  otpStore : Map.Map<Text, Types.OtpRecord>,
) {
  public func login(email : Text, password : Text) : async Common.Result<Types.AuthSession, Text> {
    UserLib.login({ users }, email, password);
  };

  public func createUser(user : Types.UserRecord) : async Common.Result<Text, Text> {
    let result = UserLib.createUser({ users }, user);
    switch (result) {
      case (#ok(_)) {
        // Fire-and-forget: notify admin + registrant
        ignore (async { await Notifications.notifyUserRegistration(users, user) });
        // Add to activity feed for registration events
        DashLib.addRegistrationEvent(registrationEvents, user.name, user.email, Time.now());
      };
      case (#err(_)) {};
    };
    result;
  };

  public query func getUsers() : async [Types.UserRecord] {
    UserLib.getUsers({ users });
  };

  public func updateUser(id : Text, user : Types.UserRecord) : async Common.Result<(), Text> {
    UserLib.updateUser({ users }, id, user);
  };

  public func deleteUser(id : Text) : async Common.Result<(), Text> {
    UserLib.deleteUser({ users }, id);
  };

  public func sendMobileOtp(email : Text, mobileNumber : Text) : async Common.Result<Text, Text> {
    await UserLib.sendMobileOtp({ otpStore }, email, mobileNumber);
  };

  public func verifyMobileOtp(email : Text, otp : Text) : async Common.Result<Bool, Text> {
    UserLib.verifyMobileOtp({ otpStore }, email, otp);
  };

  public func activateUser(id : Text) : async Common.Result<(), Text> {
    UserLib.activateUser({ users }, id);
  };
};
