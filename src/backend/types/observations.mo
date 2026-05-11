import Common "common";
import Incidents "incidents";

module {
  public type AttachmentMeta = Incidents.AttachmentMeta;

  public type ObservationType = {
    #unsafeAct;
    #unsafeCondition;
    #nearMiss;
  };

  public type ObservationStatus = {
    #open;
    #inProgress;
    #closed;
  };

  public type ObservationRecord = {
    id : Common.RecordId;
    obsType : ObservationType;
    description : Text;
    location : Text;
    reportedBy : Text;
    status : ObservationStatus;
    actions : [Text];
    createdAt : Common.Timestamp;
    attachments : ?[AttachmentMeta];
  };
};
