import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import type { Notification } from '@remedyo/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<Notification[]> {
    return this.notifications.list(user.id);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: AuthUser): Promise<{ unread: number }> {
    return this.notifications.unreadCount(user.id);
  }

  @Get('reminders')
  reminders(@CurrentUser() user: AuthUser): Promise<Notification[]> {
    return this.notifications.reminders(user.id);
  }

  @Post(':id/read')
  @HttpCode(204)
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    return this.notifications.markRead(user.id, id);
  }

  @Post('read-all')
  @HttpCode(204)
  markAllRead(@CurrentUser() user: AuthUser): Promise<void> {
    return this.notifications.markAllRead(user.id);
  }
}
