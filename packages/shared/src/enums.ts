/**
 * Enumerations shared by the web and api workspaces.
 *
 * These mirror the Prisma enums one-for-one. Prisma owns the database
 * representation; this file is what the frontend is allowed to know about it.
 */

export const Role = {
  PATIENT: 'PATIENT',
  DOCTOR: 'DOCTOR',
  ADMIN: 'ADMIN',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const AccountStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DEACTIVATED: 'DEACTIVATED',
} as const;
export type AccountStatus = (typeof AccountStatus)[keyof typeof AccountStatus];

export const ApprovalState = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type ApprovalState = (typeof ApprovalState)[keyof typeof ApprovalState];

/**
 * Stored lifecycle of an appointment. `MISSED` is deliberately absent: an
 * appointment whose join window closed without completion is derived at read
 * time, not written, so nothing has to sweep the table on a schedule.
 */
export const AppointmentState = {
  SCHEDULED: 'SCHEDULED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type AppointmentState = (typeof AppointmentState)[keyof typeof AppointmentState];

export const SessionState = {
  SCHEDULED: 'SCHEDULED',
  JOINED: 'JOINED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const;
export type SessionState = (typeof SessionState)[keyof typeof SessionState];

export const CancelledBy = {
  PATIENT: 'PATIENT',
  DOCTOR: 'DOCTOR',
  ADMIN: 'ADMIN',
} as const;
export type CancelledBy = (typeof CancelledBy)[keyof typeof CancelledBy];

/** The application-defined specialization list. Doctors may not invent one. */
export const Specialization = {
  GENERAL_PRACTICE: 'GENERAL_PRACTICE',
  CARDIOLOGY: 'CARDIOLOGY',
  DERMATOLOGY: 'DERMATOLOGY',
  PEDIATRICS: 'PEDIATRICS',
  PSYCHIATRY: 'PSYCHIATRY',
  ORTHOPEDICS: 'ORTHOPEDICS',
  NEUROLOGY: 'NEUROLOGY',
  GASTROENTEROLOGY: 'GASTROENTEROLOGY',
  OBSTETRICS_GYNECOLOGY: 'OBSTETRICS_GYNECOLOGY',
  ENDOCRINOLOGY: 'ENDOCRINOLOGY',
  OPHTHALMOLOGY: 'OPHTHALMOLOGY',
  PULMONOLOGY: 'PULMONOLOGY',
  ENT: 'ENT',
} as const;
export type Specialization = (typeof Specialization)[keyof typeof Specialization];

export const SPECIALIZATIONS = Object.values(Specialization);

export const SPECIALIZATION_LABELS: Record<Specialization, string> = {
  GENERAL_PRACTICE: 'General Practice',
  CARDIOLOGY: 'Cardiology',
  DERMATOLOGY: 'Dermatology',
  PEDIATRICS: 'Pediatrics',
  PSYCHIATRY: 'Psychiatry',
  ORTHOPEDICS: 'Orthopedics',
  NEUROLOGY: 'Neurology',
  GASTROENTEROLOGY: 'Gastroenterology',
  OBSTETRICS_GYNECOLOGY: 'Obstetrics & Gynecology',
  ENDOCRINOLOGY: 'Endocrinology',
  OPHTHALMOLOGY: 'Ophthalmology',
  PULMONOLOGY: 'Pulmonology',
  ENT: 'Ear, Nose & Throat',
};

export const MedicalHistoryKind = {
  ALLERGY: 'ALLERGY',
  MEDICATION: 'MEDICATION',
  CONDITION: 'CONDITION',
  NOTE: 'NOTE',
} as const;
export type MedicalHistoryKind = (typeof MedicalHistoryKind)[keyof typeof MedicalHistoryKind];

export const MEDICAL_HISTORY_LABELS: Record<MedicalHistoryKind, string> = {
  ALLERGY: 'Allergies',
  MEDICATION: 'Current medications',
  CONDITION: 'Chronic conditions',
  NOTE: 'Other notes',
};

export const NotificationType = {
  APPOINTMENT_BOOKED: 'APPOINTMENT_BOOKED',
  APPOINTMENT_RESCHEDULED: 'APPOINTMENT_RESCHEDULED',
  APPOINTMENT_CANCELLED: 'APPOINTMENT_CANCELLED',
  APPOINTMENT_REMINDER: 'APPOINTMENT_REMINDER',
  RECORDS_AVAILABLE: 'RECORDS_AVAILABLE',
  DOCTOR_APPROVED: 'DOCTOR_APPROVED',
  DOCTOR_REJECTED: 'DOCTOR_REJECTED',
  ACCOUNT_STATUS_CHANGED: 'ACCOUNT_STATUS_CHANGED',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const AuditAction = {
  ACCOUNT_ACTIVATED: 'ACCOUNT_ACTIVATED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  ACCOUNT_DEACTIVATED: 'ACCOUNT_DEACTIVATED',
  DOCTOR_APPROVED: 'DOCTOR_APPROVED',
  DOCTOR_REJECTED: 'DOCTOR_REJECTED',
  DOCTOR_SPECIALIZATION_UPDATED: 'DOCTOR_SPECIALIZATION_UPDATED',
  APPOINTMENT_CANCELLED: 'APPOINTMENT_CANCELLED',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  ACCOUNT_ACTIVATED: 'Account activated',
  ACCOUNT_SUSPENDED: 'Account suspended',
  ACCOUNT_DEACTIVATED: 'Account deactivated',
  DOCTOR_APPROVED: 'Doctor approved',
  DOCTOR_REJECTED: 'Doctor rejected',
  DOCTOR_SPECIALIZATION_UPDATED: 'Specialization corrected',
  APPOINTMENT_CANCELLED: 'Appointment cancelled',
};

export const Severity = {
  MILD: 'MILD',
  MODERATE: 'MODERATE',
  SEVERE: 'SEVERE',
} as const;
export type Severity = (typeof Severity)[keyof typeof Severity];
