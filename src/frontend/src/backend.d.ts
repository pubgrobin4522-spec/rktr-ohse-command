import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface IncidentTrendMonth {
    low: bigint;
    month: string;
    high: bigint;
    critical: bigint;
    medium: bigint;
}
export interface TrainingRecord {
    id: RecordId;
    status: TrainingStatus;
    completionDate?: Timestamp;
    employeeName: string;
    expiryDate?: Timestamp;
    score?: bigint;
    employeeId: string;
    course: string;
}
export type Timestamp = bigint;
export type Result_2 = {
    __kind__: "ok";
    ok: ESGRecord;
} | {
    __kind__: "err";
    err: string;
};
export interface EmergencyContact {
    name: string;
    role: string;
    phone: string;
}
export interface ActivityFeedItem {
    id: RecordId;
    message: string;
    timestamp: Timestamp;
    category: string;
}
export interface ModuleOpenCounts {
    incidents: bigint;
    inspections: bigint;
    permits: bigint;
    capaItems: bigint;
    risks: bigint;
    observations: bigint;
}
export interface ESGEnvironmental {
    wasteRecyclingRate: number;
    envComplianceViolations: number;
    renewableEnergyUsage: number;
    waterReuseRate: number;
    energyConsumption: number;
    waterIntensity: number;
    waterConsumption: number;
    carbonEmissionIntensity: number;
    wasteGenerated: number;
}
export interface AuthSession {
    token: string;
    expiresAt: Timestamp;
    userId: UserId;
}
export type Result_5 = {
    __kind__: "ok";
    ok: Array<AttachmentMeta>;
} | {
    __kind__: "err";
    err: string;
};
export type Result_1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: string;
};
export interface UserRecord {
    id: UserId;
    active: boolean;
    name: string;
    role: UserRole;
    mobileNumber: string;
    email: string;
    employeeNumber: string;
    department: string;
}
export type RecordId = string;
export type Result_4 = {
    __kind__: "ok";
    ok: AuthSession;
} | {
    __kind__: "err";
    err: string;
};
export interface HazardControl {
    control: string;
    residualRisk: string;
    hazard: string;
}
export interface DepartmentRecord {
    id: RecordId;
    head: string;
    name: string;
    location: string;
}
export interface AttachmentMeta {
    id: string;
    contentType: string;
    storageHash: string;
    name: string;
    size: bigint;
    uploadedAt: bigint;
}
export interface ToolboxTalk {
    keyPoints: string;
    conductedAt: string;
    conductedBy: string;
    attendeesCount: bigint;
}
export interface ObservationRecord {
    id: RecordId;
    status: ObservationStatus;
    createdAt: Timestamp;
    description: string;
    actions: Array<string>;
    reportedBy: string;
    obsType: ObservationType;
    location: string;
    attachments?: Array<AttachmentMeta>;
}
export interface ESGGovernance {
    antiCorruptionTrainingCoverage: number;
    complianceBreaches: number;
    regulatoryViolations: number;
    whistleblowerComplaints: number;
    codeOfConductViolations: number;
    policyComplianceScore: number;
    dataPrivacyIncidents: number;
    regulatoryPenalties: number;
}
export interface HighRiskAlertDetail {
    id: string;
    owner: string;
    area: string;
    dueDate: string;
    escalationLevel: string;
    hazard: string;
}
export interface PermitSignatures {
    safetyOfficerSignature: string;
    requestedBySignature: string;
    supervisorSignature: string;
}
export interface PermitRecord {
    id: RecordId;
    startTime: Timestamp;
    status: PermitStatus;
    isolationVerifiedBy?: string;
    hazards: Array<string>;
    endTime: Timestamp;
    permitNumber: string;
    lotoApplied?: boolean;
    approvedBy?: string;
    ppeRequired: Array<string>;
    jobDescription: string;
    createdAt: Timestamp;
    gasTestResults?: GasTestResults;
    emergencyContacts?: Array<EmergencyContact>;
    reviewedBy?: string;
    permitType: PermitType;
    isolationTypes?: Array<string>;
    signatures?: PermitSignatures;
    hazardControls?: Array<HazardControl>;
    location: string;
    requestedBy: string;
    toolboxTalk?: ToolboxTalk;
    supervisorOnDuty?: string;
}
export interface ComplianceBreakdown {
    legalCompliance: bigint;
    ppeCompliance: bigint;
    iso45001: bigint;
    iso14001: bigint;
}
export interface RiskRecord {
    id: RecordId;
    status: RiskStatus;
    controls: Array<string>;
    createdAt: Timestamp;
    createdBy: string;
    residualLikelihood: bigint;
    residualSeverity: bigint;
    severity: bigint;
    hazard: string;
    likelihood: bigint;
    riskLevel: RiskLevel;
    location: string;
}
export interface SafetyScoreSplit {
    safety: bigint;
    compliance: bigint;
    environment: bigint;
    health: bigint;
}
export interface ESGSocial {
    womenInWorkforce: number;
    occupationalHealthCases: number;
    fatalities: number;
    genderDiversityRatio: number;
    trir: number;
    employeeSatisfactionIndex: number;
    ltifr: number;
    contractorSafetyPerformance: number;
    absenteeismRate: number;
    grievanceCases: number;
    trainingHoursPerEmployee: number;
    communityEngagementPrograms: number;
    employeeTurnoverRate: number;
}
export interface DashboardStats {
    auditCompletion: bigint;
    environmentalDeviations: bigint;
    highRiskAlertDetails: Array<HighRiskAlertDetail>;
    openPermits: bigint;
    incidentTrendByMonth: Array<IncidentTrendMonth>;
    safetyScoreSplit: SafetyScoreSplit;
    ltifr: number;
    highRiskCount: bigint;
    safetyScore: bigint;
    nearMissCount: bigint;
    trainingCompliance: bigint;
    complianceBreakdown: ComplianceBreakdown;
    totalIncidents: bigint;
    moduleOpenCounts: ModuleOpenCounts;
}
export interface ESGRecord {
    id: RecordId;
    status: ESGStatus;
    periodType: string;
    dataSource: string;
    social: ESGSocial;
    period: string;
    approvedAt: Timestamp;
    approvedBy: string;
    recordedAt: Timestamp;
    recordedBy: UserId;
    recordedByName: string;
    notes: string;
    environmental: ESGEnvironmental;
    governance: ESGGovernance;
    department: string;
}
export interface GasTestResults {
    oxygenLevel: string;
    testTime: string;
    testedBy: string;
    toxicGas: string;
    flammableGas: string;
}
export type UserId = string;
export type Result = {
    __kind__: "ok";
    ok: boolean;
} | {
    __kind__: "err";
    err: string;
};
export type Result_3 = {
    __kind__: "ok";
    ok: string;
} | {
    __kind__: "err";
    err: string;
};
export interface PersonInvolved {
    name: string;
    role: string;
    employeeId: string;
    injuryType: string;
    department: string;
}
export interface IncidentRecord {
    id: RecordId;
    status: IncidentStatus;
    title: string;
    teamLead?: string;
    createdAt: Timestamp;
    areaBarricaded?: boolean;
    description: string;
    personsInvolved?: Array<PersonInvolved>;
    ticketNumber: string;
    teamMembers?: Array<string>;
    updatedAt: Timestamp;
    reportedBy: string;
    medicalTreatment?: boolean;
    investigationDueDate?: string;
    targetDate?: string;
    natureOfInjury?: string;
    actionsTaken?: string;
    rootCauseCategory?: string;
    severity: string;
    bodyPartAffected?: string;
    contributingFactors?: Array<string>;
    department: string;
    firstAidGiven?: boolean;
    correctiveAction?: string;
    daysLost?: bigint;
    location: string;
    attachments?: Array<AttachmentMeta>;
    rootCause?: string;
    responsiblePerson?: string;
}
export interface EnvironmentRecord {
    id: RecordId;
    value: number;
    createdAt: Timestamp;
    unit: string;
    recordType: string;
    recordedBy: string;
    notes?: string;
    location: string;
}
export interface CapaRecord {
    id: RecordId;
    status: CapaStatus;
    title: string;
    owner: string;
    createdAt: Timestamp;
    actionPlan: string;
    verificationDetails?: string;
    updatedAt: Timestamp;
    targetDate: Timestamp;
    department: string;
    rootCause: string;
}
export interface InspectionRecord {
    id: RecordId;
    status: InspectionStatus;
    inspectionDate: Timestamp;
    title: string;
    area: string;
    createdAt: Timestamp;
    score: bigint;
    findings: Array<string>;
    inspector: string;
}
export enum CapaStatus {
    closed = "closed",
    verified = "verified",
    open = "open",
    inProgress = "inProgress"
}
export enum ESGStatus {
    submitted = "submitted",
    approved = "approved",
    rejected = "rejected",
    draft = "draft"
}
export enum IncidentStatus {
    closed = "closed",
    submitted = "submitted",
    escalated = "escalated",
    underReview = "underReview",
    approved = "approved",
    overdue = "overdue",
    rejected = "rejected",
    draft = "draft"
}
export enum InspectionStatus {
    scheduled = "scheduled",
    completed = "completed",
    overdue = "overdue",
    inProgress = "inProgress"
}
export enum ObservationStatus {
    closed = "closed",
    open = "open",
    inProgress = "inProgress"
}
export enum ObservationType {
    unsafeAct = "unsafeAct",
    nearMiss = "nearMiss",
    unsafeCondition = "unsafeCondition"
}
export enum PermitStatus {
    closed = "closed",
    active = "active",
    expired = "expired",
    submitted = "submitted",
    underReview = "underReview",
    validated = "validated",
    approved = "approved",
    rejected = "rejected",
    draft = "draft"
}
export enum PermitType {
    confinedSpace = "confinedSpace",
    heightWork = "heightWork",
    liftingPermit = "liftingPermit",
    lineBreaking = "lineBreaking",
    hotWork = "hotWork",
    generalWorkPermit = "generalWorkPermit",
    electrical = "electrical",
    excavation = "excavation"
}
export enum RiskLevel {
    low = "low",
    high = "high",
    veryLow = "veryLow",
    critical = "critical",
    medium = "medium"
}
export enum RiskStatus {
    submitted = "submitted",
    approved = "approved",
    draft = "draft"
}
export enum TrainingStatus {
    notStarted = "notStarted",
    pending = "pending",
    completed = "completed",
    overdue = "overdue"
}
export enum UserRole {
    departmentHOD = "departmentHOD",
    supervisor = "supervisor",
    systemAdmin = "systemAdmin",
    ehsManager = "ehsManager",
    areaInCharge = "areaInCharge",
    employee = "employee",
    safetyOfficer = "safetyOfficer",
    contractorAdmin = "contractorAdmin"
}
export interface backendInterface {
    activateUser(id: string): Promise<Result_1>;
    addIncidentAttachment(incidentId: string, attachment: AttachmentMeta): Promise<Result_1>;
    calculateESGScore(): Promise<number>;
    createCapa(capa: CapaRecord): Promise<Result_3>;
    createDepartment(dept: DepartmentRecord): Promise<Result_3>;
    createESGRecord(record: ESGRecord): Promise<Result_3>;
    createEnvironmentRecord(record: EnvironmentRecord): Promise<Result_3>;
    createIncident(incident: IncidentRecord): Promise<Result_3>;
    createInspection(inspection: InspectionRecord): Promise<Result_3>;
    createObservation(obs: ObservationRecord): Promise<Result_3>;
    createPermit(permit: PermitRecord): Promise<Result_3>;
    createRisk(risk: RiskRecord): Promise<Result_3>;
    createTrainingRecord(record: TrainingRecord): Promise<Result_3>;
    createUser(user: UserRecord): Promise<Result_3>;
    deleteCapa(id: string): Promise<Result_1>;
    deleteDepartment(id: string): Promise<Result_1>;
    deleteESGRecord(id: string): Promise<Result_1>;
    deleteEnvironmentRecord(id: string): Promise<Result_1>;
    deleteIncident(id: string): Promise<Result_1>;
    deleteInspection(id: string): Promise<Result_1>;
    deleteObservation(id: string): Promise<Result_1>;
    deletePermit(id: string): Promise<Result_1>;
    deleteRisk(id: string): Promise<Result_1>;
    deleteTrainingRecord(id: string): Promise<Result_1>;
    deleteUser(id: string): Promise<Result_1>;
    getActivityFeed(): Promise<Array<ActivityFeedItem>>;
    getCapas(): Promise<Array<CapaRecord>>;
    getDashboardStats(): Promise<DashboardStats>;
    getDepartments(): Promise<Array<DepartmentRecord>>;
    getESGRecords(): Promise<Array<ESGRecord>>;
    getESGRecordsByPeriod(period: string): Promise<Array<ESGRecord>>;
    getEnvironmentRecords(): Promise<Array<EnvironmentRecord>>;
    getIncident(id: string): Promise<IncidentRecord | null>;
    getIncidentAttachments(incidentId: string): Promise<Result_5>;
    getIncidents(): Promise<Array<IncidentRecord>>;
    getInspections(): Promise<Array<InspectionRecord>>;
    getNotifLastRead(): Promise<bigint | null>;
    getObservations(): Promise<Array<ObservationRecord>>;
    getPermit(id: string): Promise<PermitRecord | null>;
    getPermits(): Promise<Array<PermitRecord>>;
    getRisks(): Promise<Array<RiskRecord>>;
    getTrainingRecords(): Promise<Array<TrainingRecord>>;
    getUsers(): Promise<Array<UserRecord>>;
    login(email: string, password: string): Promise<Result_4>;
    markNotificationsRead(): Promise<void>;
    removeIncidentAttachment(incidentId: string, attachmentId: string): Promise<Result_1>;
    runDeadlineChecks(): Promise<void>;
    seedMockData(): Promise<string>;
    sendMobileOtp(email: string, mobileNumber: string): Promise<Result_3>;
    sendTestNotification(): Promise<string>;
    updateCapa(id: string, capa: CapaRecord): Promise<Result_1>;
    updateCapaStatus(id: string, status: CapaStatus): Promise<Result_1>;
    updateESGRecord(record: ESGRecord): Promise<Result_3>;
    updateESGStatus(id: string, status: ESGStatus, approvedBy: string, approvedAt: Timestamp): Promise<Result_2>;
    updateIncident(id: string, incident: IncidentRecord): Promise<Result_1>;
    updateIncidentStatus(id: string, status: IncidentStatus): Promise<Result_1>;
    updateInspectionStatus(id: string, status: InspectionStatus): Promise<Result_1>;
    updateObservation(id: string, obs: ObservationRecord): Promise<Result_1>;
    updateObservationStatus(id: string, status: ObservationStatus): Promise<Result_1>;
    updatePermitStatus(id: string, status: PermitStatus, callerId: string, callerRole: string): Promise<Result_1>;
    updateRiskStatus(id: string, status: RiskStatus): Promise<Result_1>;
    updateTrainingStatus(id: string, status: TrainingStatus): Promise<Result_1>;
    updateUser(id: string, user: UserRecord): Promise<Result_1>;
    verifyMobileOtp(email: string, otp: string): Promise<Result>;
}
