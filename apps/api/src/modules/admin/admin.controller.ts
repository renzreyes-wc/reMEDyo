import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { AccountStatus } from '@prisma/client';
import type {
  AdminStats,
  AdminUserRow,
  Appointment,
  AuditEntry,
  DoctorDetail,
} from '@remedyo/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser } from '../../common/types';
import { AdminService } from './admin.service';
import {
  AdminAppointmentQueryDto,
  AdminCancelDto,
  AdminUserQueryDto,
  AuditQueryDto,
  RejectDoctorDto,
  SuspendAccountDto,
  UpdateSpecializationsDto,
} from './dto/admin.dto';

/**
 * Every route here is admin-only, declared once at the class level.
 *
 * Note which operations write an audit entry and which do not: listing users
 * or reading the dashboard leaves no trace, because the audit log records
 * actions that changed something, not everything an administrator looked at.
 */
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  users(@Query() query: AdminUserQueryDto): Promise<AdminUserRow[]> {
    return this.admin.listUsers(query);
  }

  @Post('users/:id/activate')
  activate(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
  ): Promise<AdminUserRow> {
    return this.admin.setAccountStatus(admin, id, AccountStatus.ACTIVE, undefined);
  }

  @Post('users/:id/suspend')
  suspend(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: SuspendAccountDto,
  ): Promise<AdminUserRow> {
    return this.admin.setAccountStatus(admin, id, AccountStatus.SUSPENDED, dto);
  }

  @Post('users/:id/deactivate')
  deactivate(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: SuspendAccountDto,
  ): Promise<AdminUserRow> {
    return this.admin.setAccountStatus(admin, id, AccountStatus.DEACTIVATED, dto);
  }

  @Get('doctors/pending')
  pending(): Promise<DoctorDetail[]> {
    return this.admin.reviewQueue();
  }

  @Post('doctors/:id/approve')
  @HttpCode(204)
  approve(@CurrentUser() admin: AuthUser, @Param('id') id: string): Promise<void> {
    return this.admin.approveDoctor(admin, id);
  }

  @Post('doctors/:id/reject')
  @HttpCode(204)
  reject(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: RejectDoctorDto,
  ): Promise<void> {
    return this.admin.rejectDoctor(admin, id, dto);
  }

  @Post('doctors/:id/specializations')
  @HttpCode(204)
  specializations(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSpecializationsDto,
  ): Promise<void> {
    return this.admin.updateSpecializations(admin, id, dto);
  }

  @Get('appointments')
  appointments(@Query() query: AdminAppointmentQueryDto): Promise<Appointment[]> {
    return this.admin.listAppointments(query);
  }

  @Post('appointments/:id/cancel')
  cancelAppointment(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: AdminCancelDto,
  ): Promise<Appointment> {
    return this.admin.cancelAppointment(admin, id, dto.reason);
  }

  @Get('stats')
  stats(): Promise<AdminStats> {
    return this.admin.stats();
  }

  @Get('audit')
  audit(@Query() query: AuditQueryDto): Promise<AuditEntry[]> {
    return this.admin.auditLog(query);
  }
}
