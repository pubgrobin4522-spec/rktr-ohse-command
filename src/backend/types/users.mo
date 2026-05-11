import Common "common";

module {
  public type UserRole = {
    #employee;
    #supervisor;
    #areaInCharge;
    #departmentHOD;
    #safetyOfficer;
    #ehsManager;
    #contractorAdmin;
    #systemAdmin;
  };

  public type UserRecord = {
    id : Common.UserId;
    name : Text;
    email : Text;
    role : UserRole;
    department : Text;
    active : Bool;
    employeeNumber : Text;
    mobileNumber : Text;
  };

  public type AuthSession = {
    userId : Common.UserId;
    token : Text;
    expiresAt : Common.Timestamp;
  };

  public type OtpRecord = {
    otp : Text;
    expires : Int;
    mobileNumber : Text;
  };
};
