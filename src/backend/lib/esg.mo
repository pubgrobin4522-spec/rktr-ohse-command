import Common "../types/common";
import Types "../types/esg";
import Map "mo:core/Map";

module {
  public type State = {
    esgRecords : Map.Map<Text, Types.ESGRecord>;
  };

  // ── CRUD ─────────────────────────────────────────────────────────────────

  public func createESGRecord(
    state : State,
    record : Types.ESGRecord,
  ) : Common.Result<Text, Text> {
    state.esgRecords.add(record.id, record);
    #ok(record.id);
  };

  public func getESGRecords(state : State) : [Types.ESGRecord] {
    state.esgRecords.values().toArray();
  };

  public func getESGRecordsByPeriod(
    state : State,
    period : Text,
  ) : [Types.ESGRecord] {
    let result = state.esgRecords.values().filter(func(r) { r.period == period });
    result.toArray();
  };

  public func updateESGRecord(
    state : State,
    record : Types.ESGRecord,
  ) : Common.Result<Text, Text> {
    switch (state.esgRecords.get(record.id)) {
      case null { #err("ESG record not found.") };
      case (?_) {
        state.esgRecords.add(record.id, record);
        #ok(record.id);
      };
    };
  };

  public func updateESGStatus(
    state : State,
    id : Text,
    status : Types.ESGStatus,
    approvedBy : Text,
    approvedAt : Common.Timestamp,
  ) : Common.Result<Types.ESGRecord, Text> {
    switch (state.esgRecords.get(id)) {
      case null { #err("ESG record not found.") };
      case (?rec) {
        let updated = { rec with status; approvedBy; approvedAt };
        state.esgRecords.add(id, updated);
        #ok(updated);
      };
    };
  };

  public func deleteESGRecord(
    state : State,
    id : Text,
  ) : Common.Result<(), Text> {
    switch (state.esgRecords.get(id)) {
      case null { #err("ESG record not found.") };
      case _ {
        state.esgRecords.remove(id);
        #ok(());
      };
    };
  };

  // ── Score calculation ────────────────────────────────────────────────────
  // Weights: Environmental 40%, Social 40%, Governance 20%
  // Each pillar is averaged across its KPIs then normalised 0-100.
  // Only approved records are considered; if multiple periods exist, the
  // latest record per department is used.

  public func calculateESGScore(state : State) : Float {
    // Collect the latest approved record per department
    let latestByDept = Map.empty<Text, Types.ESGRecord>();
    for ((_, rec) in state.esgRecords.entries()) {
      if (rec.status == #approved) {
        switch (latestByDept.get(rec.department)) {
          case null { latestByDept.add(rec.department, rec) };
          case (?existing) {
            if (rec.recordedAt > existing.recordedAt) {
              latestByDept.add(rec.department, rec);
            };
          };
        };
      };
    };

    let count = latestByDept.size();
    if (count == 0) { return 0.0 };

    var envSum : Float = 0.0;
    var socSum : Float = 0.0;
    var govSum : Float = 0.0;

    for ((_, rec) in latestByDept.entries()) {
      envSum += envPillarScore(rec.environmental);
      socSum += socPillarScore(rec.social);
      govSum += govPillarScore(rec.governance);
    };

    let n : Float = count.toFloat();
    let envAvg = envSum / n;
    let socAvg = socSum / n;
    let govAvg = govSum / n;

    // Weighted composite: 40% + 40% + 20%
    (envAvg * 0.40) + (socAvg * 0.40) + (govAvg * 0.20);
  };

  // ── Private pillar scorers ───────────────────────────────────────────────
  // Each scorer maps raw KPI values to a 0-100 pillar score.
  // For "lower is better" KPIs the score is inverted.
  // All values are clamped to [0, 100].

  func clamp(v : Float) : Float {
    if (v < 0.0) { 0.0 } else if (v > 100.0) { 100.0 } else { v };
  };

  // Renewable energy % and recycling rate are already in [0,100]; violations
  // and waste are "lower is better" — we invert them with a penalty scale.
  func envPillarScore(e : Types.ESGEnvironmental) : Float {
    let renewableScore = clamp(e.renewableEnergyUsage);
    let recyclingScore = clamp(e.wasteRecyclingRate);
    let waterReuseScore = clamp(e.waterReuseRate);
    // Violations: 0 = 100 points, every violation costs 10 points
    let violationScore = clamp(100.0 - (e.envComplianceViolations * 10.0));
    // Average of the four representative scores
    (renewableScore + recyclingScore + waterReuseScore + violationScore) / 4.0;
  };

  func socPillarScore(s : Types.ESGSocial) : Float {
    // Positive metrics (higher = better)
    let trainingScore  = clamp(s.trainingHoursPerEmployee);
    let satisfactionScore = clamp(s.employeeSatisfactionIndex);
    let diversityScore = clamp(s.genderDiversityRatio);
    let contractorScore = clamp(s.contractorSafetyPerformance);
    // Negative metrics (lower = better; each occurrence costs points)
    let ltiFRScore  = clamp(100.0 - (s.ltifr * 20.0));
    let trirScore   = clamp(100.0 - (s.trir * 10.0));
    let turnoverScore = clamp(100.0 - s.employeeTurnoverRate);
    let absenteeScore = clamp(100.0 - (s.absenteeismRate * 5.0));
    (trainingScore + satisfactionScore + diversityScore + contractorScore
      + ltiFRScore + trirScore + turnoverScore + absenteeScore) / 8.0;
  };

  func govPillarScore(g : Types.ESGGovernance) : Float {
    // Positive metrics
    let trainingCoverage = clamp(g.antiCorruptionTrainingCoverage);
    let policyScore = clamp(g.policyComplianceScore);
    // Negative metrics
    let breachScore    = clamp(100.0 - (g.complianceBreaches * 10.0));
    let violationScore = clamp(100.0 - (g.regulatoryViolations * 10.0));
    let penaltyScore   = clamp(100.0 - (g.regulatoryPenalties * 5.0));
    let whistleScore   = clamp(100.0 - (g.whistleblowerComplaints * 5.0));
    (trainingCoverage + policyScore + breachScore + violationScore + penaltyScore + whistleScore) / 6.0;
  };
};
