import Common "../types/common";
import Types "../types/departments";
import DeptLib "../lib/departments";
import Map "mo:core/Map";

mixin (departments : Map.Map<Text, Types.DepartmentRecord>) {
  public func createDepartment(dept : Types.DepartmentRecord) : async Common.Result<Text, Text> {
    DeptLib.createDepartment({ departments }, dept);
  };

  public query func getDepartments() : async [Types.DepartmentRecord] {
    DeptLib.getDepartments({ departments });
  };

  public func deleteDepartment(id : Text) : async Common.Result<(), Text> {
    DeptLib.deleteDepartment({ departments }, id);
  };
};
