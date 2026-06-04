export type AircraftStatus = "ACTIVE" | "WARNING" | "OVERDUE";

export type MonitoringZone = "East" | "Central" | "West";

export type ZoneFilter = "all" | MonitoringZone;

export type DashboardTab = "dashboard" | "reports" | "settings";

export type SettingsTab = "users" | "aircraft" | "organizations";

export type EntityStatus = "Active" | "Inactive";

export type UserRole = "OCC Operator" | "Supervisor" | "Admin";

export type VerificationOutcome =
  | "Airborne"
  | "Landed Safely"
  | "Delayed Check-In"
  | "Emergency"
  | "Maintenance Issue";

export type VerificationRecord = {
  id: string;
  /** OCC user who performed the action — preserved if user is later deleted. */
  performedByUserId: string;
  timestamp: number;
  /** Immutable display label at time of action (name + action). */
  employeeAction: string;
  outcome: VerificationOutcome;
  notes: string;
};

export type OccUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: EntityStatus;
  lastLoginAt: number | null;
  /** States/regions this operator monitors (defaults from role if omitted). */
  assignedMonitoringZones?: MonitoringZone[];
  /** Supervisors may manage response plans for these organizations only. Admins ignore this. */
  assignedOrganizationIds?: string[];
};

/**
 * Operator / fleet parent entity — extensible for billing, permissions, certificates.
 */
export type Organization = {
  id: string;
  organizationName: string;
  primaryContactName: string;
  primaryContactPhone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  email: string;
  address: string;
  notes: string;
  createdAt: number;
};

/** Aircraft registry (Aircraft Store) — Settings source of truth. */
export type Aircraft = {
  id: string;
  tailNumber: string;
  aircraftType: string;
  /** Linked organization — contact fields may override org defaults on this record. */
  organizationId: string;
  organizationName: string;
  primaryContactName: string;
  primaryContactPhone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  email: string;
  /** USPS state/DC code — monitoring zone is derived from this. */
  homeState: string;
  monitoringZone: MonitoringZone;
  checkIntervalMinutes: number;
  status: EntityStatus;
};

/**
 * Active flight session (Active Flights Store) — references aircraft by id only.
 * Aircraft metadata is joined at read time for dashboard/modal display.
 */
export type ActiveFlightSession = {
  id: string;
  aircraftId: string;
  checkIntervalMs: number;
  flightStartTime: number;
  dueAt: number;
  lastVerifiedAt: number;
  verificationHistory: VerificationRecord[];
  /** Set when operator declares emergency — flight stays active. */
  emergencyDeclaredAt?: number | null;
  /** Linked Reports > Accidents & Incidents record. */
  incidentReportId?: string | null;
};

/** Read-model: session + live registry fields (not persisted on the session). */
export type ActiveFlight = ActiveFlightSession & {
  tailNumber: string;
  aircraftType: string;
  organizationId: string;
  organizationName: string;
  monitoringZone: MonitoringZone;
  primaryContactName: string;
  primaryContactPhone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  email: string;
};

/** Immutable snapshot at archive time (Archive Store). */
export type ArchivedFlight = {
  id: string;
  sourceFlightId?: string;
  aircraftId: string;
  tailNumber: string;
  aircraftType: string;
  organizationName: string;
  homeState: string;
  monitoringZone: MonitoringZone;
  flightStartTime: number;
  landingTime: number;
  /** When the record entered archive (starts 14-day retention). */
  archivedAt: number;
  finalStatus: VerificationOutcome;
  verificationHistory: VerificationRecord[];
};

export type IncidentEventType =
  | "Accident"
  | "Incident"
  | "Emergency Landing"
  | "Overdue Aircraft"
  | "Lost Communications"
  | "Weather Event"
  | "Mechanical Failure"
  | "Medical Emergency"
  | "Fuel Emergency"
  | "Other";

export type IncidentSeverity = "Low" | "Moderate" | "High" | "Critical";

export type IncidentReportStatus =
  | "Open"
  | "Active Response"
  | "Monitoring"
  | "Resolved"
  | "Closed";

export type IncidentAttachment = {
  id: string;
  fileName: string;
  uploadedAt: number;
};

export type IncidentAuditEntry = {
  id: string;
  action: string;
  userId: string;
  userName: string;
  timestamp: number;
  details?: string;
};

