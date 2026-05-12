import Common "../types/common";
import Types "../types/incidents";
import DashTypes "../types/dashboard";
import UserTypes "../types/users";
import IncidentLib "../lib/incidents";
import NotifLib "../lib/notifications";
import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";

mixin (
  incidents : Map.Map<Text, Types.IncidentRecord>,
  users : Map.Map<Text, UserTypes.UserRecord>,
  activityFeed : List.List<DashTypes.ActivityFeedItem>,
) {
  public func createIncident(incident : Types.IncidentRecord) : async Common.Result<Text, Text> {
    let result = IncidentLib.createIncident({ incidents }, incident);
    switch (result) {
      case (#ok(_)) {
        if (incident.status == #submitted) {
          ignore NotifLib.notifyIncidentSubmitted(users, incident);
          let now = Time.now();
          let feedId = "feed-inc-" # incident.id;
          // Resolve reporter's employee number for the self-notification
          var reporterEmpNum : ?Text = null;
          for ((_, u) in users.entries()) {
            if (u.name == incident.reportedBy or u.employeeNumber == incident.reportedBy) {
              reporterEmpNum := ?u.employeeNumber;
            };
          };
          // Notify Safety Officers + EHS Managers + Admin
          activityFeed.add({ id = feedId # "_so"; message = "New Incident: " # incident.title # " at " # incident.location; timestamp = now; category = "incident"; recipient = null; recipientRole = ?"safetyOfficer" });
          activityFeed.add({ id = feedId # "_ehs"; message = "New Incident: " # incident.title # " at " # incident.location; timestamp = now; category = "incident"; recipient = null; recipientRole = ?"ehsManager" });
          activityFeed.add({ id = feedId # "_admin"; message = "New Incident: " # incident.title # " at " # incident.location; timestamp = now; category = "incident"; recipient = ?"230034"; recipientRole = null });
          // Self-notification for the reporter so they see their own submission
          switch (reporterEmpNum) {
            case (?empNum) { activityFeed.add({ id = feedId # "_rep"; message = "Your incident report \"" # incident.title # "\" has been submitted successfully"; timestamp = now; category = "incident"; recipient = ?empNum; recipientRole = null }) };
            case null {};
          };
        };
      };
      case (#err(_)) {};
    };
    result;
  };

  public query func getIncidents() : async [Types.IncidentRecord] {
    IncidentLib.getIncidents({ incidents });
  };

  public query func getIncident(id : Text) : async ?Types.IncidentRecord {
    IncidentLib.getIncident({ incidents }, id);
  };

  public func updateIncidentStatus(id : Text, status : Types.IncidentStatus) : async Common.Result<(), Text> {
    let result = IncidentLib.updateIncidentStatus({ incidents }, id, status);
    switch (result) {
      case (#ok(())) {
        switch (incidents.get(id)) {
          case (?incident) {
            // Resolve reporter's employee number
            var reporterEmpNum : ?Text = null;
            for ((_, u) in users.entries()) {
              if (u.name == incident.reportedBy or u.employeeNumber == incident.reportedBy) {
                reporterEmpNum := ?u.employeeNumber;
              };
            };
            let now = Time.now();
            let feedId = "feed-inc-" # id # "-" # debug_show(now);
            switch (status) {
              case (#submitted) {
                ignore NotifLib.notifyIncidentSubmitted(users, incident);
                activityFeed.add({ id = feedId # "_so"; message = "Incident Submitted: " # incident.ticketNumber; timestamp = now; category = "incident"; recipient = null; recipientRole = ?"safetyOfficer" });
                activityFeed.add({ id = feedId # "_ehs"; message = "Incident Submitted: " # incident.ticketNumber; timestamp = now; category = "incident"; recipient = null; recipientRole = ?"ehsManager" });
                activityFeed.add({ id = feedId # "_admin"; message = "Incident Submitted: " # incident.ticketNumber; timestamp = now; category = "incident"; recipient = ?"230034"; recipientRole = null });
              };
              case (#underReview) {
                ignore NotifLib.notifyIncidentUnderReview(users, incident);
                switch (reporterEmpNum) {
                  case (?empNum) { activityFeed.add({ id = feedId # "_rep"; message = "Your incident " # incident.ticketNumber # " is under investigation"; timestamp = now; category = "incident"; recipient = ?empNum; recipientRole = null }) };
                  case null {};
                };
                activityFeed.add({ id = feedId # "_admin"; message = "Incident Under Review: " # incident.ticketNumber; timestamp = now; category = "incident"; recipient = ?"230034"; recipientRole = null });
              };
              case (#approved) {
                ignore NotifLib.notifyIncidentApproved(users, incident);
                switch (reporterEmpNum) {
                  case (?empNum) { activityFeed.add({ id = feedId # "_rep"; message = "Your incident " # incident.ticketNumber # " investigation is complete"; timestamp = now; category = "incident"; recipient = ?empNum; recipientRole = null }) };
                  case null {};
                };
                activityFeed.add({ id = feedId # "_ehs"; message = "Incident Resolved: " # incident.ticketNumber; timestamp = now; category = "incident"; recipient = null; recipientRole = ?"ehsManager" });
                activityFeed.add({ id = feedId # "_admin"; message = "Incident Resolved: " # incident.ticketNumber; timestamp = now; category = "incident"; recipient = ?"230034"; recipientRole = null });
              };
              case (#escalated) {
                ignore NotifLib.notifyIncidentEscalated(users, incident);
                activityFeed.add({ id = feedId # "_ehs"; message = "ESCALATED: Incident " # incident.ticketNumber # " requires immediate attention"; timestamp = now; category = "incident"; recipient = null; recipientRole = ?"ehsManager" });
                activityFeed.add({ id = feedId # "_admin"; message = "ESCALATED: Incident " # incident.ticketNumber; timestamp = now; category = "incident"; recipient = ?"230034"; recipientRole = null });
              };
              case (#overdue) {
                ignore NotifLib.notifyIncidentOverdue(users, incident);
                switch (reporterEmpNum) {
                  case (?empNum) { activityFeed.add({ id = feedId # "_rep"; message = "OVERDUE: Your incident " # incident.ticketNumber # " action required"; timestamp = now; category = "incident"; recipient = ?empNum; recipientRole = null }) };
                  case null {};
                };
                activityFeed.add({ id = feedId # "_so"; message = "OVERDUE: Incident " # incident.ticketNumber; timestamp = now; category = "incident"; recipient = null; recipientRole = ?"safetyOfficer" });
                activityFeed.add({ id = feedId # "_ehs"; message = "OVERDUE: Incident " # incident.ticketNumber; timestamp = now; category = "incident"; recipient = null; recipientRole = ?"ehsManager" });
                activityFeed.add({ id = feedId # "_admin"; message = "OVERDUE: Incident " # incident.ticketNumber; timestamp = now; category = "incident"; recipient = ?"230034"; recipientRole = null });
              };
              case _ {};
            };
          };
          case null {};
        };
      };
      case (#err(_)) {};
    };
    result;
  };

  public func updateIncident(id : Text, incident : Types.IncidentRecord) : async Common.Result<(), Text> {
    IncidentLib.updateIncident({ incidents }, id, incident);
  };

  public func deleteIncident(id : Text) : async Common.Result<(), Text> {
    IncidentLib.deleteIncident({ incidents }, id);
  };

  public func addIncidentAttachment(
    incidentId : Text,
    attachment : Types.AttachmentMeta,
  ) : async Common.Result<(), Text> {
    IncidentLib.addIncidentAttachment({ incidents }, incidentId, attachment);
  };

  public func removeIncidentAttachment(
    incidentId : Text,
    attachmentId : Text,
  ) : async Common.Result<(), Text> {
    IncidentLib.removeIncidentAttachment({ incidents }, incidentId, attachmentId);
  };

  public query func getIncidentAttachments(
    incidentId : Text,
  ) : async Common.Result<[Types.AttachmentMeta], Text> {
    IncidentLib.getIncidentAttachments({ incidents }, incidentId);
  };
};
