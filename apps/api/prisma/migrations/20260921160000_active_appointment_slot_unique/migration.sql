-- Arbitrates the booking race in the database rather than in application code.
--
-- The scheduling spec requires that two patients booking the same slot produce
-- exactly one appointment. A check-then-insert in the service loses that race.
-- This partial unique index makes the database the referee: both transactions
-- insert, one commits, the other takes a unique violation and is translated
-- into 409 Conflict.
--
-- The WHERE clause is the point. An unfiltered unique index would permanently
-- burn a slot once any appointment held it, so a cancelled 09:00 could never
-- be rebooked. Restricting the index to SCHEDULED rows means cancelled and
-- completed appointments stop reserving their slot.
CREATE UNIQUE INDEX "Appointment_active_slot_key"
  ON "Appointment" ("doctorId", "startsAt")
  WHERE "state" = 'SCHEDULED';

-- Same rule from the patient's side: a patient may not hold two appointments
-- that start at the same instant, with any doctor.
CREATE UNIQUE INDEX "Appointment_patient_active_slot_key"
  ON "Appointment" ("patientId", "startsAt")
  WHERE "state" = 'SCHEDULED';
