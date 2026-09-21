import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type { Appointment } from '@remedyo/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser } from '../../common/types';
import { AppointmentsService } from './appointments.service';
import {
  BookAppointmentDto,
  CancelAppointmentDto,
  RescheduleAppointmentDto,
} from './dto/appointments.dto';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('scope') scope?: 'upcoming' | 'past' | 'all',
  ): Promise<Appointment[]> {
    return this.appointments.listForUser(user, scope ?? 'all');
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<Appointment> {
    return this.appointments.getForUser(user, id);
  }

  @Roles('PATIENT')
  @Post()
  book(
    @CurrentUser() user: AuthUser,
    @Body() dto: BookAppointmentDto,
  ): Promise<Appointment> {
    return this.appointments.book(user, dto);
  }

  @Roles('PATIENT')
  @Post(':id/reschedule')
  reschedule(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
  ): Promise<Appointment> {
    return this.appointments.reschedule(user, id, dto);
  }

  /** Either participant may cancel before the consultation starts. */
  @Roles('PATIENT', 'DOCTOR')
  @Post(':id/cancel')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CancelAppointmentDto,
  ): Promise<Appointment> {
    return this.appointments.cancel(user, id, dto);
  }
}
