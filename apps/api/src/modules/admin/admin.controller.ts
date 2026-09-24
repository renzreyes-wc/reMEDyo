import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
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
import { AppointmentDto } from '../appointments/dto/appointment.response';
import { DoctorDetailDto } from '../doctors/dto/doctor.response';
import { AdminService } from './admin.service';
import { AdminStatsDto, AdminUserRowDto, AuditEntryDto } from './dto/admin.response';
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
@ApiTags('admin')
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @ApiOperation({
    summary: 'List accounts',
    description: 'Reads leave no audit entry: the log records changes, not lookups.',
  })
  @ApiOkResponse({ description: 'Matching accounts.', type: [AdminUserRowDto] })
  @Get('users')
  users(@Query() query: AdminUserQueryDto): Promise<AdminUserRow[]> {
    return this.admin.listUsers(query);
  }

  @ApiOperation({ summary: 'Activate an account' })
  @ApiParam({ name: 'id', description: 'The account to activate.' })
  @ApiOkResponse({ description: 'The account, now active.', type: AdminUserRowDto })
  @Post('users/:id/activate')
  activate(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
  ): Promise<AdminUserRow> {
    return this.admin.setAccountStatus(admin, id, AccountStatus.ACTIVE, undefined);
  }

  @ApiOperation({
    summary: 'Suspend an account',
    description: 'Takes effect on the account’s next request, not when its token expires.',
  })
  @ApiParam({ name: 'id', description: 'The account to suspend.' })
  @ApiOkResponse({ description: 'The account, now suspended.', type: AdminUserRowDto })
  @Post('users/:id/suspend')
  suspend(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: SuspendAccountDto,
  ): Promise<AdminUserRow> {
    return this.admin.setAccountStatus(admin, id, AccountStatus.SUSPENDED, dto);
  }

  @ApiOperation({ summary: 'Deactivate an account' })
  @ApiParam({ name: 'id', description: 'The account to deactivate.' })
  @ApiOkResponse({ description: 'The account, now deactivated.', type: AdminUserRowDto })
  @Post('users/:id/deactivate')
  deactivate(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: SuspendAccountDto,
  ): Promise<AdminUserRow> {
    return this.admin.setAccountStatus(admin, id, AccountStatus.DEACTIVATED, dto);
  }

  @ApiOperation({
    summary: 'The doctor approval queue',
    description: 'Applications awaiting a decision, oldest first.',
  })
  @ApiOkResponse({ description: 'Doctors awaiting review.', type: [DoctorDetailDto] })
  @Get('doctors/pending')
  pending(): Promise<DoctorDetail[]> {
    return this.admin.reviewQueue();
  }

  @ApiOperation({
    summary: 'Approve a doctor',
    description: 'Until this happens the doctor is absent from the public directory and cannot be booked.',
  })
  @ApiParam({ name: 'id', description: 'The doctor profile to approve.' })
  @ApiNoContentResponse({ description: 'The doctor is approved.' })
  @Post('doctors/:id/approve')
  @HttpCode(204)
  approve(@CurrentUser() admin: AuthUser, @Param('id') id: string): Promise<void> {
    return this.admin.approveDoctor(admin, id);
  }

  @ApiOperation({
    summary: 'Reject a doctor',
    description:
      'The stated reason is shown to the doctor on their own profile. A rejection is not revisited by the review queue: the profile stays rejected unless an administrator later approves it.',
  })
  @ApiParam({ name: 'id', description: 'The doctor profile to reject.' })
  @ApiNoContentResponse({ description: 'The doctor is rejected.' })
  @Post('doctors/:id/reject')
  @HttpCode(204)
  reject(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: RejectDoctorDto,
  ): Promise<void> {
    return this.admin.rejectDoctor(admin, id, dto);
  }

  @ApiOperation({
    summary: 'Correct a doctor’s specializations',
    description:
      'The only way the list changes once submitted: doctors may not invent a specialization, so an administrator corrects it.',
  })
  @ApiParam({ name: 'id', description: 'The doctor profile to correct.' })
  @ApiNoContentResponse({ description: 'The specializations were updated.' })
  @Post('doctors/:id/specializations')
  @HttpCode(204)
  specializations(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSpecializationsDto,
  ): Promise<void> {
    return this.admin.updateSpecializations(admin, id, dto);
  }

  @ApiOperation({ summary: 'List appointments across all accounts' })
  @ApiOkResponse({ description: 'Matching appointments.', type: [AppointmentDto] })
  @Get('appointments')
  appointments(@Query() query: AdminAppointmentQueryDto): Promise<Appointment[]> {
    return this.admin.listAppointments(query);
  }

  @ApiOperation({
    summary: 'Cancel an appointment as an administrator',
    description: 'Recorded as cancelled by `ADMIN`, with the reason kept.',
  })
  @ApiParam({ name: 'id', description: 'The appointment to cancel.' })
  @ApiOkResponse({ description: 'The cancelled appointment.', type: AppointmentDto })
  @Post('appointments/:id/cancel')
  cancelAppointment(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: AdminCancelDto,
  ): Promise<Appointment> {
    return this.admin.cancelAppointment(admin, id, dto.reason);
  }

  @ApiOperation({ summary: 'Dashboard counts' })
  @ApiOkResponse({ description: 'The current counts.', type: AdminStatsDto })
  @Get('stats')
  stats(): Promise<AdminStats> {
    return this.admin.stats();
  }

  @ApiOperation({
    summary: 'The audit log',
    description: 'Only actions that changed something appear here.',
  })
  @ApiOkResponse({ description: 'Matching audit entries, newest first.', type: [AuditEntryDto] })
  @Get('audit')
  audit(@Query() query: AuditQueryDto): Promise<AuditEntry[]> {
    return this.admin.auditLog(query);
  }
}
