import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Notification } from '@remedyo/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { NotificationsService } from './notifications.service';
import { NotificationDto, UnreadCountDto } from './dto/notification.response';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @ApiOperation({
    summary: 'List the calling account’s notifications',
    description: 'Scoped to the caller. No role restriction: every account has a notification list.',
  })
  @ApiOkResponse({ description: 'The caller’s notifications, newest first.', type: [NotificationDto] })
  @Get()
  list(@CurrentUser() user: AuthUser): Promise<Notification[]> {
    return this.notifications.list(user.id);
  }

  @ApiOperation({ summary: 'The unread badge count' })
  @ApiOkResponse({ description: 'How many are still unread.', type: UnreadCountDto })
  @Get('unread-count')
  unreadCount(@CurrentUser() user: AuthUser): Promise<{ unread: number }> {
    return this.notifications.unreadCount(user.id);
  }

  @ApiOperation({
    summary: 'Upcoming appointment reminders',
    description: 'The reminders shown on the dashboard, derived rather than stored.',
  })
  @ApiOkResponse({ description: 'Reminder notifications.', type: [NotificationDto] })
  @Get('reminders')
  reminders(@CurrentUser() user: AuthUser): Promise<Notification[]> {
    return this.notifications.reminders(user.id);
  }

  @ApiOperation({ summary: 'Mark one notification read' })
  @ApiParam({ name: 'id', description: 'The notification to mark.' })
  @ApiNoContentResponse({ description: 'The notification is now read.' })
  @Post(':id/read')
  @HttpCode(204)
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    return this.notifications.markRead(user.id, id);
  }

  @ApiOperation({ summary: 'Mark every notification read' })
  @ApiNoContentResponse({ description: 'Every notification is now read.' })
  @Post('read-all')
  @HttpCode(204)
  markAllRead(@CurrentUser() user: AuthUser): Promise<void> {
    return this.notifications.markAllRead(user.id);
  }
}
