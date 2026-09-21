import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AVAILABILITY_HORIZON_DAYS,
  AVAILABILITY_SOON_DAYS,
  SLOT_DURATION_MINUTES,
  type AvailabilityException as AvailabilityExceptionDto,
  type AvailabilityWindow as AvailabilityWindowDto,
  type Slot,
} from '@remedyo/shared';
import { PrismaService } from '../../common/prisma.service';
import { dateKey, deriveSlots, findWindowConflict, type WindowSpec } from './slot-derivation';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async listWindows(doctorId: string): Promise<AvailabilityWindowDto[]> {
    const windows = await this.prisma.availabilityWindow.findMany({
      where: { doctorId },
      orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }],
    });
    return windows.map((w) => ({
      id: w.id,
      dayOfWeek: w.dayOfWeek,
      startMinute: w.startMinute,
      endMinute: w.endMinute,
    }));
  }

  async addWindow(
    doctorId: string,
    spec: WindowSpec,
  ): Promise<AvailabilityWindowDto> {
    if (spec.endMinute <= spec.startMinute) {
      throw new BadRequestException(
        'The end time has to be after the start time.',
      );
    }
    if (spec.endMinute - spec.startMinute < SLOT_DURATION_MINUTES) {
      throw new BadRequestException(
        `A window has to be at least ${SLOT_DURATION_MINUTES} minutes long.`,
      );
    }

    const existing = await this.prisma.availabilityWindow.findMany({
      where: { doctorId, dayOfWeek: spec.dayOfWeek },
    });

    const conflict = findWindowConflict(spec, existing);
    if (conflict) {
      throw new ConflictException(
        'That overlaps a window you already have on the same day.',
      );
    }

    const created = await this.prisma.availabilityWindow.create({
      data: { ...spec, doctorId },
    });

    return {
      id: created.id,
      dayOfWeek: created.dayOfWeek,
      startMinute: created.startMinute,
      endMinute: created.endMinute,
    };
  }

  async removeWindow(doctorId: string, windowId: string): Promise<void> {
    const window = await this.prisma.availabilityWindow.findUnique({
      where: { id: windowId },
    });
    if (!window || window.doctorId !== doctorId) {
      throw new NotFoundException('That availability window does not exist.');
    }
    await this.prisma.availabilityWindow.delete({ where: { id: windowId } });
  }

  async listExceptions(doctorId: string): Promise<AvailabilityExceptionDto[]> {
    const exceptions = await this.prisma.availabilityException.findMany({
      where: { doctorId, date: { gte: startOfDay(new Date()) } },
      orderBy: { date: 'asc' },
    });
    return exceptions.map((e) => ({
      id: e.id,
      date: dateKey(e.date),
      reason: e.reason,
    }));
  }

  async addException(
    doctorId: string,
    isoDate: string,
    reason?: string,
  ): Promise<AvailabilityExceptionDto> {
    const date = startOfDay(new Date(`${isoDate}T00:00:00`));
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('That is not a valid date.');
    }

    const created = await this.prisma.availabilityException.upsert({
      where: { doctorId_date: { doctorId, date } },
      update: { reason: reason ?? null },
      create: { doctorId, date, reason: reason ?? null },
    });

    return { id: created.id, date: dateKey(created.date), reason: created.reason };
  }

  async removeException(doctorId: string, exceptionId: string): Promise<void> {
    const exception = await this.prisma.availabilityException.findUnique({
      where: { id: exceptionId },
    });
    if (!exception || exception.doctorId !== doctorId) {
      throw new NotFoundException('That blocked date does not exist.');
    }
    await this.prisma.availabilityException.delete({ where: { id: exceptionId } });
  }

  /**
   * Offerable slots for one doctor over a range, with everything already
   * subtracted: past times, blocked dates, and slots an active appointment
   * holds.
   */
  async slotsFor(
    doctorId: string,
    options: { from?: Date; days?: number } = {},
  ): Promise<Slot[]> {
    const now = new Date();
    const from = options.from ?? now;
    const days = options.days ?? AVAILABILITY_HORIZON_DAYS;
    const to = new Date(startOfDay(from).getTime() + days * DAY_MS);

    const [windows, exceptions, booked] = await Promise.all([
      this.prisma.availabilityWindow.findMany({ where: { doctorId } }),
      this.prisma.availabilityException.findMany({
        where: { doctorId, date: { gte: startOfDay(from), lt: to } },
      }),
      this.prisma.appointment.findMany({
        where: {
          doctorId,
          state: 'SCHEDULED',
          startsAt: { gte: startOfDay(from), lt: to },
        },
        select: { startsAt: true },
      }),
    ]);

    const starts = deriveSlots({
      windows,
      exceptionDates: new Set(exceptions.map((e) => dateKey(e.date))),
      bookedStarts: new Set(booked.map((b) => b.startsAt.getTime())),
      from,
      to,
      now,
      slotMinutes: SLOT_DURATION_MINUTES,
    });

    return starts.map((start) => ({
      startsAt: start.toISOString(),
      endsAt: new Date(start.getTime() + SLOT_DURATION_MINUTES * 60_000).toISOString(),
    }));
  }

  /**
   * Which of these doctors have a slot inside the "soon" horizon.
   *
   * Answered in one pass for the whole directory page rather than per card,
   * so the listing does not fan out into a query per doctor.
   */
  async doctorsWithUpcomingAvailability(
    doctorIds: string[],
    days = AVAILABILITY_SOON_DAYS,
  ): Promise<Set<string>> {
    if (doctorIds.length === 0) return new Set();

    const now = new Date();
    const to = new Date(startOfDay(now).getTime() + days * DAY_MS);

    const [windows, exceptions, booked] = await Promise.all([
      this.prisma.availabilityWindow.findMany({
        where: { doctorId: { in: doctorIds } },
      }),
      this.prisma.availabilityException.findMany({
        where: { doctorId: { in: doctorIds }, date: { gte: startOfDay(now), lt: to } },
      }),
      this.prisma.appointment.findMany({
        where: {
          doctorId: { in: doctorIds },
          state: 'SCHEDULED',
          startsAt: { gte: now, lt: to },
        },
        select: { doctorId: true, startsAt: true },
      }),
    ]);

    const windowsByDoctor = groupBy(windows, (w) => w.doctorId);
    const exceptionsByDoctor = groupBy(exceptions, (e) => e.doctorId);
    const bookedByDoctor = groupBy(booked, (b) => b.doctorId);

    const available = new Set<string>();

    for (const doctorId of doctorIds) {
      const slots = deriveSlots({
        windows: windowsByDoctor.get(doctorId) ?? [],
        exceptionDates: new Set(
          (exceptionsByDoctor.get(doctorId) ?? []).map((e) => dateKey(e.date)),
        ),
        bookedStarts: new Set(
          (bookedByDoctor.get(doctorId) ?? []).map((b) => b.startsAt.getTime()),
        ),
        from: now,
        to,
        now,
        slotMinutes: SLOT_DURATION_MINUTES,
      });

      if (slots.length > 0) available.add(doctorId);
    }

    return available;
  }
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k) ?? [];
    list.push(item);
    map.set(k, list);
  }
  return map;
}
