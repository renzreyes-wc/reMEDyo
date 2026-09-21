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
  joinOpensAt: string;
  joinClosesAt: string;
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

export interface MedicalRecordEntry {
  appointment: Appointment;
  note: ConsultationNote | null;
  prescriptions: Prescription[];
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
