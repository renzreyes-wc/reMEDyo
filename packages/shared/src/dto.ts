/**
 * Response shapes the API returns and the web app consumes.
 *
 * Dates cross the wire as ISO-8601 strings; each app converts at its own edge.
 */

import type {
  AccountStatus,
  ApprovalState,
  AppointmentState,
  AuditAction,
  CancelledBy,
  MedicalHistoryKind,
  NotificationType,
  Role,
  SessionState,
  Severity,
  Specialization,
} from './enums';

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  status: AccountStatus;
  displayName: string | null;
  initials: string;
  /** Patients: name and date of birth present. Doctors: profile submitted. */
  profileComplete: boolean;
  /** Doctors only. */
  approvalState?: ApprovalState;
}

export interface MedicalHistoryEntry {
  id: string;
  kind: MedicalHistoryKind;
  description: string;
  recordedAt: string;
}

export interface PatientProfile {
  id: string;
  userId: string;
  fullName: string | null;
  dateOfBirth: string | null;
  /** Derived from dateOfBirth, never stored. */
  age: number | null;
  contactNumber: string | null;
  weightKg: number | null;
  heightCm: number | null;
  initials: string;
  history: MedicalHistoryEntry[];
}

export interface DoctorSummary {
  id: string;
  userId: string;
  fullName: string;
  initials: string;
  specializations: Specialization[];
  yearsExperience: number;
  consultationFee: number;
  bioExcerpt: string;
  hasUpcomingAvailability: boolean;
  approvalState: ApprovalState;
}

export interface DoctorDetail extends DoctorSummary {
  bio: string;
  licenseNumber: string;
  nextSlots: Slot[];
  rejectionReason?: string | null;
}

export interface Slot {
  /** ISO-8601 start instant. Slots are derived, never stored. */
  startsAt: string;
  endsAt: string;
}

export interface AvailabilityWindow {
  id: string;
  /** 0 = Sunday .. 6 = Saturday */
  dayOfWeek: number;
  /** Minutes from midnight, local to the doctor. */
  startMinute: number;
  endMinute: number;
}

export interface AvailabilityException {
  id: string;
  /** ISO date (YYYY-MM-DD) marked unavailable. */
  date: string;
  reason: string | null;
}

export interface AppointmentParty {
  id: string;
  fullName: string;
  initials: string;
}

export interface Appointment {
  id: string;
  patient: AppointmentParty;
  doctor: AppointmentParty & { specializations: Specialization[] };
  startsAt: string;
  endsAt: string;
  state: AppointmentState;
  sessionState: SessionState;
  reasonForVisit: string;
  cancelledBy: CancelledBy | null;
  cancellationReason: string | null;
  /** Derived: join window closed with no completion. */
  missed: boolean;
  hasNote: boolean;
  prescriptionCount: number;
}

export interface ConsultationMessage {
  id: string;
  appointmentId: string;
  senderId: string;
  senderName: string;
  body: string;
  sentAt: string;
}

export interface ConsultationContext {
  appointment: Appointment;
  sessionState: SessionState;
  patientJoinedAt: string | null;
  doctorJoinedAt: string | null;
  joinable: boolean;
  messages: ConsultationMessage[];
  /** Populated for the doctor only. */
  clinicalContext?: {
    age: number | null;
    allergies: string[];
    medications: string[];
    conditions: string[];
  };
}

export interface ConsultationNote {
  id: string;
  appointmentId: string;
  findings: string;
  diagnosis: string;
  recommendations: string;
  followUp: string | null;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Prescription {
  id: string;
  appointmentId: string;
  medication: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions: string | null;
  prescriberName: string;
  issuedAt: string;
}

/**
 * A generated plain-language rendering of a signed note.
 *
 * Not the medical record. Shown beside the clinical note, never instead of
 * it, and only while it still explains the note's current version.
 */
export interface RecordSummary {
  summary: string;
  /** The model that produced it, so what is on screen can be traced. */
  model: string;
  generatedAt: string;
}

export interface MedicalRecordEntry {
  appointment: Appointment;
  note: ConsultationNote | null;
  prescriptions: Prescription[];
  /** Null when generation is disabled, unavailable, or the summary is stale. */
  summary: RecordSummary | null;
}

/**
 * A generated consultation-note draft, for the doctor to edit and sign.
 *
 * Scaffolding, not the record: it pre-fills the form and nothing else. The
 * doctor's save through the note endpoint remains the only writer.
 */
export interface NoteDraft {
  findings: string;
  diagnosis: string;
  recommendations: string;
  followUp: string | null;
  /** Verified prescription values, each traceable to the doctor's own message. */
  extractionCandidates: ExtractionCandidate[];
  model: string;
  generatedAt: string;
}

/**
 * Prescription values read out of a doctor's own message.
 *
 * Never a prescription. These pre-fill the form and are labelled as awaiting
 * the doctor's confirmation; the system can always point at the message the
 * values came from.
 */
export interface ExtractionCandidate {
  medication: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions: string | null;
  sourceMessageId: string;
  /** The words in that message these values were read from. */
  excerpt: string;
}

/** Why no draft was produced. Rendered as one absent-assistance state. */
export type DraftRefusalReason =
  | 'transcript-empty'
  | 'transcript-too-thin'
  | 'unavailable';

export type NoteDraftResult =
  | { status: 'drafted'; draft: NoteDraft }
  | { status: 'refused'; reason: DraftRefusalReason };

/** Whether assist surfaces should be offered at all. */
export interface AssistAvailability {
  enabled: boolean;
  model: string | null;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Route the notification points at, if any. */
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface SymptomOption {
  id: string;
  label: string;
  /** Emergency indicators trigger prominent guidance ahead of suggestions. */
  emergency: boolean;
}

export interface MatchIntake {
  symptomIds: string[];
  freeText?: string;
  durationDays?: number;
  severity?: Severity;
}

export interface MatchSuggestion {
  doctor: DoctorSummary;
  score: number;
  matchedSpecialization: Specialization;
  /** Plain-language explanation naming the concerns that produced the match. */
  reason: string;
}

export interface MatchResult {
  suggestions: MatchSuggestion[];
  /** True when no rule matched, or no doctor held the matched specialty. */
  fallback: boolean;
  fallbackReason: string | null;
  emergencyWarning: boolean;
}

export interface AdminUserRow {
  id: string;
  email: string;
  role: Role;
  status: AccountStatus;
  fullName: string | null;
  initials: string;
  statusReason: string | null;
  createdAt: string;
  approvalState: ApprovalState | null;
}

export interface AdminStats {
  patients: number;
  doctors: number;
  doctorsPendingReview: number;
  appointmentsByState: Record<AppointmentState, number>;
  consultationsCompleted: number;
}

export interface AuditEntry {
  id: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  action: AuditAction;
  targetType: string;
  targetId: string;
  reason: string | null;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}
