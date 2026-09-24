import { ApiProperty } from '@nestjs/swagger';
import {
  NotificationType,
  type Notification,
} from '@remedyo/shared';

/**
 * Response models for the notification surface (design D7).
 */

export class NotificationDto implements Notification {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: NotificationType })
  type!: NotificationType;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty({ nullable: true, description: 'The route this notification points at, if any.' })
  link!: string | null;

  @ApiProperty({ format: 'date-time', nullable: true, description: 'Null while unread.' })
  readAt!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

/**
 * The unread badge count.
 *
 * No `@remedyo/shared` counterpart: the web app reads the field off this one
 * endpoint and does not model it separately.
 */
export class UnreadCountDto {
  @ApiProperty({ description: 'Notifications addressed to the caller that have not been read.' })
  unread!: number;
}
