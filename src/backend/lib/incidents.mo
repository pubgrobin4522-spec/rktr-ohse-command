import Common "../types/common";
import Types "../types/incidents";
import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Array "mo:core/Array";

module {
  public type State = {
    incidents : Map.Map<Text, Types.IncidentRecord>;
  };

  public func createIncident(
    state : State,
    incident : Types.IncidentRecord,
  ) : Common.Result<Text, Text> {
    state.incidents.add(incident.id, incident);
    #ok(incident.id);
  };

  public func getIncidents(state : State) : [Types.IncidentRecord] {
    state.incidents.values().toArray();
  };

  public func getIncident(
    state : State,
    id : Text,
  ) : ?Types.IncidentRecord {
    state.incidents.get(id);
  };

  public func updateIncidentStatus(
    state : State,
    id : Text,
    status : Types.IncidentStatus,
  ) : Common.Result<(), Text> {
    switch (state.incidents.get(id)) {
      case null { #err("Incident not found.") };
      case (?rec) {
        state.incidents.add(id, { rec with status });
        #ok(());
      };
    };
  };

  public func updateIncident(
    state : State,
    id : Text,
    incident : Types.IncidentRecord,
  ) : Common.Result<(), Text> {
    switch (state.incidents.get(id)) {
      case null { #err("Incident not found.") };
      case _ {
        state.incidents.add(id, incident);
        #ok(());
      };
    };
  };

  public func deleteIncident(
    state : State,
    id : Text,
  ) : Common.Result<(), Text> {
    switch (state.incidents.get(id)) {
      case null { #err("Incident not found.") };
      case _ {
        state.incidents.remove(id);
        #ok(());
      };
    };
  };

  public func addIncidentAttachment(
    state : State,
    incidentId : Text,
    attachment : Types.AttachmentMeta,
  ) : Common.Result<(), Text> {
    switch (state.incidents.get(incidentId)) {
      case null { #err("Incident not found.") };
      case (?rec) {
        let existing = switch (rec.attachments) {
          case null { [] };
          case (?arr) { arr };
        };
        let updated = existing.concat([attachment]);
        state.incidents.add(incidentId, { rec with attachments = ?updated });
        #ok(());
      };
    };
  };

  public func removeIncidentAttachment(
    state : State,
    incidentId : Text,
    attachmentId : Text,
  ) : Common.Result<(), Text> {
    switch (state.incidents.get(incidentId)) {
      case null { #err("Incident not found.") };
      case (?rec) {
        let existing = switch (rec.attachments) {
          case null { [] };
          case (?arr) { arr };
        };
        let filtered = existing.filter(func(a) { a.id != attachmentId });
        state.incidents.add(incidentId, { rec with attachments = ?filtered });
        #ok(());
      };
    };
  };

  public func getIncidentAttachments(
    state : State,
    incidentId : Text,
  ) : Common.Result<[Types.AttachmentMeta], Text> {
    switch (state.incidents.get(incidentId)) {
      case null { #err("Incident not found.") };
      case (?rec) {
        let attachments = switch (rec.attachments) {
          case null { [] };
          case (?arr) { arr };
        };
        #ok(attachments);
      };
    };
  };
};
