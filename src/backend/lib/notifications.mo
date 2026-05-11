import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";
import EmailClient "mo:caffeineai-email/emailClient";
import UserTypes "../types/users";
import IncidentTypes "../types/incidents";
import PermitTypes "../types/permits";
import CapaTypes "../types/capa";
import TrainingTypes "../types/training";
import InspectionTypes "../types/inspections";
import ESGTypes "../types/esg";

module {
  let FROM_USERNAME = "ohse-noreply";
  let SYSTEM_ADMIN_EMAIL = "sumesh.j@rktrwheels.com";


  // ── Role helpers ─────────────────────────────────────────────────────────

  public func getEmailsByRole(
    users : Map.Map<Text, UserTypes.UserRecord>,
    role : UserTypes.UserRole,
  ) : [Text] {
    let result = List.empty<Text>();
    for ((_, u) in users.entries()) {
      if (u.active) {
        let matches = switch (role) {
          case (#safetyOfficer) { u.role == #safetyOfficer };
          case (#ehsManager) { u.role == #ehsManager };
          case (#supervisor) { u.role == #supervisor };
          case (#areaInCharge) { u.role == #areaInCharge };
          case (#departmentHOD) { u.role == #departmentHOD };
          case (#systemAdmin) { u.role == #systemAdmin };
          case (#employee) { u.role == #employee };
          case (#contractorAdmin) { u.role == #contractorAdmin };
        };
        if (matches) { result.add(u.email) };
      };
    };
    result.toArray();
  };

  /// Always returns the system admin email — sumesh.j@rktrwheels.com is the
  /// permanent single system admin and must receive every workflow notification.
  func getAdminEmails(
    users : Map.Map<Text, UserTypes.UserRecord>,
  ) : [Text] {
    // Pull from live user state first (handles edge cases where email changes)
    let admins = getEmailsByRole(users, #systemAdmin);
    // Always guarantee the hardcoded system admin email is included
    let seen = Map.empty<Text, Bool>();
    let result = List.empty<Text>();
    for (e in admins.values()) {
      if (not e.isEmpty()) { seen.add(e, true); result.add(e) };
    };
    if (seen.get(SYSTEM_ADMIN_EMAIL) == null) {
      result.add(SYSTEM_ADMIN_EMAIL);
    };
    result.toArray();
  };

  func getEmailByName(
    users : Map.Map<Text, UserTypes.UserRecord>,
    name : Text,
  ) : ?Text {
    for ((_, u) in users.entries()) {
      if (u.active and u.name == name) { return ?u.email };
    };
    null;
  };

  func getEmailByEmployeeId(
    users : Map.Map<Text, UserTypes.UserRecord>,
    employeeId : Text,
  ) : ?Text {
    for ((_, u) in users.entries()) {
      if (u.active and (u.id == employeeId or u.employeeNumber == employeeId)) {
        return ?u.email;
      };
    };
    null;
  };

  func mergeEmails(a : [Text], b : [Text]) : [Text] {
    let seen = Map.empty<Text, Bool>();
    let merged = List.empty<Text>();
    for (e in a.values()) {
      if (not e.isEmpty() and seen.get(e) == null) {
        seen.add(e, true);
        merged.add(e);
      };
    };
    for (e in b.values()) {
      if (not e.isEmpty() and seen.get(e) == null) {
        seen.add(e, true);
        merged.add(e);
      };
    };
    merged.toArray();
  };

  func optionalEmail(opt : ?Text) : [Text] {
    switch (opt) {
      case (?e) { if (e.isEmpty()) { [] } else { [e] } };
      case null { [] };
    };
  };

  // ── Permit email notifications ────────────────────────────────────────────

  public func notifyPermitSubmitted(
    users : Map.Map<Text, UserTypes.UserRecord>,
    permit : PermitTypes.PermitRecord,
  ) : async () {
    let officers = getEmailsByRole(users, #safetyOfficer);
    let mgrs = getEmailsByRole(users, #ehsManager);
    let admins = getAdminEmails(users);
    let to = mergeEmails(mergeEmails(officers, mgrs), admins);
    if (to.size() == 0) { return };
    let permitTypeText = permitTypeLabel(permit.permitType);
    let subject = "New Permit Submitted: " # permitTypeText # " - " # permit.location;
    let body = "<h2>New Permit Submitted</h2>"
      # "<p><b>Permit #:</b> " # permit.permitNumber # "</p>"
      # "<p><b>Type:</b> " # permitTypeText # "</p>"
      # "<p><b>Location:</b> " # permit.location # "</p>"
      # "<p><b>Job Description:</b> " # permit.jobDescription # "</p>"
      # "<p><b>Requested By:</b> " # permit.requestedBy # "</p>"
      # "<p>Please log in to the RKTR OHSE Command Center to review this permit.</p>";
    ignore (await EmailClient.sendServiceEmail(FROM_USERNAME, to, subject, body));
  };

  public func notifyPermitUnderReview(
    users : Map.Map<Text, UserTypes.UserRecord>,
    permit : PermitTypes.PermitRecord,
  ) : async () {
    let supervisorEmails = getEmailByName(users, permit.requestedBy);
    let admins = getAdminEmails(users);
    let to = mergeEmails(optionalEmail(supervisorEmails), admins);
    if (to.size() == 0) { return };
    let subject = "Your Permit Is Under Review: " # permit.permitNumber;
    let body = "<h2>Permit Under Review</h2>"
      # "<p>Your permit <b>" # permit.permitNumber # "</b> is now under review by the area in-charge.</p>"
      # "<p><b>Type:</b> " # permitTypeLabel(permit.permitType) # "</p>"
      # "<p><b>Location:</b> " # permit.location # "</p>";
    ignore (await EmailClient.sendServiceEmail(FROM_USERNAME, to, subject, body));
  };

  public func notifyPermitValidated(
    users : Map.Map<Text, UserTypes.UserRecord>,
    permit : PermitTypes.PermitRecord,
  ) : async () {
    let officers = getEmailsByRole(users, #safetyOfficer);
    let mgrs = getEmailsByRole(users, #ehsManager);
    let admins = getAdminEmails(users);
    let to = mergeEmails(mergeEmails(officers, mgrs), admins);
    if (to.size() == 0) { return };
    let subject = "Permit Validated - Awaiting Approval: " # permit.permitNumber;
    let body = "<h2>Permit Validated</h2>"
      # "<p>Permit <b>" # permit.permitNumber # "</b> has been validated and is awaiting your approval.</p>"
      # "<p><b>Type:</b> " # permitTypeLabel(permit.permitType) # "</p>"
      # "<p><b>Location:</b> " # permit.location # "</p>";
    ignore (await EmailClient.sendServiceEmail(FROM_USERNAME, to, subject, body));
  };

  public func notifyPermitApproved(
    users : Map.Map<Text, UserTypes.UserRecord>,
    permit : PermitTypes.PermitRecord,
  ) : async () {
    let supervisorEmails = optionalEmail(getEmailByName(users, permit.requestedBy));
    let areaInChargeEmails = getEmailsByRole(users, #areaInCharge);
    let admins = getAdminEmails(users);
    let to = mergeEmails(mergeEmails(supervisorEmails, areaInChargeEmails), admins);
    if (to.size() == 0) { return };
    let permitTypeText = permitTypeLabel(permit.permitType);
    let subject = "Permit Approved: " # permitTypeText # " at " # permit.location;
    let body = "<h2>Permit Approved</h2>"
      # "<p>Permit <b>" # permit.permitNumber # "</b> has been approved.</p>"
      # "<p><b>Type:</b> " # permitTypeText # "</p>"
      # "<p><b>Location:</b> " # permit.location # "</p>"
      # "<p>The permit is now ready for activation.</p>";
    ignore (await EmailClient.sendServiceEmail(FROM_USERNAME, to, subject, body));
  };

  public func notifyPermitExpired(
    users : Map.Map<Text, UserTypes.UserRecord>,
    permit : PermitTypes.PermitRecord,
  ) : async () {
    let supervisorEmails = optionalEmail(getEmailByName(users, permit.requestedBy));
    let officerEmails = getEmailsByRole(users, #safetyOfficer);
    let admins = getAdminEmails(users);
    let to = mergeEmails(mergeEmails(supervisorEmails, officerEmails), admins);
    if (to.size() == 0) { return };
    let subject = "PERMIT EXPIRED: " # permit.permitNumber # " - Immediate Action Required";
    let body = "<h2 style='color:red'>Permit Expired</h2>"
      # "<p>Permit <b>" # permit.permitNumber # "</b> has expired.</p>"
      # "<p><b>Type:</b> " # permitTypeLabel(permit.permitType) # "</p>"
      # "<p><b>Location:</b> " # permit.location # "</p>"
      # "<p>Immediate action is required. Please stop work and close out this permit.</p>";
    ignore (await EmailClient.sendServiceEmail(FROM_USERNAME, to, subject, body));
  };

  public func notifyPermitRejected(
    users : Map.Map<Text, UserTypes.UserRecord>,
    permit : PermitTypes.PermitRecord,
    reason : Text,
  ) : async () {
    let requesterEmails = optionalEmail(getEmailByName(users, permit.requestedBy));
    let admins = getAdminEmails(users);
    let to = mergeEmails(requesterEmails, admins);
    if (to.size() == 0) { return };
    let subject = "Permit Rejected: " # permit.permitNumber # " - " # reason;
    let body = "<h2>Permit Rejected</h2>"
      # "<p>Your permit <b>" # permit.permitNumber # "</b> has been rejected.</p>"
      # "<p><b>Reason:</b> " # reason # "</p>"
      # "<p>Please revise and resubmit as appropriate.</p>";
    ignore (await EmailClient.sendServiceEmail(FROM_USERNAME, to, subject, body));
  };

  // ── Incident email notifications ──────────────────────────────────────────

  public func notifyIncidentSubmitted(
    users : Map.Map<Text, UserTypes.UserRecord>,
    incident : IncidentTypes.IncidentRecord,
  ) : async () {
    let officers = getEmailsByRole(users, #safetyOfficer);
    let mgrs = getEmailsByRole(users, #ehsManager);
    let admins = getAdminEmails(users);
    let to = mergeEmails(mergeEmails(officers, mgrs), admins);
    if (to.size() == 0) { return };
    let subject = "New Incident Reported: " # incident.title # " at " # incident.location;
    let body = "<h2>New Incident Report</h2>"
      # "<p><b>Ticket #:</b> " # incident.ticketNumber # "</p>"
      # "<p><b>Title:</b> " # incident.title # "</p>"
      # "<p><b>Severity:</b> " # incident.severity # "</p>"
      # "<p><b>Location:</b> " # incident.location # "</p>"
      # "<p><b>Reported By:</b> " # incident.reportedBy # "</p>"
      # "<p><b>Description:</b> " # incident.description # "</p>";
    ignore (await EmailClient.sendServiceEmail(FROM_USERNAME, to, subject, body));
  };

  public func notifyIncidentUnderReview(
    users : Map.Map<Text, UserTypes.UserRecord>,
    incident : IncidentTypes.IncidentRecord,
  ) : async () {
    let reporterEmails = optionalEmail(getEmailByName(users, incident.reportedBy));
    let admins = getAdminEmails(users);
    let to = mergeEmails(reporterEmails, admins);
    if (to.size() == 0) { return };
    let subject = "Your Incident Report #" # incident.ticketNumber # " Is Being Investigated";
    let body = "<h2>Incident Under Investigation</h2>"
      # "<p>Your incident report <b>" # incident.ticketNumber # "</b> has been assigned for investigation.</p>"
      # "<p><b>Title:</b> " # incident.title # "</p>"
      # "<p>You will be notified when the investigation is complete.</p>";
    ignore (await EmailClient.sendServiceEmail(FROM_USERNAME, to, subject, body));
  };

  public func notifyIncidentApproved(
    users : Map.Map<Text, UserTypes.UserRecord>,
    incident : IncidentTypes.IncidentRecord,
  ) : async () {
    let reporterEmails = optionalEmail(getEmailByName(users, incident.reportedBy));
    let mgrs = getEmailsByRole(users, #ehsManager);
    let admins = getAdminEmails(users);
    let to = mergeEmails(mergeEmails(reporterEmails, mgrs), admins);
    if (to.size() == 0) { return };
    let subject = "Incident #" # incident.ticketNumber # " Investigation Complete";
    let body = "<h2>Incident Investigation Complete</h2>"
      # "<p>The investigation for incident <b>" # incident.ticketNumber # "</b> has been completed and approved.</p>"
      # "<p><b>Title:</b> " # incident.title # "</p>";
    ignore (await EmailClient.sendServiceEmail(FROM_USERNAME, to, subject, body));
  };

  public func notifyIncidentEscalated(
    users : Map.Map<Text, UserTypes.UserRecord>,
    incident : IncidentTypes.IncidentRecord,
  ) : async () {
    let mgrs = getEmailsByRole(users, #ehsManager);
    let admins = getAdminEmails(users);
    let to = mergeEmails(mgrs, admins);
    if (to.size() == 0) { return };
    let subject = "ESCALATED: Incident #" # incident.ticketNumber # " Requires Immediate Attention";
    let body = "<h2 style='color:red'>Incident Escalated</h2>"
      # "<p>Incident <b>" # incident.ticketNumber # "</b> has been escalated and requires immediate attention.</p>"
      # "<p><b>Title:</b> " # incident.title # "</p>"
      # "<p><b>Severity:</b> " # incident.severity # "</p>"
      # "<p><b>Location:</b> " # incident.location # "</p>";
    ignore (await EmailClient.sendServiceEmail(FROM_USERNAME, to, subject, body));
  };

  public func notifyIncidentOverdue(
    users : Map.Map<Text, UserTypes.UserRecord>,
    incident : IncidentTypes.IncidentRecord,
  ) : async () {
    let reporterEmails = optionalEmail(getEmailByName(users, incident.reportedBy));
    let officers = getEmailsByRole(users, #safetyOfficer);
    let mgrs = getEmailsByRole(users, #ehsManager);
    let admins = getAdminEmails(users);
    let to = mergeEmails(mergeEmails(reporterEmails, mergeEmails(officers, mgrs)), admins);
    if (to.size() == 0) { return };
    let subject = "OVERDUE: Incident #" # incident.ticketNumber # " Action Required";
    let body = "<h2 style='color:orange'>Incident Overdue</h2>"
      # "<p>Incident <b>" # incident.ticketNumber # "</b> is overdue and requires immediate action.</p>"
      # "<p><b>Title:</b> " # incident.title # "</p>"
      # "<p><b>Location:</b> " # incident.location # "</p>";
    ignore (await EmailClient.sendServiceEmail(FROM_USERNAME, to, subject, body));
  };

  // ── Inspection email notifications ──────────────────────────────────────────

  public func notifyInspectionScheduled(
    users : Map.Map<Text, UserTypes.UserRecord>,
    inspection : InspectionTypes.InspectionRecord,
  ) : async () {
    let officers = getEmailsByRole(users, #safetyOfficer);
    let admins = getAdminEmails(users);
    let to = mergeEmails(officers, admins);
    if (to.size() == 0) { return };
    let subject = "New Inspection Scheduled: " # inspection.title;
    let body = "<h2>New Inspection Scheduled</h2>"
      # "<p><b>Title:</b> " # inspection.title # "</p>"
      # "<p><b>Area / Location:</b> " # inspection.area # "</p>"
      # "<p><b>Inspector:</b> " # inspection.inspector # "</p>"
      # "<p>This inspection has been logged in the RKTR OHSE Command Center. No approval is required — please ensure the inspection is carried out on the scheduled date.</p>";
    ignore (await EmailClient.sendServiceEmail(FROM_USERNAME, to, subject, body));
  };

  // ── Deadline checker (called by 24h timer) ────────────────────────────────

  public func runDeadlineChecks(
    users : Map.Map<Text, UserTypes.UserRecord>,
    capas : Map.Map<Text, CapaTypes.CapaRecord>,
    trainingRecords : Map.Map<Text, TrainingTypes.TrainingRecord>,
    permits : Map.Map<Text, PermitTypes.PermitRecord>,
    inspections : Map.Map<Text, InspectionTypes.InspectionRecord>,
  ) : async () {
    let now = Time.now();
    let day = 86_400_000_000_000; // 1 day in nanoseconds
    let mgrs = getEmailsByRole(users, #ehsManager);
    let officers = getEmailsByRole(users, #safetyOfficer);
    let supervisors = getEmailsByRole(users, #supervisor);
    let admins = getAdminEmails(users);

    // ── CAPA deadline checks ────────────────────────────────────────────────
    for ((_, capa) in capas.entries()) {
      let isOpen = capa.status == #open or capa.status == #inProgress;
      if (isOpen) {
        // Normalize targetDate timestamp (ns vs ms)
        let targetNs = if (capa.targetDate > 1_000_000_000_000_000) {
          capa.targetDate
        } else if (capa.targetDate > 1_000_000_000_000) {
          capa.targetDate * 1_000_000
        } else {
          capa.targetDate * 1_000_000_000_000
        };

        let ownerEmail = optionalEmail(getEmailByName(users, capa.owner));
        let to = mergeEmails(mergeEmails(ownerEmail, mgrs), admins);

        if (targetNs < now) {
          // Overdue
          if (to.size() > 0) {
            let subject = "OVERDUE CAPA: " # capa.title;
            let body = "<h2 style='color:red'>CAPA Overdue</h2>"
              # "<p>CAPA <b>" # capa.title # "</b> is past its target date.</p>"
              # "<p><b>Owner:</b> " # capa.owner # "</p>";
            ignore (await EmailClient.sendServiceEmail(FROM_USERNAME, to, subject, body));
          };
        } else if (targetNs - now <= 3 * day) {
          // Due within 3 days
          if (to.size() > 0) {
            let subject = "CAPA Deadline Approaching: " # capa.title;
            let body = "<h2>CAPA Deadline Approaching</h2>"
              # "<p>CAPA <b>" # capa.title # "</b> is due within 3 days.</p>"
              # "<p><b>Owner:</b> " # capa.owner # "</p>";
            ignore (await EmailClient.sendServiceEmail(FROM_USERNAME, to, subject, body));
          };
        };
      };
    };

    // ── Training expiry checks ──────────────────────────────────────────────
    for ((id, tr) in trainingRecords.entries()) {
      switch (tr.expiryDate) {
        case null {};
        case (?expiry) {
          let expiryNs = if (expiry > 1_000_000_000_000_000) {
            expiry
          } else if (expiry > 1_000_000_000_000) {
            expiry * 1_000_000
          } else {
            expiry * 1_000_000_000_000
          };

          let empEmail = optionalEmail(getEmailByEmployeeId(users, tr.employeeId));

          if (expiryNs < now and tr.status == #completed) {
            // Mark overdue — fire-and-forget state update is done in the mixin
            let to = mergeEmails(mergeEmails(empEmail, mergeEmails(supervisors, mgrs)), admins);
            if (to.size() > 0) {
              let subject = "TRAINING EXPIRED: " # tr.course;
              let body = "<h2 style='color:red'>Training Expired</h2>"
                # "<p>Training <b>" # tr.course # "</b> for <b>" # tr.employeeName # "</b> has expired.</p>"
                # "<p>Please arrange renewal immediately.</p>";
              ignore (await EmailClient.sendServiceEmail(FROM_USERNAME, to, subject, body));
            };
          } else if (expiryNs > now and expiryNs - now <= 7 * day and tr.status != #overdue) {
            // Expiring within 7 days
            let to = mergeEmails(mergeEmails(empEmail, supervisors), admins);
            if (to.size() > 0) {
              let subject = "Training Expiry Alert: " # tr.course;
              let body = "<h2>Training Expiry Warning</h2>"
                # "<p>Training <b>" # tr.course # "</b> for <b>" # tr.employeeName # "</b> expires within 7 days.</p>";
              ignore (await EmailClient.sendServiceEmail(FROM_USERNAME, to, subject, body));
            };
          };
        };
      };
    };

    // ── Permit expiry warnings ──────────────────────────────────────────────
    for ((_, permit) in permits.entries()) {
      if (permit.status == #approved or permit.status == #active) {
        let endNs = if (permit.endTime > 1_000_000_000_000_000) {
          permit.endTime
        } else if (permit.endTime > 1_000_000_000_000) {
          permit.endTime * 1_000_000
        } else {
          permit.endTime * 1_000_000_000_000
        };

        if (endNs > now and endNs - now <= day) {
          let supervisorEmails = optionalEmail(getEmailByName(users, permit.requestedBy));
          let to = mergeEmails(mergeEmails(supervisorEmails, officers), admins);
          if (to.size() > 0) {
            let subject = "Permit Expiry Warning: " # permit.permitNumber # " expires soon";
            let body = "<h2>Permit Expiry Warning</h2>"
              # "<p>Permit <b>" # permit.permitNumber # "</b> expires within 24 hours.</p>"
              # "<p><b>Type:</b> " # permitTypeLabel(permit.permitType) # "</p>"
              # "<p><b>Location:</b> " # permit.location # "</p>";
            ignore (await EmailClient.sendServiceEmail(FROM_USERNAME, to, subject, body));
          };
        };
      };
    };

    // ── Inspection overdue checks ───────────────────────────────────────────
    for ((_, insp) in inspections.entries()) {
      if (insp.status == #scheduled) {
        let schedNs = if (insp.inspectionDate > 1_000_000_000_000_000) {
          insp.inspectionDate
        } else if (insp.inspectionDate > 1_000_000_000_000) {
          insp.inspectionDate * 1_000_000
        } else {
          insp.inspectionDate * 1_000_000_000_000
        };

        if (schedNs < now) {
          let inspectorEmail = optionalEmail(getEmailByName(users, insp.inspector));
          let to = mergeEmails(mergeEmails(inspectorEmail, officers), admins);
          if (to.size() > 0) {
            let subject = "Inspection Overdue: " # insp.title;
            let body = "<h2 style='color:orange'>Inspection Overdue</h2>"
              # "<p>Inspection <b>" # insp.title # "</b> was scheduled but has not been completed.</p>"
              # "<p><b>Area:</b> " # insp.area # "</p>"
              # "<p><b>Inspector:</b> " # insp.inspector # "</p>";
            ignore (await EmailClient.sendServiceEmail(FROM_USERNAME, to, subject, body));
          };
        };
      };
    };
  };

  // ── User registration email notifications ─────────────────────────────────

  public func notifyUserRegistration(
    users : Map.Map<Text, UserTypes.UserRecord>,
    newUser : UserTypes.UserRecord,
  ) : async () {
    let officers = getEmailsByRole(users, #safetyOfficer);
    let admins = getAdminEmails(users);
    // Admin + safety officers get notification of pending registration
    let toAdmins = mergeEmails(admins, officers);
    if (toAdmins.size() > 0) {
      let subject = "New User Registration Pending Approval \u{2014} " # newUser.name;
      let body = "<h2>New User Registration</h2>"
        # "<p>A new user has registered and is awaiting activation.</p>"
        # "<p><b>Name:</b> " # newUser.name # "</p>"
        # "<p><b>Email:</b> " # newUser.email # "</p>"
        # "<p><b>Department:</b> " # newUser.department # "</p>"
        # "<p><b>Employee Number:</b> " # newUser.employeeNumber # "</p>"
        # "<p><b>Mobile:</b> " # newUser.mobileNumber # "</p>"
        # "<p>Please log in to the Admin Panel to review and activate this account.</p>";
      ignore (await EmailClient.sendServiceEmail(FROM_USERNAME, toAdmins, subject, body));
    };
    // Confirmation email to the registrant
    if (not newUser.email.isEmpty()) {
      let confirmSubject = "RKTR OHSE Command Center \u{2014} Registration Received";
      let confirmBody = "<h2>Registration Received</h2>"
        # "<p>Thank you for registering, " # newUser.name # ".</p>"
        # "<p>Your account has been submitted for approval. The system administrator will review and activate your account shortly.</p>"
        # "<p>Once activated, you can log in using your registered email address.</p>"
        # "<p>If you have any questions, please contact Sumesh J at <a href='mailto:sumesh.j@rktrwheels.com'>sumesh.j@rktrwheels.com</a>.</p>";
      ignore (await EmailClient.sendServiceEmail(FROM_USERNAME, [newUser.email], confirmSubject, confirmBody));
    };
  };

  // ── ESG email notifications ──────────────────────────────────────────────

  public func notifyESGSubmitted(
    users : Map.Map<Text, UserTypes.UserRecord>,
    record : ESGTypes.ESGRecord,
  ) : async () {
    let officers = getEmailsByRole(users, #safetyOfficer);
    let mgrs = getEmailsByRole(users, #ehsManager);
    let admins = getAdminEmails(users);
    let to = mergeEmails(mergeEmails(officers, mgrs), admins);
    if (to.size() == 0) { return };
    let subject = "ESG Record Submitted for Review: " # record.period # " - " # record.department;
    let body = "<h2>ESG Record Submitted</h2>"
      # "<p><b>Period:</b> " # record.period # "</p>"
      # "<p><b>Period Type:</b> " # record.periodType # "</p>"
      # "<p><b>Department:</b> " # record.department # "</p>"
      # "<p><b>Submitted By:</b> " # record.recordedByName # "</p>"
      # "<p>Please log in to the RKTR OHSE Command Center to review and approve this ESG record.</p>";
    ignore (await EmailClient.sendServiceEmail(FROM_USERNAME, to, subject, body));
  };

  public func notifyESGApproved(
    users : Map.Map<Text, UserTypes.UserRecord>,
    record : ESGTypes.ESGRecord,
  ) : async () {
    let recorderEmail = optionalEmail(getEmailByEmployeeId(users, record.recordedBy));
    let admins = getAdminEmails(users);
    let to = mergeEmails(recorderEmail, admins);
    if (to.size() == 0) { return };
    let subject = "ESG Record Approved: " # record.period # " - " # record.department;
    let body = "<h2>ESG Record Approved</h2>"
      # "<p>Your ESG data submission for <b>" # record.period # "</b> (" # record.department # ") has been approved.</p>"
      # "<p><b>Approved By:</b> " # record.approvedBy # "</p>";
    ignore (await EmailClient.sendServiceEmail(FROM_USERNAME, to, subject, body));
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  func permitTypeLabel(pt : PermitTypes.PermitType) : Text {
    switch (pt) {
      case (#hotWork) { "Hot Work" };
      case (#electrical) { "Electrical" };
      case (#excavation) { "Excavation" };
      case (#heightWork) { "Height Work" };
      case (#confinedSpace) { "Confined Space" };
      case (#lineBreaking) { "Line Breaking" };
      case (#liftingPermit) { "Lifting Permit" };
      case (#generalWorkPermit) { "General Work Permit" };
    };
  };
};
