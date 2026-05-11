import Common "common";

module {
  // ESG KPIs — Environmental sub-record
  public type ESGEnvironmental = {
    carbonEmissionIntensity : Float;
    energyConsumption : Float;
    renewableEnergyUsage : Float;
    waterConsumption : Float;
    waterIntensity : Float;
    waterReuseRate : Float;
    wasteGenerated : Float;
    wasteRecyclingRate : Float;
    envComplianceViolations : Float;
  };

  // ESG KPIs — Social sub-record
  public type ESGSocial = {
    ltifr : Float;
    trir : Float;
    fatalities : Float;
    employeeTurnoverRate : Float;
    absenteeismRate : Float;
    trainingHoursPerEmployee : Float;
    employeeSatisfactionIndex : Float;
    genderDiversityRatio : Float;
    womenInWorkforce : Float;
    contractorSafetyPerformance : Float;
    occupationalHealthCases : Float;
    grievanceCases : Float;
    communityEngagementPrograms : Float;
  };

  // ESG KPIs — Governance sub-record (8 fields — dataPrivacyIncidents included)
  public type ESGGovernance = {
    complianceBreaches : Float;
    regulatoryViolations : Float;
    regulatoryPenalties : Float;
    whistleblowerComplaints : Float;
    antiCorruptionTrainingCoverage : Float;
    codeOfConductViolations : Float;
    policyComplianceScore : Float;
    dataPrivacyIncidents : Float;
  };

  public type ESGStatus = {
    #draft;
    #submitted;
    #approved;
    #rejected;
  };

  public type ESGRecord = {
    id : Common.RecordId;
    period : Text;       // e.g. "2026-01" or "2026-Q1"
    periodType : Text;   // "monthly" or "quarterly"
    department : Text;
    recordedBy : Common.UserId;
    recordedByName : Text;
    recordedAt : Common.Timestamp;
    status : ESGStatus;
    approvedBy : Text;
    approvedAt : Common.Timestamp;
    notes : Text;
    dataSource : Text;
    environmental : ESGEnvironmental;
    social : ESGSocial;
    governance : ESGGovernance;
  };

  public type ESGTarget = {
    id : Common.RecordId;
    kpiId : Text;
    targetValue : Float;
    unit : Text;
    setBy : Common.UserId;
    setAt : Common.Timestamp;
  };
};
