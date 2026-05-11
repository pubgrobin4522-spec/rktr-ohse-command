import Common "../types/common";
import Types "../types/incidents";
import UserTypes "../types/users";
import IncidentLib "../lib/incidents";
import NotifLib "../lib/notifications";
import Map "mo:core/Map";

mixin (
  incidents : Map.Map<Text, Types.IncidentRecord>,
  users : Map.Map<Text, UserTypes.UserRecord>,
) {
  public func createIncident(incident : Types.IncidentRecord) : async Common.Result<Text, Text> {
    let result = IncidentLib.createIncident({ incidents }, incident);
    // Fire email notification when a new incident is submitted
    switch (result) {
      case (#ok(_)) {
        if (incident.status == #submitted) {
          ignore NotifLib.notifyIncidentSubmitted(users, incident);
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
            switch (status) {
              case (#submitted) { ignore NotifLib.notifyIncidentSubmitted(users, incident) };
              case (#underReview) { ignore NotifLib.notifyIncidentUnderReview(users, incident) };
              case (#approved) { ignore NotifLib.notifyIncidentApproved(users, incident) };
              case (#escalated) { ignore NotifLib.notifyIncidentEscalated(users, incident) };
              case (#overdue) { ignore NotifLib.notifyIncidentOverdue(users, incident) };
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
