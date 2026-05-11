import Common "../types/common";
import Types "../types/permits";
import Map "mo:core/Map";
import Time "mo:core/Time";

module {
  public type State = {
    permits : Map.Map<Text, Types.PermitRecord>;
    counter : { var nextId : Nat };
  };

  func generateId(state : State) : Text {
    let n = state.counter.nextId;
    state.counter.nextId += 1;
    let ts = Time.now();
    "perm-" # debug_show(ts) # "-" # debug_show(n);
  };

  func isTransitionAllowed(
    currentStatus : Types.PermitStatus,
    newStatus : Types.PermitStatus,
    callerRole : Text,
  ) : Bool {
    switch (currentStatus, newStatus) {
      case (#draft, #submitted) { callerRole == "supervisor" or callerRole == "employee" };
      case (#submitted, #underReview) { callerRole == "areaInCharge" };
      case (#underReview, #validated) { callerRole == "areaInCharge" };
      case (#validated, #approved) { callerRole == "safetyOfficer" or callerRole == "ehsManager" or callerRole == "systemAdmin" };
      case (#approved, #active) { callerRole == "safetyOfficer" or callerRole == "ehsManager" or callerRole == "systemAdmin" };
      case (#active, #closed) { callerRole == "supervisor" or callerRole == "employee" };
      case (#submitted, #rejected) { true };
      case (#underReview, #rejected) { true };
      case (#validated, #rejected) { true };
      case (#approved, #rejected) { true };
      case _ { false };
    };
  };

  public func createPermit(
    state : State,
    permit : Types.PermitRecord,
  ) : Common.Result<Text, Text> {
    let newId = generateId(state);
    let stored = { permit with id = newId };
    state.permits.add(newId, stored);
    #ok(newId);
  };

  public func getPermits(state : State) : [Types.PermitRecord] {
    state.permits.values().toArray();
  };

  public func getPermit(
    state : State,
    id : Text,
  ) : ?Types.PermitRecord {
    state.permits.get(id);
  };

  public func updatePermitStatus(
    state : State,
    id : Text,
    newStatus : Types.PermitStatus,
    callerId : Text,
    callerRole : Text,
  ) : Common.Result<(), Text> {
    switch (state.permits.get(id)) {
      case null { #err("Permit not found.") };
      case (?rec) {
        if (not isTransitionAllowed(rec.status, newStatus, callerRole)) {
          return #err("Unauthorized: your role cannot perform this action");
        };
        let reviewedBy : ?Text = switch (newStatus) {
          case (#underReview or #validated) { ?callerId };
          case _ { rec.reviewedBy };
        };
        let approvedBy : ?Text = switch (newStatus) {
          case (#approved) { ?callerId };
          case _ { rec.approvedBy };
        };
        state.permits.add(id, { rec with status = newStatus; reviewedBy; approvedBy });
        #ok(());
      };
    };
  };

  public func deletePermit(
    state : State,
    id : Text,
  ) : Common.Result<(), Text> {
    switch (state.permits.get(id)) {
      case null { #err("Permit not found.") };
      case _ {
        state.permits.remove(id);
        #ok(());
      };
    };
  };
};

