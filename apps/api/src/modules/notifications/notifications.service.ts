import { Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { IMMINENT_WINDOW_MINUTES, type Notification } from '@remedyo/shared';
import { PrismaService } from '../../common/prisma.service';

export interface NotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string | null;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Written inside the transaction of the event that caused it.
   *
   * That is the whole point: a booking that rolls back on a slot conflict must
   * not leave a notification claiming it succeeded. Callers pass their
   * transaction client, so the notification shares the booking's fate.
   */
  async emit(
    tx: Prisma.TransactionClient,
    inputs: NotificationInput | NotificationInput[],
  ): Promise<void> {
    const list = Array.isArray(inputs) ? inputs : [inputs];
    if (list.length === 0) return;

    await tx.notification.createMany({
      data: list.map((n) => ({
        userId: n.userId,
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link ?? null,
      })),
    });
  }

  async list(userId: string): Promise<Notification[]> {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return rows.map(toDto);
  }

  async unreadCount(userId: string): Promise<{ unread: number }> {
    const unread = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });
    return { unread };
  }

  async markRead(userId: string, id: string): Promise<void> {
    // Scoped by userId so one user cannot mark another's notification read.
    await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  /**
   * Imminent-appointment reminders, computed on read.
   *
   * No scheduler, no worker, no delivery table. A cancelled appointment stops
   * reminding for free, because it simply falls out of this query.
   */
  async reminders(userId: string): Promise<Notification[]> {
    const now = new Date();
    const until = new Date(now.getTime() + IMMINENT_WINDOW_MINUTES * 60_000);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        state: 'SCHEDULED',
        startsAt: { gte: new Date(now.getTime() - 15 * 60_000), lte: until },
        OR: [
          { patient: { userId } },
          { doctor: { userId } },
        ],
      },
      include: {
        patient: { select: { fullName: true, userId: true } },
        doctor: { select: { fullName: true, userId: true } },
      },
      orderBy: { startsAt: 'asc' },
    });

    return appointments.map((a) => {
      const viewerIsPatient = a.patient.userId === userId;
      const counterpart = viewerIsPatient
        ? `Dr. ${a.doctor.fullName}`
        : (a.patient.fullName ?? 'your patient');

      return {
        id: `reminder_${a.id}`,
        type: NotificationType.APPOINTMENT_REMINDER,
        title: 'Consultation starting soon',
        body: `Your consultation with ${counterpart} starts at ${a.startsAt.toLocaleTimeString(
          'en-PH',
          { hour: 'numeric', minute: '2-digit' },
        )}.`,
        link: `/consultation/${a.id}`,
        readAt: null,
        createdAt: a.startsAt.toISOString(),
      };
    });
  }
}

function toDto(row: {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
}): Notification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