export type IncidentReport = {
  id: string;
  reportNumber: string;
  eventAt: number;
  aircraftId: string;
  tailNumber: string;
  organizationId: string;
  organizationName: string;
  location: string;
  state: string;
  region: MonitoringZone;
  eventType: IncidentEventType;
  severity: IncidentSeverity;
  description: string;
  /** Immediate actions taken (legacy field name preserved in storage). */
  actionsTaken: string;
  status: IncidentReportStatus;
  attachments: IncidentAttachment[];
  createdByUserId: string;
  createdByUserName: string;
  createdAt: number;
  updatedAt: number;
  sourceFlightId?: string;
  isEmergencyTrigger: boolean;
  assignedOperatorName: string;
  flightStartTime: number;
  flightDurationMinutes: number;
  lastKnownPosition: string;
  personsOnBoard: string;
  notificationsMade: string;
  additionalNotes: string;
  auditLog: IncidentAuditEntry[];
  /** @deprecated Legacy fixed checklist — use responsePlanExecution for new emergencies. */
  emergencyChecklist?: EmergencyChecklistState;
  /** Snapshot of organization response plan at emergency declaration. */
  responsePlanExecution?: IncidentResponsePlanExecution;
};

export type ResponsePlanItemType =
  | "checkbox"
  | "notes"
  | "text"
  | "dropdown"
  | "yes_no";

export type ResponsePlanChecklistItem = {
  id: string;
  label: string;
  type: ResponsePlanItemType;
  required: boolean;
  options?: string[];
};

export type ResponsePlanStep = {
  id: string;
  title: string;
  order: number;
  items: ResponsePlanChecklistItem[];
};

export type ResponsePlanNotificationContact = {
  id: string;
  /** Role or position (e.g. Operations Manager). */
  label: string;
  /** Contact person name. */
  name: string;
  phone: string;
  required: boolean;
};

export type ResponsePlanRequiredInformation = {
  personsOnBoard: boolean;
  fuelRemaining: boolean;
  lastKnownCoordinates: boolean;
  medicalConcerns: boolean;
  missionType: boolean;
};

export type ResponsePlanOverrides = {
  notificationContacts: ResponsePlanNotificationContact[];
  requiredInformation: ResponsePlanRequiredInformation;
};

export type OrganizationResponsePlanVersion = {
  versionNumber: number;
  planName: string;
  createdAt: number;
  createdByUserId: string;
  createdByUserName: string;
  steps: ResponsePlanStep[];
  overrides: ResponsePlanOverrides;
};

export type OrganizationResponsePlan = {
  id: string;
  organizationId: string;
  currentVersionNumber: number;
  versions: OrganizationResponsePlanVersion[];
  updatedAt: number;
};

export type ResponsePlanTemplateId =
  | "standard-flight-following"
  | "ems-helicopter"
  | "utility-helicopter"
  | "law-enforcement"
  | "offshore"
  | "custom-blank";

export type ResponsePlanItemCompletion = {
  itemId: string;
  completed: boolean;
  completedAt: number | null;
  completedByUserId: string;
  completedByUserName: string;
  value: string;
};

export type ResponsePlanNotificationCompletion = {
  contactId: string;
  outcome: EmergencyContactOutcome | null;
  completedAt: number | null;
  completedByUserId: string;
  completedByUserName: string;
};

export type IncidentResponsePlanExecution = {
  planId: string;
  organizationId: string;
  planName: string;
  versionNumber: number;
  steps: ResponsePlanStep[];
  overrides: ResponsePlanOverrides;
  declaredAt: number;
  currentStepIndex: number;
  itemCompletions: Record<string, ResponsePlanItemCompletion>;
  notificationCompletions: Record<string, ResponsePlanNotificationCompletion>;
  requiredInformation: Record<string, string>;
  updateLog: EmergencyUpdateLogEntry[];
  outcome: {
    outcome: EmergencyOutcomeType | null;
    severity: IncidentSeverity | null;
    summary: string;
    completedAt: number | null;
  };
  closedAt: number | null;
};

export const RESPONSE_PLAN_REQUIRED_INFO_FIELDS: {
  key: keyof ResponsePlanRequiredInformation;
  label: string;
}[] = [
  { key: "personsOnBoard", label: "Persons on board" },
  { key: "fuelRemaining", label: "Fuel remaining" },
  { key: "lastKnownCoordinates", label: "Last known coordinates" },
  { key: "medicalConcerns", label: "Medical concerns" },
  { key: "missionType", label: "Mission type" },
];

/** @deprecated Legacy labels — use dynamic notificationContacts on plans. */
export const RESPONSE_PLAN_NOTIFICATION_FIELDS = [
  { key: "operationsManager", label: "Operations Manager" },
  { key: "chiefPilot", label: "Chief Pilot" },
  { key: "safetyOfficer", label: "Safety Officer" },
  { key: "customer", label: "Customer" },
  { key: "faa", label: "FAA" },
  { key: "ntsb", label: "NTSB" },
  { key: "sar", label: "SAR" },
] as const;

export type EmergencyAssessmentType =
  | "Mechanical"
  | "Medical"
  | "Fuel"
  | "Weather"
  | "Lost Communications"
  | "Accident"
  | "Unknown"
  | "Other";

export type EmergencyYesNo = "Yes" | "No";

export type EmergencyContactOutcome =
  | "Contacted"
  | "Left Message"
  | "Unable to Reach";

