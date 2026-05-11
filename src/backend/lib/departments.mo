import Common "../types/common";
import Types "../types/departments";
import Map "mo:core/Map";
import Iter "mo:core/Iter";

module {
  public type State = {
    departments : Map.Map<Text, Types.DepartmentRecord>;
  };

  public func createDepartment(
    state : State,
    dept : Types.DepartmentRecord,
  ) : Common.Result<Text, Text> {
    state.departments.add(dept.id, dept);
    #ok(dept.id);
  };

  public func getDepartments(state : State) : [Types.DepartmentRecord] {
    state.departments.values().toArray();
  };

  public func deleteDepartment(
    state : State,
    id : Text,
  ) : Common.Result<(), Text> {
    switch (state.departments.get(id)) {
      case null { #err("Department not found.") };
      case _ {
        state.departments.remove(id);
        #ok(());
      };
    };
  };
};
