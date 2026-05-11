import Common "common";

module {
  public type DepartmentRecord = {
    id : Common.RecordId;
    name : Text;
    head : Text;
    location : Text;
  };
};
