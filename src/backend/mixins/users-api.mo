import Common "../types/common";
import Types "../types/users";
import UserLib "../lib/users";
import Map "mo:core/Map";

mixin (users : Map.Map<Text, Types.UserRecord>) {
  public func login(email : Text, password : Text) : async Common.Result<Types.AuthSession, Text> {
    UserLib.login({ users }, email, password);
  };

  public func createUser(user : Types.UserRecord) : async Common.Result<Text, Text> {
    UserLib.createUser({ users }, user);
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

  public func activateUser(id : Text) : async Common.Result<(), Text> {
    UserLib.activateUser({ users }, id);
  };
};
