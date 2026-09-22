# Spec Delta

## Purpose

Governs when consultations can happen: how doctors declare availability, how that becomes concrete bookable slots, and the rules under which patients book, reschedule, and cancel without producing overlapping or invalid appointments.

## ADDED Requirements

### Requirement: Doctor availability definition
The system SHALL allow an approved doctor to define availability as recurring weekly windows, each with a day of week, start time, and end time, and to remove or edit those windows. A doctor SHALL also be able to mark a specific date as unavailable, overriding the recurring pattern.

#### Scenario: Doctor adds a weekly window
- **WHEN** a doctor adds availability for Tuesdays from 09:00 to 12:00
- **THEN** the system stores the window and bookable slots appear on upcoming Tuesdays within that range

#### Scenario: Invalid window rejected
- **WHEN** a doctor submits an availability window whose end time is at or before its start time
- **THEN** the system rejects it with a validation error and stores nothing

#### Scenario: Overlapping windows rejected
- **WHEN** a doctor submits a window that overlaps an existing window on the same day of week
- **THEN** the system rejects it with a validation error identifying the conflict

#### Scenario: Date marked unavailable
- **WHEN** a doctor marks a specific upcoming date as unavailable
- **THEN** no bookable slots are offered on that date, even where a recurring window would otherwise apply

### Requirement: Derived bookable slots
The system SHALL derive discrete bookable slots of a fixed application-defined duration from a doctor's availability windows. A slot SHALL be offered only if it lies in the future, falls inside an availability window, is not on a date marked unavailable, and is not already held by an active appointment.

#### Scenario: Slots derived from a window
- **WHEN** a doctor's availability window spans 09:00 to 10:00 and the slot duration is thirty minutes
- **THEN** the system offers slots at 09:00 and 09:30 on the applicable dates

#### Scenario: Past slots not offered
- **WHEN** a patient views a doctor's availability for the current day
- **THEN** slots whose start time has already passed are not offered

#### Scenario: Booked slot withdrawn
- **WHEN** a slot is held by an active appointment
- **THEN** that slot is not offered to any other patient

### Requirement: Appointment booking
The system SHALL allow a patient with a complete required profile to book an offered slot with an approved doctor, creating an appointment in the scheduled state that records the patient, doctor, start time, duration, and the reason for the visit.

#### Scenario: Successful booking
- **WHEN** a patient books an available future slot with an approved doctor and supplies a reason for the visit
- **THEN** the system creates a scheduled appointment, the slot ceases to be offered, and both patient and doctor are notified

#### Scenario: Slot taken concurrently
- **WHEN** two patients submit bookings for the same slot and the same doctor
- **THEN** exactly one appointment is created and the other request is rejected with a conflict error explaining that the slot is no longer available

#### Scenario: Booking a past slot
- **WHEN** a patient submits a booking for a start time in the past
- **THEN** the system rejects it and creates no appointment

#### Scenario: Patient double-books themselves
- **WHEN** a patient books a slot that overlaps an appointment they already hold with any doctor
- **THEN** the system rejects the booking with a conflict error

### Requirement: Rescheduling
The system SHALL allow a patient to move a scheduled appointment to another offered slot with the same doctor, provided the appointment has not started and has not been completed or cancelled. The original slot SHALL be released and the new slot held, atomically.

#### Scenario: Successful reschedule
- **WHEN** a patient reschedules a scheduled appointment to another available future slot with the same doctor
- **THEN** the appointment moves to the new time, the original slot becomes available again, and both parties are notified

#### Scenario: Reschedule into a taken slot
- **WHEN** a patient attempts to reschedule into a slot that is no longer available
- **THEN** the system rejects the request, the appointment remains at its original time, and the original slot is not released

#### Scenario: Reschedule of a completed appointment
- **WHEN** a patient attempts to reschedule an appointment that is completed or cancelled
- **THEN** the system rejects the request

### Requirement: Cancellation
The system SHALL allow either the patient or the doctor to cancel a scheduled appointment before it starts, recording who cancelled and an optional reason. A cancelled appointment SHALL release its slot and SHALL NOT be reusable as an active appointment.

#### Scenario: Patient cancels
- **WHEN** a patient cancels their scheduled appointment
- **THEN** the appointment moves to the cancelled state, the slot becomes available again, and the doctor is notified

#### Scenario: Doctor cancels
- **WHEN** a doctor cancels a scheduled appointment with a reason
- **THEN** the appointment moves to the cancelled state, the reason is recorded, and the patient is notified

#### Scenario: Cancelling a completed appointment
- **WHEN** either party attempts to cancel an appointment that has already been completed
- **THEN** the system rejects the request and the appointment remains completed

### Requirement: Appointment visibility
A patient SHALL see only their own appointments and a doctor SHALL see only appointments where they are the clinician. Each party SHALL be able to view upcoming and past appointments separately.

#### Scenario: Patient views their schedule
- **WHEN** a patient opens their appointments view
- **THEN** only appointments where they are the patient are listed, separated into upcoming and past

#### Scenario: Doctor views their queue
- **WHEN** a doctor opens their appointments view
- **THEN** only appointments where they are the doctor are listed, ordered by start time

#### Scenario: Cross-account appointment access
- **WHEN** a user requests an appointment in which they are neither the patient nor the doctor, and they are not an administrator
- **THEN** the system rejects the request as forbidden or not-found
