# Spec Delta

## Purpose

Keeps both sides of a consultation aware of what changed — bookings, reschedules, cancellations, imminent appointments, and available records — entirely through in-application messages stored in the database, with no email, SMS, or push dependency.

## ADDED Requirements

### Requirement: In-app notification delivery
The system SHALL store notifications in the database and present them to their recipient inside the application. The system MUST NOT require an email, SMS, or push-notification service for any notification.

#### Scenario: Recipient sees a notification
- **WHEN** a notification is created for a user and that user opens the application
- **THEN** the notification is listed in their notification surface with its message and the time it was created

#### Scenario: Notifications are private
- **WHEN** a user requests notifications
- **THEN** only notifications addressed to that user are returned

#### Scenario: Delivery without external services
- **WHEN** the application runs with no outbound internet access
- **THEN** notifications are still created and displayed to their recipients

### Requirement: Notification triggers
The system SHALL create a notification for the affected counterpart on each of the following events: an appointment is booked, an appointment is rescheduled, an appointment is cancelled by either party or by an administrator, a doctor profile is approved or rejected, an account is suspended or reactivated, and consultation notes or a prescription become available to a patient.

#### Scenario: Booking notifies the doctor
- **WHEN** a patient books an appointment
- **THEN** a notification is created for the doctor naming the patient and the appointment time

#### Scenario: Cancellation notifies the counterpart
- **WHEN** a doctor cancels an appointment
- **THEN** a notification is created for the patient stating the appointment was cancelled and including the reason where one was given

#### Scenario: Administrative cancellation notifies both parties
- **WHEN** an administrator cancels an appointment
- **THEN** notifications are created for both the patient and the doctor

#### Scenario: Records availability notifies the patient
- **WHEN** a doctor records consultation notes or issues a prescription
- **THEN** a notification is created for the patient stating that their consultation record is available

#### Scenario: Approval notifies the doctor
- **WHEN** an administrator approves or rejects a doctor profile
- **THEN** a notification is created for that doctor stating the outcome

### Requirement: Upcoming appointment reminder
The system SHALL surface a reminder to both the patient and the doctor for an appointment starting within an application-defined imminent window, without requiring a background delivery service.

#### Scenario: Appointment becomes imminent
- **WHEN** a scheduled appointment's start time falls inside the imminent window
- **THEN** both parties see a reminder for it, carrying a direct route into the consultation workspace

#### Scenario: Cancelled appointment does not remind
- **WHEN** an appointment inside the imminent window has been cancelled
- **THEN** no reminder is shown for it

### Requirement: Read state and unread count
Each notification SHALL carry a read state. The system SHALL display the number of unread notifications for the signed-in user and SHALL allow marking a notification, or all notifications, as read.

#### Scenario: Unread count reflects new notifications
- **WHEN** a user has three unread notifications
- **THEN** the interface displays an unread count of three

#### Scenario: Marking one as read
- **WHEN** a user marks a single unread notification as read
- **THEN** that notification is no longer unread and the unread count decreases by one

#### Scenario: Marking all as read
- **WHEN** a user marks all notifications as read
- **THEN** the unread count becomes zero and every notification remains listed in their history
