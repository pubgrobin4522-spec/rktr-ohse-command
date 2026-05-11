import Common "../types/common";
import Types "../types/training";
import Map "mo:core/Map";
import Iter "mo:core/Iter";

module {
  public type State = {
    trainingRecords : Map.Map<Text, Types.TrainingRecord>;
  };

  public func createTrainingRecord(
    state : State,
    record : Types.TrainingRecord,
  ) : Common.Result<Text, Text> {
    state.trainingRecords.add(record.id, record);
    #ok(record.id);
  };

  public func getTrainingRecords(state : State) : [Types.TrainingRecord] {
    state.trainingRecords.values().toArray();
  };

  public func updateTrainingStatus(
    state : State,
    id : Text,
    status : Types.TrainingStatus,
  ) : Common.Result<(), Text> {
    switch (state.trainingRecords.get(id)) {
      case null { #err("Training record not found.") };
      case (?rec) {
        state.trainingRecords.add(id, { rec with status });
        #ok(());
      };
    };
  };

  public func deleteTrainingRecord(
    state : State,
    id : Text,
  ) : Common.Result<(), Text> {
    switch (state.trainingRecords.get(id)) {
      case null { #err("Training record not found.") };
      case _ {
        state.trainingRecords.remove(id);
        #ok(());
      };
    };
  };
};
