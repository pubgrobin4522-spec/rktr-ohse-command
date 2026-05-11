import Common "../types/common";
import Types "../types/training";
import TrainingLib "../lib/training";
import Map "mo:core/Map";

mixin (trainingRecords : Map.Map<Text, Types.TrainingRecord>) {
  public func createTrainingRecord(record : Types.TrainingRecord) : async Common.Result<Text, Text> {
    TrainingLib.createTrainingRecord({ trainingRecords }, record);
  };

  public query func getTrainingRecords() : async [Types.TrainingRecord] {
    TrainingLib.getTrainingRecords({ trainingRecords });
  };

  public func updateTrainingStatus(id : Text, status : Types.TrainingStatus) : async Common.Result<(), Text> {
    TrainingLib.updateTrainingStatus({ trainingRecords }, id, status);
  };

  public func deleteTrainingRecord(id : Text) : async Common.Result<(), Text> {
    TrainingLib.deleteTrainingRecord({ trainingRecords }, id);
  };
};
