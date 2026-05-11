// Cross-cutting shared types for the OHSE portal
module {
  public type Result<T, E> = { #ok : T; #err : E };
  public type Timestamp = Int;
  public type UserId = Text;
  public type RecordId = Text;
};
