import Common "../types/common";
import Types "../types/users";
import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import EmailClient "mo:caffeineai-email/emailClient";
import Int "mo:core/Int";
import Text "mo:core/Text";

module {
  public type State = {
    users : Map.Map<Text, Types.UserRecord>;
  };

  public type OtpState = {
    otpStore : Map.Map<Text, Types.OtpRecord>;
  };

  public type PasswordState = {
    passwords : Map.Map<Text, Text>;
  };


  let FROM_USERNAME = "ohse-noreply";
  let OTP_TTL_NS : Int = 600_000_000_000; // 10 minutes in nanoseconds

  /// Generate a random 8-char password: uppercase + lowercase + digits
  func genPassword(seed : Int) : Text {
    let palette : [Text] = [
      "A","B","C","D","E","F","G","H","J","K","L","M","N","P","Q","R","S","T","U","V","W","X","Y","Z",
      "a","b","c","d","e","f","g","h","j","k","m","n","p","q","r","s","t","u","v","w","x","y","z",
      "2","3","4","5","6","7","8","9"
    ];
    let len = palette.size();
    var result = "";
    var s = Int.abs(seed);
    var i = 0;
    while (i < 8) {
      let idx = s % len;
      s := (s * 1_664_525 + 1_013_904_223) % 4_294_967_296;
      result := result # palette[idx];
      i += 1;
    };
    result;
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
    // Validate employee number: must start with "23" and be exactly 6 digits
    if (not user.employeeNumber.isEmpty()) {
      if (user.employeeNumber.size() != 6 or not user.employeeNumber.startsWith(#text "23")) {
        return #err("Employee number must be 6 digits starting with 23");
      };
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


  /// Reset a user's password by verifying their employeeNumber and mobileNumber.
  /// Generates a new random password, stores it, and returns it in plaintext.
  public func resetPasswordByMobile(
    state : State,
    pwState : PasswordState,
    employeeNumber : Text,
    mobileNumber : Text,
  ) : Common.Result<Text, Text> {
    if (employeeNumber == "230034") {
      return #err("For System Admin password reset, contact your IT team.");
    };
    var found : ?Types.UserRecord = null;
    for ((_, u) in state.users.entries()) {
      if (u.employeeNumber == employeeNumber) { found := ?u };
    };
    switch (found) {
      case null { #err("Employee Number and Mobile Number do not match our records.") };
      case (?user) {
        let storedMobile = user.mobileNumber.trim(#char ' ');
        let inputMobile = mobileNumber.trim(#char ' ');
        if (storedMobile != inputMobile or storedMobile == "") {
          return #err("Employee Number and Mobile Number do not match our records.");
        };
        let newPwd = genPassword(Time.now() + Int.abs(employeeNumber.size()));
        pwState.passwords.add(employeeNumber, newPwd);
        #ok(newPwd);
      };
    };
  };

  public func sendMobileOtp(
    otpState : OtpState,
    email : Text,
    mobileNumber : Text,
  ) : async Common.Result<Text, Text> {
    let otp = (100_000 + (Int.abs(Time.now()) % 900_000)).toText();
    let expires = Time.now() + OTP_TTL_NS;
    otpState.otpStore.add(email, { otp; expires; mobileNumber });
    let subject = "RKTR OHSE - Mobile Number Verification OTP";
    let body = "Dear User,\n\nYour OTP for verifying mobile number "
      # mobileNumber
      # " is: "
      # otp
      # "\n\nThis OTP is valid for 10 minutes.\n\nDo not share this OTP with anyone.\n\nRKTR OHSE Command Center";
    let result = await EmailClient.sendServiceEmail(FROM_USERNAME, [email], subject, body);
    switch (result) {
      case (#ok(_)) { #ok("OTP sent to your email address") };
      case (#err(_)) { #err("Failed to send OTP") };
    };
  };

  public func verifyMobileOtp(
    otpState : OtpState,
    email : Text,
    otp : Text,
  ) : Common.Result<Bool, Text> {
    switch (otpState.otpStore.get(email)) {
      case null { #err("No OTP found. Please request a new OTP.") };
      case (?record) {
        if (Time.now() > record.expires) {
          otpState.otpStore.remove(email);
          #err("OTP has expired. Please request a new one.");
        } else if (record.otp != otp) {
          #err("Invalid OTP");
        } else {
          otpState.otpStore.remove(email);
          #ok(true);
        };
      };
    };
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