export const EMERGENCY_CONTACT_OUTCOMES: EmergencyContactOutcome[] = [
  "Contacted",
  "Left Message",
  "Unable to Reach",
];

export const EMERGENCY_CONTACT_OUTCOME_LABELS: Record<
  EmergencyContactOutcome,
  string
> = {
  Contacted: "Contacted",
  "Left Message": "Left Message",
  "Unable to Reach": "No Answer",
};

export type EmergencyOutcomeType =
  | "Safe Landing"
  | "Precautionary Landing"
  | "Accident"
  | "Incident"
  | "SAR Activation"
  | "Unresolved"
  | "Other";

export type EmergencyResponseActionKey =
  | "emergencyServices"
  | "searchAndRescue"
  | "localAuthorities"
  | "landingFacility"
  | "situationUpdates";

export type EmergencyChecklistActionItem = {
  completed: boolean;
  completedAt: number | null;
  completedByUserId: string;
  completedByUserName: string;
  notes: string;
};

export type EmergencyUpdateLogEntry = {
  id: string;
  timestamp: number;
  userId: string;
  userName: string;
  entry: string;
};

export type EmergencyChecklistState = {
  currentStep: number;
  step1Acknowledged: boolean;
  assessment: {
    communicationsEstablished: EmergencyYesNo | null;
    emergencyType: EmergencyAssessmentType | null;
    aircraftStatusNotes: string;
    lastKnownLocation: string;
    completedAt: number | null;
  };
  contacts: {
    emergencyContact: EmergencyContactOutcome | null;
    organizationDispatch: boolean;
    supervisor: boolean;
    additionalNotes: string;
    completedAt: number | null;
  };
  responseActions: Record<EmergencyResponseActionKey, EmergencyChecklistActionItem>;
  updateLog: EmergencyUpdateLogEntry[];
  outcome: {
    outcome: EmergencyOutcomeType | null;
    severity: IncidentSeverity | null;
    summary: string;
    completedAt: number | null;
  };
  closeout: {
    allNotifications: boolean;
    finalNotes: boolean;
    incidentSummary: boolean;
    supervisorReview: boolean;
    completedAt: number | null;
  };
};

export const EMERGENCY_ASSESSMENT_TYPES: EmergencyAssessmentType[] = [
  "Mechanical",
  "Medical",
  "Fuel",
  "Weather",
  "Lost Communications",
  "Accident",
  "Unknown",
  "Other",
];

export const EMERGENCY_OUTCOMES: EmergencyOutcomeType[] = [
  "Safe Landing",
  "Precautionary Landing",
  "Accident",
  "Incident",
  "SAR Activation",
  "Unresolved",
  "Other",
];

export const EMERGENCY_RESPONSE_ACTIONS: EmergencyResponseActionKey[] = [
  "emergencyServices",
  "searchAndRescue",
  "localAuthorities",
  "landingFacility",
  "situationUpdates",
];

export const EMERGENCY_RESPONSE_STEPS = [
  { id: 1, label: "Emergency declared" },
  { id: 2, label: "Initial assessment" },
  { id: 3, label: "Contacts" },
  { id: 4, label: "Response actions" },
  { id: 5, label: "Ongoing monitoring" },
  { id: 6, label: "Event outcome" },
  { id: 7, label: "Closeout" },
] as const;

export const INCIDENT_EVENT_TYPES: IncidentEventType[] = [
  "Accident",
  "Incident",
  "Emergency Landing",
  "Overdue Aircraft",
  "Lost Communications",
  "Weather Event",
  "Mechanical Failure",
  "Medical Emergency",
  "Fuel Emergency",
  "Other",
];

export const INCIDENT_SEVERITIES: IncidentSeverity[] = [
  "Low",
  "Moderate",
  "High",
  "Critical",
];

export const INCIDENT_REPORT_STATUSES: IncidentReportStatus[] = [
  "Open",
  "Active Response",
  "Monitoring",
  "Resolved",
  "Closed",
];

export const TERMINAL_INCIDENT_STATUSES: IncidentReportStatus[] = [
  "Resolved",
  "Closed",
];

export const DEFAULT_CHECK_INTERVAL_MINUTES = 10;
export const VERIFY_INTERVAL_MS = DEFAULT_CHECK_INTERVAL_MINUTES * 60 * 1000;
export const WARNING_THRESHOLD_MS = 2 * 60 * 1000;

export const VERIFICATION_OUTCOMES: VerificationOutcome[] = [
  "Airborne",
  "Landed Safely",
  "Delayed Check-In",
  "Emergency",
  "Maintenance Issue",
];

export const USER_ROLES: UserRole[] = [
  "OCC Operator",
  "Supervisor",
  "Admin",
];

export const MONITORING_ZONES: MonitoringZone[] = ["East", "Central", "West"];

/** @deprecated Use Aircraft */
export type AircraftConfig = Aircraft;
