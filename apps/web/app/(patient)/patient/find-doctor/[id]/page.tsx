'use client';

import type { Appointment, DoctorDetail } from '@remedyo/shared';
import { SPECIALIZATION_LABELS } from '@remedyo/shared';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  Field,
  PageHeading,
  Spinner,
  Textarea,
} from '@/components/ui';
import { SlotPicker } from '@/features/appointments/slot-picker';
import { api, ApiRequestError } from '@/lib/api';
import { formatPeso, formatRange } from '@/lib/format';

export default function DoctorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [doctor, setDoctor] = useState<DoctorDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [slot, setSlot] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    api
      .get<DoctorDetail>(`/doctors/${id}`)
      .then(setDoctor)
      .catch(() => setNotFound(true));
  }, [id]);

  async function book(event: React.FormEvent) {
    event.preventDefault();
    if (!slot) {
      setErrors(['Choose a time slot first.']);
      return;
    }
    setErrors([]);
    setBooking(true);
    try {
      const appointment = await api.post<Appointment>('/appointments', {
        doctorId: id,
        startsAt: slot,
        reasonForVisit: reason,
      });
      router.push(`/patient/appointments?booked=${appointment.id}`);
    } catch (error) {
      setErrors(error instanceof ApiRequestError ? error.details : ['Could not book.']);
      // The slot may have gone while the form was open, so refresh what is left.
      void api.get<DoctorDetail>(`/doctors/${id}`).then(setDoctor);
      setSlot(null);
      setBooking(false);
    }
  }

  if (notFound) {
    return (
      <EmptyState
        title="Doctor not available"
        description="This profile either does not exist or has not been approved yet."
        action={<ButtonLink href="/patient/find-doctor">Back to the directory</ButtonLink>}
      />
    );
  }

  if (!doctor) return <Spinner label="Loading profile…" />;

  return (
    <>
      <PageHeading title={`Dr. ${doctor.fullName}`} />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
        <Card className="h-fit p-5">
          <div className="flex items-start gap-4">
            <Avatar initials={doctor.initials} size="lg" />
            <div>
              <h2 className="text-lg font-semibold text-ink-900">Dr. {doctor.fullName}</h2>
              <p className="mt-1 flex flex-wrap gap-1">
                {doctor.specializations.map((s) => (
                  <Badge key={s} tone="brand">{SPECIALIZATION_LABELS[s]}</Badge>
                ))}
              </p>
            </div>
          </div>

          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-700">
            {doctor.bio || 'No biography provided.'}
          </p>

          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-ink-100 pt-4">
            <div>
              <dt className="text-xs text-ink-500">Experience</dt>
              <dd className="text-sm font-medium text-ink-900">
                {doctor.yearsExperience} years
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500">Consultation fee</dt>
              <dd className="text-sm font-medium text-ink-900">
                {formatPeso(doctor.consultationFee)}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader
            title="Book a consultation"
            description="Pick a time, tell the doctor why, and you are done."
          />
          <form onSubmit={book} className="space-y-5 p-5">
            {errors.length > 0 ? (
              <Alert tone="danger">
                {errors.length > 1 ? (
                  <ul className="list-inside list-disc">
                    {errors.map((e) => <li key={e}>{e}</li>)}
                  </ul>
                ) : errors[0]}
              </Alert>
            ) : null}

            <SlotPicker slots={doctor.nextSlots} value={slot} onChange={setSlot} />

            {slot ? (
              <Alert tone="success" title="Selected">
                {formatRange(
                  slot,
                  doctor.nextSlots.find((s) => s.startsAt === slot)?.endsAt ?? slot,
                )}
              </Alert>
            ) : null}

            <Field
              label="Why are you booking?"
              required
              hint="A sentence is enough. Your doctor sees this before the consultation."
            >
              <Textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Persistent cough for about two weeks, worse at night."
              />
            </Field>

            <Button type="submit" size="lg" className="w-full" disabled={booking || !slot}>
              {booking ? 'Booking…' : 'Confirm booking'}
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
