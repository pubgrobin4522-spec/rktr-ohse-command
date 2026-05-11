import Common "../types/common";
import Types "../types/users";
import Map "mo:core/Map";
import Iter "mo:core/Iter";

module {
  public type State = {
    users : Map.Map<Text, Types.UserRecord>;
  };

  public func login(
    state : State,
    email : Text,
    _password : Text,
  ) : Common.Result<Types.AuthSession, Text> {
    if (not email.endsWith(#text "@rktrwheels.com")) {
      return #err("Access restricted to RKTR Wheels employees only.");
    };
    switch (state.users.get(email)) {
      case null { #err("User not found.") };
      case (?user) {
        if (not user.active) {
          return #err("Account is inactive.");
        };
        #ok({
          userId = user.id;
          token = "token-" # user.id;
          expiresAt = 9_999_999_999_000_000_000;
        });
      };
    };
  };

  public func createUser(
    state : State,
    user : Types.UserRecord,
  ) : Common.Result<Text, Text> {
    if (state.users.get(user.email) != null) {
      return #err("User with this email already exists.");
    };
    // Only sumesh.j@rktrwheels.com may hold the systemAdmin role
    if (user.role == #systemAdmin and user.email != "sumesh.j@rktrwheels.com") {
      return #err("Only one System Admin is allowed. System Admin role is reserved for sumesh.j@rktrwheels.com.");
    };
    state.users.add(user.email, user);
    #ok(user.id);
  };

  public func getUsers(state : State) : [Types.UserRecord] {
    state.users.values().toArray();
  };

  public func updateUser(
    state : State,
    id : Text,
    user : Types.UserRecord,
  ) : Common.Result<(), Text> {
    var foundEmail : ?Text = null;
    for ((email, u) in state.users.entries()) {
      if (u.id == id) { foundEmail := ?email };
    };
    switch (foundEmail) {
      case null { #err("User not found.") };
      case (?oldEmail) {
        // Block any modification of the system admin account
        if (oldEmail == "sumesh.j@rktrwheels.com") {
          return #err("System Administrator account cannot be modified");
        };
        // Block targeting the admin email via the new record
        if (user.email == "sumesh.j@rktrwheels.com") {
          return #err("System Administrator account cannot be modified");
        };
        // Only sumesh.j@rktrwheels.com may hold the systemAdmin role
        if (user.role == #systemAdmin) {
          return #err("Only one System Admin is allowed. System Admin role is reserved for sumesh.j@rktrwheels.com.");
        };
        state.users.remove(oldEmail);
        state.users.add(user.email, user);
        #ok(());
      };
    };
  };

  public func deleteUser(
    state : State,
    id : Text,
  ) : Common.Result<(), Text> {
    var foundEmail : ?Text = null;
    for ((email, u) in state.users.entries()) {
      if (u.id == id) { foundEmail := ?email };
    };
    switch (foundEmail) {
      case null { #err("User not found.") };
      case (?oldEmail) {
        if (oldEmail == "sumesh.j@rktrwheels.com") {
          return #err("System Administrator account cannot be modified");
        };
        state.users.remove(oldEmail);
        #ok(());
      };
    };
  };

  /// Scans all users and downgrades any user (other than sumesh.j@rktrwheels.com)
  /// who holds #systemAdmin to #ehsManager. Returns the count of downgrades applied.
  public func enforceSystemAdminUniqueness(state : State) : Nat {
    var count = 0;
    for ((email, u) in state.users.entries()) {
      if (u.role == #systemAdmin and email != "sumesh.j@rktrwheels.com") {
        state.users.add(email, { u with role = #ehsManager });
        count += 1;
      };
    };
    count;
  };

  public func activateUser(
    state : State,
    id : Text,
  ) : Common.Result<(), Text> {
    var foundEmail : ?Text = null;
    for ((email, u) in state.users.entries()) {
      if (u.id == id) { foundEmail := ?email };
    };
    switch (foundEmail) {
      case null { #err("User not found.") };
      case (?email) {
        switch (state.users.get(email)) {
          case null { #err("User not found.") };
          case (?user) {
            state.users.add(email, { user with active = true });
            #ok(());
          };
        };
      };
    };
  };
};
